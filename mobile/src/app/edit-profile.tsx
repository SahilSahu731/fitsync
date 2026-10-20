
import React, { useState } from "react";

import type { BodyType } from "@/context/session";

import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import { Redirect, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { loadImagePicker } from "@/src/services/native-modules";

import { C } from "@/src/constants/theme";
import {
  Pill,
  PrimaryButton,
  Txt
} from "@/src/components/ui";

import {
  type Equipment,
  type Experience,
  type Gender,
  type Goal,
  useSession
} from "@/src/context/session";

function InputField({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  multiline = false
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "default" | "decimal-pad";
  multiline?: boolean;
}) {
  return (
    <View className="mb-5">
      <Txt
        weight="bold"
        className="mb-2 text-xs tracking-[1px] text-muted"
      >
        {label}
      </Txt>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        maxLength={multiline ? 250 : 100}
        placeholderTextColor={C.muted}
        className={`rounded-2xl border border-border bg-panel px-4 text-base text-ink ${multiline ? "min-h-[90px] py-4" : "h-14"}`}
        style={{
          fontFamily: "Outfit_500Medium",
          textAlignVertical: multiline ? "top" : "center"
        }}
      />
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
  options: { label: string; value: string }[];
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
            onPress={() => onChange(option.value)}
          />
        ))}
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();

  const {
    user,
    profile,
    updateAccount,
    updateFitness,
    uploadAvatar,
    removeAvatar
  } = useSession();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");


