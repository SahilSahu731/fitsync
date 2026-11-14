import {
  addDays,
  latestMetrics,
  localDate,
  type LoggedSet,
  type Metric,
  type ProgressEvent,
  type ProgressWorkout,
} from "../progress/model";
import { estimatedMax, setVolume, workoutDate } from "../progress/analytics";
import { MUSCLES, type MuscleMetadata } from "./analytics";

export type InsightConfidence = "insufficient" | "limited" | "moderate";
export type InsightReadiness = {
  date: string;
  soreness?: number | null;
  muscleSoreness?: Record<string, number>;
};
export type InsightSession = {
  workoutId: string;
  date: string;
  finishedAt: string;
  name: string;
  exerciseId: string;
  trackingType: string;
  sets: LoggedSet[];
  standardSets: LoggedSet[];
  uncompletedSets: number;
  primaryMuscles: string[];
  secondaryMuscles: string[];
};
const finite = (n: number | null | undefined) => n != null && Number.isFinite(n);
const positive = (n: number | null | undefined) => finite(n) && n! > 0;
const mean = (values: number[]) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const dayDistance = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);
const validDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) &&
  Number.isFinite(Date.parse(`${date}T12:00:00Z`)) &&
  new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
const validCompletion = (set: LoggedSet, today: string) =>
  !!set.completed_at &&
  Number.isFinite(Date.parse(set.completed_at)) &&
  localDate(new Date(set.completed_at)) <= today;

/** One canonical completed-workout view; derived insights never keep a separate history. */
export function completedInsightWorkouts(workouts: ProgressWorkout[], today: string) {
  if (!validDate(today)) return [];
  return [...new Map(workouts.map((w) => [w.id, w])).values()]
    .filter(
      (w) =>
        w.status === "completed" &&
        !!w.finished_at &&
        Number.isFinite(Date.parse(w.finished_at)) &&
        workoutDate(w) <= today,
    )
    .sort((a, b) => a.finished_at!.localeCompare(b.finished_at!) || a.id.localeCompare(b.id));
}

export function insightSessions(
  workouts: ProgressWorkout[],
  today: string,
  metadata: MuscleMetadata[] = [],
): InsightSession[] {
  const index = new Map(metadata.map((m) => [m.id, m]));
  return completedInsightWorkouts(workouts, today).flatMap((workout) => {
    const merged = new Map<string, InsightSession>();
    const seenSets = new Set<string>();
    for (const row of [...workout.workout_session_exercises].sort(
      (a, b) => a.position - b.position,
    )) {
      const key = `${row.exercise_id}:${row.tracking_type}`;
      const snapshot = row.exercises?.exercise_muscles;
      const primary = snapshot?.length
        ? snapshot
            .filter((m) => m.role === "primary")
            .map((m) => m.exercise_muscle_groups?.code)
            .filter((v): v is string => !!v)
        : (index.get(row.exercise_id)?.primaryMuscles ?? []);
      const secondary = snapshot?.length
        ? snapshot
            .filter((m) => m.role === "secondary")
            .map((m) => m.exercise_muscle_groups?.code)
            .filter((v): v is string => !!v)
        : (index.get(row.exercise_id)?.secondaryMuscles ?? []);
      const item = merged.get(key) ?? {
        workoutId: workout.id,
        date: workoutDate(workout),
        finishedAt: workout.finished_at!,
        name: row.exercise_name,
        exerciseId: row.exercise_id,
        trackingType: row.tracking_type,
        sets: [],
        standardSets: [],
        uncompletedSets: 0,
        primaryMuscles: [...new Set(primary)],
        secondaryMuscles: [...new Set(secondary)].filter((m) => !primary.includes(m)),
      };
      for (const set of row.workout_logged_sets) {
        const setKey = `${key}:${set.id}`;
        if (seenSets.has(setKey)) continue;
        seenSets.add(setKey);
        if (set.set_type === "warmup") continue;
        if (validCompletion(set, today)) {
          item.sets.push(set);
          if (set.set_type === "normal") item.standardSets.push(set);
        } else if (!set.completed_at) item.uncompletedSets++;
      }
      merged.set(key, item);
    }
    return [...merged.values()];
  });
}

