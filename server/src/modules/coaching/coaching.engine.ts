export type Equipment = "gym" | "dumbbells" | "bodyweight";
export type Profile = { goal: "muscle" | "strength" | "fat_loss" | "fitness"; experience: "beginner" | "intermediate" | "advanced"; trainingDays: number; minutesPerWorkout: number; equipment: Equipment };
export type Exercise = { id: string; name: string; tracking_type: string; movement_pattern: string; difficulty: string; equipment: string[]; primary_muscles: string[]; status?: string };
export type PrescriptionExercise = { exerciseId: string; name: string; pattern: string; trackingType: string; sets: number; repsMin: number | null; repsMax: number | null; weightKg: number | null; durationSeconds: number | null; restSeconds: number; reason: string };
export type Prescription = { minutes: number; equipment: Equipment; effort: "normal" | "easy"; explanation: string[]; exercises: PrescriptionExercise[] };
export type PlannedDay = { week: number; day: number; date: string; name: string; prescription: Prescription };
export type LoggedSet = { set_type: string; weight_kg: number | string | null; reps: number | null; duration_seconds?: number | null; rpe: number | string | null; rir: number | null; completed_at: string | null };
export type History = { id: string; status: string; finished_at: string | null; elapsed_seconds: number | null; workout_session_exercises: { exercise_id: string; exercise_name?: string; tracking_type: string; workout_logged_sets: LoggedSet[] }[] };
export type MetricEvent = { id: string; observed_at: string; payload: { kind?: string; metric?: string; date?: string; value?: number | null } };

