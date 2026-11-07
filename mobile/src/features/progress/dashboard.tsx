import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, RefreshControl, ScrollView, Share, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { MotionPressable, ScreenEntrance } from "@/src/components/motion";
import { useSession } from "@/src/context/session";
import { Txt } from "@/src/components/ui";
import { C } from "@/src/constants/theme";
import { useProgress } from "./use-progress";
import { addDays, dateLabel, latestMetrics, localDate, METRICS, METRIC_GROUPS, weightValue, type Metric, type MetricGroup, type ProgressWorkout } from "./model";
import { buildProgress, metricSeries, workoutDate, summary } from "./analytics";
import { GoalsEditor, MetricEditor, Sheet } from "./editors";
import { StrengthSection } from "./strength";
import { ConsistencySection } from "./consistency";
import { MetricDetail } from "./metric-detail";
import { WalkCounter } from "./walk-counter";
import { Icon, IconButton, PanelCard, SectionTitle, SmallButton } from "./visuals";
import { DailyMetricGrid, MetricList, TrainingHero, TrainingStats, WeightCard, compact, displayMetric, displayUnit } from "./tracking-cards";
import { PlusPreview } from "./plus";

type ProgressView = "overview" | "health" | "history";
const VIEWS = [{ id: "overview", label: "Overview" }, { id: "health", label: "Health" }, { id: "history", label: "History" }] as const;
const PERIODS = [7, 30, 90, 365];

function WorkoutRows({ workouts, unit, onOpen }: { workouts: ProgressWorkout[]; unit: "kg" | "lb"; onOpen: (id: string) => void }) {
  return <View style={{ gap: 10 }}>{workouts.map(workout => {
    const stats = summary([workout]); const date = workoutDate(workout);
    return <MotionPressable key={workout.id} accessibilityRole="button" onPress={() => onOpen(workout.id)} className="flex-row items-center gap-3 rounded-[22px] bg-panel p-4">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-elevated"><Txt weight="bold" className="text-lg text-brand">{Number(date.slice(-2))}</Txt><Txt className="text-[11px] text-muted">{dateLabel(date, { month: "short" })}</Txt></View>
      <View className="flex-1"><Txt weight="semibold" className="text-[15px]" numberOfLines={1}>{workout.name}</Txt><Txt className="mt-1 text-xs text-muted">{stats.minutes} min · {stats.sets} sets</Txt><Txt className="mt-1 text-[11px] text-muted">{compact(weightValue(stats.volume, unit))} {unit} volume</Txt></View><Icon name="chevron-right" color={C.muted} size={20} />
    </MotionPressable>;
  })}</View>;
}

