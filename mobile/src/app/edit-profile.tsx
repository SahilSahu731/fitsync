import React, { useState } from "react";

import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import {
  Redirect,
  useRouter
} from "expo-router";

import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";

import { C } from "@/src/constants/theme";

import {
  Pill,
  PrimaryButton,
  Txt
} from "@/src/components/ui";

import {
  useSession,
  type BodyType,
  type Equipment,
  type Experience,
  type Gender,
  type Goal
} from "@/src/context/session";

// ======================================================
// TYPES
// ======================================================

type IconName =
  keyof typeof MaterialCommunityIcons.glyphMap;

type ChoiceOption = {
  label: string;
  value: string;
};

// ======================================================
// CONSTANTS
// ======================================================

const GOALS: ChoiceOption[] = [
  {
    label: "Build Muscle",
    value: "muscle"
  },
  {
    label: "Strength",
    value: "strength"
  },
  {
    label: "Lose Fat",
    value: "fat_loss"
  },
  {
    label: "Fitness",
    value: "fitness"
  }
];

const EXPERIENCE: ChoiceOption[] = [
  {
    label: "Beginner",
    value: "beginner"
  },
  {
    label: "Intermediate",
    value: "intermediate"
  },
  {
    label: "Advanced",
    value: "advanced"
  }
];

const GENDER: ChoiceOption[] = [
  {
    label: "Male",
    value: "male"
  },
  {
    label: "Female",
    value: "female"
  },
  {
    label: "Prefer not to say",
    value: "prefer_not_to_say"
  }
];

const BODY_TYPES: ChoiceOption[] = [
  {
    label: "Slim",
    value: "slim"
  },
  {
    label: "Medium",
    value: "medium"
  },
  {
    label: "Broad",
    value: "broad"
  },
  {
    label: "Not specified",
    value: "none"
  }
];

const EQUIPMENT: ChoiceOption[] = [
  {
    label: "Full Gym",
    value: "gym"
  },
  {
    label: "Dumbbells",
    value: "dumbbells"
  },
  {
    label: "Bodyweight",
    value: "bodyweight"
  }
];

const DURATION: ChoiceOption[] = [
  {
    label: "30 min",
    value: "30"
  },
  {
    label: "45 min",
    value: "45"
  },
  {
    label: "60 min",
    value: "60"
  }
];

// ======================================================
// REUSABLE FIELD COMPONENTS
// ======================================================