export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const level = (value: string) => ({ beginner: 0, intermediate: 1, advanced: 2 }[value] ?? 2);
const simpleEquipment = new Set(["bodyweight", "none", "yoga-mat"]);
export function compatible(exercise: Exercise, equipment: Equipment) {
  if (exercise.status && exercise.status !== "published") return false;
  if (!Array.isArray(exercise.equipment)) return false;
  if (equipment === "gym") return !exercise.equipment.some(value => value === "other");
  return exercise.equipment.every(value => simpleEquipment.has(value) || equipment === "dumbbells" && value === "dumbbell");
}
function choose(catalog: Exercise[], pattern: string, profile: Profile, excluded: Set<string>, rotation = 0) {
  const candidates = catalog.filter(e => compatible(e, profile.equipment) && e.movement_pattern === pattern && level(e.difficulty) <= level(profile.experience) && !excluded.has(e.id)
    && (pattern !== "locomotion" || /walk|march|cycl|bike|treadmill|elliptical/i.test(e.name)));
  candidates.sort((a, b) => {
    const score = (e: Exercise) => (profile.equipment === "gym" && e.tracking_type === "reps_weight" ? 3 : 0) + (e.difficulty === "beginner" ? 1 : 0) + (profile.equipment === "dumbbells" && e.equipment.includes("dumbbell") ? 4 : 0);
    return score(b) - score(a) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
  return candidates.length ? candidates[rotation % Math.min(candidates.length, 2)] : null;
}
function dose(exercise: Exercise, profile: Profile, easy = false): PrescriptionExercise {
  const timed = ["duration", "distance_duration"].includes(exercise.tracking_type);
  const strength = profile.goal === "strength" && exercise.tracking_type === "reps_weight";
  const activity = exercise.movement_pattern === "locomotion";
  return { exerciseId: exercise.id, name: exercise.name, pattern: exercise.movement_pattern, trackingType: exercise.tracking_type,
    sets: activity ? 1 : easy ? 2 : profile.experience === "beginner" ? 2 : 3, repsMin: timed ? null : strength ? 5 : 8, repsMax: timed ? null : strength ? 8 : profile.goal === "fitness" ? 15 : 12,
    weightKg: exercise.tracking_type === "reps" ? 0 : null, durationSeconds: timed ? activity ? 300 : 30 : null, restSeconds: activity ? 0 : easy ? 90 : strength ? 150 : profile.goal === "fitness" ? 60 : 90,
    reason: exercise.tracking_type === "reps_weight" ? "Choose a manageable first working load, leaving about 2–3 repetitions in reserve. No starting weight is guessed from body size." : "Use a comfortable range and controlled technique. Stop the set before technique changes." };
}
// Includes time for warm-up, transitions and rest. A budget trims accessories before compounds.
export function estimatedMinutes(exercises: PrescriptionExercise[]) {
  return Math.ceil((300 + exercises.reduce((n, e) => n + 45 + e.sets * (e.durationSeconds ?? 45) + Math.max(0, e.sets - 1) * e.restSeconds, 0)) / 60);
}
function fitBudget(exercises: PrescriptionExercise[], minutes: number) {
  const result = exercises.map(e => ({ ...e }));
  while (estimatedMinutes(result) > minutes && result.some(e => e.sets > 1)) {
    let index = result.length - 1;
    while (index > 0 && result[index].sets <= 1) index--;
    result[index].sets--;
  }
  while (estimatedMinutes(result) > minutes && result.length > 2) result.pop();
  return result;
}
export function generatePlan(profile: Profile, catalog: Exercise[], startDate: string) {
  const strengthDays = Math.min(profile.trainingDays, profile.experience === "beginner" ? 3 : 4);
  const offsets: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5] };
  const explanation = [
    `Four weeks built around ${profile.goal === "fat_loss" ? "maintaining strength while building a consistent activity habit" : profile.goal === "fitness" ? "balanced full-body training" : profile.goal === "strength" ? "repeatable strength practice" : "muscle-building working sets"}, your ${profile.equipment} equipment and ${profile.minutesPerWorkout}-minute sessions.`,
    "Repeat key movements to learn technique and compare performance. Week 4 reduces sets for an easier consolidation week; loads do not automatically rise with the calendar.",
  ];
  if (strengthDays < profile.trainingDays) explanation.push(`Your ${profile.trainingDays} available days include ${strengthDays} strength sessions. Use other days for comfortable walking or mobility; recovery is part of the plan.`);
  const variants: Prescription[] = [];
  for (let index = 0; index < strengthDays; index++) {
    const activityGoal = profile.goal === "fitness" || profile.goal === "fat_loss";
    const split = strengthDays === 4;
    const patterns = split
      ? activityGoal
        ? index % 2 === 0 ? ["push", "pull", "locomotion", "rotation", "push", "pull"] : ["squat", "hinge", "locomotion", "lunge", "rotation", "mobility"]
        : index % 2 === 0 ? ["push", "pull", "push", "pull", "rotation", "carry"] : ["squat", "hinge", "lunge", "squat", "rotation", "carry"]
      : activityGoal
      ? index % 2 === 0 ? ["squat", "push", "pull", "locomotion", "hinge", "mobility"] : ["hinge", "pull", "push", "locomotion", "lunge", "mobility"]
      : index % 2 === 0 ? ["squat", "push", "pull", "hinge", "rotation", "carry"] : ["hinge", "pull", "push", "lunge", "rotation", "carry"];
    const used = new Set<string>(); const exercises: PrescriptionExercise[] = []; const missing: string[] = [];
    for (const pattern of patterns.slice(0, profile.minutesPerWorkout <= 30 ? 4 : 6)) {
      const exercise = choose(catalog, pattern, profile, used, index % 2);
      if (exercise) { used.add(exercise.id); exercises.push(dose(exercise, profile)); } else missing.push(pattern);
    }
    if (exercises.length < 2) throw new Error("The published library does not yet have enough suitable exercises for this equipment and experience. Choose another setup or use your own routine.");
    variants.push({ minutes: profile.minutesPerWorkout, equipment: profile.equipment, effort: "normal", exercises: fitBudget(exercises, profile.minutesPerWorkout), explanation: ["Start with a brief comfortable warm-up and an easier practice set when needed.", ...(missing.length ? [`No suitable published ${missing.join(" / ")} movement was available. These patterns are omitted rather than replaced with unrelated exercises.`] : [])] });
  }
  const sessions: PlannedDay[] = [];
  for (let week = 1; week <= 4; week++) for (let index = 0; index < strengthDays; index++) {
    const base = variants[index]; const easy = week === 4;
    const name = strengthDays === 4 ? `${index % 2 === 0 ? "Upper" : "Lower"} body ${index < 2 ? "A" : "B"}` : `Full body ${String.fromCharCode(65 + index)}`;
    sessions.push({ week, day: offsets[strengthDays][index] + 1, date: addDays(startDate, (week - 1) * 7 + offsets[strengthDays][index]), name: `${name}${easy ? " · Easier week" : ""}`,
      prescription: { ...base, effort: easy ? "easy" : "normal", explanation: [...base.explanation, ...(easy ? ["One fewer set per exercise this week, with at least one working set. Use the same or an easier load; this is not a performance test."] : [])], exercises: base.exercises.map(e => ({ ...e, sets: easy ? Math.max(1, e.sets - 1) : e.sets })) } });
  }
  return { name: "Your four-week training plan", goal: profile.goal, equipment: profile.equipment, trainingDays: strengthDays, minutesPerWorkout: profile.minutesPerWorkout, startDate, explanation, sessions };
}

