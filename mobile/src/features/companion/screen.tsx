import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  Switch,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import Slider from "@react-native-community/slider";
import { Txt } from "@/src/components/ui";
import { useAppAlert } from "@/src/components/app-dialog";
import { useSession } from "@/src/context/session";
import { useBilling } from "../billing/billing-context";
import { useProgress } from "../progress/use-progress";
import { addDays, latestMetrics, localDate, METRICS, type Metric } from "../progress/model";
import { mutationId } from "../coaching/model";
import { useProCatalog } from "../pro/use-pro-catalog";
import { MUSCLES } from "../pro/analytics";
import { CompanionInsightsPanel } from "../pro/companion-insights-panel";
import { GlassCard, ProAction, ProButton, ProPill, ProScene, ProSection, PRO } from "../pro/ui";
import {
  type CompanionRecord,
  type Experiment,
  type Milestone,
  type MonthlyReport,
  type Readiness,
} from "./api";
import { useCompanion } from "./companion-context";
import { effectiveReadiness, milestoneProgress } from "./model";
import { TodayForYouCard } from "./today-card";
import { ReminderSettingsPanel } from "./reminders-panel";
import { FocusPanel } from "./focus-panel";
import { useGoalExercises } from "./use-goal-exercises";
import { readJournal } from "../progress/journal";
import { useWorkout } from "../workouts/workout-context";
import { useCoaching } from "../coaching/use-coaching";
import { useProgram } from "../program-follow/program-context";

