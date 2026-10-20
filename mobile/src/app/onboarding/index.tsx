import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  View
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { C } from "@/src/constants/theme";
import { PrimaryButton, Txt } from "@/src/components/ui";

import {
  useSession,
  type BodyType,
  type Equipment,
  type Experience,
  type Gender,
  type Goal,
  type Profile
} from "@/src/context/session";

import {
  OnboardingArt,
  BodyFigure,
  type ArtVariant
} from "@/src/components/onboarding/onboarding-art";

import { MetricPicker } from "@/src/components/onboarding/metric-picker";
import { OptionCard } from "@/src/components/onboarding/option-card";

// ======================================================
// TYPES
// ======================================================

type Draft = Omit<Profile, "completedAt">;

type StepConfig = {
  eyebrow: string;
  title: string;
  description: string;
  artwork: ArtVariant;
};

type IconName =
  keyof typeof MaterialCommunityIcons.glyphMap;

// ======================================================
// CONSTANTS
// ======================================================

const STORAGE_PREFIX = "@fitsync/onboarding/v3";

const DEFAULT_DRAFT: Draft = {
  gender: "prefer_not_to_say",
  heightCm: 175,
  weightKg: 70,
  bodyType: null,

  goal: "muscle",
  experience: "beginner",

  trainingDays: 4,
  minutesPerWorkout: 45,
  equipment: "gym"
};

const STEPS: StepConfig[] = [
  {
    eyebrow: "THE BEGINNING / 001",
    title: "BUILT FOR YOUR NEXT LEVEL.",
    description:
      "Before your first rep, let's build a training profile that actually fits your life.",
    artwork: "welcome"
  },
  {
    eyebrow: "YOUR IDENTITY / 002",
    title: "HOW DO YOU IDENTIFY?",
    description:
      "This is optional and can be changed whenever you want.",
    artwork: "gender"
  },
  {
    eyebrow: "YOUR BASELINE / 003",
    title: "HOW TALL ARE YOU?",
    description:
      "Move the ruler to enter your height. You can always update it later.",
    artwork: "height"
  },
  {
    eyebrow: "YOUR BASELINE / 004",
    title: "WHAT'S YOUR WEIGHT?",
    description:
      "Just your current weight. There is no perfect number you need to be.",
    artwork: "weight"
  },
  {
    eyebrow: "YOUR FRAME / 005",
    title: "WHICH BUILD IS CLOSEST?",
    description:
      "Pick a general description of your current body frame, or skip this.",
    artwork: "build"
  },
  {
    eyebrow: "YOUR MISSION / 006",
    title: "WHAT ARE WE TRAINING FOR?",
    description:
      "Choose the goal that matters most to you right now.",
    artwork: "goal"
  },
  {
    eyebrow: "YOUR START / 007",
    title: "WHERE ARE YOU STARTING?",
    description:
      "We'll use your experience level to select suitable training plans.",
    artwork: "experience"
  },
  {
    eyebrow: "YOUR COMMITMENT / 008",
    title: "HOW OFTEN CAN YOU SHOW UP?",
    description:
      "Choose a realistic weekly training frequency, not the highest number.",
    artwork: "days"
  },
  {
    eyebrow: "YOUR ENVIRONMENT / 009",
    title: "WHAT DO YOU TRAIN WITH?",
    description:
      "Your available equipment and time will help us choose workouts.",
    artwork: "equipment"
  },
  {
    eyebrow: "READY TO START / 010",
    title: "YOUR NEXT CHAPTER STARTS NOW.",
    description:
      "Review everything. Once you finish, your FitSync profile will be saved.",
    artwork: "complete"
  }
];

const GOALS: {
  value: Goal;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    value: "muscle",
    title: "Build muscle",
    description: "Focus on muscle growth and getting stronger.",
    icon: "arm-flex"
  },
  {
    value: "strength",
    title: "Build strength",
    description: "Improve strength in your major lifts.",
    icon: "weight-lifter"
  },
  {
    value: "fat_loss",
    title: "Lose fat",
    description: "Support body composition goals with training.",
    icon: "fire"
  },
  {
    value: "fitness",
    title: "General fitness",
    description: "Build consistency, energy, and overall fitness.",
    icon: "heart-pulse"
  }
];

