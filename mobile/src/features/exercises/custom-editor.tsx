import React, { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotionPressable as Pressable } from "@/src/components/motion";
import { Txt } from "@/src/components/ui";
import { Sheet } from "../progress/editors";
import { AnatomicalBody } from "../pro/anatomical-body";
import { ProButton } from "../pro/hub-ui";
import { pretty, type Exercise, type ExerciseTaxonomies, type TaxonomyItem } from "./api";
import type { CustomExerciseInput } from "./custom-api";

export const TRACKING = {
  reps_weight: {
    label: "Weight & reps",
    detail: "External resistance, recorded per set",
    icon: "weight-kilogram",
  },
  reps: { label: "Reps only", detail: "Count every completed repetition", icon: "repeat" },
  duration: {
    label: "Time",
    detail: "Holds, stretches and timed movements",
    icon: "timer-outline",
  },
  distance_duration: {
    label: "Distance & time",
    detail: "Runs, rides and distance-based work",
    icon: "map-marker-distance",
  },
} as const;
const PATTERNS = [
  "push",
  "pull",
  "squat",
  "hinge",
  "lunge",
  "carry",
  "rotation",
  "locomotion",
  "mobility",
  "stillness",
  "other",
] as const;
type Choice =
  | "primaryMuscles"
  | "secondaryMuscles"
  | "equipment"
  | "category"
  | "activityType"
  | "bodyRegion"
  | "difficulty"
  | "movementPattern";
