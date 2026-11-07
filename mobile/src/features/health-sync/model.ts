import { createEventBase, localDate, orderedEvents, validMetric, type Journal, type MetricEvent, type ProgressEvent } from "../progress/model";
import type { HealthSource, HealthValue } from "./types";

export function healthDays(now = new Date()) {
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(now); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (6 - index));
    const next = new Date(start); next.setDate(next.getDate() + 1);
    return { date: localDate(start), start, end: new Date(Math.min(next.getTime(), now.getTime())) };
  });
}

export type SleepInterval = { start: number; end: number; wakeDate?: string };
export function sleepValues(intervals: SleepInterval[], dates: readonly string[]): HealthValue[] {
  const valid = intervals.filter(item => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start && item.end - item.start <= 36 * 3600_000).sort((a, b) => a.start - b.start);
  // HealthKit reports stages rather than whole nights. Nearby stage intervals
  // belong to a sleep episode, and its wake date owns the whole episode.
  const episodes: SleepInterval[][] = [];
  for (const interval of valid) {
    const previous = episodes.at(-1);
    const previousEnd = previous ? Math.max(...previous.map(item => item.end)) : 0;
    if (previous && !interval.wakeDate && !previous[0].wakeDate && interval.start - previousEnd <= 90 * 60_000) previous.push(interval);
    else if (previous && interval.wakeDate && interval.wakeDate === previous[0].wakeDate) previous.push(interval);
    else episodes.push([interval]);
  }
  const grouped = new Map<string, SleepInterval[]>();
  for (const episode of episodes) {
    const date = episode[0].wakeDate ?? localDate(new Date(Math.max(...episode.map(item => item.end))));
    if (dates.includes(date)) grouped.set(date, [...(grouped.get(date) ?? []), ...episode]);
  }
  return [...grouped].map(([date, samples]) => {
    // Union coverage: overlapping stages, watches and apps never add the same
    // sleeping minute twice. Awake/in-bed records never reach this function.
    let start = 0; let end = 0; let total = 0;
    for (const sample of samples.sort((a, b) => a.start - b.start)) {
      if (sample.start > end) { total += end - start; start = sample.start; end = sample.end; }
      else end = Math.max(end, sample.end);
    }
    total += end - start;
    return { metric: "sleep" as const, date, value: Math.round(total / 3600_000 * 100) / 100 };
  }).filter(item => item.value > 0 && item.value <= 24);
}

export function latestWeightValues(samples: { at: number; kg: number }[], dates: readonly string[]): HealthValue[] {
  const grouped = new Map<string, { at: number; kg: number }>();
  for (const sample of samples) {
    if (!Number.isFinite(sample.at) || !validMetric("weight", sample.kg)) continue;
    const date = localDate(new Date(sample.at));
    if (dates.includes(date) && (!grouped.has(date) || grouped.get(date)!.at < sample.at)) grouped.set(date, sample);
  }
  return [...grouped].map(([date, sample]) => ({ metric: "weight", date, value: Math.round(sample.kg * 100) / 100 }));
}

export function planHealthImport(journal: Journal, source: HealthSource, values: readonly HealthValue[], now = new Date()) {
  const allowedDates = healthDays(now).map(day => day.date);
  const latest = new Map<string, MetricEvent>();
  for (const event of orderedEvents(journal.events)) if (event.kind === "metric") latest.set(`${event.date}:${event.metric}`, event);
  let events = [...journal.events]; const added: ProgressEvent[] = [];
  let unchanged = 0; let protectedEntries = 0;
  const unique = new Map(values.map(value => [`${value.date}:${value.metric}`, value]));
  for (const [key, sample] of unique) {
    if (!allowedDates.includes(sample.date) || !validMetric(sample.metric, sample.value)) continue;
    const previous = latest.get(key);
    // Preserve manual corrections and explicit deletions, including pedometer
    // totals that may already contain some of the same device steps.
    if (previous && previous.source !== "healthkit" && previous.source !== "healthconnect") { protectedEntries++; continue; }
    if (previous?.value === sample.value) { unchanged++; continue; }
    const event: MetricEvent = { ...createEventBase(events), kind: "metric", ...sample, source, notes: `Imported from ${source === "healthkit" ? "Apple Health" : "Health Connect"}` };
    added.push(event); events.push(event); latest.set(key, event);
  }
  return {
    journal: { ...journal, events, pending: [...new Set([...journal.pending, ...added.map(event => event.id)])] },
    imported: added.length, unchanged, protectedEntries
  };
}