const EXPERIENCE_OPTIONS: {
  value: Experience;
  title: string;
  description: string;
}[] = [
  {
    value: "beginner",
    title: "I'm just starting",
    description: "New to gym training or returning after a long break."
  },
  {
    value: "intermediate",
    title: "I train regularly",
    description: "Comfortable with the main exercises and equipment."
  },
  {
    value: "advanced",
    title: "I'm experienced",
    description: "Have a consistent training background."
  }
];

const EQUIPMENT_OPTIONS: {
  value: Equipment;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    value: "gym",
    title: "Full gym",
    description: "Machines, cables, barbells, and dumbbells.",
    icon: "dumbbell"
  },
  {
    value: "dumbbells",
    title: "Dumbbells",
    description: "Free weights and a simpler setup.",
    icon: "weight"
  },
  {
    value: "bodyweight",
    title: "Bodyweight",
    description: "Train with little or no equipment.",
    icon: "human-handsup"
  }
];

const GOAL_LABELS: Record<Goal, string> = {
  muscle: "Build muscle",
  strength: "Build strength",
  fat_loss: "Lose fat",
  fitness: "General fitness"
};

// ======================================================
// SCREEN
// ======================================================

export default function OnboardingScreen() {
  const router = useRouter();

  const {
    user,
    settings,
    saveProfile
  } = useSession();

  const [step, setStep] = useState(0);

  const [draft, setDraft] = useState<Draft>(
    DEFAULT_DRAFT
  );

  const [loadedKey, setLoadedKey] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  const completedRef = useRef(false);

  const fade = useRef(
    new Animated.Value(1)
  ).current;

  const translate = useRef(
    new Animated.Value(0)
  ).current;

  const draftKey = user?.id
    ? `${STORAGE_PREFIX}/${user.id}`
    : null;

  const currentStep = STEPS[step];

  const isOptionalStep =
    step === 1 || step === 4;

  // ====================================================
  // RESTORE CURRENT USER'S DRAFT
  // ====================================================

  useEffect(() => {
    let active = true;

    setLoadedKey(null);
    setDraft(DEFAULT_DRAFT);

    if (!draftKey) {
      return () => {
        active = false;
      };
    }

    async function restoreDraft() {
      try {
        const raw = await AsyncStorage.getItem(draftKey!);

        if (!active) return;

        if (raw) {
          const parsed = JSON.parse(raw) as Partial<Draft>;

          setDraft({
            ...DEFAULT_DRAFT,
            ...parsed
          });
        }
      } catch (error) {
        console.warn(
          "Could not restore onboarding draft",
          error
        );
      } finally {
        if (active) {
          setLoadedKey(draftKey);
        }
      }
    }

    void restoreDraft();

    return () => {
      active = false;
    };
  }, [draftKey]);

  // ====================================================
  // AUTOSAVE DRAFT
  // ====================================================

  useEffect(() => {
    if (
      !draftKey ||
      loadedKey !== draftKey ||
      completedRef.current
    ) {
      return;
    }

    const timer = setTimeout(() => {
      AsyncStorage.setItem(
        draftKey,
        JSON.stringify(draft)
      ).catch(error => {
        console.warn(
          "Could not save onboarding draft",
          error
        );
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [draft, draftKey, loadedKey]);

  // ====================================================
  // ANIMATE STEP TRANSITIONS
  // ====================================================

  useEffect(() => {
    fade.setValue(0);
    translate.setValue(18);

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true
      }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 340,
        useNativeDriver: true
      })
    ]).start();
  }, [step, fade, translate]);

  // ====================================================
  // HELPERS
  // ====================================================

  function updateDraft<K extends keyof Draft>(
    key: K,
    value: Draft[K]
  ) {
    setDraft(previous => ({
      ...previous,
      [key]: value
    }));
  }

  function choose<K extends keyof Draft>(
    key: K,
    value: Draft[K]
  ) {
    void Haptics.selectionAsync();
    updateDraft(key, value);
  }

  function goBack() {
    if (step === 0 || saving) return;

    void Haptics.selectionAsync();

    setStep(previous => previous - 1);
  }

  function skip() {
    if (!isOptionalStep || saving) return;

    if (step === 1) {
      updateDraft(
        "gender",
        "prefer_not_to_say"
      );
    }

    if (step === 4) {
      updateDraft("bodyType", null);
    }

    setStep(previous => previous + 1);
  }

  async function next() {
    if (saving) return;

    await Haptics.selectionAsync();

    if (step < STEPS.length - 1) {
      setStep(previous => previous + 1);
      return;
    }

    const valid =
      Number.isFinite(draft.heightCm) &&
      draft.heightCm >= 100 &&
      draft.heightCm <= 250 &&
      Number.isFinite(draft.weightKg) &&
      draft.weightKg >= 25 &&
      draft.weightKg <= 350;

    if (!valid) {
      Alert.alert(
        "Check your measurements",
        "Your height or weight is outside the supported range."
      );
      return;
    }

    setSaving(true);

    try {
      const profile: Profile = {
        ...draft,
        completedAt: new Date().toISOString()
      };

      // Sends profile data to the Express backend.
      await saveProfile(profile);

      completedRef.current = true;

      if (draftKey) {
        await AsyncStorage.removeItem(draftKey);
      }

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Couldn't complete setup",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ====================================================
  // STEP 0 — WELCOME
  // ====================================================

  function renderWelcome() {
    return (
      <View className="mt-6 rounded-[26px] border border-border bg-panel p-5">
        <Txt
          weight="extra"
          className="text-[23px] tracking-tight"
        >
          THIS IS YOUR STARTING LINE.
        </Txt>

        <Txt className="mt-3 text-sm leading-6 text-muted">
          Tell us a little about yourself so FitSync can
          prepare a training experience that fits your
          goals, schedule, and equipment.
        </Txt>

        <View className="mt-5 flex-row flex-wrap gap-2">
          {[
            "YOUR BODY",
            "YOUR GOAL",
            "YOUR TRAINING"
          ].map(label => (
            <View
              key={label}
              className="rounded-full bg-elevated px-3 py-2"
            >
              <Txt
                weight="bold"
                className="text-[10px] tracking-wide text-brand"
              >
                {label}
              </Txt>
            </View>
          ))}
        </View>
      </View>
    );
  }

  // ====================================================
  // STEP 1 — GENDER
  // ====================================================

  function renderGender() {
    const options: {
      value: Gender;
      title: string;
      icon: IconName;
    }[] = [
      {
        value: "male",
        title: "Male",
        icon: "human-male"
      },
      {
        value: "female",
        title: "Female",
        icon: "human-female"
      },
      {
        value: "prefer_not_to_say",
        title: "Prefer not to say",
        icon: "account-outline"
      }
    ];

    return (
      <View className="mt-6">
        {options.map(option => (
          <OptionCard
            key={option.value}
            icon={option.icon}
            title={option.title}
            selected={draft.gender === option.value}
            onPress={() =>
              choose("gender", option.value)
            }
          />
        ))}

        <Txt className="mt-3 text-xs leading-5 text-muted">
          This field is optional and won't determine what
          you're capable of lifting.
        </Txt>
      </View>
    );
  }

  // ====================================================
  // STEP 2 — HEIGHT
  // ====================================================

  function renderHeight() {
    return (
      <View className="mt-6">
        <MetricPicker
          min={100}
          max={250}
          step={1}
          value={draft.heightCm}
          onChange={value =>
            updateDraft("heightCm", value)
          }
          unit="cm"
        />

        <View className="mt-5 flex-row items-center justify-center">
          <MaterialCommunityIcons
            name="information-outline"
            size={16}
            color={C.muted}
          />

          <Txt className="ml-2 text-xs text-muted">
            You can change this measurement later.
          </Txt>
        </View>
      </View>
    );
  }

  // ====================================================
  // STEP 3 — WEIGHT
  // ====================================================

  function renderWeight() {
    const unit = settings?.weightUnit ?? "kg";

    const displayValue =
      unit === "lb"
        ? Number(
            (draft.weightKg * 2.2046226218).toFixed(1)
          )
        : draft.weightKg;

    return (
      <View className="mt-6">
        <MetricPicker
          min={unit === "lb" ? 55 : 25}
          max={unit === "lb" ? 770 : 350}
          step={unit === "lb" ? 1 : 0.5}
          decimals={1}
          value={displayValue}
          onChange={value => {
            const kilograms =
              unit === "lb"
                ? value / 2.2046226218
                : value;

            updateDraft(
              "weightKg",
              Number(kilograms.toFixed(1))
            );
          }}
          unit={unit}
        />

        <View className="mt-5 rounded-2xl border border-border bg-panel p-4">
          <Txt
            weight="bold"
            className="text-xs text-brand"
          >
            YOUR BASELINE
          </Txt>

          <Txt className="mt-2 text-sm leading-6 text-muted">
            We'll use this as your starting measurement.
            FitSync stores body weight in kilograms
            internally, regardless of your preferred unit.
          </Txt>
        </View>
      </View>
    );
  }

  // ====================================================
  // STEP 4 — BODY BUILD
  // ====================================================

  function renderBodyBuild() {
    const options: {
      value: BodyType;
      title: string;
    }[] = [
      {
        value: "slim",
        title: "Slim"
      },
      {
        value: "medium",
        title: "Medium"
      },
      {
        value: "broad",
        title: "Broad"
      }
    ];

    return (
      <View className="mt-6">
        <View className="flex-row gap-2">
          {options.map(option => {
            const selected =
              draft.bodyType === option.value;

            return (
              <Pressable
                key={option.value}
                onPress={() =>
                  choose("bodyType", option.value)
                }
                className={`flex-1 items-center rounded-[22px] border px-2 pb-5 pt-4 ${
                  selected
                    ? "border-brand bg-[#2B211B]"
                    : "border-border bg-panel"
                }`}
              >
                <BodyFigure
                  frame={option.value}
                  size={65}
                  color={
                    selected ? C.brand : C.ink
                  }
                />

                <Txt
                  weight="bold"
                  className="mt-4 text-sm"
                >
                  {option.title}
                </Txt>

                <MaterialCommunityIcons
                  name={
                    selected
                      ? "check-circle"
                      : "circle-outline"
                  }
                  size={23}
                  color={
                    selected ? C.brand : C.muted
                  }
                  style={{ marginTop: 12 }}
                />
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6 rounded-2xl bg-elevated p-4">
          <Txt className="text-xs leading-5 text-muted">
            Body shape is only a personal description.
            It doesn't determine your fitness level,
            strength, or recommended exercises.
          </Txt>
        </View>
      </View>
    );
  }

  // ====================================================
  // STEP 5 — GOAL
  // ====================================================

  function renderGoal() {
    return (
      <View className="mt-6">
        {GOALS.map(option => (
          <OptionCard
            key={option.value}
            icon={option.icon}
            title={option.title}
            description={option.description}
            selected={
              draft.goal === option.value
            }
            onPress={() =>
              choose("goal", option.value)
            }
          />
        ))}
      </View>
    );
  }

  // ====================================================
  // STEP 6 — EXPERIENCE
  // ====================================================

  function renderExperience() {
    return (
      <View className="mt-6">
        {EXPERIENCE_OPTIONS.map(option => (
          <OptionCard
            key={option.value}
            icon="dumbbell"
            title={option.title}
            description={option.description}
            selected={
              draft.experience === option.value
            }
            onPress={() =>
              choose("experience", option.value)
            }
          />
        ))}
      </View>
    );
  }

  // ====================================================
  // STEP 7 — TRAINING DAYS
  // ====================================================

  function renderTrainingDays() {
    return (
      <View className="mt-6">
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {[2, 3, 4, 5, 6].map(days => {
            const selected =
              draft.trainingDays === days;

            return (
              <Pressable
                key={days}
                onPress={() =>
                  choose("trainingDays", days)
                }
                className={`w-[30%] items-center rounded-[23px] border py-5 ${
                  selected
                    ? "border-brand bg-brand"
                    : "border-border bg-panel"
                }`}
              >
                <Txt
                  weight="extra"
                  className="text-[34px]"
                  style={{
                    color: selected
                      ? C.bg
                      : C.ink
                  }}
                >
                  {days}
                </Txt>

                <Txt
                  weight="bold"
                  className="mt-1 text-xs"
                  style={{
                    color: selected
                      ? C.bg
                      : C.muted
                  }}
                >
                  DAYS
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6 rounded-2xl border border-border bg-panel p-5">
          <Txt weight="bold" className="text-base">
            {draft.trainingDays} training days per week
          </Txt>

          <Txt className="mt-2 text-sm leading-6 text-muted">
            That leaves {7 - draft.trainingDays} other
            days for rest, recovery, and other activities.
            Your schedule can change later.
          </Txt>
        </View>
      </View>
    );
  }

  // ====================================================
  // STEP 8 — EQUIPMENT AND DURATION
  // ====================================================

  function renderTrainingSetup() {
    return (
      <View className="mt-6">
        <Txt
          weight="bold"
          className="mb-3 text-xs tracking-[1px] text-brand"
        >
          WHERE WILL YOU TRAIN?
        </Txt>

        {EQUIPMENT_OPTIONS.map(option => (
          <OptionCard
            key={option.value}
            icon={option.icon}
            title={option.title}
            description={option.description}
            selected={
              draft.equipment === option.value
            }
            onPress={() =>
              choose("equipment", option.value)
            }
          />
        ))}

        <Txt
          weight="bold"
          className="mb-3 mt-6 text-xs tracking-[1px] text-brand"
        >
          HOW MUCH TIME DO YOU HAVE?
        </Txt>

        <View className="flex-row gap-2">
          {([30, 45, 60] as const).map(minutes => {
            const selected =
              draft.minutesPerWorkout === minutes;

            return (
              <Pressable
                key={minutes}
                onPress={() =>
                  choose(
                    "minutesPerWorkout",
                    minutes
                  )
                }
                className={`flex-1 items-center rounded-2xl border py-5 ${
                  selected
                    ? "border-brand bg-brand"
                    : "border-border bg-panel"
                }`}
              >
                <Txt
                  weight="extra"
                  className="text-[29px]"
                  style={{
                    color: selected
                      ? C.bg
                      : C.ink
                  }}
                >
                  {minutes}
                </Txt>

                <Txt
                  weight="medium"
                  className="text-xs"
                  style={{
                    color: selected
                      ? C.bg
                      : C.muted
                  }}
                >
                  MINUTES
                </Txt>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // ====================================================
  // STEP 9 — SUMMARY
  // ====================================================

  function renderReview() {
    const rows = [
      ["Fitness goal", GOAL_LABELS[draft.goal]],
      ["Experience", draft.experience],
      [
        "Gender",
        draft.gender === "prefer_not_to_say"
          ? "Not specified"
          : draft.gender
      ],
      ["Height", `${draft.heightCm} cm`],
      ["Weight", `${draft.weightKg} kg`],
      [
        "Body build",
        draft.bodyType || "Not specified"
      ],
      [
        "Training days",
        `${draft.trainingDays} days/week`
      ],
      [
        "Workout duration",
        `${draft.minutesPerWorkout} min`
      ],
      ["Equipment", draft.equipment]
    ];

    return (
      <View className="mt-6 rounded-[26px] border border-border bg-panel p-5">
        <Txt
          weight="extra"
          className="mb-3 text-xl"
        >
          YOUR STARTING PROFILE
        </Txt>

        {rows.map(([label, value]) => (
          <View
            key={label}
            className="flex-row items-center justify-between border-b border-border py-3.5"
          >
            <Txt className="flex-1 text-sm text-muted">
              {label}
            </Txt>

            <Txt
              weight="bold"
              className="flex-1 text-right text-sm capitalize"
            >
              {value}
            </Txt>
          </View>
        ))}

        <View className="mt-5 flex-row items-start">
          <MaterialCommunityIcons
            name="check-circle-outline"
            color={C.brand}
            size={21}
          />

          <Txt className="ml-3 flex-1 text-xs leading-5 text-muted">
            This information will be saved to your
            FitSync account. You can update it later
            from Edit Profile.
          </Txt>
        </View>
      </View>
    );
  }

  // ====================================================
  // RENDER STEP
  // ====================================================

  function renderContent() {
    switch (step) {
      case 0:
        return renderWelcome();

      case 1:
        return renderGender();

      case 2:
        return renderHeight();

      case 3:
        return renderWeight();

      case 4:
        return renderBodyBuild();

      case 5:
        return renderGoal();

      case 6:
        return renderExperience();

      case 7:
        return renderTrainingDays();

      case 8:
        return renderTrainingSetup();

      case 9:
        return renderReview();

      default:
        return null;
    }
  }

  // ====================================================
  // LOADING
  // ====================================================

  if (!draftKey || loadedKey !== draftKey) {
    return <View className="flex-1 bg-bg" />;
  }

  // ====================================================
  // SCREEN
  // ====================================================

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}

      <View className="flex-row items-center justify-between px-6 pb-4 pt-5">
        <Pressable
          disabled={step === 0 || saving}
          onPress={goBack}
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-panel"
        >
          <MaterialCommunityIcons
            name={
              step === 0
                ? "lightning-bolt"
                : "arrow-left"
            }
            size={23}
            color={
              step === 0
                ? C.brand
                : C.ink
            }
          />
        </Pressable>

        <Txt
          weight="extra"
          className="text-lg tracking-tight"
        >
          FIT
          <Txt
            weight="extra"
            className="text-lg text-brand"
          >
            SYNC
          </Txt>
        </Txt>

        <Txt
          weight="bold"
          className="text-xs text-muted"
        >
          {String(step + 1).padStart(2, "0")} / 10
        </Txt>
      </View>

      {/* Progress indicator */}

      <View className="mx-6 mb-3 h-1.5 overflow-hidden rounded-full bg-elevated">
        <View
          className="h-full rounded-full bg-brand"
          style={{
            width: `${
              ((step + 1) / STEPS.length) * 100
            }%`
          }}
        />
      </View>

      {/* Content */}

      <ScrollView
        key={step}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 14,
          paddingBottom: 35
        }}
      >
        <Animated.View
          style={{
            opacity: fade,
            transform: [
              { translateY: translate }
            ]
          }}
        >
          <Txt
            weight="bold"
            className="mb-3 text-xs tracking-[2px] text-brand"
          >
            {currentStep.eyebrow}
          </Txt>

          <Txt
            weight="extra"
            className="text-[35px] leading-[39px] tracking-tight"
          >
            {currentStep.title}
          </Txt>

          <Txt className="mb-6 mt-3 text-sm leading-6 text-muted">
            {currentStep.description}
          </Txt>

          <OnboardingArt
            variant={currentStep.artwork}
            height={step === 9 ? 170 : 205}
          />

          {renderContent()}
        </Animated.View>
      </ScrollView>

      {/* Footer */}

      <View className="border-t border-border bg-bg px-6 pb-6 pt-4">
        <PrimaryButton
          title={
            step === 0
              ? "LET'S BEGIN →"
              : step === 9
                ? "FINISH MY SETUP →"
                : "CONTINUE →"
          }
          onPress={next}
          loading={saving}
          disabled={saving}
        />

        {isOptionalStep && (
          <Pressable
            disabled={saving}
            onPress={skip}
            className="items-center py-3"
          >
            <Txt
              weight="semibold"
              className="text-xs text-muted"
            >
              SKIP THIS QUESTION
            </Txt>
          </Pressable>
        )}
      </View>
    </View>
  );
}