export function ProgressDashboard() {
  const router = useRouter();
  const { settings } = useSession();
  const progress = useProgress();
  const { journal, goals } = progress;
  const unit = settings?.weightUnit ?? "kg";
  const today = localDate();
  const scroll = useRef<ScrollView>(null);
  const [view, setView] = useState<ProgressView>("overview");
  const [group, setGroup] = useState<MetricGroup>("activity");
  const [days, setDays] = useState(30);
  const [selectedDate, setSelectedDate] = useState(today);
  const [metricSearch, setMetricSearch] = useState("");
  const [detailMetric, setDetailMetric] = useState<Metric | null>(null);
  const [editor, setEditor] = useState<{ metric: Metric; date: string } | null>(null);
  const [goalEditor, setGoalEditor] = useState(false);
  const [trainingDetails, setTrainingDetails] = useState(false);
  const [dateEditor, setDateEditor] = useState(false);
  const [dateInput, setDateInput] = useState(today);
  const [dateError, setDateError] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [historyDayOnly, setHistoryDayOnly] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(15);
  const [workoutLimit, setWorkoutLimit] = useState(5);
  const [waterBusy, setWaterBusy] = useState(false);
  const [walkDraft, setWalkDraft] = useState({ count: 0, date: today });
  const savingWalk = useRef(false);
  const data = useMemo(() => buildProgress(journal.workouts, journal.events, days, today, goals.weeklyWorkouts), [journal.workouts, journal.events, days, today, goals.weeklyWorkouts]);
  const metrics = useMemo(() => latestMetrics(journal.events), [journal.events]);
  const daily = (metric: Metric) => metrics.find(entry => entry.metric === metric && entry.date === selectedDate)?.value ?? null;
  const weights = metricSeries(journal.events, "weight", data.start, today);
  const latestWeight = metrics.filter(entry => entry.metric === "weight" && entry.date <= today).at(-1);
  const completed = [...journal.workouts].filter(workout => workout.status === "completed" && workout.finished_at && workoutDate(workout) <= today).sort((a, b) => b.finished_at!.localeCompare(a.finished_at!));
  const dailyWorkouts = completed.filter(workout => workoutDate(workout) === selectedDate);
  const historyWorkouts = historyDayOnly ? dailyWorkouts : completed;
  const history = [...metrics].reverse().filter(entry => entry.date <= today && (!historyDayOnly || entry.date === selectedDate) && `${METRICS[entry.metric].label} ${entry.notes}`.toLowerCase().includes(historySearch.trim().toLowerCase()));
  const visibleMetrics = metricSearch.trim() ? (Object.keys(METRICS) as Metric[]).filter(metric => METRICS[metric].label.toLowerCase().includes(metricSearch.trim().toLowerCase())) : METRIC_GROUPS[group].metrics;
  const syncIssue = progress.storageError || progress.workoutError || progress.syncError;
  const canLog = !progress.loading && !progress.storageError;
  const metricProps = { daily, goals, unit, onLog: (metric: Metric) => setEditor({ metric, date: selectedDate }), onDetail: setDetailMetric };
  const dateTitle = selectedDate === today ? "Today" : dateLabel(selectedDate, { month: "short", day: "numeric", year: "numeric" });

  function navigate(next: ProgressView) { setView(next); scroll.current?.scrollTo({ y: 0, animated: false }); }
  function chooseDate() { setDateInput(selectedDate); setDateError(""); setDateEditor(true); }
  function openWorkout(id: string) { router.push({ pathname: "/workout/history/[id]", params: { id } }); }
  async function saveLog(metric: Metric, date: string, value: number | null, notes: string) {
    await progress.log(metric, date, value, notes);
    setSelectedDate(date); setMessageError(false);
    setMessage(value === null ? "Check-in cleared." : `${METRICS[metric].label} saved.`);
  }
  async function addWater() {
    if (waterBusy) return;
    setWaterBusy(true); setMessageError(false);
    try { await progress.increment("water", selectedDate, 250, "Added 250 ml of water."); setMessage("250 ml added to your water total."); }
    catch (error) { setMessageError(true); setMessage(error instanceof Error ? error.message : "Could not save water."); }
    finally { setWaterBusy(false); }
  }
  async function saveWalk(count: number, date: string) {
    if (savingWalk.current) throw new Error("This walk is already being saved.");
    savingWalk.current = true;
    try {
      await progress.increment("steps", date, count, `Includes a saved foreground walk of ${count} steps.`, "pedometer");
      setWalkDraft({ count: 0, date }); setSelectedDate(date); setMessageError(false); setMessage("Walk added to your daily steps.");
    } finally { savingWalk.current = false; }
  }
  async function exportData() {
    try { await Share.share({ title: "FitSync progress journal", message: JSON.stringify({ exportedAt: new Date().toISOString(), units: { weight: "kg", workoutDistance: "meters", walkingRunningDistance: "km", calories: "kcal", water: "ml", bodyMeasurements: "cm" }, goals, healthJournal: journal.events, completedWorkouts: journal.workouts }, null, 2) }); }
    catch (error) { Alert.alert("Could not export", error instanceof Error ? error.message : "Try again."); }
  }
  const dayPicker = <View className="mb-4 flex-row items-center gap-2">
    <IconButton icon="chevron-left" label="Previous check-in day" onPress={() => setSelectedDate(addDays(selectedDate, -1))} />
    <MotionPressable accessibilityRole="button" accessibilityLabel="Choose check-in date" onPress={chooseDate} className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-panel px-3"><Icon name="calendar-blank-outline" size={17} color={C.muted} /><Txt weight="medium" className="text-sm">{dateTitle}</Txt><Icon name="chevron-down" size={16} color={C.muted} /></MotionPressable>
    <IconButton icon="chevron-right" label="Next check-in day" disabled={selectedDate >= today} onPress={() => setSelectedDate(addDays(selectedDate, 1))} />
    {selectedDate !== today && <MotionPressable accessibilityRole="button" onPress={() => setSelectedDate(today)} className="min-h-11 justify-center px-2"><Txt weight="medium" className="text-xs text-brand">Today</Txt></MotionPressable>}
  </View>;

  return <ScreenEntrance style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={progress.refreshing && !progress.loading} onRefresh={() => void progress.refresh()} tintColor={C.brand} />} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 26, paddingBottom: 160, width: "100%", maxWidth: 760, alignSelf: "center" }}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1"><Txt className="text-sm text-muted">{dateLabel(today, { weekday: "long", day: "numeric", month: "long" })}</Txt><Txt accessibilityRole="header" weight="semibold" className="mt-1 text-[36px] tracking-tight">Progress</Txt></View>
        <IconButton icon="tune-variant" label="Edit progress goals" onPress={() => setGoalEditor(true)} />
        <MotionPressable accessibilityRole="button" accessibilityLabel="Log a health check-in" disabled={!canLog} onPress={() => setEditor({ metric: "steps", date: selectedDate })} className="min-h-11 flex-row items-center gap-1 rounded-full bg-brand px-4" style={{ opacity: canLog ? 1 : 0.4 }}><Icon name="plus" color={C.bg} size={19} /><Txt weight="bold" className="text-sm text-bg">Log</Txt></MotionPressable>
      </View>
      <View className="mb-3 mt-5 flex-row gap-2">{VIEWS.map(item => <MotionPressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected: item.id === view }} onPress={() => navigate(item.id)} style={{ flex: 1, minHeight: 46, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: item.id === view ? C.ink : C.panel }}><Txt weight="semibold" style={{ fontSize: 14, color: item.id === view ? C.bg : C.muted }}>{item.label}</Txt></MotionPressable>)}</View>
      {progress.loading && <View className="mt-4 flex-row items-center gap-3 rounded-2xl bg-panel p-4"><ActivityIndicator color={C.brand} /><Txt className="text-sm text-muted">Loading your progress…</Txt></View>}
      {!!syncIssue && <PanelCard style={{ marginTop: 14 }}><View className="flex-row items-center gap-2"><Icon name="cloud-alert-outline" size={20} color="#E8BC79" /><Txt weight="semibold" className="flex-1 text-sm">{progress.storageError ? "Could not open saved data" : "Sync needs attention"}</Txt></View>{[progress.storageError, progress.workoutError, progress.syncError].filter(Boolean).map((error, index) => <Txt key={index} className="mt-2 text-xs leading-5 text-muted">{error}</Txt>)}<View className="mt-3"><SmallButton label="Retry" icon="sync" onPress={() => void progress.refresh()} /></View></PanelCard>}
      {!!message && <MotionPressable accessibilityRole="button" accessibilityLiveRegion="polite" accessibilityLabel={`${message} Dismiss`} onPress={() => setMessage("")} className="mt-3 flex-row items-center gap-2 rounded-2xl bg-panel p-4"><Icon name={messageError ? "alert-circle-outline" : "check-circle-outline"} size={19} color={messageError ? "#E8BC79" : C.brand} /><Txt className="flex-1 text-xs">{message}</Txt><Icon name="close" color={C.muted} size={16} /></MotionPressable>}
      {walkDraft.count > 0 && !(view === "health" && group === "activity") && <View className="mt-3"><SmallButton label={`${compact(walkDraft.count)} walk steps waiting to save`} icon="walk" onPress={() => { setGroup("activity"); setMetricSearch(""); navigate("health"); }} /></View>}

      {view === "overview" && <>
        <SectionTitle title="Training overview" action="Details" onAction={() => setTrainingDetails(true)} />
        <View className="mb-4 flex-row gap-2">{PERIODS.map(period => <MotionPressable key={period} accessibilityRole="button" accessibilityState={{ selected: days === period }} onPress={() => setDays(period)} style={{ flex: 1, minHeight: 38, borderRadius: 20, backgroundColor: days === period ? C.elevated : "transparent", alignItems: "center", justifyContent: "center" }}><Txt weight="medium" style={{ color: days === period ? C.ink : C.muted, fontSize: 12 }}>{period === 365 ? "1 year" : `${period} days`}</Txt></MotionPressable>)}</View>
        <TrainingHero data={data} days={days} target={goals.weeklyWorkouts} onGoals={() => setGoalEditor(true)} onDay={date => { setSelectedDate(date); setHistoryDayOnly(true); navigate("history"); }} />
        <TrainingStats data={data} unit={unit} />
        <SectionTitle title="Daily tracking" action="All metrics" onAction={() => navigate("health")} />
        {dayPicker}
        <DailyMetricGrid metrics={["steps", "caloriesIn", "water", "sleep"]} {...metricProps} />
        <View className="mt-3"><SmallButton label="Add 250 ml water" icon="water-plus-outline" onPress={() => void addWater()} disabled={waterBusy || !canLog} /></View>
        <SectionTitle title="Body weight" action="View trend" onAction={() => setDetailMetric("weight")} />
        <WeightCard latest={latestWeight} weights={weights} unit={unit} onLog={() => setEditor({ metric: "weight", date: selectedDate })} onDetail={() => setDetailMetric("weight")} />
        <SectionTitle title={`${dateTitle}’s training`} action="History" onAction={() => { setHistoryDayOnly(false); navigate("history"); }} />
        {dailyWorkouts.length ? <WorkoutRows workouts={dailyWorkouts} unit={unit} onOpen={openWorkout} /> : <PanelCard><View className="flex-row items-center gap-3"><Icon name="dumbbell" size={26} color={C.muted} /><View className="flex-1"><Txt weight="semibold" className="text-sm">No workout logged</Txt><Txt className="mt-1 text-xs text-muted">Completed sessions will appear here.</Txt></View><MotionPressable accessibilityRole="button" onPress={() => router.push("/(tabs)/train")} className="min-h-11 justify-center pl-2"><Txt weight="semibold" className="text-xs text-brand">Train</Txt></MotionPressable></View></PanelCard>}
        <View className="mt-6"><PlusPreview /></View>
      </>}

      {view === "health" && <View className="mt-4">
        {dayPicker}
        <View className="mb-4 h-14 flex-row items-center gap-3 rounded-2xl bg-panel px-4"><Icon name="magnify" color={C.muted} /><TextInput accessibilityLabel="Search all health metrics" placeholder="Search steps, calories, measurements…" placeholderTextColor={C.muted} value={metricSearch} onChangeText={setMetricSearch} autoCorrect={false} style={{ flex: 1, color: C.ink, fontFamily: "Outfit_400Regular", fontSize: 14, height: "100%" }} />{!!metricSearch && <MotionPressable accessibilityRole="button" accessibilityLabel="Clear metric search" onPress={() => setMetricSearch("")} className="h-11 w-11 items-center justify-center"><Icon name="close-circle" color={C.muted} size={18} /></MotionPressable>}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{(Object.keys(METRIC_GROUPS) as MetricGroup[]).map(key => <MotionPressable key={key} accessibilityRole="tab" accessibilityState={{ selected: !metricSearch && group === key }} onPress={() => { setGroup(key); setMetricSearch(""); }} style={{ flexDirection: "row", gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 24, alignItems: "center", backgroundColor: !metricSearch && group === key ? C.brand : C.panel }}><Icon name={METRIC_GROUPS[key].icon} size={18} color={!metricSearch && group === key ? C.bg : C.muted} /><Txt weight="medium" style={{ color: !metricSearch && group === key ? C.bg : C.ink, fontSize: 13 }}>{METRIC_GROUPS[key].label}</Txt></MotionPressable>)}</ScrollView>
        <SectionTitle title={metricSearch ? "Search results" : METRIC_GROUPS[group].label} action="Goals" onAction={() => setGoalEditor(true)} />
        {!metricSearch && group === "body" && <WeightCard latest={latestWeight} weights={weights} unit={unit} onLog={() => setEditor({ metric: "weight", date: selectedDate })} onDetail={() => setDetailMetric("weight")} />}
        {visibleMetrics.length ? <MetricList metrics={visibleMetrics} {...metricProps} /> : <PanelCard><Txt className="text-sm text-muted">No metrics match this search.</Txt></PanelCard>}
        <Txt className="mt-3 text-xs leading-5 text-muted">Values are for {selectedDate === today ? "today" : dateLabel(selectedDate)}. Tap a row for its trend or + to log.</Txt>
        {!metricSearch && group === "activity" && <PanelCard style={{ marginTop: 20 }}><WalkCounter draft={walkDraft} onDraftChange={setWalkDraft} onSave={saveWalk} /></PanelCard>}
        {!metricSearch && group === "nutrition" && <View className="mt-4"><SmallButton label="Add 250 ml water" icon="water-plus-outline" onPress={() => void addWater()} disabled={waterBusy || !canLog} /><Txt className="mt-4 text-xs leading-5 text-muted">Food and active calories are separate daily totals. Active calories exclude resting energy.</Txt></View>}
      </View>}

      {view === "history" && <View className="mt-4">
        {dayPicker}
        <View className="mb-2 flex-row items-center justify-between"><MotionPressable accessibilityRole="switch" accessibilityState={{ checked: historyDayOnly }} onPress={() => { setHistoryDayOnly(!historyDayOnly); setHistoryLimit(15); setWorkoutLimit(5); }} className="min-h-11 flex-row items-center gap-2"><Icon name={historyDayOnly ? "checkbox-marked" : "checkbox-blank-outline"} size={22} color={historyDayOnly ? C.brand : C.muted} /><Txt className="text-sm text-muted">Selected day only</Txt></MotionPressable><MotionPressable accessibilityRole="button" onPress={() => void exportData()} className="min-h-11 flex-row items-center gap-1"><Icon name="export-variant" color={C.brand} size={17} /><Txt weight="semibold" className="text-xs text-brand">Export</Txt></MotionPressable></View>
        <SectionTitle title="Workout history" />
        {historyWorkouts.length ? <WorkoutRows workouts={historyWorkouts.slice(0, workoutLimit)} unit={unit} onOpen={openWorkout} /> : <PanelCard><Txt className="text-sm text-muted">No completed workouts {historyDayOnly ? "on this day" : "yet"}.</Txt></PanelCard>}
        {historyWorkouts.length > workoutLimit && <MotionPressable accessibilityRole="button" onPress={() => setWorkoutLimit(limit => limit + 10)} className="min-h-11 items-center justify-center"><Txt className="text-sm text-brand">More workouts</Txt></MotionPressable>}
        <SectionTitle title="Health check-ins" />
        <View className="mb-4 h-14 flex-row items-center gap-3 rounded-2xl bg-panel px-4"><Icon name="magnify" color={C.muted} /><TextInput accessibilityLabel="Search saved metrics or notes" value={historySearch} onChangeText={value => { setHistorySearch(value); setHistoryLimit(15); }} placeholder="Search your check-ins…" placeholderTextColor={C.muted} style={{ flex: 1, color: C.ink, fontFamily: "Outfit_400Regular", height: "100%" }} /></View>
        {!history.length && <PanelCard><Txt weight="semibold" className="text-base">{historySearch ? "No matching check-ins" : "No check-ins yet"}</Txt><Txt className="mt-2 text-xs leading-5 text-muted">{historySearch ? "Try another metric name or note." : "Log a metric to start your history."}</Txt></PanelCard>}
        <View style={{ gap: 10 }}>{history.slice(0, historyLimit).map(entry => <MotionPressable key={entry.id} accessibilityRole="button" accessibilityLabel={`Edit ${METRICS[entry.metric].label} for ${entry.date}`} onPress={() => setEditor({ metric: entry.metric, date: entry.date })} className="flex-row items-center gap-3 rounded-[22px] bg-panel p-4"><View className="h-12 w-12 items-center justify-center rounded-2xl bg-elevated"><Txt weight="bold" className="text-base text-brand">{Number(entry.date.slice(-2))}</Txt><Txt className="text-[10px] text-muted">{dateLabel(entry.date, { month: "short" })}</Txt></View><View className="flex-1"><Txt weight="semibold" className="text-sm">{METRICS[entry.metric].label}</Txt><Txt className="mt-1 text-[11px] text-muted">{dateLabel(entry.date, { year: "numeric", month: "short", day: "numeric" })} · {entry.source === "pedometer" ? "Phone walk" : "Manual"}</Txt>{!!entry.notes && <Txt numberOfLines={2} className="mt-1 text-[11px] text-muted">{entry.notes}</Txt>}</View><Txt weight="bold" className="text-base">{displayMetric(entry.metric, entry.value, unit)}<Txt className="text-[11px] text-muted"> {displayUnit(entry.metric, unit)}</Txt></Txt><Icon name="chevron-right" size={18} color={C.muted} /></MotionPressable>)}</View>
        {history.length > historyLimit && <MotionPressable accessibilityRole="button" onPress={() => setHistoryLimit(limit => limit + 20)} className="min-h-14 items-center justify-center"><Txt className="text-sm text-brand">More check-ins</Txt></MotionPressable>}
        <Txt className="mt-5 text-xs leading-5 text-muted">All your saved check-ins stay available. Export includes revisions and cleared entries. Averages use logged days only.</Txt>
      </View>}
      <View className="mt-6 flex-row items-center justify-center gap-2"><Icon name={syncIssue ? "cloud-off-outline" : "cloud-check-outline"} color={C.muted} size={15} /><Txt className="text-[11px] text-muted">{progress.loading ? "Opening journal" : progress.refreshing ? "Syncing" : journal.pending.length ? `${journal.pending.length} changes waiting to sync` : syncIssue ? "Saved on this device" : "Your journal is up to date"}</Txt></View>
    </ScrollView>

    {editor && <MetricEditor key={`${editor.metric}-${editor.date}`} initialMetric={editor.metric} date={editor.date} events={metrics} unit={unit} onClose={() => setEditor(null)} onSave={saveLog} />}
    {detailMetric && <MetricDetail initialMetric={detailMetric} metrics={metrics} start={data.start} end={today} days={days} unit={unit} onRangeChange={setDays} onClose={() => setDetailMetric(null)} onEdit={(metric, date) => { setDetailMetric(null); setEditor({ metric, date }); }} />}
    {goalEditor && <GoalsEditor goals={goals} unit={unit} onClose={() => setGoalEditor(false)} onSave={async next => { await progress.saveGoals(next); setMessageError(false); setMessage("Goals updated."); }} />}
    {trainingDetails && <Sheet title="Training details" subtitle={`${dateLabel(data.start)} – ${dateLabel(today)} · completed workouts`} onClose={() => setTrainingDetails(false)}>
      <TrainingStats data={data} unit={unit} />
      <PanelCard style={{ marginTop: 16 }}><View className="flex-row justify-between"><View><Txt className="text-xs text-muted">Repetitions</Txt><Txt weight="bold" className="mt-2 text-2xl">{compact(data.current.reps)}</Txt></View><View><Txt className="text-xs text-muted">Timed work</Txt><Txt weight="bold" className="mt-2 text-2xl">{compact(data.current.timedSeconds / 60)}<Txt className="text-sm text-muted"> min</Txt></Txt></View><View><Txt className="text-xs text-muted">Avg. set RPE</Txt><Txt weight="bold" className="mt-2 text-2xl">{data.current.averageRpe === null ? "—" : data.current.averageRpe.toFixed(1)}</Txt></View></View><Txt className="mt-4 text-xs text-muted">{compact(data.current.distance / 1000)} km in sets · {data.current.warmups} warm-up sets excluded</Txt></PanelCard>
      <ConsistencySection data={data} target={goals.weeklyWorkouts} selectedDate={selectedDate} onDate={date => { setSelectedDate(date); setHistoryDayOnly(true); setTrainingDetails(false); navigate("history"); }} />
      <StrengthSection data={data} unit={unit} />
    </Sheet>}
    {dateEditor && <Sheet title="Choose a date" subtitle="Use YYYY-MM-DD to open a past check-in day." onClose={() => setDateEditor(false)}>
      <TextInput accessibilityLabel="Journal date YYYY-MM-DD" placeholder="YYYY-MM-DD" placeholderTextColor={C.muted} autoCapitalize="none" maxLength={10} value={dateInput} onChangeText={value => { setDateInput(value); setDateError(""); }} style={{ padding: 17, borderRadius: 16, backgroundColor: C.elevated, color: C.ink, fontSize: 22, fontFamily: "Outfit_500Medium" }} />
      {!!dateError && <Txt accessibilityRole="alert" className="mt-3 text-sm" style={{ color: "#FF9A94" }}>{dateError}</Txt>}
      <MotionPressable accessibilityRole="button" className="mt-5 items-center rounded-full bg-brand p-4" onPress={() => { if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput) || !Number.isFinite(Date.parse(`${dateInput}T12:00:00Z`)) || new Date(`${dateInput}T12:00:00Z`).toISOString().slice(0, 10) !== dateInput || dateInput > today) { setDateError("Choose a valid date up to today (YYYY-MM-DD)."); return; } setSelectedDate(dateInput); setDateEditor(false); }}><Txt weight="bold" className="text-bg">Open this day</Txt></MotionPressable>
    </Sheet>}
  </ScreenEntrance>;
}