export function adaptPrescription(current: Prescription, profile: Profile, catalog: Exercise[], changes: { minutes?: number; equipment?: Equipment; effort?: "normal" | "easy"; swapExerciseId?: string }) {
  const equipment = changes.equipment ?? current.equipment; const minutes = changes.minutes ?? current.minutes;
  const effort = changes.effort ?? current.effort; const used = new Set(current.exercises.map(e => e.exerciseId)); const explanation: string[] = [];
  if (changes.swapExerciseId && !used.has(changes.swapExerciseId)) throw new Error("Choose an exercise in this session to swap.");
  const exercises: PrescriptionExercise[] = [];
  for (const row of current.exercises) {
    const original = catalog.find(e => e.id === row.exerciseId);
    const needsSwap = row.exerciseId === changes.swapExerciseId || !original || !compatible(original, equipment);
    let result = { ...row };
    if (needsSwap) {
      const alternative = choose(catalog, row.pattern, { ...profile, equipment }, used);
      if (!alternative) {
        if (changes.swapExerciseId === row.exerciseId) throw new Error(`No suitable published alternative is available for ${row.name} with ${equipment}. Keep it or choose another setup.`);
        explanation.push(`${row.name} is omitted: no suitable published ${row.pattern} alternative is available with ${equipment}.`); continue;
      }
      used.add(alternative.id);
      result = { ...dose(alternative, { ...profile, equipment }, effort === "easy"), sets: row.sets, reason: `Replaces ${row.name} with the same ${row.pattern} movement pattern. Establish a fresh baseline; weights are not transferred between exercises.` };
      explanation.push(`${row.name} → ${alternative.name}; the movement pattern is preserved.`);
    }
    // Reducing difficulty is relative to the existing prescription; repeated requests do not compound a reduction.
    if (effort === "easy" && current.effort !== "easy") {
      result.sets = Math.max(1, result.sets - 1);
      result.weightKg = result.weightKg === null ? null : Math.round(result.weightKg * 0.9 * 100) / 100;
      result.reason += " Easier day: fewer sets and a 10% lower suggested load where a load is known; adjust to available plates.";
    }
    exercises.push(result);
  }
  if (exercises.length < 2) throw new Error("This setup does not have enough suitable published movements. Keep your original session or choose another equipment option.");
  const fitted = fitBudget(exercises, minutes);
  if (minutes !== current.minutes) explanation.push(`Fit into ${minutes} minutes by reducing sets and accessories before changing rest. Estimated ${estimatedMinutes(fitted)} minutes including a short warm-up; actual pace can vary.`);
  if (changes.effort === "normal" && current.effort === "easy") explanation.push("Normal effort selected. Prior reductions are preserved; use progression or adjust your sets manually rather than restoring a guessed load.");
  return { minutes, equipment, effort, exercises: fitted, explanation: [...explanation, "Check the prescription before starting. You can change loads and reps while logging."] } satisfies Prescription;
}