export type TargetValues = {
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rpe: number | null;
};
export type WorkingSetSuggestion = {
  setNumber: number;
  previous: TargetValues;
  suggested: TargetValues;
  action: "repeat" | "increase_reps" | "increase_load" | "reduce_load";
  reason: string;
};
const valuesOf = (set: LoggedSet): TargetValues => ({
  weightKg: finite(set.weight_kg) && set.weight_kg! >= 0 ? set.weight_kg : null,
  reps: positive(set.reps) && Number.isInteger(set.reps) ? set.reps : null,
  durationSeconds: positive(set.duration_seconds) ? set.duration_seconds : null,
  distanceMeters: positive(set.distance_meters) ? set.distance_meters : null,
  rpe: finite(set.rpe) && set.rpe! >= 1 && set.rpe! <= 10 ? set.rpe : null,
});
export function suggestWorkingSetTargets(
  history: ProgressWorkout[],
  exerciseId: string,
  trackingType: string,
  currentDate: string,
  incrementKg = 2.5,
) {
  const rawSessions = insightSessions(history, currentDate).filter(
    (s) => s.exerciseId === exerciseId && s.trackingType === trackingType && s.standardSets.length,
  );
  const sessions = [...new Map(rawSessions.map((session) => [session.date, session])).values()];
  const last = sessions.at(-1);
  const prior = sessions.at(-2);
  const missing: string[] = [];
  if (!last)
    missing.push("No completed standard working sets for this exercise and tracking type.");
  if (sessions.length < 2)
    missing.push("At least two comparable sessions are needed before suggesting progression.");
  if ([last, prior].some((session) => session?.standardSets.some((s) => valuesOf(s).rpe === null)))
    missing.push("Some previous sets have no valid RPE; those targets repeat the baseline.");
  const stale = !!last && dayDistance(last.date, currentDate) > 42;
  if (stale)
    missing.push(
      "The last performance is more than six weeks old; reassess the load before resuming.",
    );
  const validIncrement = Number.isFinite(incrementKg) && incrementKg > 0 ? incrementKg : 2.5;
  const targets: WorkingSetSuggestion[] = (last?.standardSets ?? []).map((set, index) => {
    const previous = valuesOf(set);
    const suggested = { ...previous, rpe: null };
    const before = prior?.standardSets[index] ? valuesOf(prior.standardSets[index]) : null;
    let action: WorkingSetSuggestion["action"] = "repeat";
    let reason = "Repeat the last recorded baseline and adjust to today's technique and effort.";
    if (stale)
      reason = "Older baseline: choose a comfortable return load; no increase is suggested.";
    else if (trackingType !== "reps_weight" && trackingType !== "reps")
      reason =
        "Repeat this tracking-specific baseline; no pace, assistance, or duration goal is assumed.";
    else if (!before || previous.reps === null || before.reps === null)
      reason = "A second valid set at the same position is needed for a progression suggestion.";
    else if (previous.rpe === null || before.rpe === null)
      reason = "Repeat the baseline because comparable effort ratings are missing.";
    else if (
      trackingType === "reps_weight" &&
      previous.weightKg !== null &&
      previous.weightKg > 0 &&
      before.weightKg === previous.weightKg &&
      previous.reps < before.reps &&
      previous.rpe >= 9.5 &&
      before.rpe >= 9.5
    ) {
      const reduced = Math.floor((previous.weightKg * 0.95) / validIncrement) * validIncrement;
      if (reduced > 0 && reduced >= previous.weightKg * 0.9 && reduced < previous.weightKg) {
        action = "reduce_load";
        suggested.weightKg = Math.round(reduced * 1000) / 1000;
        reason =
          "Reps fell at the same load across two very high-effort sets. A small optional reduction may help repeat controlled reps.";
      }
    } else if (
      previous.rpe <= 8 &&
      before.rpe <= 8 &&
      previous.reps >= before.reps &&
      (trackingType === "reps" ||
        (positive(previous.weightKg) && previous.weightKg === before.weightKg))
    ) {
      if (previous.reps < 12) {
        action = "increase_reps";
        suggested.reps = previous.reps + 1;
        reason =
          "Two same-position sets at comparable load had RPE 8 or lower. One additional rep is an optional next target.";
      } else if (
        trackingType === "reps_weight" &&
        previous.weightKg &&
        validIncrement / previous.weightKg <= 0.1
      ) {
        action = "increase_load";
        suggested.weightKg = Math.round((previous.weightKg + validIncrement) * 1000) / 1000;
        suggested.reps = Math.max(1, previous.reps - 2);
        reason =
          "At least 12 reps were repeated with manageable recorded effort. Try one load increment with two fewer target reps, if comfortable.";
      } else
        reason =
          "Repeat this baseline; the available load increment would exceed 10%, or a rep-range goal is needed.";
    }
    return { setNumber: index + 1, previous, suggested, action, reason };
  });
  const confidence: InsightConfidence = !last
    ? "insufficient"
    : sessions.length >= 3 && !missing.length
      ? "moderate"
      : "limited";
  return {
    exerciseId,
    trackingType,
    previousSessionId: last?.workoutId ?? null,
    previousDate: last?.date ?? null,
    confidence,
    comparableSessions: sessions.length,
    reason:
      "Optional targets use completed normal sets at the same set position, exercise and tracking type. Warm-ups and advanced methods are excluded. Rest, technique and equipment setup are not measured.",
    missing,
    targets,
  };
}

