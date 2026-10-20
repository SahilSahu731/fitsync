
import React, { useState } from "react";

import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { C } from "@/src/constants/theme";
import { PrimaryButton, Txt } from "@/src/components/ui";

import {
  type Equipment,
  type Experience,
  type Gender,
  type Goal,
  type Profile,
  useSession
} from "@/src/context/session";

type IconName =
  keyof typeof MaterialCommunityIcons.glyphMap;

const goals: {
  id: Goal;
  icon: IconName;
  title: string;
  detail: string;
}[] = [
  {
    id: "muscle",
    icon: "arm-flex",
    title: "Build muscle",
    detail: "Grow size and strength"
  },
  {
    id: "strength",
    icon: "weight-lifter",
    title: "Get stronger",
    detail: "Focus on progressive lifting"
  },
  {
    id: "fat_loss",
    icon: "fire",
    title: "Lose fat",
    detail: "Stay active and build strength"
  },
  {
    id: "fitness",
    icon: "heart-pulse",
    title: "Feel fitter",
    detail: "Move, train, feel better"
  }
];

const experiences: {
  id: Experience;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "beginner",
    title: "Just starting",
    subtitle: "New to gym training"
  },
  {
    id: "intermediate",
    title: "I have a routine",
    subtitle: "I train fairly regularly"
  },
  {
    id: "advanced",
    title: "Experienced",
    subtitle: "Comfortable with most lifts"
  }
];

const equipmentOptions: {
  id: Equipment;
  title: string;
  icon: IconName;
}[] = [
  {
    id: "gym",
    title: "Full gym",
    icon: "dumbbell"
  },
  {
    id: "dumbbells",
    title: "Dumbbells",
    icon: "weight"
  },
  {
    id: "bodyweight",
    title: "Bodyweight",
    icon: "human-handsup"
  }
];