function completedVisits(exercise: PrescriptionExercise, history: History[], now: Date) {
  const cutoff = now.getTime() - 42 * 86400000;
  return history.filter(w => w.status === "completed" && w.finished_at && Date.parse(w.finished_at) >= cutoff && Date.parse(w.finished_at) <= now.getTime())
    .sort((a, b) => b.finished_at!.localeCompare(a.finished_at!))
    .flatMap(w => w.workout_session_exercises.filter(e => e.exercise_id === exercise.exerciseId && e.tracking_type === exercise.trackingType)
      .map(e => ({ id: w.id, finishedAt: w.finished_at!, sets: e.workout_logged_sets.filter(s => s.set_type === "normal") })))
    .filter((v, i, rows) => rows.findIndex(r => r.id === v.id) === i);
}
function effortKnownAndManageable(sets: LoggedSet[]) {
  return sets.every(s => (s.rpe !== null || s.rir !== null) && (s.rpe === null || Number(s.rpe) <= 8) && (s.rir === null || s.rir >= 2));
}
export function progressPrescription(current: Prescription, history: History[], incrementKg?: number, now = new Date()): Prescription {
  const exercises = current.exercises.map(row => {
    const next = { ...row }; const visits = completedVisits(row, history, now); const latest = visits[0];
    if (current.effort === "easy") return { ...next, reason: "Keep this easier session. Automatic load increases are paused for an easier day." };
    if (!latest || latest.sets.length < row.sets || latest.sets.some(s => !s.completed_at)) return { ...next, reason: "Keep this target: there is no recent, fully completed set sequence with enough working sets for a comparison." };
    const loads = latest.sets.map(s => s.weight_kg === null ? null : Number(s.weight_kg));
    if (row.trackingType !== "reps_weight") return { ...next, reason: "Keep the current target and build controlled repetitions or time. Bodyweight difficulty and technique cannot be inferred from repetitions alone." };
    const load = loads[0];
    if (load === null || !Number.isFinite(load) || load <= 0 || loads.some(v => v !== load)) return { ...next, reason: "Keep this target: comparisons require the same positive load across straight working sets. Mixed loads and missing loads are not combined." };
    // A real recorded baseline is helpful even when increasing is not justified.
    next.weightKg = load;
    const prior = visits[1];
    const sameDay = prior?.finishedAt.slice(0, 10) === latest.finishedAt.slice(0, 10);
    const comparable = prior && !sameDay && prior.sets.length === latest.sets.length && prior.sets.every(s => s.completed_at && Number(s.weight_kg) === load);
    const allReps = (sets: LoggedSet[]) => sets.every(s => s.reps !== null && s.reps >= (row.repsMax ?? Infinity));
    if (!comparable) return { ...next, reason: `Use your recorded ${load} kg baseline. Two recent comparable sessions on separate days at the same load and set count are needed before suggesting an increase.` };
    if (!effortKnownAndManageable(latest.sets) || !effortKnownAndManageable(prior.sets)) return { ...next, reason: `Repeat ${load} kg. Effort is missing or the sets were hard; record RPE or repetitions in reserve so increases do not rely on reps alone.` };
    if (!allReps(latest.sets) || !allReps(prior.sets)) return { ...next, reason: `Repeat ${load} kg and work toward ${row.repsMax} controlled reps in every working set. Add load after two comparable successful sessions.` };
    const increment = incrementKg ?? (current.equipment === "dumbbells" ? 1 : 2.5);
    if (increment > load * 0.05) return { ...next, reason: `Repeat ${load} kg: your ${increment} kg increment would exceed 5%. Select a smaller available increment or progress reps first.` };
    return { ...next, weightKg: Math.round((load + increment) * 100) / 100, reason: `Try ${Math.round((load + increment) * 100) / 100} kg (+${increment} kg): two recent comparable sessions reached ${row.repsMax} reps in every working set with manageable recorded effort. Use only an increment your equipment supports; reduce it if technique or effort changes.` };
  });
  return { ...current, exercises, explanation: ["Suggestions use the same exercise, recent completed straight working sets, load, set count and recorded effort. Warm-ups, drop/failure/heavy sets and incomplete sessions are excluded.", "This is a suggestion for your next session, not a prediction. You control every logged weight and repetition."] };
}