const TABS = [
  "today",
  "readiness",
  "insights",
  "goals",
  "focus",
  "photos",
  "nutrition",
  "experiments",
  "reminders",
  "sharing",
  "reports",
  "desktop",
] as const;
type Tab = (typeof TABS)[number];
const labels: Record<Tab, string> = {
  today: "Today",
  readiness: "Check-in",
  insights: "Insights",
  goals: "Milestones",
  focus: "Muscle focus",
  photos: "Photos",
  nutrition: "Nutrition",
  experiments: "Experiments",
  reminders: "Reminders & devices",
  sharing: "Coach sharing",
  reports: "Reports",
  desktop: "Web workspace",
};
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  numeric?: boolean;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Txt className="mb-2 text-xs text-muted">{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "decimal-pad" : "default"}
        autoCapitalize="none"
        placeholder={placeholder}
        placeholderTextColor={PRO.muted}
        multiline={multiline}
        maxLength={multiline ? 2000 : 200}
        className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-poppins-regular text-sm text-white ${multiline ? "min-h-24" : "min-h-12"}`}
      />
    </View>
  );
}
export function Choices({
  values,
  value,
  onChange,
}: {
  values: { id: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="mb-4 flex-row flex-wrap gap-2">
      {values.map((item) => (
        <ProPill
          key={item.id}
          label={item.label}
          selected={value === item.id}
          onPress={() => onChange(item.id)}
        />
      ))}
    </View>
  );
}
function useAction() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function run(action: () => Promise<void>, success = "Saved and synced.") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save. Your input is kept.");
    } finally {
      setBusy(false);
    }
  }
  const feedback = (
    <>
      {!!error && (
        <Txt accessibilityRole="alert" className="my-3 text-xs leading-5 text-red-300">
          {error}
        </Txt>
      )}
      {!!notice && (
        <Txt
          accessibilityLiveRegion="polite"
          className="my-3 text-xs leading-5"
          style={{ color: PRO.accent }}
        >
          {notice}
        </Txt>
      )}
    </>
  );
  return { run, busy, feedback };
}
function number(value: string, label: string, min: number, max: number, integer = false) {
  const result = Number(value.replace(",", "."));
  if (
    !value.trim() ||
    !Number.isFinite(result) ||
    result < min ||
    result > max ||
    (integer && !Number.isInteger(result))
  )
    throw new Error(
      `${label}: enter ${integer ? "a whole number" : "a number"} from ${min} to ${max}.`,
    );
  return result;
}
function useProWrite() {
  const { isPro } = useBilling();
  return {
    isPro,
    guard: () => {
      if (!isPro) {
        router.push("/membership");
        return false;
      }
      return true;
    },
  };
}

export function CompanionScreen() {
  const { user } = useSession();
  return <AccountCompanionScreen key={user?.id ?? "signed-out"} />;
}
function AccountCompanionScreen() {
  const params = useLocalSearchParams<{ tab?: string; muscle?: string }>();
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "today";
  const setTab = (next: Tab) => router.setParams({ tab: next });
  const companion = useCompanion(),
    progress = useProgress();
  const coaching = useCoaching(),
    program = useProgram();
  const { user, settings } = useSession(),
    catalog = useProCatalog(user?.id ?? "");
  const { isPro } = useBilling();
  const today = localDate();
  const refreshCompanion = companion.refresh;
  useFocusEffect(
    useCallback(() => {
      void refreshCompanion();
    }, [refreshCompanion]),
  );
  const readyRecord = companion.state.records.find(
    (r) => r.kind === "readiness" && r.date === today,
  ) as CompanionRecord<"readiness"> | undefined;
  const ready = effectiveReadiness(readyRecord, progress.journal.events, today);
  const experiments = (
    companion.state.records.filter(
      (r) => r.kind === "experiment",
    ) as CompanionRecord<"experiment">[]
  )
    .filter((r) => r.data.compareStartDate && r.data.compareEndDate)
    .map((r) => ({
      id: r.id,
      title: r.data.title,
      metric: r.data.metric,
      measurement: r.data.measurement,
      exerciseId: r.data.exerciseId,
      hypothesis: r.data.hypothesis,
      baseline: { start: r.data.compareStartDate!, end: r.data.compareEndDate! },
      comparison: { start: r.data.startDate, end: r.data.endDate },
    }));
  return (
    <ProScene>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
        refreshControl={
          <RefreshControl
            refreshing={companion.loading}
            tintColor={PRO.accent}
            onRefresh={() => {
              void companion.refresh();
              void progress.refresh();
              void catalog.refresh();
            }}
          />
        }
      >
        <View className="mb-6 flex-row items-center justify-between">
          <ProPill
            label="‹ Back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/pro"))}
          />
          <Txt className="text-xs tracking-widest" style={{ color: PRO.accent }}>
            YOUR PRO COMPANION
          </Txt>
        </View>
        <Txt weight="medium" className="text-[34px] leading-[41px] tracking-[-1px]">
          A plan that knows you.
        </Txt>
        <Txt className="mb-6 mt-3 text-sm leading-6 text-muted">
          Your training, check-ins and goals, connected to the same history.
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          <View className="flex-row gap-2">
            {TABS.map((item) => (
              <ProPill
                key={item}
                label={labels[item]}
                selected={tab === item}
                onPress={() => setTab(item)}
              />
            ))}
          </View>
        </ScrollView>
        {companion.error && (
          <View className="mb-5">
            <ProAction
              icon="cloud-alert-outline"
              title="Companion sync needs attention"
              subtitle={`${companion.error} Your last loaded data is kept.`}
              onPress={() => void companion.refresh()}
            />
          </View>
        )}
        {!isPro && (
          <View className="mb-5">
            <ProAction
              icon="star-four-points"
              title="Personalise your training with Pro"
              subtitle="Your saved records, deletion, sharing controls and reports stay accessible."
              onPress={() => router.push("/membership")}
            />
          </View>
        )}
        {companion.loading && <ActivityIndicator className="mb-5" color={PRO.accent} />}
        {tab === "today" && (
          <>
            <TodayForYouCard />
            <View className="gap-3">
              <ProAction
                icon="chart-timeline-variant"
                title="Understand your progress"
                subtitle="Plateaus, training blocks and estimated recovery"
                onPress={() => setTab("insights")}
              />
              <ProAction
                icon="flag-checkered"
                title="One goal at a time"
                subtitle="Track a meaningful milestone from your real logs"
                onPress={() => setTab("goals")}
              />
              <ProAction
                icon="bell-outline"
                title="Make space for your next session"
                subtitle="Personal reminders, widgets and watch notification controls"
                onPress={() => setTab("reminders")}
              />
            </View>
          </>
        )}
        {tab === "readiness" && !companion.loading && (
          <ReadinessPanel key={today} record={readyRecord} />
        )}
        {tab === "insights" &&
          (isPro ? (
            <CompanionInsightsPanel
              workouts={progress.journal.workouts}
              metadata={catalog.items}
              events={progress.journal.events}
              today={today}
              unit={settings?.weightUnit ?? "kg"}
              readiness={{
                date: today,
                muscleSoreness: Object.fromEntries(
                  (ready.soreness ?? []).map((item) => [item.muscle, item.level]),
                ),
              }}
              experiments={experiments}
              replacementEvidence={companion.replacements ?? undefined}
              plannedDates={
                program.active?.enrollment.status === "active"
                  ? program.active.slots.map((slot) => slot.date)
                  : coaching.data?.plan?.sessions.map((day) => day.date)
              }
              onAddExperiment={() => setTab("experiments")}
              onSpecialise={(muscle) => {
                router.setParams({ muscle, tab: "focus" });
              }}
            />
          ) : (
            <GlassCard>
              <Txt className="text-sm leading-6">
                Pro turns completed logs into evidence-based comparisons. Record workouts first;
                missing data will stay visible.
              </Txt>
            </GlassCard>
          ))}
        {tab === "goals" && <GoalsPanel />}
        {tab === "focus" && <FocusPanel muscle={params.muscle} />}
        {tab === "photos" && <PhotosPanel />}
        {tab === "nutrition" && <NutritionPanel />}
        {tab === "experiments" && <ExperimentsPanel />}
        {tab === "reminders" && <ReminderSettingsPanel />}
        {tab === "sharing" && <SharingPanel />}
        {tab === "reports" && <ReportsPanel />}
        {tab === "desktop" && <DesktopWorkspacePanel />}
      </ScrollView>
    </ProScene>
  );
}

function ReadinessPanel({ record }: { record?: CompanionRecord<"readiness"> }) {
  const progress = useProgress(),
    companion = useCompanion(),
    action = useAction(),
    pro = useProWrite();
  const today = localDate(),
    initial = effectiveReadiness(record, progress.journal.events, today);
  const [sleepDraft, setSleep] = useState<string | null>(null),
    [energyDraft, setEnergy] = useState<string | null>(null),
    [minutes, setMinutes] = useState(initial.availableMinutes?.toString() ?? ""),
    [note, setNote] = useState(initial.note ?? "");
  const sleep = sleepDraft ?? initial.sleepHours?.toString() ?? "",
    energy = energyDraft ?? initial.energy?.toString() ?? "";
  const [baseRevision, setBaseRevision] = useState(record?.revision ?? 0);
  const [muscle, setMuscle] = useState<string>("chest"),
    [soreness, setSoreness] = useState<Record<string, number>>(
      Object.fromEntries((initial.soreness ?? []).map((item) => [item.muscle, item.level])),
    );
  return (
    <>
      <ProSection title="How does today feel?" eyebrow="Always optional" />
      <GlassCard>
        <Txt className="mb-5 text-sm leading-6 text-muted">
          Choose what you want to share. This helps you review possible changes; it does not measure
          recovery or alter your plan automatically.
        </Txt>
        <Txt className="mb-4 text-xs leading-5 text-muted">
          Leaving sleep or energy blank keeps any existing Progress reading for today. Correct or
          remove an existing reading from Progress.
        </Txt>
        <Field label="Sleep · hours (optional)" value={sleep} onChange={setSleep} numeric />
        <Txt className="mb-2 text-xs text-muted">Energy · optional</Txt>
        <Choices
          values={[
            { id: "", label: "Skip" },
            ...[1, 2, 3, 4, 5].map((v) => ({ id: String(v), label: `${v}/5` })),
          ]}
          value={energy}
          onChange={setEnergy}
        />
        <Field
          label="Available time · minutes (optional)"
          value={minutes}
          onChange={setMinutes}
          numeric
        />
        <Txt className="mb-2 text-xs text-muted">
          Muscle soreness · choose a group, then a rating
        </Txt>
        <Choices
          values={MUSCLES.map((code) => ({ id: code, label: code.replace(/-/g, " ") }))}
          value={muscle}
          onChange={setMuscle}
        />
        <Choices
          values={[
            { id: "", label: "Unrecorded" },
            ...[0, 1, 2, 3, 4, 5].map((v) => ({
              id: String(v),
              label: v === 0 ? "0 · none" : String(v),
            })),
          ]}
          value={soreness[muscle]?.toString() ?? ""}
          onChange={(v) =>
            setSoreness((current) => {
              const copy = { ...current };
              if (v === "") delete copy[muscle];
              else copy[muscle] = Number(v);
              return copy;
            })
          }
        />
        <Field
          label="Private check-in note (optional)"
          value={note}
          onChange={(value) => setNote(value.slice(0, 500))}
          multiline
        />
        {action.feedback}
        <ProButton
          title="Save today’s check-in"
          loading={action.busy}
          disabled={companion.busy || progress.loading}
          onPress={() => {
            if (!pro.guard()) return;
            void action.run(async () => {
              const data: Readiness = {
                ...(sleep.trim() ? { sleepHours: number(sleep, "Sleep", 0, 24) } : {}),
                ...(energy ? { energy: Number(energy) } : {}),
                ...(minutes.trim()
                  ? { availableMinutes: number(minutes, "Available minutes", 5, 240, true) }
                  : {}),
                ...(Object.keys(soreness).length
                  ? {
                      soreness: Object.entries(soreness).map(([muscle, level]) => ({
                        muscle,
                        level,
                      })),
                    }
                  : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
              };
              if (!Object.keys(data).length) throw new Error("Add at least one check-in value.");
              const saved = await companion.save(
                record?.id ?? `readiness_${today}`,
                "readiness",
                data,
                today,
                baseRevision,
              );
              setBaseRevision(saved.revision);
              // The server saves shared health metrics in the same transaction as this check-in.
              await progress.refresh();
            }, "Check-in saved with your shared sleep and energy readings. Refresh Progress if this phone is still reconnecting.");
          }}
        />
        <ProButton title="Reload saved check-in (replace input)" secondary disabled={action.busy || companion.busy} onPress={() => { setSleep(null); setEnergy(null); setMinutes(initial.availableMinutes?.toString() ?? ""); setNote(initial.note ?? ""); setSoreness(Object.fromEntries((initial.soreness ?? []).map(item => [item.muscle, item.level]))); setBaseRevision(record?.revision ?? 0); }} />
      </GlassCard>
    </>
  );
}

function GoalsPanel() {
  const companion = useCompanion(),
    progress = useProgress(),
    pro = useProWrite(),
    action = useAction();
  const goals = companion.state.records.filter(
    (r) => r.kind === "goal",
  ) as CompanionRecord<"goal">[];
  const [editing, setEditing] = useState<CompanionRecord<"goal"> | null>(null),
    [kind, setKind] = useState<Milestone["type"]>("consistency"),
    [title, setTitle] = useState(""),
    [target, setTarget] = useState("3"),
    [baseline, setBaseline] = useState(""),
    [deadline, setDeadline] = useState(""),
    [exercise, setExercise] = useState(""),
    [query, setQuery] = useState(""),
    [metric, setMetric] = useState<Metric>("weight");
  const catalog = useGoalExercises(query);
  const today = localDate();
  function edit(record: CompanionRecord<"goal">) {
    const g = record.data;
    setEditing(record);
    setKind(g.type);
    setTitle(g.title);
    setTarget(String(g.target));
    setBaseline(g.baseline?.toString() ?? "");
    setDeadline(g.deadline ?? "");
    setExercise(g.exerciseId ?? "");
    setMetric((g.metric as Metric) ?? "weight");
  }
  return (
    <>
      <ProSection title="Give progress a direction." eyebrow="Your milestones" />
      <View className="gap-4">
        {goals.map((record) => {
          const g = record.data,
            value = milestoneProgress(g, progress.journal.workouts, progress.journal.events, today);
          return (
            <GlassCard key={record.id}>
              <Txt weight="medium" className="text-lg">
                {g.title}
              </Txt>
              <Txt className="my-3 text-[25px]">
                {value.current == null
                  ? "—"
                  : value.current.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                / {g.target} <Txt className="text-sm text-muted">{g.unit}</Txt>
              </Txt>
              <Txt className="text-xs leading-5 text-muted">
                {value.evidence}
                {g.deadline ? ` Deadline: ${g.deadline}.` : ""}
                {value.achieved
                  ? " Target reached."
                  : value.overdue
                    ? " You can edit the deadline."
                    : ""}
              </Txt>
              <View className="mt-3 flex-row gap-2">
                <ProPill
                  label="Edit goal"
                  onPress={() => {
                    if (pro.guard()) edit(record);
                  }}
                />
                <DeleteRecord record={record} />
              </View>
            </GlassCard>
          );
        })}
      </View>
      <ProSection title={editing ? "Update your milestone" : "Create a milestone"} />
      <GlassCard>
        <Choices
          values={[
            { id: "consistency", label: "Weekly consistency" },
            { id: "strength", label: "Strength" },
            { id: "measurement", label: "Measurement" },
          ]}
          value={kind}
          onChange={(v) => setKind(v as Milestone["type"])}
        />
        <Field
          label="Milestone name"
          value={title}
          onChange={setTitle}
          placeholder="Show up three times each week"
        />
        {kind === "strength" && (
          <>
            <Txt className="mb-2 text-xs text-muted">
              Strength uses completed external load in kg.
            </Txt>
            <Field label="Find your exercise" value={query} onChange={setQuery} />
            <Choices
              values={catalog.items
                .filter(
                  (item) =>
                    item.trackingType === "reps_weight" &&
                    (!query || item.name.toLowerCase().includes(query.toLowerCase())),
                )
                .map((item) => ({ id: item.id, label: item.name }))}
              value={exercise}
              onChange={setExercise}
            />
            {exercise && (
              <Txt className="mb-3 text-xs" style={{ color: PRO.accent }}>
                {catalog.items.find((e) => e.id === exercise)?.name ?? "Selected exercise"}
              </Txt>
            )}
            {catalog.hasMore && (
              <ProButton
                title="Load more exercises"
                secondary
                onPress={() => void catalog.more()}
              />
            )}
            {!!catalog.error && (
              <Txt accessibilityRole="alert" className="mb-3 text-xs text-red-300">
                {catalog.error}
              </Txt>
            )}
          </>
        )}
        {kind === "measurement" && (
          <Choices
            values={Object.entries(METRICS).map(([id, spec]) => ({ id, label: spec.label }))}
            value={metric}
            onChange={(v) => setMetric(v as Metric)}
          />
        )}
        <Field
          label={`Target · ${kind === "strength" ? "kg" : kind === "consistency" ? "sessions in rolling 7 days" : METRICS[metric].unit}`}
          value={target}
          onChange={setTarget}
          numeric
        />
        <Field
          label="Starting value · measurements use your current reading if left blank"
          value={baseline}
          onChange={setBaseline}
          numeric
        />
        <Field label="Deadline · optional YYYY-MM-DD" value={deadline} onChange={setDeadline} />
        {action.feedback}
        <ProButton
          title={editing ? "Save milestone changes" : "Create milestone"}
          loading={action.busy}
          onPress={() => {
            if (!pro.guard()) return;
            void action.run(async () => {
              const startingValue = baseline.trim()
                ? number(baseline, "Starting value", 0, 1000000)
                : kind === "measurement"
                  ? latestMetrics(progress.journal.events)
                      .filter((e) => e.metric === metric && e.date <= today)
                      .at(-1)?.value
                  : undefined;
              if (kind === "measurement" && startingValue == null)
                throw new Error(
                  "Add a starting value or record this measurement in Progress first, so your goal has a clear direction.",
                );
              const data: Milestone = {
                type: kind,
                title,
                target: number(target, "Target", 0.01, 1000000, kind === "consistency"),
                unit:
                  kind === "strength"
                    ? "kg"
                    : kind === "consistency"
                      ? "sessions / 7 days"
                      : METRICS[metric].unit,
                ...(exercise && kind === "strength" ? { exerciseId: exercise } : {}),
                ...(kind === "measurement" ? { metric } : {}),
                ...(deadline ? { deadline } : {}),
                ...(startingValue != null ? { baseline: startingValue } : {}),
              };
              await companion.save(
                editing?.id ?? mutationId(),
                "goal",
                data,
                undefined,
                editing?.revision ?? 0,
              );
              setEditing(null);
              setTitle("");
            });
          }}
        />
        {editing && (
          <ProButton
            title="Cancel editing"
            secondary
            onPress={() => {
              setEditing(null);
              setTitle("");
            }}
          />
        )}
      </GlassCard>
    </>
  );
}
function DeleteRecord({ record }: { record: CompanionRecord }) {
  const companion = useCompanion(),
    { alert } = useAppAlert();
  return (
    <ProPill
      label="Delete"
      onPress={() =>
        alert(
          "Delete this record?",
          "This removes this saved companion record across your devices. Your workout history stays available.",
          [
            { text: "Keep", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => {
                void companion.run(() => companion.api.remove(record)).catch(() => {});
              },
            },
          ],
        )
      }
    />
  );
}

function useClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
function PhotosPanel() {
  const now = useClock();
  const companion = useCompanion(),
    pro = useProWrite(),
    action = useAction(),
    { alert } = useAppAlert();
  const [date, setDate] = useState(localDate()),
    [view, setView] = useState<"front" | "side" | "back">("front"),
    [caption, setCaption] = useState(""),
    [crop, setCrop] = useState(true),
    [selected, setSelected] = useState<string[]>([]),
    [opacity, setOpacity] = useState(0.5);
  const photos = companion.state.photos.filter((p) => p.view === view),
    pair = selected.map((id) => photos.find((photo) => photo.id === id)).filter((p) => !!p);
  const expired = pair.some((p) => Date.parse(p.urlExpiresAt) <= now);
  async function upload() {
    if (!pro.guard()) return;
    await action.run(async () => {
      const image = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: crop,
        aspect: [3, 4],
        quality: 0.65,
        exif: false,
      });
      if (image.canceled) return;
      const asset = image.assets[0];
      if ((asset.fileSize ?? 0) > 3 * 1024 * 1024)
        throw new Error("Choose or crop a photo under 3 MB.");
      const form = new FormData();
      form.append("image", {
        uri: asset.uri,
        type: asset.mimeType ?? "image/jpeg",
        name: asset.fileName ?? "progress.jpg",
      } as unknown as Blob);
      form.append("date", date);
      form.append("view", view);
      form.append("caption", caption);
      await companion.run(() => companion.api.uploadPhoto(form));
      setCaption("");
    }, "Photo upload finished. Refresh to renew an expired private link.");
  }
  return (
    <>
      <ProSection title="A private view of your progress." eyebrow="Your photo journal" />
      <GlassCard>
        <Txt className="mb-4 text-sm leading-6 text-muted">
          Photos are stored privately. Only short-lived links open them. Crop your face or
          identifying details before uploading if you prefer. Photos are excluded from coach sharing
          and reports.
        </Txt>
        <Choices
          values={["front", "side", "back"].map((id) => ({ id, label: id }))}
          value={view}
          onChange={(v) => {
            setView(v as typeof view);
            setSelected([]);
          }}
        />
        <Field label="Photo date · YYYY-MM-DD" value={date} onChange={setDate} />
        <Field
          label="Caption · optional"
          value={caption}
          onChange={(v) => setCaption(v.slice(0, 300))}
        />
        <View className="mb-4 flex-row items-center justify-between">
          <Txt className="flex-1 text-sm">Open crop tool before upload</Txt>
          <Switch accessibilityLabel="Crop before upload" value={crop} onValueChange={setCrop} />
        </View>
        {action.feedback}
        <ProButton
          title="Choose a private photo"
          onPress={() => void upload()}
          loading={action.busy}
        />
      </GlassCard>
      {pair.length === 2 && (
        <View className="mt-5">
          <GlassCard>
            <Txt weight="medium">Aligned comparison · {view}</Txt>
            <Txt className="my-2 text-xs text-muted">
              {pair[0].date} ↔ {pair[1].date} · matching frames, without body reshaping
            </Txt>
            <View
              style={{
                aspectRatio: 3 / 4,
                backgroundColor: "#000",
                borderRadius: 18,
                overflow: "hidden",
              }}
            >
              {pair.map((photo, i) => (
                <Image
                  key={photo.id}
                  accessibilityLabel={`Progress photo ${photo.date}`}
                  source={{ uri: photo.url }}
                  resizeMode="contain"
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: i ? opacity : 1,
                  }}
                  onError={() => {
                    void companion.refresh();
                  }}
                />
              ))}
            </View>
            <Slider
              accessibilityLabel="Blend comparison photos"
              value={opacity}
              onValueChange={setOpacity}
              minimumValue={0}
              maximumValue={1}
              minimumTrackTintColor={PRO.accent}
              thumbTintColor={PRO.accent}
            />
            {expired && (
              <ProButton
                title="Refresh private image links"
                secondary
                onPress={() => void companion.refresh()}
              />
            )}
          </GlassCard>
        </View>
      )}
      <ProSection title="Saved photos" eyebrow="Choose two of the same view to compare" />
      <View className="gap-3">
        {!photos.length && <Txt className="text-sm text-muted">No {view} photos saved yet.</Txt>}
        {photos.map((photo) => (
          <GlassCard key={photo.id}>
            <View className="flex-row gap-4">
              <Image
                source={{ uri: photo.url }}
                accessibilityLabel={`${photo.view} progress photo ${photo.date}`}
                resizeMode="cover"
                style={{ width: 76, height: 100, borderRadius: 14 }}
              />
              <View className="flex-1">
                <Txt weight="medium">{photo.date}</Txt>
                <Txt className="mt-1 text-xs leading-5 text-muted">
                  {photo.caption || photo.view}
                </Txt>
                <View className="mt-3 flex-row flex-wrap gap-2">
                  <ProPill
                    label={selected.includes(photo.id) ? "Selected ✓" : "Compare"}
                    selected={selected.includes(photo.id)}
                    onPress={() =>
                      setSelected((ids) =>
                        ids.includes(photo.id)
                          ? ids.filter((id) => id !== photo.id)
                          : [...ids.slice(-1), photo.id],
                      )
                    }
                  />
                  <ProPill
                    label="Delete"
                    onPress={() =>
                      alert(
                        "Delete this private photo?",
                        "This deletes the stored photo and its journal entry. Any issued link expires shortly.",
                        [
                          { text: "Keep", style: "cancel" },
                          {
                            text: "Delete photo",
                            style: "destructive",
                            onPress: () => {
                              void action.run(async () => {
                                await companion.run(() => companion.api.deletePhoto(photo.id));
                                setSelected((ids) => ids.filter((id) => id !== photo.id));
                              }, "Photo deleted.");
                            },
                          },
                        ],
                      )
                    }
                  />
                </View>
              </View>
            </View>
          </GlassCard>
        ))}
      </View>
    </>
  );
}

function NutritionPanel() {
  const progress = useProgress(),
    action = useAction();
  const [date, setDate] = useState(localDate());
  const existing = latestMetrics(progress.journal.events).filter((event) => event.date === date);
  const [values, setValues] = useState<Record<string, string>>({});
  const metrics: Metric[] = [
    "caloriesIn",
    "protein",
    "carbs",
    "fat",
    "water",
    "fiber",
    "sugar",
    "sodium",
  ];
  return (
    <>
      <ProSection title="Nutrition at your pace." eyebrow="Optional daily totals" />
      <GlassCard>
        <Txt className="mb-4 text-sm leading-6 text-muted">
          These are the same daily totals shown in Progress. Leave a field untouched to keep its
          existing value. No prescribed calorie target or food logging requirement.
        </Txt>
        <Field
          label="Nutrition date · YYYY-MM-DD"
          value={date}
          onChange={(value) => {
            setDate(value);
            setValues({});
          }}
        />
        {metrics.map((metric) => (
          <Field
            key={metric}
            label={`${METRICS[metric].label} · ${METRICS[metric].unit}`}
            value={
              values[metric] ?? existing.find((e) => e.metric === metric)?.value?.toString() ?? ""
            }
            onChange={(value) => setValues((current) => ({ ...current, [metric]: value }))}
            numeric
          />
        ))}
        {action.feedback}
        <ProButton
          title="Save changed daily totals"
          loading={action.busy}
          disabled={progress.loading}
          onPress={() =>
            void action.run(async () => {
              if (
                !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
                Number.isNaN(Date.parse(`${date}T12:00:00Z`)) ||
                new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
              )
                throw new Error("Use a valid YYYY-MM-DD date.");
              const changed = Object.entries(values);
              if (!changed.length) throw new Error("Change at least one daily total.");
              const validated = changed.map(([key, value]) => {
                const metric = key as Metric;
                return {
                  metric,
                  value: value.trim()
                    ? number(value, METRICS[metric].label, METRICS[metric].min, METRICS[metric].max)
                    : null,
                };
              });
              for (const entry of validated) {
                await progress.log(entry.metric, date, entry.value, "Daily nutrition total");
              }
              setValues({});
            }, "Daily totals saved to your progress journal and queued for cloud sync.")
          }
        />
        <View className="mt-3">
          <ProButton
            title="Open meal planning & saved meals"
            secondary
            onPress={() => router.push("/wellness")}
          />
        </View>
      </GlassCard>
    </>
  );
}

function ExperimentsPanel() {
  const companion = useCompanion(),
    action = useAction(),
    pro = useProWrite();
  const [title, setTitle] = useState(""),
    [hypothesis, setHypothesis] = useState(""),
    [start, setStart] = useState(localDate()),
    [end, setEnd] = useState(addDays(localDate(), 27)),
    [baseStart, setBaseStart] = useState(addDays(localDate(), -28)),
    [baseEnd, setBaseEnd] = useState(addDays(localDate(), -1)),
    [metric, setMetric] = useState<Experiment["metric"]>("sessions"),
    [measurement, setMeasurement] = useState<Metric>("weight"),
    [notes, setNotes] = useState("");
  const experiments = companion.state.records.filter(
    (r) => r.kind === "experiment",
  ) as CompanionRecord<"experiment">[];
  return (
    <>
      <ProSection title="Learn from your own training." eyebrow="Personal experiments" />
      <GlassCard>
        <Txt className="mb-5 text-sm leading-6 text-muted">
          Record one change and compare two blocks. Results are observations; they cannot establish
          that your change caused an outcome.
        </Txt>
        <Field label="Experiment name" value={title} onChange={setTitle} />
        <Field
          label="What are you trying?"
          value={hypothesis}
          onChange={(value) => setHypothesis(value.slice(0, 500))}
          multiline
        />
        <Choices
          values={[
            { id: "sessions", label: "Consistency" },
            { id: "volume", label: "Volume" },
            { id: "strength", label: "Strength" },
            { id: "measurement", label: "Measurement" },
          ]}
          value={metric}
          onChange={(value) => setMetric(value as Experiment["metric"])}
        />
        {metric === "measurement" && (
          <Choices
            values={Object.entries(METRICS).map(([id, spec]) => ({ id, label: spec.label }))}
            value={measurement}
            onChange={(v) => setMeasurement(v as Metric)}
          />
        )}
        <Field label="Experiment starts · YYYY-MM-DD" value={start} onChange={setStart} />
        <Field label="Experiment ends · YYYY-MM-DD" value={end} onChange={setEnd} />
        <Field
          label="Earlier comparison starts · YYYY-MM-DD"
          value={baseStart}
          onChange={setBaseStart}
        />
        <Field label="Earlier comparison ends · YYYY-MM-DD" value={baseEnd} onChange={setBaseEnd} />
        <Field
          label="Notes & possible confounding factors"
          value={notes}
          onChange={setNotes}
          multiline
        />
        {action.feedback}
        <ProButton
          title="Save experiment"
          loading={action.busy}
          onPress={() => {
            if (!pro.guard()) return;
            void action.run(async () => {
              await companion.save(mutationId(), "experiment", {
                title,
                hypothesis,
                startDate: start,
                endDate: end,
                compareStartDate: baseStart,
                compareEndDate: baseEnd,
                metric,
                ...(metric === "measurement" ? { measurement } : {}),
                notes,
              });
              setTitle("");
              setHypothesis("");
            });
          }}
        />
      </GlassCard>
      <ProSection title="Your experiments" />
      <View className="gap-3">
        {experiments.map((record) => (
          <GlassCard key={record.id}>
            <Txt weight="medium" className="text-lg">
              {record.data.title}
            </Txt>
            <Txt className="my-3 text-xs leading-5 text-muted">
              {record.data.hypothesis}
              {`\n`}
              {record.data.startDate} → {record.data.endDate}
              {`\n`}
              {record.data.notes}
            </Txt>
            <ProAction
              icon="chart-box-outline"
              title="Compare recorded blocks"
              subtitle="Open Insights to view this experiment’s evidence and missing data"
              onPress={() => router.setParams({ tab: "insights" })}
            />
            <View className="mt-3">
              <DeleteRecord record={record} />
            </View>
          </GlassCard>
        ))}
      </View>
    </>
  );
}

function SharingPanel() {
  const now = useClock();
  const companion = useCompanion(),
    action = useAction(),
    pro = useProWrite();
  const [label, setLabel] = useState("My coach"),
    [days, setDays] = useState("7"),
    [fields, setFields] = useState<("workouts" | "plan")[]>(["workouts"]),
    [link, setLink] = useState("");
  const webBase = process.env.EXPO_PUBLIC_WEB_URL?.replace(/\/$/, "");
  return (
    <>
      <ProSection title="Share only what you choose." eyebrow="Revocable coach access" />
      <GlassCard>
        <Txt className="mb-5 text-sm leading-6 text-muted">
          A private link lets its holder read the selected training information until expiry or
          revocation. Keep the link private. Photos, check-in notes, nutrition and body measurements
          are excluded.
        </Txt>
        <Field label="Who is this access for?" value={label} onChange={setLabel} />
        <View className="mb-4 gap-3">
          {(["workouts", "plan"] as const).map((field) => (
            <View key={field} className="flex-row items-center justify-between">
              <Txt className="text-sm">
                {field === "workouts" ? "Completed workout summaries" : "Current training plan"}
              </Txt>
              <Switch
                accessibilityLabel={`Share ${field}`}
                value={fields.includes(field)}
                onValueChange={(enabled) =>
                  setFields((current) =>
                    enabled ? [...current, field] : current.filter((value) => value !== field),
                  )
                }
              />
            </View>
          ))}
        </View>
        <Field label="Access expires after · days (1–30)" value={days} onChange={setDays} numeric />
        {!webBase && (
          <Txt className="mb-3 text-xs leading-5 text-muted">
            New coach links are unavailable in this build. You can still review and revoke existing
            access.
          </Txt>
        )}
        {action.feedback}
        <ProButton
          title="Create private coach link"
          loading={action.busy}
          disabled={!webBase}
          onPress={() => {
            if (!pro.guard()) return;
            void action.run(async () => {
              if (!webBase || !/^https:\/\//.test(webBase))
                throw new Error("A secure public web address is required.");
              const result = await companion.run(() =>
                companion.api.share({
                  label,
                  fields,
                  expiresInDays: number(days, "Expiry", 1, 30, true),
                }),
              );
              setLink(`${webBase}/shared/${result.token}`);
            }, "Private link created. Save or share it now; its token is only shown once.");
          }}
        />
        {link && (
          <View className="mt-4">
            <Txt selectable className="mb-3 text-xs leading-5">
              {link}
            </Txt>
            <ProButton
              title="Share this private link"
              secondary
              onPress={() => void Share.share({ message: link })}
            />
            <ProButton title="Hide link" secondary onPress={() => setLink("")} />
          </View>
        )}
      </GlassCard>
      <ProSection title="Access you have granted" />
      <View className="gap-3">
        {companion.state.shares.map((share) => (
          <GlassCard key={share.id}>
            <Txt weight="medium">{share.label}</Txt>
            <Txt className="my-2 text-xs leading-5 text-muted">
              {share.fields.join(" + ")} ·{" "}
              {share.revokedAt
                ? "revoked"
                : Date.parse(share.expiresAt) <= now
                  ? "expired"
                  : `expires ${share.expiresAt.slice(0, 10)}`}
            </Txt>
            {!share.revokedAt && (
              <ProButton
                title="Revoke access now"
                secondary
                loading={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    await companion.run(() => companion.api.revoke(share.id));
                    setLink("");
                  }, "Access revoked.")
                }
              />
            )}
          </GlassCard>
        ))}
      </View>
    </>
  );
}

function DesktopWorkspacePanel() {
  const action = useAction();
  const origin = (() => { try { const url = new URL(process.env.EXPO_PUBLIC_WEB_URL ?? ""); return url.protocol === "https:" ? url.origin : null; } catch { return null; } })();
  return <><ProSection eyebrow="The same FitSync account" title="A little more room to plan." /><GlassCard><Txt className="mb-5 text-sm leading-6 text-muted">Open your training workspace in a browser. Preview a plan, edit your personal routines, manage coach access and download monthly reports. Sign in with the same account to use the training you see here.</Txt><ProButton title="Open FitSync web workspace" disabled={!origin} loading={action.busy} onPress={() => void action.run(async () => { if (origin) await Linking.openURL(`${origin}/user/planner`); }, "")} />{!origin && <Txt className="mt-3 text-xs leading-5 text-muted">The web workspace link is unavailable in this build.</Txt>}{action.feedback}</GlassCard></>;
}
function ReportsPanel() {
  const companion = useCompanion(),
    progress = useProgress(),
    action = useAction(),
    workout = useWorkout();
  const { user } = useSession();
  const [month, setMonth] = useState(localDate().slice(0, 7)),
    [report, setReport] = useState<MonthlyReport | null>(null);
  return (
    <>
      <ProSection title="Your month, in perspective." eyebrow="Downloadable reports" />
      <GlassCard>
        <Txt className="mb-5 text-sm leading-6 text-muted">
          Generate a report from your synced workouts and latest measurement entries. Refresh first
          to upload pending journal entries. Private photos and check-in notes are excluded.
        </Txt>
        <Field
          label="Report month · YYYY-MM"
          value={month}
          onChange={(value) => {
            setMonth(value);
            setReport(null);
          }}
        />
        {action.feedback}
        <ProButton
          title="Generate monthly report"
          loading={action.busy}
          onPress={() =>
            void action.run(async () => {
              if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
                throw new Error("Use YYYY-MM, for example 2026-11.");
              await workout.ensureSynced();
              await progress.refresh();
              if (!user || (await readJournal(user.id)).pending.length)
                throw new Error(
                  "Some progress entries still need to sync. Reconnect and refresh before generating the report.",
                );
              setReport(await companion.api.report(month));
            }, "Report generated from the server’s saved records.")
          }
        />
        {report && (
          <View className="mt-5">
            <Txt selectable className="text-sm leading-6">
              {report.text}
            </Txt>
            <View className="mt-5">
              <ProButton
                title="Share or save report text"
                onPress={() =>
                  void Share.share({ title: `FitSync ${report.month}`, message: report.text })
                }
              />
            </View>
          </View>
        )}
      </GlassCard>
    </>
  );
}