function Choice({
  selected,
  title,
  subtitle,
  icon,
  onPress
}: {
  selected: boolean;
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 flex-row items-center rounded-2xl border p-4 ${selected ? "border-brand bg-[#28201B]" : "border-border bg-panel"}`}
    >
      {icon ? (
        <View
          className={`mr-4 h-11 w-11 items-center justify-center rounded-xl ${selected ? "bg-brand" : "bg-elevated"}`}
        >
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={selected ? C.bg : C.ink}
          />
        </View>
      ) : null}

      <View className="flex-1">
        <Txt weight="bold" className="text-base">
          {title}
        </Txt>

        {subtitle ? (
          <Txt className="mt-0.5 text-xs text-muted">
            {subtitle}
          </Txt>
        ) : null}
      </View>

      <MaterialCommunityIcons
        name={selected ? "check-circle" : "circle-outline"}
        size={23}
        color={selected ? C.brand : C.muted}
      />
    </Pressable>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, saveProfile } = useSession();

  const [step, setStep] = useState(0);

  const [goal, setGoal] = useState<Goal>("muscle");
  const [experience, setExperience] =
    useState<Experience>("beginner");

  const [height, setHeight] = useState("175");
  const [weight, setWeight] = useState("70");

  const [gender, setGender] =
    useState<Gender>("prefer_not_to_say");

  const [days, setDays] = useState(4);

  const [minutes, setMinutes] =
    useState<30 | 45 | 60>(45);

  const [gear, setGear] =
    useState<Equipment>("gym");

  const [saving, setSaving] = useState(false);

  const headings = [
    [
      "WHY ARE YOU HERE?",
      "Pick your main goal. You can change it later."
    ],
    [
      "YOUR STARTING POINT.",
      "A plan should fit your experience."
    ],
    [
      "KNOW YOUR START.",
      "These numbers help personalize your setup."
    ],
    [
      "MAKE IT FIT.",
      "How often can you actually train?"
    ],
    [
      "WHERE DO YOU TRAIN?",
      "Almost ready. Your equipment matters."
    ]
  ];

  const validateMeasurements = () => {
    const h = Number(height);
    const w = Number(weight);

    const invalid =
      !Number.isFinite(h) ||
      h < 100 ||
      h > 250 ||
      !Number.isFinite(w) ||
      w < 25 ||
      w > 350;

    if (invalid) {
      Alert.alert(
        "Check your measurements",
        "Enter a height between 100–250 cm and weight between 25–350 kg."
      );

      return false;
    }

    return true;
  };

  const next = async () => {
    if (step === 2 && !validateMeasurements()) {
      return;
    }

    Haptics.selectionAsync();

    if (step < 4) {
      setStep(current => current + 1);
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      const profile: Profile = {
        goal,
        experience,
        weightKg: Number(weight),
        heightCm: Number(height),
        gender,
        trainingDays: days,
        minutesPerWorkout: minutes,
        equipment: gear,
        completedAt: new Date().toISOString()
      };

      await saveProfile(profile);

      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Could not save setup",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}

      <View className="flex-row items-center justify-between px-6 pb-3 pt-6">
        <Pressable
          onPress={() => {
            if (step > 0) {
              setStep(value => value - 1);
            }
          }}
          className="h-10 w-10 items-center justify-center rounded-full border border-border"
        >
          <MaterialCommunityIcons
            name={step === 0 ? "flash" : "arrow-left"}
            color={C.ink}
            size={22}
          />
        </Pressable>

        <Txt
          weight="bold"
          className="text-xs tracking-[2px] text-muted"
        >
          YOUR SETUP / {String(step + 1).padStart(2, "0")}
        </Txt>

        <Txt weight="bold" className="text-xs text-brand">
          {step + 1} / 5
        </Txt>
      </View>

      {/* Progress indicator */}

      <View className="mb-6 flex-row gap-1.5 px-6">
        {Array.from({ length: 5 }, (_, i) => (
          <View
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-elevated"}`}
          />
        ))}
      </View>

      {/* Content */}

      <ScrollView
        key={step}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 25
        }}
      >
        <Txt
          weight="medium"
          className="mt-3 text-sm text-brand"
        >
          LET'S BUILD YOUR PLAN
          {user?.name
            ? `, ${user.name.split(" ")[0].toUpperCase()}`
            : ""}
        </Txt>

        <Txt
          weight="extra"
          className="mt-3 text-[36px] leading-[40px] tracking-tight"
        >
          {headings[step][0]}
        </Txt>

        <Txt className="mb-9 mt-3 text-[15px] leading-6 text-muted">
          {headings[step][1]}
        </Txt>

        {/* Step 1 — Goal */}

        {step === 0
          ? goals.map(item => (
              <Choice
                key={item.id}
                icon={item.icon}
                selected={goal === item.id}
                title={item.title}
                subtitle={item.detail}
                onPress={() => setGoal(item.id)}
              />
            ))
          : null}

        {/* Step 2 — Experience */}

        {step === 1
          ? experiences.map(item => (
              <Choice
                key={item.id}
                selected={experience === item.id}
                title={item.title}
                subtitle={item.subtitle}
                onPress={() => setExperience(item.id)}
              />
            ))
          : null}

        {/* Step 3 — Measurements */}

        {step === 2 ? (
          <View>
            <Txt weight="bold" className="mb-2 text-sm text-muted">
              HEIGHT (CM)
            </Txt>

            <View className="mb-5 flex-row items-center rounded-2xl border border-border bg-panel px-5 py-3">
              <TextInput
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="175"
                placeholderTextColor={C.muted}
                className="flex-1 text-3xl text-ink"
                style={{ fontFamily: "Outfit_700Bold" }}
              />

              <Txt weight="semibold" className="text-sm text-muted">
                cm
              </Txt>
            </View>

            <Txt weight="bold" className="mb-2 text-sm text-muted">
              CURRENT WEIGHT (KG)
            </Txt>

            <View className="mb-6 flex-row items-center rounded-2xl border border-border bg-panel px-5 py-3">
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                maxLength={6}
                placeholder="70"
                placeholderTextColor={C.muted}
                className="flex-1 text-3xl text-ink"
                style={{ fontFamily: "Outfit_700Bold" }}
              />

              <Txt weight="semibold" className="text-sm text-muted">
                kg
              </Txt>
            </View>

            <Txt weight="bold" className="mb-3 text-sm text-muted">
              GENDER (OPTIONAL)
            </Txt>

            {(
              [
                ["male", "Male"],
                ["female", "Female"],
                ["prefer_not_to_say", "Prefer not to say"]
              ] as const
            ).map(([value, title]) => (
              <Choice
                key={value}
                title={title}
                selected={gender === value}
                onPress={() => setGender(value)}
              />
            ))}

            <Txt className="mt-3 text-xs text-muted">
              Optional profile information, not a medical assessment.
            </Txt>
          </View>
        ) : null}

        {/* Step 4 — Training frequency */}

        {step === 3 ? (
          <View>
            <Txt weight="bold" className="mb-4 text-sm text-muted">
              TRAINING DAYS / WEEK
            </Txt>

            <View className="mb-8 flex-row gap-2">
              {[2, 3, 4, 5, 6].map(value => (
                <Pressable
                  key={value}
                  onPress={() => setDays(value)}
                  className={`h-14 flex-1 items-center justify-center rounded-2xl border ${days === value ? "border-brand bg-brand" : "border-border bg-panel"}`}
                >
                  <Txt
                    weight="extra"
                    className="text-xl"
                    style={{
                      color: days === value ? C.bg : C.ink
                    }}
                  >
                    {value}
                  </Txt>
                </Pressable>
              ))}
            </View>

            <Txt weight="bold" className="mb-4 text-sm text-muted">
              TYPICAL WORKOUT LENGTH
            </Txt>

            {([30, 45, 60] as const).map(value => (
              <Choice
                key={value}
                title={`${value} minutes`}
                subtitle={
                  value === 30
                    ? "Quick and focused"
                    : value === 45
                      ? "A balanced session"
                      : "More time to train"
                }
                selected={minutes === value}
                onPress={() => setMinutes(value)}
              />
            ))}

            <Txt className="mt-5 text-sm text-muted">
              Rest days are part of training.
              Choose a schedule you can sustain.
            </Txt>
          </View>
        ) : null}

        {/* Step 5 — Equipment */}

        {step === 4 ? (
          <View>
            {equipmentOptions.map(item => (
              <Choice
                key={item.id}
                icon={item.icon}
                title={item.title}
                selected={gear === item.id}
                onPress={() => setGear(item.id)}
              />
            ))}

            <View className="mt-5 rounded-2xl border border-border bg-panel p-5">
              <Txt weight="bold" className="text-sm text-brand">
                YOUR STARTING SETUP
              </Txt>

              <Txt className="mt-2 text-sm leading-6 text-muted">
                {goal.replace("_", " ")} · {days} days/week ·{" "}
                {minutes} min/session · {experience}
              </Txt>

              <Txt className="mt-1 text-sm text-muted">
                We'll connect your real personalized training
                plan after this UI phase.
              </Txt>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom action */}

      <View className="border-t border-border bg-bg px-6 pb-7 pt-4">
        <PrimaryButton
          title={
            step === 4
              ? "FINISH SETUP →"
              : "CONTINUE →"
          }
          onPress={next}
          loading={saving}
        />
      </View>
    </KeyboardAvoidingView>
  );
}
