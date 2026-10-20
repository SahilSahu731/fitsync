
import React, { useEffect, useRef, useState } from "react";
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
import { Txt, PrimaryButton } from "@/src/components/ui";
import {
  useSession,
  type Profile,
  type Gender,
  type Goal,
  type Experience,
  type Equipment
} from "@/src/context/session";

import {
  OnboardingArt,
  BodyFigure,
  type ArtVariant
} from "@/src/components/onboarding/onboarding-art";
import { MetricPicker } from "@/src/components/onboarding/metric-picker";
import { OptionCard } from "@/src/components/onboarding/option-card";

type BodyType = "slim" | "medium" | "broad";

type Draft = Omit<Profile, "completedAt">;

const DRAFT_KEY = "@fitsync/onboarding-draft-v2";

const INITIAL: Draft = {
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

const screens: {
  eyebrow: string;
  title: string;
  subtitle: string;
  art: ArtVariant;
}[] = [
  {
    eyebrow: "WELCOME / 001",
    title: "YOUR NEXT LEVEL STARTS HERE.",
    subtitle: "A little about you. A better training experience ahead.",
    art: "welcome"
  },
  {
    eyebrow: "ABOUT YOU / 002",
    title: "HOW DO YOU IDENTIFY?",
    subtitle: "Optional information for your fitness profile.",
    art: "gender"
  },
  {
    eyebrow: "YOUR BODY / 003",
    title: "HOW TALL ARE YOU?",
    subtitle: "Drag the slider to set your current height.",
    art: "height"
  },
  {
    eyebrow: "YOUR BODY / 004",
    title: "YOUR CURRENT WEIGHT.",
    subtitle: "This is your starting measurement, not a judgment.",
    art: "weight"
  },
  {
    eyebrow: "YOUR BUILD / 005",
    title: "WHICH LOOKS CLOSEST?",
    subtitle: "An optional description of your current frame.",
    art: "build"
  },
  {
    eyebrow: "YOUR MISSION / 006",
    title: "WHAT'S YOUR GOAL?",
    subtitle: "Pick the outcome that matters most to you.",
    art: "goal"
  },
  {
    eyebrow: "YOUR EXPERIENCE / 007",
    title: "WHERE ARE YOU STARTING?",
    subtitle: "We'll use this when building your training plan.",
    art: "experience"
  },
  {
    eyebrow: "YOUR ROUTINE / 008",
    title: "HOW OFTEN WILL YOU TRAIN?",
    subtitle: "Choose a schedule that realistically fits your week.",
    art: "days"
  },
  {
    eyebrow: "YOUR SETUP / 009",
    title: "WHERE DO YOU WORK OUT?",
    subtitle: "Choose your equipment and available time.",
    art: "equipment"
  },
  {
    eyebrow: "READY / 010",
    title: "YOU'RE READY TO BEGIN.",
    subtitle: "Review your answers before we save your setup.",
    art: "complete"
  }
];

const goalOptions: {
  value: Goal;
  title: string;
  description: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: "muscle", title: "Build muscle", description: "Get bigger and stronger.", icon: "arm-flex" },
  { value: "strength", title: "Build strength", description: "Get better at lifting.", icon: "weight-lifter" },
  { value: "fat_loss", title: "Lose fat", description: "Improve body composition through training.", icon: "fire" },
  { value: "fitness", title: "Feel fitter", description: "Move better and build consistency.", icon: "heart-pulse" }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, saveProfile } = useSession();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const fade = useRef(new Animated.Value(1)).current;
  const move = useRef(new Animated.Value(0)).current;

  const current = screens[step];

  useEffect(() => {
    AsyncStorage.getItem(DRAFT_KEY)
      .then(value => {
        if (value) {
          const parsed = JSON.parse(value) as Partial<Draft>;
          setDraft({ ...INITIAL, ...parsed });
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
  }, [draft, loaded]);

  useEffect(() => {
    fade.setValue(0);
    move.setValue(16);

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true
      }),
      Animated.timing(move, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true
      })
    ]).start();
  }, [step, fade, move]);

  const change = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft(previous => ({ ...previous, [key]: value }));
  };

  const advance = async () => {
    Haptics.selectionAsync();

    if (step < screens.length - 1) {
      setStep(value => value + 1);
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        ...draft,
        completedAt: new Date().toISOString()
      });

      await AsyncStorage.removeItem(DRAFT_KEY);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Couldn't save your setup",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const skipOptional = () => {
    if (step === 1) change("gender", "prefer_not_to_say");
    if (step === 4) change("bodyType", null);
    setStep(value => value + 1);
  };

  const initials = user?.name?.split(" ")[0] || "Athlete";

  if (!loaded) return <View className="flex-1 bg-bg"/>;

  return (
    <View className="flex-1 bg-bg">
      {/* Top navigation */}

      <View className="flex-row items-center justify-between px-6 pb-4 pt-5">
        <Pressable
          disabled={step === 0 || saving}
          onPress={() => setStep(value => value - 1)}
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-panel"
        >
          <MaterialCommunityIcons
            name={step === 0 ? "lightning-bolt" : "arrow-left"}
            color={step === 0 ? C.brand : C.ink}
            size={23}
          />
        </Pressable>

        <Txt weight="extra" className="text-[17px] tracking-tight">
          FIT<Txt weight="extra" className="text-[17px] text-brand">SYNC</Txt>
        </Txt>

        <Txt weight="bold" className="text-[12px] text-muted">
          {String(step + 1).padStart(2, "0")} / 10
        </Txt>
      </View>

      {/* Progress */}

      <View className="mx-6 mb-3 h-1 overflow-hidden rounded-full bg-elevated">
        <View
          className="h-full rounded-full bg-brand"
          style={{ width: `${((step + 1) / screens.length) * 100}%` }}
        />
      </View>

      <ScrollView
        key={step}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 23,
          paddingTop: 12,
          paddingBottom: 35
        }}
      >
        <Animated.View
          style={{
            opacity: fade,
            transform: [{ translateY: move }]
          }}
        >
          <Txt weight="bold" className="mb-3 text-[11px] tracking-[2px] text-brand">
            {current.eyebrow}
          </Txt>

          <Txt weight="extra" className="text-[34px] leading-[37px] tracking-tight">
            {current.title}
          </Txt>

          <Txt className="mb-6 mt-3 text-[14px] leading-[22px] text-muted">
            {current.subtitle}
          </Txt>

          <OnboardingArt
            variant={current.art}
            height={step === 9 ? 170 : 205}
          />

          {/* 0: Welcome */}

          {step === 0 && (
            <View className="mt-6 rounded-[24px] border border-border bg-panel p-5">
              <Txt weight="extra" className="text-xl">
                LET'S GO, {initials.toUpperCase()}.
              </Txt>
              <Txt className="mt-3 text-sm leading-6 text-muted">
                Tell us about your goals, body measurements, and schedule.
                Your setup takes only a few moments, and you can edit it later.
              </Txt>
              <View className="mt-5 flex-row gap-2">
                {["YOUR GOALS", "YOUR PACE", "YOUR PLAN"].map(label => (
                  <View key={label} className="rounded-full bg-elevated px-3 py-2">
                    <Txt weight="bold" className="text-[9px] text-brand">{label}</Txt>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 1: Gender */}

          {step === 1 && (
            <View className="mt-6">
              {(
                [
                  ["male", "Male"],
                  ["female", "Female"],
                  ["prefer_not_to_say", "Prefer not to say"]
                ] as const
              ).map(([value, label]) => (
                <OptionCard
                  key={value}
                  title={label}
                  icon={value === "male" ? "human-male" : value === "female" ? "human-female" : "account-outline"}
                  selected={draft.gender === value}
                  onPress={() => change("gender", value as Gender)}
                />
              ))}
            </View>
          )}

          {/* 2: Height */}

          {step === 2 && (
            <View className="mt-6">
              <MetricPicker
                min={100}
                max={250}
                step={1}
                value={draft.heightCm}
                unit="cm"
                onChange={value => change("heightCm", value)}
              />
              <Txt className="mt-4 text-center text-xs text-muted">
                You can change your measurements at any time.
              </Txt>
            </View>
          )}

          {/* 3: Weight */}

          {step === 3 && (
            <View className="mt-6">
              <MetricPicker
                min={25}
                max={350}
                step={0.5}
                decimals={1}
                value={draft.weightKg}
                unit="kg"
                onChange={value => change("weightKg", value)}
              />
              <Txt className="mt-4 text-center text-xs text-muted">
                This helps record your baseline. Progress is more than a number.
              </Txt>
            </View>
          )}

          {/* 4: Body frame */}

          {step === 4 && (
            <View className="mt-6">
              <View className="flex-row gap-2">
                {(
                  [
                    ["slim", "Slim"],
                    ["medium", "Medium"],
                    ["broad", "Broad"]
                  ] as const
                ).map(([value, label]) => {
                  const selected = draft.bodyType === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => change("bodyType", value as BodyType)}
                      className={`flex-1 items-center rounded-2xl border px-2 pb-5 pt-4 ${selected ? "border-brand bg-[#302219]" : "border-border bg-panel"}`}
                    >
                      <BodyFigure
                        frame={value}
                        size={65}
                        color={selected ? C.brand : C.ink}
                      />
                      <Txt weight="bold" className="mt-3 text-sm">{label}</Txt>
                      <MaterialCommunityIcons
                        name={selected ? "check-circle" : "circle-outline"}
                        color={selected ? C.brand : C.muted}
                        size={21}
                        style={{ marginTop: 12 }}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Txt className="mt-5 text-xs leading-5 text-muted">
                This is only a visual description. We won't use it to
                assume your abilities or prescribe a training method.
              </Txt>
            </View>
          )}

          {/* 5: Goal */}

          {step === 5 && (
            <View className="mt-6">
              {goalOptions.map(option => (
                <OptionCard
                  key={option.value}
                  icon={option.icon}
                  title={option.title}
                  description={option.description}
                  selected={draft.goal === option.value}
                  onPress={() => change("goal", option.value)}
                />
              ))}
            </View>
          )}

          {/* 6: Experience */}

          {step === 6 && (
            <View className="mt-6">
              {([
                ["beginner", "I'm new to lifting", "I want a simple starting point."],
                ["intermediate", "I train regularly", "I'm familiar with common gym exercises."],
                ["advanced", "I'm experienced", "I've been training consistently for a while."]
              ] as const).map(([value, label, detail]) => (
                <OptionCard
                  key={value}
                  title={label}
                  description={detail}
                  icon="dumbbell"
                  selected={draft.experience === value}
                  onPress={() => change("experience", value as Experience)}
                />
              ))}
            </View>
          )}

          {/* 7: Weekly schedule */}

          {step === 7 && (
            <View className="mt-6">
              <View className="flex-row flex-wrap gap-3">
                {[2, 3, 4, 5, 6].map(days => {
                  const selected = draft.trainingDays === days;
                  return (
                    <Pressable
                      key={days}
                      onPress={() => change("trainingDays", days)}
                      className={`w-[29%] items-center rounded-[23px] border px-3 py-5 ${selected ? "border-brand bg-brand" : "border-border bg-panel"}`}
                    >
                      <Txt
                        weight="extra"
                        className="text-[31px]"
                        style={{ color: selected ? C.bg : C.ink }}
                      >
                        {days}
                      </Txt>
                      <Txt
                        weight="bold"
                        className="mt-1 text-xs"
                        style={{ color: selected ? C.bg : C.muted }}
                      >
                        DAYS
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>

              <View className="mt-6 rounded-2xl border border-border bg-panel p-5">
                <Txt weight="bold" className="text-base">
                  {draft.trainingDays} training days. {7 - draft.trainingDays} other days.
                </Txt>
                <Txt className="mt-2 text-sm leading-6 text-muted">
                  We'll use this to select an appropriate weekly plan.
                  Rest and recovery matter too.
                </Txt>
              </View>
            </View>
          )}

          {/* 8: Equipment and time */}

          {step === 8 && (
            <View className="mt-6">
              <Txt weight="bold" className="mb-3 text-xs tracking-[1px] text-brand">
                AVAILABLE EQUIPMENT
              </Txt>

              {([
                ["gym", "Full gym", "Machines, cables and free weights", "dumbbell"],
                ["dumbbells", "Dumbbells", "Basic home or small gym setup", "weight"],
                ["bodyweight", "Bodyweight", "Minimal equipment", "human-handsup"]
              ] as const).map(([value, label, detail, icon]) => (
                <OptionCard
                  key={value}
                  title={label}
                  description={detail}
                  icon={icon}
                  selected={draft.equipment === value}
                  onPress={() => change("equipment", value as Equipment)}
                />
              ))}

              <Txt weight="bold" className="mb-3 mt-5 text-xs tracking-[1px] text-brand">
                TIME PER WORKOUT
              </Txt>

              <View className="flex-row gap-2">
                {([30, 45, 60] as const).map(minutes => {
                  const selected = draft.minutesPerWorkout === minutes;
                  return (
                    <Pressable
                      key={minutes}
                      onPress={() => change("minutesPerWorkout", minutes)}
                      className={`flex-1 items-center rounded-2xl border py-5 ${selected ? "border-brand bg-brand" : "border-border bg-panel"}`}
                    >
                      <Txt
                        weight="extra"
                        className="text-[25px]"
                        style={{ color: selected ? C.bg : C.ink }}
                      >
                        {minutes}
                      </Txt>
                      <Txt
                        weight="medium"
                        className="text-xs"
                        style={{ color: selected ? C.bg : C.muted }}
                      >
                        MIN
                      </Txt>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* 9: Review */}

          {step === 9 && (
            <View className="mt-6 rounded-[24px] border border-border bg-panel p-5">
              {[
                ["Goal", draft.goal.replace("_", " ")],
                ["Experience", draft.experience],
                ["Height", `${draft.heightCm} cm`],
                ["Weight", `${draft.weightKg} kg`],
                ["Training", `${draft.trainingDays} days/week`],
                ["Session", `${draft.minutesPerWorkout} minutes`],
                ["Equipment", draft.equipment],
                ["Body frame", draft.bodyType || "Not specified"]
              ].map(([label, value]) => (
                <View key={label} className="flex-row items-center justify-between border-b border-border py-3">
                  <Txt className="text-sm text-muted">{label}</Txt>
                  <Txt weight="bold" className="text-sm capitalize">{value}</Txt>
                </View>
              ))}
              <Txt className="mt-4 text-xs leading-5 text-muted">
                You can edit this information from your FitSync profile.
              </Txt>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Bottom action */}

      <View className="border-t border-border bg-bg px-6 pb-6 pt-4">
        <PrimaryButton
          title={step === 0 ? "LET'S BEGIN →" : step === 9 ? "BUILD MY FITSYNC PROFILE →" : "CONTINUE →"}
          loading={saving}
          onPress={advance}
        />

        {(step === 1 || step === 4) && (
          <Pressable onPress={skipOptional} className="items-center py-3">
            <Txt weight="semibold" className="text-xs text-muted">
              SKIP THIS QUESTION
            </Txt>
          </Pressable>
        )}
      </View>
    </View>
  );
}