const [bodyType, setBodyType] = useState<BodyType | null>(
  profile?.bodyType ?? null
);


  const [weight, setWeight] = useState(
    String(profile?.weightKg || 70)
  );

  const [height, setHeight] = useState(
    String(profile?.heightCm || 175)
  );

  const [goal, setGoal] = useState<Goal>(
    profile?.goal || "muscle"
  );

  const [experience, setExperience] =
    useState<Experience>(
      profile?.experience || "beginner"
    );

  const [gender, setGender] = useState<Gender>(
    profile?.gender || "prefer_not_to_say"
  );

  const [days, setDays] = useState(
    profile?.trainingDays || 4
  );

  const [minutes, setMinutes] =
    useState<30 | 45 | 60>(
      profile?.minutesPerWorkout || 45
    );

  const [equipment, setEquipment] =
    useState<Equipment>(
      profile?.equipment || "gym"
    );

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (!user) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  const choosePhoto = async () => {
    try {
      const ImagePicker = await loadImagePicker();
      const selected =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85
        });

      if (selected.canceled || !selected.assets?.length) {
        return;
      }

      const image = selected.assets[0];

      if (
        image.fileSize &&
        image.fileSize > 3 * 1024 * 1024
      ) {
        Alert.alert(
          "Image too large",
          "Choose an image smaller than 3 MB."
        );

        return;
      }

      setUploading(true);

      await uploadAvatar(
        image.uri,
        image.mimeType || "image/jpeg"
      );

      Alert.alert(
        "Photo updated",
        "Your profile picture has been saved."
      );
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error
          ? error.message
          : "Try another image."
      );
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = () => {
    Alert.alert(
      "Remove profile photo?",
      "Your Google account photo will be shown instead.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          onPress: async () => {
            try {
              setUploading(true);
              await removeAvatar();
            } catch (error) {
              Alert.alert(
                "Could not remove photo",
                String(error)
              );
            } finally {
              setUploading(false);
            }
          }
        }
      ]
    );
  };

  const save = async () => {
    const w = Number(weight);
    const h = Number(height);

    if (name.trim().length < 2) {
      Alert.alert("Invalid name", "Enter your name.");
      return;
    }

    if (
      !Number.isFinite(w) ||
      w < 25 ||
      w > 350 ||
      !Number.isFinite(h) ||
      h < 100 ||
      h > 250
    ) {
      Alert.alert(
        "Invalid measurements",
        "Check your weight and height."
      );

      return;
    }

    setSaving(true);

    try {
      await updateAccount({
        name: name.trim(),
        bio: bio.trim()
      });

      await updateFitness({
        weightKg: w,
        heightCm: h,
        goal,
        experience,
        gender,
        trainingDays: days,
        minutesPerWorkout: minutes,
        equipment
      });

      Alert.alert(
        "Saved",
        "Your profile has been updated."
      );

      router.back();
    } catch (error) {
      Alert.alert(
        "Could not finish saving",
        error instanceof Error
          ? error.message
          : "Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 35
        }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mb-7 h-11 w-11 items-center justify-center rounded-full border border-border"
        >
          <MaterialCommunityIcons
            name="arrow-left"
            size={23}
            color={C.ink}
          />
        </Pressable>

        <Txt
          weight="medium"
          className="text-xs tracking-[2px] text-brand"
        >
          PERSONAL SETTINGS
        </Txt>

        <Txt
          weight="extra"
          className="mt-2 text-[36px]"
        >
          EDIT PROFILE.
        </Txt>

        {/* Avatar */}

        <View className="my-8 items-center">
          <Pressable
            disabled={uploading}
            onPress={choosePhoto}
            className="relative"
          >
            <View className="h-28 w-28 overflow-hidden rounded-[32px] bg-brand">
              {user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Txt
                    weight="extra"
                    className="text-4xl text-bg"
                  >
                    {user.name[0].toUpperCase()}
                  </Txt>
                </View>
              )}
            </View>

            <View className="absolute -bottom-2 -right-2 h-10 w-10 items-center justify-center rounded-full border-4 border-bg bg-brand">
              <MaterialCommunityIcons
                name="camera"
                size={19}
                color={C.bg}
              />
            </View>
          </Pressable>

          <Txt
            weight="bold"
            className="mt-5 text-sm text-brand"
          >
            {uploading
              ? "UPLOADING..."
              : "CHANGE PHOTO"}
          </Txt>

          {user.hasCustomAvatar ? (
            <Pressable
              disabled={uploading}
              onPress={removePhoto}
              className="mt-2 py-2"
            >
              <Txt className="text-xs text-muted">
                Remove uploaded photo
              </Txt>
            </Pressable>
          ) : null}
        </View>

        <InputField
          label="DISPLAY NAME"
          value={name}
          onChangeText={setName}
        />

        <InputField
          label="BIO"
          value={bio}
          onChangeText={setBio}
          multiline
        />

        <Txt
          weight="extra"
          className="mb-5 mt-5 text-[22px]"
        >
          BODY INFORMATION
        </Txt>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <InputField
              label="WEIGHT (KG)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
            />
          </View>

          <View className="flex-1">
            <InputField
              label="HEIGHT (CM)"
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <ChoiceField
          title="GENDER (OPTIONAL)"
          value={gender}
          onChange={value => setGender(value as Gender)}
          options={[
            { label: "Male", value: "male" },
            { label: "Female", value: "female" },
            {
              label: "Prefer not to say",
              value: "prefer_not_to_say"
            }
          ]}
        />

        <Txt
          weight="extra"
          className="mb-5 mt-5 text-[22px]"
        >
          TRAINING PROFILE
        </Txt>

        <ChoiceField
          title="MAIN GOAL"
          value={goal}
          onChange={value => setGoal(value as Goal)}
          options={[
            { label: "Build muscle", value: "muscle" },
            { label: "Strength", value: "strength" },
            { label: "Lose fat", value: "fat_loss" },
            { label: "Fitness", value: "fitness" }
          ]}
        />

        <ChoiceField
          title="EXPERIENCE"
          value={experience}
          onChange={value =>
            setExperience(value as Experience)
          }
          options={[
            { label: "Beginner", value: "beginner" },
            {
              label: "Intermediate",
              value: "intermediate"
            },
            { label: "Advanced", value: "advanced" }
          ]}
        />

        <Txt
          weight="bold"
          className="mb-3 text-xs tracking-[1px] text-muted"
        >
          TRAINING DAYS PER WEEK
        </Txt>

        <View className="mb-6 flex-row gap-2">
          {[2, 3, 4, 5, 6].map(value => (
            <Pressable
              key={value}
              onPress={() => setDays(value)}
              className={`h-12 flex-1 items-center justify-center rounded-xl border ${days === value ? "border-brand bg-brand" : "border-border bg-panel"}`}
            >
              <Txt
                weight="bold"
                style={{
                  color: days === value ? C.bg : C.ink
                }}
              >
                {value}
              </Txt>
            </Pressable>
          ))}
        </View>

        <ChoiceField
          title="WORKOUT DURATION"
          value={String(minutes)}
          onChange={value =>
            setMinutes(Number(value) as 30 | 45 | 60)
          }
          options={[
            { label: "30 min", value: "30" },
            { label: "45 min", value: "45" },
            { label: "60 min", value: "60" }
          ]}
        />

        <ChoiceField
          title="EQUIPMENT"
          value={equipment}
          onChange={value =>
            setEquipment(value as Equipment)
          }
          options={[
            { label: "Full gym", value: "gym" },
            { label: "Dumbbells", value: "dumbbells" },
            { label: "Bodyweight", value: "bodyweight" }
          ]}
        />

        <PrimaryButton
          title="SAVE CHANGES →"
          loading={saving}
          onPress={save}
        />
      </ScrollView>
    </View>
  );
}