export function weeklyReview(history: History[], profile: Profile | null, events: MetricEvent[], now = new Date(), timezone = "UTC") {
  const date = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
  const end = date(now); const start = addDays(end, -6); const previousStart = addDays(start, -7);
  const logged = history.filter(w => w.status === "completed" && w.finished_at && Date.parse(w.finished_at) <= now.getTime());
  const current = logged.filter(w => date(new Date(w.finished_at!)) >= start && date(new Date(w.finished_at!)) <= end);
  const previous = logged.filter(w => date(new Date(w.finished_at!)) >= previousStart && date(new Date(w.finished_at!)) < start);
  const sets = (workouts: History[]) => workouts.flatMap(w => w.workout_session_exercises.flatMap(e => e.workout_logged_sets.filter(s => s.completed_at && s.set_type !== "warmup")));
  const completedSets = sets(current).length;
  const observations = [`${current.length} completed workout${current.length === 1 ? "" : "s"}, ${completedSets} working sets and ${Math.round(current.reduce((n, w) => n + (w.elapsed_seconds ?? 0), 0) / 60)} logged minutes in the last seven days.`];
  const actions: string[] = []; const dataNotes = ["Only finished workouts and completed working sets count. Workout time and volume are not proof of strength or fat loss."];
  const target = profile ? Math.min(profile.trainingDays, profile.experience === "beginner" ? 3 : 4) : 3;
  if (!current.length) actions.push("Choose one manageable session for your next available day. Resume with familiar movements and conservative loads; there is no need to make up every missed workout.");
  else if (current.length < target) actions.push(`Keep next week manageable: schedule ${Math.min(target, current.length + 1)} sessions around your real availability. Move unfinished sessions instead of stacking catch-up workouts.`);
  else actions.push("Keep your successful weekly schedule. Progress a load only when comparable logged sets and effort support it.");
  if (previous.length) observations.push(`${current.length - previous.length >= 0 ? "+" : ""}${current.length - previous.length} workouts compared with the preceding seven days; attendance changes do not establish changes in fitness.`);
  else dataNotes.push("There is no completed workout baseline in the preceding seven days for a weekly comparison.");
  let comparisons = 0;
  for (const workout of [...current].sort((a, b) => b.finished_at!.localeCompare(a.finished_at!))) {
    for (const exercise of workout.workout_session_exercises) {
      if (comparisons >= 2 || exercise.tracking_type !== "reps_weight") continue;
      const currentSets = exercise.workout_logged_sets.filter(s => s.set_type === "normal");
      const baseline = [...previous].sort((a, b) => b.finished_at!.localeCompare(a.finished_at!)).flatMap(w => w.workout_session_exercises).find(e => e.exercise_id === exercise.exercise_id && e.tracking_type === exercise.tracking_type);
      const priorSets = baseline?.workout_logged_sets.filter(s => s.set_type === "normal") ?? [];
      const load = currentSets[0]?.weight_kg;
      if (!currentSets.length || currentSets.length !== priorSets.length || load === null || Number(load) <= 0 || !currentSets.every(s => s.completed_at && Number(s.weight_kg) === Number(load) && s.reps !== null) || !priorSets.every(s => s.completed_at && Number(s.weight_kg) === Number(load) && s.reps !== null)) continue;
      const before = priorSets.reduce((n, s) => n + s.reps!, 0); const after = currentSets.reduce((n, s) => n + s.reps!, 0);
      observations.push(`${exercise.exercise_name ?? "A repeated exercise"}: ${before} → ${after} recorded reps across ${currentSets.length} straight working sets at the same ${Number(load)} kg. Technique and range still affect comparability.`);
      comparisons++;
    }
    if (comparisons >= 2) break;
  }
  if (!comparisons && current.length) dataNotes.push("No same-exercise, same-load and same-set-count comparison was available across these two weeks. No strength improvement was inferred.");
  const effort = sets(current).filter(s => s.rpe !== null || s.rir !== null);
  const hard = effort.filter(s => s.rpe !== null && Number(s.rpe) >= 9 || s.rir !== null && s.rir <= 1);
  if (hard.length >= 3 && hard.length / effort.length >= 0.5) actions.push("Most recorded effort was high. Consider an easier next session with fewer sets or a lower load, and check how you feel before training.");
  else if (!effort.length && completedSets) actions.push("Record effort for your final working sets next week. This helps distinguish a comfortable target from a near-limit set.");
  // Resolve append-only corrections/tombstones before interpreting health data.
  const latest = new Map<string, MetricEvent>();
  for (const event of [...events].sort((a, b) => a.observed_at.localeCompare(b.observed_at) || a.id.localeCompare(b.id))) {
    const p = event.payload;
    if (p.kind === "metric" && p.metric && p.date && p.date >= start && p.date <= end) latest.set(`${p.metric}:${p.date}`, event);
  }
  const values = (metric: string) => [...latest.values()].filter(e => e.payload.metric === metric && e.payload.value !== null && typeof e.payload.value === "number");
  const sleep = values("sleep");
  if (sleep.length >= 3) {
    const average = sleep.reduce((n, e) => n + e.payload.value!, 0) / sleep.length;
    observations.push(`Sleep averaged ${average.toFixed(1)} hours across ${sleep.length} recorded days. Missing days are not zeros.`);
    if (average < 7) actions.push("Protect a consistent sleep opportunity and choose an easier training day if you feel under-recovered. These logs do not establish what caused a performance change.");
  }
  if (profile?.goal === "fat_loss") {
    const weight = values("weight").sort((a, b) => a.payload.date!.localeCompare(b.payload.date!));
    observations.push(weight.length >= 3 ? `Weight was recorded on ${weight.length} days. One week is too short to label a sustained fat-loss trend.` : "There are too few weight check-ins this week to describe a trend.");
    actions.push("Keep strength sessions consistent. If weight tracking supports your goal, compare several weeks of check-ins under similar conditions rather than changing targets after one reading.");
  } else if (profile?.goal === "muscle") actions.push("Prioritize repeatable working sets and adequate recovery. Use comparable exercise records rather than total tonnage to judge progress.");
  else if (profile?.goal === "fitness") actions.push("Add a comfortable walk or mobility break on a non-lifting day if it fits your week.");
  if (!events.length) dataNotes.push("No synced health check-ins were available. No sleep, nutrition or body trend was inferred.");
  return { period: { start, end }, headline: current.length ? "Keep what is working; adjust the next step." : "A manageable restart is progress.", observations, actions: actions.slice(0, 4), metrics: { workouts: current.length, completedSets, minutes: Math.round(current.reduce((n, w) => n + (w.elapsed_seconds ?? 0), 0) / 60) }, dataNotes };
}