function scoreSession(s: InsightSession) {
  if (s.trackingType === "reps_weight") {
    const estimates = s.standardSets
      .map((set) => estimatedMax(set, s.trackingType))
      .filter((v): v is number => v !== null);
    return estimates.length ? Math.max(...estimates) : null;
  }
  if (s.trackingType === "reps") {
    const reps = s.standardSets
      .map((set) => set.reps)
      .filter((v): v is number => positive(v) && Number.isInteger(v));
    return reps.length ? Math.max(...reps) : null;
  }
  return null;
}
export type ReplacementEvidence = { exerciseId: string; date: string; requestId: string };
export function buildExerciseProfiles(
  workouts: ProgressWorkout[],
  today: string,
  replacementEvidence?: ReplacementEvidence[],
) {
  const replacements = [
    ...new Map(
      (replacementEvidence ?? [])
        .flatMap((event) => {
          const iso =
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
              event.date,
            );
          const date = validDate(event.date)
            ? event.date
            : iso && validDate(event.date.slice(0, 10)) && Number.isFinite(Date.parse(event.date))
              ? localDate(new Date(event.date))
              : null;
          return date ? [{ ...event, date }] : [];
        })
        .filter(
          (event) =>
            typeof event.requestId === "string" &&
            event.requestId.trim().length > 0 &&
            typeof event.exerciseId === "string" &&
            event.exerciseId.trim().length > 0 &&
            validDate(event.date) &&
            event.date <= today,
        )
        .map((event) => [event.requestId, event]),
    ).values(),
  ];
  const groups = new Map<string, InsightSession[]>();
  for (const s of insightSessions(workouts, today)) {
    const key = `${s.exerciseId}:${s.trackingType}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()]
    .map(([id, all]) => {
      const completed = all.filter((s) => s.sets.length);
      const comparable = completed.filter((s) => scoreSession(s) !== null);
      // Same-day repeats do not provide independent longitudinal evidence.
      const dates = [...new Map(comparable.map((s) => [s.date, s])).values()];
      const recent = dates.slice(-4);
      const span = recent.length ? dayDistance(recent[0].date, recent.at(-1)!.date) : 0;
      const baseline = recent.length ? scoreSession(recent[0]) : null;
      const current = recent.length ? scoreSession(recent.at(-1)!) : null;
      const changePercent =
        baseline && current !== null ? ((current - baseline) / baseline) * 100 : null;
      const enough =
        recent.length >= 4 && span >= 21 && dayDistance(recent.at(-1)!.date, today) <= 42;
      const stableMethod =
        recent.length > 0 &&
        recent.every((s) => s.standardSets.length === recent[0].standardSets.length);
      const scores = recent.map(scoreSession).filter((v): v is number => v !== null);
      const rangePercent =
        baseline && scores.length
          ? ((Math.max(...scores) - Math.min(...scores)) / baseline) * 100
          : null;
      const status: "insufficient" | "progressing" | "stable" | "declining" | "mixed" =
        !enough || !stableMethod || changePercent === null
          ? "insufficient"
          : changePercent > 2
            ? "progressing"
            : changePercent < -2
              ? "declining"
              : rangePercent !== null && rangePercent <= 2
                ? "stable"
                : "mixed";
      const efforts = recent.flatMap((s) =>
        s.standardSets
          .map((set) => set.rpe)
          .filter((v): v is number => finite(v) && v! >= 1 && v! <= 10),
      );
      const standardCount = recent.reduce((n, s) => n + s.standardSets.length, 0);
      const missing = [
        ...(!enough
          ? [
              "Need four comparable sessions on different dates spanning at least 21 days, with a recent session.",
            ]
          : []),
        ...(!stableMethod && recent.length ? ["Working-set counts changed between sessions."] : []),
        ...(efforts.length < standardCount
          ? ["Effort ratings are incomplete; equal scores may have required different effort."]
          : []),
        "Rest intervals, range of motion and equipment setup are not measured.",
      ];
      return {
        id,
        exerciseId: all[0].exerciseId,
        name: all.at(-1)!.name,
        trackingType: all[0].trackingType,
        sessions: completed.length,
        appearances: all.length,
        // An unfinished row is evidence of an uncompleted appearance, not evidence of its cause.
        uncompletedAppearances: all.filter((s) => !s.sets.length && s.uncompletedSets > 0).length,
        replacementCount: replacementEvidence
          ? replacements.filter((event) => event.exerciseId === all[0].exerciseId).length
          : null,
        replacementEvents: replacements
          .filter((event) => event.exerciseId === all[0].exerciseId)
          .sort((a, b) => b.date.localeCompare(a.date)),
        replacementNote: replacementEvidence
          ? "Counts saved planned-coaching exercise swaps across tracking variants, including only dated commands through today. Workout removals and reasons are not inferred."
          : "Planned-coaching replacement history has not loaded. Workout removals and replacement reasons are not inferred.",
        status,
        plateau: status === "stable",
        changePercent,
        scoreLabel:
          all[0].trackingType === "reps_weight"
            ? "Estimated 1RM (1–12 normal reps)"
            : all[0].trackingType === "reps"
              ? "Best normal-set reps"
              : "No comparable strength score for this tracking type",
        confidence: (enough && stableMethod
          ? "moderate"
          : completed.length
            ? "limited"
            : "insufficient") as InsightConfidence,
        evidence: recent.map((s) => ({
          date: s.date,
          workoutId: s.workoutId,
          score: scoreSession(s),
          standardSets: s.standardSets.length,
          averageRpe: mean(
            s.standardSets
              .map((set) => set.rpe)
              .filter((v): v is number => finite(v) && v! >= 1 && v! <= 10),
          ),
        })),
        missing,
        recommendation:
          status === "stable"
            ? "Possible plateau signal: compare technique, rest and effort, then review the plan. Stable logs alone do not establish a training plateau."
            : status === "declining"
              ? "Performance fell in this sample. Review fatigue, attendance and changes in execution before changing the plan."
              : status === "progressing"
                ? "Recorded performance improved across this sample. Keep the comparison conditions consistent."
                : "Log comparable normal working sets over time to build a useful performance trend.",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type TrainingRange = { start: string; end: string };
export function compareTrainingRanges(
  workouts: ProgressWorkout[],
  events: ProgressEvent[],
  baseline: TrainingRange,
  comparison: TrainingRange,
  today: string,
  options: { plannedDates?: string[] } = {},
) {
  const ranges = [baseline, comparison];
  const valid = ranges.every(
    (r) => validDate(r.start) && validDate(r.end) && r.start <= r.end && r.end <= today,
  );
  const notes = ["These are observational comparisons. A change does not prove what caused it."];
  if (!valid)
    return {
      valid: false as const,
      baseline: null,
      comparison: null,
      exercises: [],
      notes: ["Use valid, completed date ranges ending on or before today.", ...notes],
    };
  const sessions = insightSessions(workouts, today);
  const done = completedInsightWorkouts(workouts, today);
  const metrics = latestMetrics(events);
  const summarise = (range: TrainingRange) => {
    const included = done.filter(
      (w) => workoutDate(w) >= range.start && workoutDate(w) <= range.end,
    );
    const selected = sessions.filter((s) => s.date >= range.start && s.date <= range.end);
    const sets = selected.flatMap((s) => s.sets.map((set) => ({ set, type: s.trackingType })));
    const efforts = sets
      .map(({ set }) => set.rpe)
      .filter((r): r is number => finite(r) && r! >= 1 && r! <= 10);
    const scheduled = options.plannedDates
      ? [...new Set(options.plannedDates.filter((d) => d >= range.start && d <= range.end))]
      : null;
    const completedDates = new Set(included.map(workoutDate));
    const measurementAverages: Partial<Record<Metric, { value: number; days: number }>> = {};
    for (const m of metrics.filter((e) => e.date >= range.start && e.date <= range.end)) {
      if (m.value === null || !Number.isFinite(m.value)) continue;
      const old = measurementAverages[m.metric];
      measurementAverages[m.metric] = {
        value: (old?.value ?? 0) + m.value,
        days: (old?.days ?? 0) + 1,
      };
    }
    for (const m of Object.keys(measurementAverages) as Metric[])
      measurementAverages[m]!.value /= measurementAverages[m]!.days;
    return {
      ...range,
      days: dayDistance(range.start, range.end) + 1,
      workouts: included.length,
      activeDays: completedDates.size,
      workingSets: sets.length,
      volumeKg: sets.reduce((n, { set, type }) => n + Math.max(0, setVolume(set, type)), 0),
      minutes: included.reduce(
        (n, w) => n + (finite(w.elapsed_seconds) ? Math.max(0, w.elapsed_seconds!) / 60 : 0),
        0,
      ),
      durationCoverage: included.length
        ? included.filter((w) => finite(w.elapsed_seconds)).length / included.length
        : 0,
      averageRpe: mean(efforts),
      effortCoverage: sets.length ? efforts.length / sets.length : 0,
      exerciseIds: [
        ...new Set(
          selected.filter((s) => s.sets.length).map((s) => `${s.exerciseId}:${s.trackingType}`),
        ),
      ],
      attendance: scheduled?.length
        ? {
            completed: scheduled.filter((d) => completedDates.has(d)).length,
            planned: scheduled.length,
          }
        : null,
      measurementAverages,
    };
  };
  const a = summarise(baseline),
    b = summarise(comparison);
  const common = a.exerciseIds.filter((id) => b.exerciseIds.includes(id));
  const exercises = common.map((id) => {
    const all = sessions.filter((s) => `${s.exerciseId}:${s.trackingType}` === id);
    const scores = (range: TrainingRange) =>
      all
        .filter((s) => s.date >= range.start && s.date <= range.end)
        .map(scoreSession)
        .filter((v): v is number => v !== null);
    const before = scores(baseline),
      after = scores(comparison);
    const first = mean(before),
      second = mean(after);
    return {
      id,
      name: all.at(-1)!.name,
      type: all[0].trackingType,
      baseline: first,
      comparison: second,
      baselineSamples: before.length,
      comparisonSamples: after.length,
      changePercent: first && second !== null ? ((second - first) / first) * 100 : null,
      confidence: (before.length >= 3 && after.length >= 3
        ? "moderate"
        : "limited") as InsightConfidence,
    };
  });
  if (a.days !== b.days)
    notes.push("The ranges have different lengths; compare rates per week rather than totals.");
  if (baseline.start <= comparison.end && comparison.start <= baseline.end)
    notes.push("The date ranges overlap; some observations appear in both blocks.");
  if (!a.attendance || !b.attendance)
    notes.push(
      "Historical planned dates are unavailable; completed sessions are shown without an attendance percentage.",
    );
  if (a.effortCoverage < 1 || b.effortCoverage < 1)
    notes.push("Effort averages use recorded RPE only; missing ratings can affect the comparison.");
  if (common.length !== a.exerciseIds.length || common.length !== b.exerciseIds.length)
    notes.push(
      "Exercise selection changed; performance comparisons include only matching exercises and tracking types.",
    );
  if (a.durationCoverage < 1 || b.durationCoverage < 1)
    notes.push(
      "Workout duration is missing for some sessions; minutes total recorded durations only.",
    );
  notes.push(
    "Body measurements show averages of recorded days, with no missing-day estimates. Sleep, diet, technique and other changes may confound the result.",
  );
  return { valid: true as const, baseline: a, comparison: b, exercises, notes };
}

export function compareTrainingBlocks(
  workouts: ProgressWorkout[],
  events: ProgressEvent[],
  weeks: 4 | 8,
  today: string,
  options: { plannedDates?: string[] } = {},
) {
  const days = weeks * 7;
  return compareTrainingRanges(
    workouts,
    events,
    { start: addDays(today, 1 - days * 2), end: addDays(today, -days) },
    { start: addDays(today, 1 - days), end: today },
    today,
    options,
  );
}

/** Transparent workload heuristic, not a biological recovery measurement. */
export function estimateMuscleRecovery(
  workouts: ProgressWorkout[],
  metadata: MuscleMetadata[],
  today: string,
  readiness?: InsightReadiness | null,
) {
  const sessions = insightSessions(workouts, today, metadata);
  const codes = [
    ...new Set([
      ...MUSCLES,
      ...sessions.flatMap((s) => [...s.primaryMuscles, ...s.secondaryMuscles]),
    ]),
  ];
  const unknownSets = sessions
    .filter(
      (s) => s.date >= addDays(today, -6) && !s.primaryMuscles.length && !s.secondaryMuscles.length,
    )
    .reduce((n, s) => n + s.sets.length, 0);
  const freshReadiness = readiness?.date === today ? readiness : null;
  return {
    unknownSets,
    generalSoreness:
      finite(freshReadiness?.soreness) &&
      freshReadiness!.soreness! >= 1 &&
      freshReadiness!.soreness! <= 5
        ? freshReadiness!.soreness!
        : null,
    disclaimer:
      "Workload estimate only. Days since training and logged sets do not measure biological recovery, injury or readiness to train.",
    muscles: codes.map((code) => {
      const relevant = sessions.filter(
        (s) =>
          s.sets.length && (s.primaryMuscles.includes(code) || s.secondaryMuscles.includes(code)),
      );
      const recent = relevant.filter((s) => s.date >= addDays(today, -6));
      const last = relevant.at(-1);
      // Explicit calendar-day rule: full weight on day 0–1, half on day 2, quarter on day 3.
      const weightedRecentSets = recent.reduce((n, s) => {
        const days = dayDistance(s.date, today);
        const ageFactor = days < 2 ? 1 : days === 2 ? 0.5 : days === 3 ? 0.25 : 0;
        return n + s.sets.length * (s.primaryMuscles.includes(code) ? 1 : 0.5) * ageFactor;
      }, 0);
      const soreness = freshReadiness?.muscleSoreness?.[code];
      const validSoreness = finite(soreness) && soreness! >= 1 && soreness! <= 5 ? soreness! : null;
      const status =
        validSoreness !== null && validSoreness >= 4
          ? "reported_sore"
          : !last
            ? "unknown"
            : weightedRecentSets >= 8
              ? "higher_recent_load"
              : weightedRecentSets > 0
                ? "some_recent_load"
                : "lower_recent_load";
      return {
        code,
        lastDate: last?.date ?? null,
        daysSince: last ? dayDistance(last.date, today) : null,
        primarySets7d: recent
          .filter((s) => s.primaryMuscles.includes(code))
          .reduce((n, s) => n + s.sets.length, 0),
        secondarySets7d: recent
          .filter((s) => s.secondaryMuscles.includes(code))
          .reduce((n, s) => n + s.sets.length, 0),
        weightedRecentSets,
        soreness: validSoreness,
        status,
        confidence: (!last
          ? validSoreness === null
            ? "insufficient"
            : "limited"
          : validSoreness === null
            ? "limited"
            : "moderate") as InsightConfidence,
        reason:
          validSoreness !== null && validSoreness >= 4
            ? `You reported ${validSoreness}/5 soreness for this muscle today.`
            : !last
              ? "No completed, muscle-mapped working sets are available."
              : `${Math.round(weightedRecentSets * 10) / 10} weighted recent sets. Primary sets count 1; secondary sets 0.5. Age weights: day 0–1 = 1, day 2 = 0.5, day 3 = 0.25, later = 0.`,
        missing: [
          "Exercise execution, external activity and biological recovery are not measured.",
          ...(validSoreness === null
            ? [
                "No muscle-specific soreness report today. General soreness is not assigned to individual muscles.",
              ]
            : []),
        ],
      };
    }),
  };
}

export function previewSpecialisation(
  workouts: ProgressWorkout[],
  metadata: MuscleMetadata[],
  muscleCode: string,
  today: string,
) {
  const sessions = insightSessions(workouts, today, metadata).filter(
    (s) => s.date >= addDays(today, -27),
  );
  const primary = sessions.filter((s) => s.primaryMuscles.includes(muscleCode));
  const secondary = sessions.filter((s) => s.secondaryMuscles.includes(muscleCode));
  const eligible = new Map<string, { exerciseId: string; name: string; normalSets: number }>();
  for (const s of primary.filter((s) => s.standardSets.length)) {
    const old = eligible.get(s.exerciseId);
    eligible.set(s.exerciseId, {
      exerciseId: s.exerciseId,
      name: s.name,
      normalSets: (old?.normalSets ?? 0) + s.standardSets.length,
    });
  }
  const suggestions = [...eligible.values()]
    .sort((a, b) => b.normalSets - a.normalSets || a.name.localeCompare(b.name))
    .slice(0, 2)
    .map((e) => ({ exerciseId: e.exerciseId, name: e.name, extraSetsPerWeek: 1 }));
  const firstObserved = sessions.length ? sessions[0].date : null;
  const observedDays = firstObserved ? dayDistance(firstObserved, today) + 1 : 0;
  const primarySets = primary.reduce((n, s) => n + s.sets.length, 0);
  const secondarySets = secondary.reduce((n, s) => n + s.sets.length, 0);
  return {
    muscleCode,
    start: addDays(today, -27),
    end: today,
    primarySets,
    secondarySets,
    // Keep the full fixed four-week denominator; a sparse history is never extrapolated upward.
    averagePrimarySetsPerWeek: primarySets / 4,
    observedDays,
    confidence: (observedDays >= 21 && primary.length >= 4
      ? "moderate"
      : primary.length
        ? "limited"
        : "insufficient") as InsightConfidence,
    suggestions,
    extraSetsPerWeek: suggestions.length,
    preserveOtherWork: true,
    explanation: suggestions.length
      ? "Optional focus preview: add one normal set per week to each of up to two exercises already logged for this muscle. Other work stays unchanged. Review the exact generated plan and your recovery before applying."
      : "Log a completed normal working set on a muscle-mapped exercise first; no new movement or starting load is guessed.",
    limitations: [
      "This is a bounded planning heuristic, not an individual optimal-volume prescription.",
      "The actual plan preview determines suitable days and exercises. No schedule changes are applied by this calculation.",
    ],
  };
}

export type InsightExperiment = {
  id: string;
  title: string;
  baseline: TrainingRange;
  comparison: TrainingRange;
  metric?: "sessions" | "volume" | "strength" | "measurement";
  exerciseId?: string;
  measurement?: string;
  hypothesis?: string;
};