function SectionTitle({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="mb-5 mt-8">
      <Txt
        weight="extra"
        className="text-[23px] tracking-tight"
      >
        {title}
      </Txt>

      {subtitle ? (
        <Txt className="mt-1 text-xs leading-5 text-muted">
          {subtitle}
        </Txt>
      ) : null}
    </View>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  maxLength = 100,
  suffix
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad";
  multiline?: boolean;
  maxLength?: number;
  suffix?: string;
}) {
  return (
    <View className="mb-5">
      <Txt
        weight="bold"
        className="mb-2 text-xs tracking-[1px] text-muted"
      >
        {label}
      </Txt>

      <View
        className={`flex-row rounded-2xl border border-border bg-panel px-4 ${
          multiline
            ? "min-h-[110px] py-3"
            : "h-14 items-center"
        }`}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          keyboardType={keyboardType}
          multiline={multiline}
          maxLength={maxLength}
          className="flex-1 text-base text-ink"
          style={{
            fontFamily: "Outfit_500Medium",
            textAlignVertical:
              multiline ? "top" : "center"
          }}
        />

        {suffix ? (
          <Txt
            weight="bold"
            className="ml-2 text-sm text-brand"
          >
            {suffix}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

function ChoiceField({
  title,
  options,
  value,
  onChange
}: {
  title: string;
  options: ChoiceOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="mb-6">
      <Txt
        weight="bold"
        className="mb-3 text-xs tracking-[1px] text-muted"
      >
        {title}
      </Txt>

      <View className="flex-row flex-wrap gap-2">
        {options.map(option => (
          <Pill
            key={option.value}
            label={option.label}
            active={value === option.value}
            onPress={() => {
              void Haptics.selectionAsync();

              onChange(option.value);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  text
}: {
  icon: IconName;
  text: string;
}) {
  return (
    <View className="flex-row items-start">
      <MaterialCommunityIcons
        name={icon}
        color={C.brand}
        size={19}
      />

      <Txt className="ml-3 flex-1 text-xs leading-5 text-muted">
        {text}
      </Txt>
    </View>
  );
}

// ======================================================
// MAIN SCREEN
// ======================================================

export default function EditProfileScreen() {
  const router = useRouter();

  const {
    user,
    profile,
    settings,
    updateAccount,
    updateFitness,
    uploadAvatar,
    removeAvatar
  } = useSession();

  const weightUnit =
    settings?.weightUnit ?? "kg";

  // ====================================================
  // LOCAL FORM STATE
  // ====================================================

  const [name, setName] = useState(
    user?.name ?? ""
  );

  const [bio, setBio] = useState(
    user?.bio ?? ""
  );

  const [height, setHeight] = useState(
    String(profile?.heightCm ?? 175)
  );

  const [weight, setWeight] = useState(() => {
    const kilograms = profile?.weightKg ?? 70;

    if (weightUnit === "lb") {
      return (
        kilograms * 2.2046226218
      ).toFixed(1);
    }

    return String(kilograms);
  });

  const [gender, setGender] =
    useState<Gender>(
      profile?.gender ?? "prefer_not_to_say"
    );

  const [bodyType, setBodyType] =
    useState<BodyType | null>(
      profile?.bodyType ?? null
    );

  const [goal, setGoal] =
    useState<Goal>(
      profile?.goal ?? "muscle"
    );

  const [experience, setExperience] =
    useState<Experience>(
      profile?.experience ?? "beginner"
    );

  const [trainingDays, setTrainingDays] =
    useState<number>(
      profile?.trainingDays ?? 4
    );

  const [minutes, setMinutes] =
    useState<30 | 45 | 60>(
      profile?.minutesPerWorkout ?? 45
    );

  const [equipment, setEquipment] =
    useState<Equipment>(
      profile?.equipment ?? "gym"
    );

  const [saving, setSaving] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  // ====================================================
  // AUTH / PROFILE GUARD
  // ====================================================

  if (!user) {
    return (
      <Redirect href="/(auth)/sign-in" />
    );
  }

  if (!profile) {
    return (
      <Redirect href="/onboarding" />
    );
  }

  // ====================================================
  // CHOOSE PROFILE PHOTO
  // ====================================================

  async function choosePhoto() {
    if (uploading || saving) return;

    try {
      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7
        });

      if (
        result.canceled ||
        !result.assets.length
      ) {
        return;
      }

      const image = result.assets[0];

      const maxSize = 3 * 1024 * 1024;

      if (
        image.fileSize &&
        image.fileSize > maxSize
      ) {
        Alert.alert(
          "Image too large",
          "Choose a photo smaller than 3 MB."
        );

        return;
      }

      const mimeType =
        image.mimeType || "image/jpeg";

      if (
        ![
          "image/jpeg",
          "image/png",
          "image/webp"
        ].includes(mimeType)
      ) {
        Alert.alert(
          "Unsupported image",
          "Please select a JPEG, PNG, or WebP image."
        );

        return;
      }

      setUploading(true);

      await uploadAvatar(
        image.uri,
        mimeType
      );

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        "Photo updated",
        "Your new profile picture has been saved."
      );
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error
          ? error.message
          : "Could not upload your photo."
      );
    } finally {
      setUploading(false);
    }
  }

  // ====================================================
  // REMOVE PHOTO
  // ====================================================

  function confirmRemovePhoto() {
    if (uploading || saving) return;

    Alert.alert(
      "Remove your profile photo?",
      "Your original Google account picture may be shown instead.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Remove photo",
          style: "destructive",
          onPress: async () => {
            setUploading(true);

            try {
              await removeAvatar();

              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            } catch (error) {
              Alert.alert(
                "Could not remove photo",
                error instanceof Error
                  ? error.message
                  : "Please try again."
              );
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  }

  // ====================================================
  // SAVE PROFILE
  // ====================================================

  async function saveChanges() {
    if (saving || uploading) return;

    const trimmedName = name.trim();
    const trimmedBio = bio.trim();

    const heightCm = Number(height);

    const inputWeight = Number(weight);

    const weightKg =
      weightUnit === "lb"
        ? inputWeight / 2.2046226218
        : inputWeight;

    const roundedKg =
      Number(weightKg.toFixed(1));

    // ------------------------------------
    // VALIDATION
    // ------------------------------------

    if (
      trimmedName.length < 2 ||
      trimmedName.length > 100
    ) {
      Alert.alert(
        "Invalid name",
        "Enter a name containing 2–100 characters."
      );

      return;
    }

    if (trimmedBio.length > 250) {
      Alert.alert(
        "Bio too long",
        "Your bio can contain up to 250 characters."
      );

      return;
    }

    if (
      !Number.isFinite(heightCm) ||
      heightCm < 100 ||
      heightCm > 250
    ) {
      Alert.alert(
        "Invalid height",
        "Enter a height between 100 and 250 cm."
      );

      return;
    }

    if (
      !Number.isFinite(roundedKg) ||
      roundedKg < 25 ||
      roundedKg > 350
    ) {
      Alert.alert(
        "Invalid weight",
        "Enter a valid weight within the supported range."
      );

      return;
    }

    if (
      trainingDays < 1 ||
      trainingDays > 7
    ) {
      Alert.alert(
        "Invalid schedule",
        "Choose a valid weekly training frequency."
      );

      return;
    }

    // ------------------------------------
    // SEND UPDATES TO EXPRESS
    // ------------------------------------

    setSaving(true);

    let accountSaved = false;

    try {
      // PATCH /api/me
      await updateAccount({
        name: trimmedName,
        bio: trimmedBio
      });

      accountSaved = true;

      // PATCH /api/me/profile
      await updateFitness({
        heightCm,
        weightKg: roundedKg,
        gender,
        bodyType,
        goal,
        experience,
        trainingDays,
        minutesPerWorkout: minutes,
        equipment
      });

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        "Profile updated",
        "Your changes have been saved to FitSync.",
        [
          {
            text: "Done",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        "Could not save everything",
        accountSaved
          ? "Your account information was saved, but some fitness details were not. Please try again."
          : error instanceof Error
            ? error.message
            : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >
      {/* Header */}

      <View className="flex-row items-center justify-between border-b border-border px-6 pb-4 pt-5">
        <Pressable
          onPress={() => router.back()}
          disabled={saving || uploading}
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-panel"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            color={C.ink}
            size={23}
          />
        </Pressable>

        <Txt
          weight="extra"
          className="text-lg tracking-tight"
        >
          EDIT PROFILE
        </Txt>

        <MaterialCommunityIcons
          name="account-edit-outline"
          color={C.brand}
          size={24}
        />
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 35
        }}
      >
        {/* Intro */}

        <Txt
          weight="bold"
          className="mt-8 text-xs tracking-[2px] text-brand"
        >
          YOUR PROFILE / YOUR RULES
        </Txt>

        <Txt
          weight="extra"
          className="mt-2 text-[36px] leading-[39px] tracking-tight"
        >
          MAKE IT YOURS.
        </Txt>

        <Txt className="mt-3 text-sm leading-6 text-muted">
          Your information, training preferences,
          and goals—all in one place.
        </Txt>

        {/* ==================================
            PROFILE IMAGE
        ================================== */}

        <View className="mt-7 items-center rounded-[28px] border border-border bg-panel px-5 py-7">
          <Pressable
            disabled={uploading || saving}
            onPress={choosePhoto}
            className="relative"
          >
            <View className="h-28 w-28 overflow-hidden rounded-[32px] bg-brand">
              {user.avatarUrl ? (
                <Image
                  source={{
                    uri: user.avatarUrl
                  }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Txt
                    weight="extra"
                    className="text-5xl text-bg"
                  >
                    {(
                      user.name[0] || "A"
                    ).toUpperCase()}
                  </Txt>
                </View>
              )}
            </View>

            <View className="absolute -bottom-2 -right-2 h-11 w-11 items-center justify-center rounded-full border-4 border-panel bg-brand">
              <MaterialCommunityIcons
                name="camera-plus"
                color={C.bg}
                size={20}
              />
            </View>
          </Pressable>

          <Txt
            weight="extra"
            className="mt-6 text-lg"
          >
            YOUR LOOK. YOUR IDENTITY.
          </Txt>

          <Pressable
            onPress={choosePhoto}
            disabled={uploading || saving}
            className="mt-3 rounded-full border border-brand px-5 py-2.5"
          >
            <Txt
              weight="bold"
              className="text-xs text-brand"
            >
              {uploading
                ? "UPLOADING..."
                : "CHANGE PROFILE PHOTO"}
            </Txt>
          </Pressable>

          {user.hasCustomAvatar && (
            <Pressable
              onPress={confirmRemovePhoto}
              disabled={uploading || saving}
              className="mt-3 px-3 py-2"
            >
              <Txt className="text-xs text-muted">
                Remove uploaded photo
              </Txt>
            </Pressable>
          )}
        </View>

        {/* ==================================
            PERSONAL INFORMATION
        ================================== */}

        <SectionTitle
          title="PERSONAL INFORMATION"
          subtitle="The basics people can recognize you by."
        />

        <InputField
          label="DISPLAY NAME"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          maxLength={100}
        />

        <InputField
          label="BIO"
          value={bio}
          onChangeText={setBio}
          placeholder="Something about you..."
          multiline
          maxLength={250}
        />

        <View className="mb-3 rounded-2xl border border-border bg-panel p-4">
          <Txt
            weight="bold"
            className="text-xs text-muted"
          >
            CONNECTED GOOGLE ACCOUNT
          </Txt>

          <Txt
            weight="medium"
            className="mt-2 text-sm"
          >
            {user.email}
          </Txt>

          <Txt className="mt-2 text-xs leading-5 text-muted">
            Your email is managed by your Google
            account and cannot be edited here.
          </Txt>
        </View>

        {/* ==================================
            BODY INFORMATION
        ================================== */}

        <SectionTitle
          title="BODY INFORMATION"
          subtitle="Your current baseline measurements."
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <InputField
              label="HEIGHT"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              maxLength={6}
              suffix="cm"
            />
          </View>

          <View className="flex-1">
            <InputField
              label="WEIGHT"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              maxLength={7}
              suffix={weightUnit}
            />
          </View>
        </View>

        <InfoRow
          icon="information-outline"
          text="Your preferred weight unit comes from Settings. FitSync stores weight in kilograms internally."
        />

        <View className="mt-6">
          <ChoiceField
            title="GENDER (OPTIONAL)"
            options={GENDER}
            value={gender}
            onChange={value =>
              setGender(value as Gender)
            }
          />
        </View>

        <ChoiceField
          title="BODY BUILD (OPTIONAL)"
          options={BODY_TYPES}
          value={bodyType ?? "none"}
          onChange={value =>
            setBodyType(
              value === "none"
                ? null
                : (value as BodyType)
            )
          }
        />

        <View className="rounded-2xl bg-elevated p-4">
          <InfoRow
            icon="shield-check-outline"
            text="Your body-build selection is descriptive only. It is not used to judge your fitness ability."
          />
        </View>

        {/* ==================================
            FITNESS GOAL
        ================================== */}

        <SectionTitle
          title="YOUR FITNESS GOAL"
          subtitle="What you're currently training toward."
        />

        <ChoiceField
          title="MAIN FITNESS GOAL"
          options={GOALS}
          value={goal}
          onChange={value =>
            setGoal(value as Goal)
          }
        />

        <ChoiceField
          title="TRAINING EXPERIENCE"
          options={EXPERIENCE}
          value={experience}
          onChange={value =>
            setExperience(
              value as Experience
            )
          }
        />

        {/* ==================================
            TRAINING SCHEDULE
        ================================== */}

        <SectionTitle
          title="YOUR TRAINING ROUTINE"
          subtitle="Keep your training schedule realistic and sustainable."
        />

        <Txt
          weight="bold"
          className="mb-3 text-xs tracking-[1px] text-muted"
        >
          TRAINING DAYS PER WEEK
        </Txt>

        <View className="mb-6 flex-row gap-2">
          {[2, 3, 4, 5, 6].map(days => {
            const selected =
              trainingDays === days;

            return (
              <Pressable
                key={days}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setTrainingDays(days);
                }}
                className={`h-14 flex-1 items-center justify-center rounded-2xl border ${
                  selected
                    ? "border-brand bg-brand"
                    : "border-border bg-panel"
                }`}
              >
                <Txt
                  weight="extra"
                  className="text-xl"
                  style={{
                    color: selected
                      ? C.bg
                      : C.ink
                  }}
                >
                  {days}
                </Txt>
              </Pressable>
            );
          })}
        </View>

        <ChoiceField
          title="WORKOUT DURATION"
          options={DURATION}
          value={String(minutes)}
          onChange={value =>
            setMinutes(
              Number(value) as 30 | 45 | 60
            )
          }
        />

        <ChoiceField
          title="AVAILABLE EQUIPMENT"
          options={EQUIPMENT}
          value={equipment}
          onChange={value =>
            setEquipment(
              value as Equipment
            )
          }
        />

        {/* ==================================
            FINISH
        ================================== */}

        <View className="mt-5 rounded-[24px] border border-brand bg-[#271F19] p-5">
          <Txt
            weight="extra"
            className="text-lg text-brand"
          >
            YOUR NEXT REP STARTS HERE.
          </Txt>

          <Txt className="mt-2 text-sm leading-6 text-muted">
            Your updated training preferences
            will be saved to your FitSync account
            and available the next time you sign in.
          </Txt>
        </View>
      </ScrollView>

      {/* Sticky save button */}

      <View className="border-t border-border bg-bg px-6 pb-6 pt-4">
        <PrimaryButton
          title={
            saving
              ? "SAVING..."
              : "SAVE CHANGES →"
          }
          loading={saving}
          disabled={
            saving || uploading
          }
          onPress={saveChanges}
        />
      </View>
    </KeyboardAvoidingView>
  );
}