const CHOICE_LABELS: Record<Choice, string> = {
  primaryMuscles: "Primary muscles",
  secondaryMuscles: "Supporting muscles",
  equipment: "Equipment",
  category: "Category",
  activityType: "Activity",
  bodyRegion: "Body region",
  difficulty: "Difficulty",
  movementPattern: "Movement pattern",
};
export function customInput(
  exercise: Exercise | undefined,
  tax: ExerciseTaxonomies,
): CustomExerciseInput {
  if (exercise)
    return {
      name: exercise.name,
      description: exercise.description,
      category: exercise.category,
      activityType: exercise.activityType,
      bodyRegion: exercise.bodyRegion,
      difficulty: exercise.difficulty,
      trackingType: exercise.trackingType,
      movementPattern: exercise.movementPattern,
      primaryMuscles: [...exercise.primaryMuscles],
      secondaryMuscles: [...exercise.secondaryMuscles],
      equipment: [...exercise.equipment],
      instructions: [...exercise.instructions],
      tips: [...exercise.tips],
      mistakes: [...exercise.mistakes],
      safetyNotes: [...exercise.safetyNotes],
      breathingTip: exercise.breathingTip,
    };
  const category =
    tax.categories.find((item) => item.code === "strength")?.code ??
    tax.categories[0]?.code ??
    "strength";
  return {
    name: "",
    description: "",
    category,
    activityType:
      tax.activityTypes.find(
        (item) => item.code === "weight-training" && item.category === category,
      )?.code ??
      tax.activityTypes.find((item) => item.category === category)?.code ??
      "",
    bodyRegion:
      tax.bodyRegions.find((item) => item.code === "upper-body")?.code ??
      tax.bodyRegions[0]?.code ??
      "",
    difficulty: "beginner",
    trackingType: "reps_weight",
    movementPattern: "other",
    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: [],
    instructions: [],
    tips: [],
    mistakes: [],
    safetyNotes: [],
    breathingTip: "",
  };
}
function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
  maxLength = 120,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <View className="gap-2">
      <Txt className="text-[11px] text-muted">{label}</Txt>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        multiline={multiline}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor="#666666"
        selectionColor="#FFFFFF"
        underlineColorAndroid="transparent"
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 font-poppins-regular text-sm text-white ${multiline ? "min-h-28" : "min-h-14"}`}
      />
    </View>
  );
}
function SelectRow({
  title,
  value,
  onPress,
  optional = false,
}: {
  title: string;
  value: string;
  onPress: () => void;
  optional?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Choose ${title.toLowerCase()}`}
      onPress={onPress}
      className="min-h-20 flex-row items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.02] px-4 py-4"
    >
      <View className="min-w-0 flex-1">
        <Txt className="text-[10px] text-muted">
          {title}
          {optional ? " · optional" : ""}
        </Txt>
        <Txt weight="medium" className="mt-1 text-sm leading-6">
          {value || "Choose"}
        </Txt>
      </View>
      <MaterialCommunityIcons name="chevron-right" color="#A3A3A3" size={20} />
    </Pressable>
  );
}
export function CustomExerciseEditor({
  exercise,
  tax,
  onSave,
  onClose,
}: {
  exercise?: Exercise;
  tax: ExerciseTaxonomies;
  onSave: (input: CustomExerciseInput) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(() => customInput(exercise, tax));
  const [steps, setSteps] = useState(exercise?.instructions.join("\n") ?? "");
  const [step, setStep] = useState(0),
    [choice, setChoice] = useState<Choice | null>(null),
    [query, setQuery] = useState("");
  const [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const patch = <K extends keyof CustomExerciseInput>(key: K, value: CustomExerciseInput[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const options: TaxonomyItem[] =
    choice === "primaryMuscles" || choice === "secondaryMuscles"
      ? tax.muscleGroups.filter(
          (item) => choice !== "secondaryMuscles" || !draft.primaryMuscles.includes(item.code),
        )
      : choice === "equipment"
        ? tax.equipmentTypes
        : choice === "category"
          ? tax.categories
          : choice === "activityType"
            ? tax.activityTypes.filter((item) => item.category === draft.category)
            : choice === "bodyRegion"
              ? tax.bodyRegions
              : choice === "difficulty"
                ? ["beginner", "intermediate", "advanced"].map((code) => ({
                    code,
                    label: pretty(code),
                  }))
                : choice === "movementPattern"
                  ? PATTERNS.map((code) => ({ code, label: pretty(code) }))
                  : [];
  const multiple =
    choice === "primaryMuscles" || choice === "secondaryMuscles" || choice === "equipment";
  const names = (codes: string[], items: TaxonomyItem[]) =>
    codes.map((code) => items.find((item) => item.code === code)?.label ?? pretty(code)).join(", ");
  const openChoice = (value: Choice) => {
    setChoice(value);
    setQuery("");
    setError("");
  };
  function choose(code: string) {
    if (!choice) return;
    if (choice === "primaryMuscles" || choice === "secondaryMuscles" || choice === "equipment") {
      const key = choice;
      setDraft((current) => {
        if (!current[key].includes(code) && current[key].length >= 20) return current;
        const selected = current[key].includes(code)
          ? current[key].filter((item) => item !== code)
          : [...current[key], code];
        return {
          ...current,
          [key]: selected,
          ...(key === "primaryMuscles"
            ? {
                secondaryMuscles: current.secondaryMuscles.filter(
                  (item) => !selected.includes(item),
                ),
              }
            : {}),
        };
      });
    } else if (choice === "category") {
      setDraft((current) => ({
        ...current,
        category: code,
        activityType: tax.activityTypes.find((item) => item.category === code)?.code ?? "",
      }));
      setChoice(null);
    } else {
      setDraft((current) => ({ ...current, [choice]: code }));
      setChoice(null);
    }
  }
  function validated() {
    const instructions = steps
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (draft.name.trim().length < 2)
      throw new Error("Give your exercise a name of at least two characters.");
    if (!draft.primaryMuscles.length) throw new Error("Choose at least one primary muscle.");
    if (
      !instructions.length ||
      instructions.length > 30 ||
      instructions.some((line) => line.length < 2 || line.length > 500)
    )
      throw new Error("Add 1–30 instruction steps, each between 2 and 500 characters.");
    if (
      !tax.activityTypes.some(
        (item) => item.code === draft.activityType && item.category === draft.category,
      )
    )
      throw new Error("Choose an activity that matches the category.");
    return {
      ...draft,
      name: draft.name.trim(),
      description: draft.description.trim(),
      breathingTip: draft.breathingTip.trim(),
      instructions,
    };
  }
  function next() {
    setError("");
    if (step === 0 && (draft.name.trim().length < 2 || !draft.primaryMuscles.length)) {
      setError("Add a name and choose your primary muscles to continue.");
      return;
    }
    if (step === 1) {
      try {
        validated();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Check your instructions.");
        return;
      }
    }
    setStep(step + 1);
  }
  async function save() {
    if (lock.current) return;
    setError("");
    try {
      const input = validated();
      lock.current = true;
      setBusy(true);
      await onSave(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Your draft is kept.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Sheet
      title={choice ? CHOICE_LABELS[choice] : exercise ? "Make it yours." : "Build your movement."}
      eyebrow={
        choice
          ? "EXERCISE DETAILS"
          : `YOUR LIBRARY / ${["THE BASICS", "YOUR TECHNIQUE", "READY TO TRAIN"][step]}`
      }
      subtitle={
        choice
          ? multiple
            ? "Choose every option that applies."
            : "Choose one option."
          : "Private to your FitSync account."
      }
      busy={busy}
      onClose={() => {
        if (!lock.current) onClose();
      }}
      footer={
        choice ? (
          <ProButton
            title={multiple ? "Done" : "Back to exercise"}
            onPress={() => setChoice(null)}
          />
        ) : (
          <View className="gap-3">
            {!!error && (
              <Txt accessibilityRole="alert" className="text-xs leading-5 text-white">
                {error}
              </Txt>
            )}
            <View className="flex-row gap-3">
              {step > 0 && (
                <View className="w-24">
                  <ProButton
                    title="Back"
                    secondary
                    disabled={busy}
                    onPress={() => {
                      setStep(step - 1);
                      setError("");
                    }}
                  />
                </View>
              )}
              <View className="flex-1">
                <ProButton
                  title={
                    step === 2
                      ? "Save exercise"
                      : step === 0
                        ? "Next · technique"
                        : "Review exercise"
                  }
                  loading={busy}
                  onPress={() => (step === 2 ? void save() : next())}
                />
              </View>
            </View>
          </View>
        )
      }
    >
      {choice ? (
        <View className="gap-3">
          {(choice === "primaryMuscles" || choice === "secondaryMuscles") && (
            <View className="flex-row items-center justify-center rounded-[24px] border border-white/10 bg-black/30 py-4">
              <AnatomicalBody size={78} muscles={draft[choice]} />
              <AnatomicalBody size={78} back muscles={draft[choice]} />
            </View>
          )}
          <TextInput
            accessibilityLabel={`Search ${CHOICE_LABELS[choice].toLowerCase()}`}
            value={query}
            onChangeText={setQuery}
            placeholder="Search choices…"
            placeholderTextColor="#666666"
            className="min-h-14 rounded-full border border-white/10 px-4 font-poppins-regular text-sm text-white"
          />
          {multiple && (
            <Txt className="text-[10px] text-muted">
              {(draft[choice] as string[]).length} / 20 selected
            </Txt>
          )}
          {!options.some((item) =>
            `${item.label} ${item.code}`.toLowerCase().includes(query.toLowerCase()),
          ) && (
            <Txt className="py-6 text-center text-xs text-muted">
              No matching choices. Try another search.
            </Txt>
          )}
          {options
            .filter((item) =>
              `${item.label} ${item.code}`.toLowerCase().includes(query.toLowerCase()),
            )
            .map((item) => {
              const value = draft[choice];
              const selected = Array.isArray(value)
                ? value.includes(item.code)
                : value === item.code;
              const disabled = Array.isArray(value) && !selected && value.length >= 20;
              return (
                <Pressable
                  key={item.code}
                  accessibilityRole={multiple ? "checkbox" : "radio"}
                  accessibilityLabel={item.label}
                  accessibilityState={{ checked: selected, disabled }}
                  disabled={disabled}
                  onPress={() => choose(item.code)}
                  className="min-h-14 flex-row items-center justify-between gap-3 rounded-2xl border px-4 py-3"
                  style={{
                    backgroundColor: selected ? "#FFFFFF0D" : "transparent",
                    borderColor: selected ? "#FFFFFF55" : "#FFFFFF0D",
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  <Txt className="min-w-0 flex-1 text-sm">{item.label}</Txt>
                  <MaterialCommunityIcons
                    name={selected ? "check-circle" : "circle-outline"}
                    size={22}
                    color={selected ? "#FFFFFF" : "#555555"}
                  />
                </Pressable>
              );
            })}
        </View>
      ) : (
        <View className="gap-5">
          <View className="mb-1 flex-row gap-2">
            {["Basics", "Technique", "Review"].map((label, index) => (
              <View key={label} className="min-w-0 flex-1">
                <View
                  className={`mb-2 h-1 rounded-full ${index <= step ? "bg-white" : "bg-white/10"}`}
                />
                <Txt
                  className="text-[10px]"
                  style={{ color: index === step ? "#FFFFFF" : "#777777" }}
                >
                  {String(index + 1).padStart(2, "0")} · {label}
                </Txt>
              </View>
            ))}
          </View>
          {step === 0 ? (
            <>
              <Field
                label="Custom exercise name"
                value={draft.name}
                onChange={(value) => patch("name", value)}
                placeholder="e.g. My cable lateral raise"
              />
              <View>
                <Txt weight="medium" className="mb-3 text-base">
                  How will you track it?
                </Txt>
                <View className="gap-2">
                  {(
                    Object.entries(TRACKING) as [
                      Exercise["trackingType"],
                      (typeof TRACKING)[keyof typeof TRACKING],
                    ][]
                  ).map(([key, item]) => (
                    <Pressable
                      key={key}
                      accessibilityRole="radio"
                      accessibilityLabel={item.label}
                      accessibilityState={{ checked: draft.trackingType === key }}
                      onPress={() => patch("trackingType", key)}
                      className="min-h-20 flex-row items-center gap-3 rounded-[22px] border p-4"
                      style={{
                        borderColor: draft.trackingType === key ? "#FFFFFF66" : "#FFFFFF0D",
                        backgroundColor: draft.trackingType === key ? "#FFFFFF0A" : "#FFFFFF02",
                      }}
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-white/5">
                        <MaterialCommunityIcons name={item.icon} size={21} color="#FFFFFF" />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Txt weight="medium" className="text-sm">
                          {item.label}
                        </Txt>
                        <Txt className="mt-1 text-[10px] leading-5 text-muted">{item.detail}</Txt>
                      </View>
                      <MaterialCommunityIcons
                        name={draft.trackingType === key ? "radiobox-marked" : "radiobox-blank"}
                        size={21}
                        color={draft.trackingType === key ? "#FFFFFF" : "#555555"}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
              <SelectRow
                title="Primary muscles"
                value={names(draft.primaryMuscles, tax.muscleGroups)}
                onPress={() => openChoice("primaryMuscles")}
              />
              <SelectRow
                title="Supporting muscles"
                optional
                value={names(draft.secondaryMuscles, tax.muscleGroups) || "Add supporting muscles"}
                onPress={() => openChoice("secondaryMuscles")}
              />
              <SelectRow
                title="Equipment"
                optional
                value={names(draft.equipment, tax.equipmentTypes) || "No equipment selected"}
                onPress={() => openChoice("equipment")}
              />
              <Txt className="text-[10px] leading-5 text-muted">
                Muscle labels connect your movement to muscle insights. For weight & reps, record
                external resistance. Once used in training, its tracking type is fixed.
              </Txt>
            </>
          ) : step === 1 ? (
            <>
              <View className="rounded-[24px] bg-white p-5">
                <Txt weight="medium" className="text-lg text-black">
                  A good set starts with a clear cue.
                </Txt>
                <Txt className="mt-2 text-xs leading-5 text-black/60">
                  Write the setup and movement, one step per line. These instructions stay with your
                  exercise.
                </Txt>
              </View>
              <Field
                label="Custom exercise instructions"
                value={steps}
                onChange={setSteps}
                multiline
                maxLength={15000}
                placeholder={
                  "Set up your equipment…\nMove through a comfortable range…\nReturn with control…"
                }
              />
              <Field
                label="Custom exercise notes"
                value={draft.description}
                onChange={(value) => patch("description", value)}
                multiline
                maxLength={2000}
                placeholder="Setup details, handles, or cues you want to remember"
              />
              <Field
                label="Breathing cue · optional"
                value={draft.breathingTip}
                onChange={(value) => patch("breathingTip", value)}
                maxLength={500}
                placeholder="A cue that works for this movement"
              />
            </>
          ) : (
            <>
              <View className="rounded-[26px] border border-white/10 bg-white/[0.03] p-5">
                <Txt className="text-[10px] tracking-[1px] text-muted">YOUR CUSTOM EXERCISE</Txt>
                <Txt weight="medium" className="mt-3 text-2xl leading-8 tracking-[-0.6px]">
                  {draft.name}
                </Txt>
                <Txt className="mt-3 text-xs leading-6 text-muted">
                  {TRACKING[draft.trackingType].label} ·{" "}
                  {names(draft.primaryMuscles, tax.muscleGroups)}
                </Txt>
                {draft.equipment.length > 0 && (
                  <Txt className="mt-2 text-[11px] leading-5 text-muted">
                    {names(draft.equipment, tax.equipmentTypes)}
                  </Txt>
                )}
              </View>
              <View>
                <Txt weight="medium" className="mb-3 text-base">
                  Your technique
                </Txt>
                {steps
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, index) => (
                    <View key={index} className="mb-3 flex-row gap-3">
                      <View className="h-7 w-7 items-center justify-center rounded-full bg-white/5">
                        <Txt className="text-[10px]">{index + 1}</Txt>
                      </View>
                      <Txt className="min-w-0 flex-1 text-xs leading-6 text-muted">{line}</Txt>
                    </View>
                  ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="More exercise details"
                accessibilityState={{ expanded: more }}
                onPress={() => setMore(!more)}
                className="min-h-16 flex-row items-center justify-between rounded-[22px] border border-white/10 px-4"
              >
                <View className="min-w-0 flex-1">
                  <Txt weight="medium" className="text-sm">
                    More details
                  </Txt>
                  <Txt className="mt-1 text-[10px] text-muted">
                    Classification, movement and difficulty
                  </Txt>
                </View>
                <MaterialCommunityIcons
                  name={more ? "chevron-up" : "chevron-down"}
                  size={21}
                  color="#A3A3A3"
                />
              </Pressable>
              {more && (
                <View className="gap-3">
                  {(
                    [
                      "category",
                      "activityType",
                      "bodyRegion",
                      "movementPattern",
                      "difficulty",
                    ] as Choice[]
                  ).map((key) => (
                    <SelectRow
                      key={key}
                      title={CHOICE_LABELS[key]}
                      value={pretty(String(draft[key]))}
                      onPress={() => openChoice(key)}
                    />
                  ))}
                </View>
              )}
              <Txt className="text-xs leading-6 text-muted">
                Save it once. Find it under My exercises in the catalog and add it to workouts or
                routines. Your existing exercises stay available after Pro ends.
              </Txt>
            </>
          )}
        </View>
      )}
    </Sheet>
  );
}
