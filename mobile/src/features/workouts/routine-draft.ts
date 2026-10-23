import type { PickerExercise } from "../exercises/picker-cache";
import type { SetType, TemplateInput } from "./api";
let sequence = 0;
const id = () => `draft-${Date.now()}-${++sequence}`;
export type DraftSet = { id: string; type: SetType; reps: string; weight: string; duration: string };
export type DraftExercise = { id: string; exercise: PickerExercise; notes: string; rest: string; sets: DraftSet[] };
export function newDraftSet(previous?: DraftSet): DraftSet {
  return previous ? { ...previous, id: id() } : { id: id(), type: "normal", reps: "10", weight: "0", duration: "30" };
}
export function newDraftExercise(exercise: PickerExercise): DraftExercise {
  return { id: exercise.id, exercise, notes: "", rest: "90", sets: Array.from({ length: 3 }, () => newDraftSet()) };
}
export function routineInput(name: string, description: string, exercises: DraftExercise[]): TemplateInput {
  if (!name.trim() || name.trim().length > 100) throw Error("Give your routine a name of 1–100 characters.");
  if (description.length > 2000) throw Error("Keep routine notes under 2,000 characters.");
  if (!exercises.length || exercises.length > 50) throw Error("Choose between 1 and 50 exercises.");
  const number = (text: string, label: string, min: number, max: number, integer = false) => {
    const value = Number(text);
    if (!text.trim() || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw Error(`${label} must be ${integer ? "a whole number " : ""}between ${min} and ${max}.`);
    return value;
  };
  return { name: name.trim(), description, exercises: exercises.map(item => {
    if (item.sets.length < 1 || item.sets.length > 30) throw Error(`${item.exercise.name}: use 1–30 sets.`);
    const timed = ["duration", "distance_duration"].includes(item.exercise.trackingType);
    return {
      exerciseId: item.exercise.id, notes: item.notes,
      restSeconds: number(item.rest, `${item.exercise.name} rest`, 0, 900, true),
      sets: item.sets.map((set, index) => ({
        setType: set.type,
        targetReps: timed ? null : number(set.reps, `${item.exercise.name}, set ${index + 1} reps`, 1, 1000, true),
        targetWeight: timed ? null : number(set.weight, `${item.exercise.name}, set ${index + 1} weight`, 0, 100000),
        targetDurationSeconds: timed ? number(set.duration, `${item.exercise.name}, set ${index + 1} duration`, 1, 86400, true) : null,
      }))
    };
  }) };
}
