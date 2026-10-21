
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View
} from "react-native";

import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { C } from "@/src/constants/theme";
import { Txt, PrimaryButton } from "@/src/components/ui";

import {
  Exercise,
  ExerciseInput,
  ExerciseTaxonomies,
  TaxonomyItem,
  createExercise,
  editExercise,
  getExercise,
  getExercisePermissions,
  getTaxonomies,
  uploadExerciseMedia,
  deleteExerciseMedia,
  pretty
} from "@/src/features/exercises/api";

const initial: ExerciseInput = {
  slug: "",
  name: "",
  description: "",

  category: "strength",
  activityType: "weight-training",
  bodyRegion: "upper-body",

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

  status: "draft"
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
    .replace(/-$/, "");
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

function exerciseToInput(item: Exercise): ExerciseInput {
  return {
    slug: item.slug,
    name: item.name,
    description: item.description,

    category: item.category,
    activityType: item.activityType,
    bodyRegion: item.bodyRegion,

    difficulty: item.difficulty,
    trackingType: item.trackingType,
    movementPattern: item.movementPattern,

    primaryMuscles: item.primaryMuscles,
    secondaryMuscles: item.secondaryMuscles,
    equipment: item.equipment,

    instructions: item.instructions,
    tips: item.tips,
    mistakes: item.mistakes,
    safetyNotes: item.safetyNotes,

    breathingTip: item.breathingTip,
    status: item.status
  };
}

function Section({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-6 rounded-3xl border border-border bg-panel p-4">
      <Txt weight="extra" className="text-lg">
        {title}
      </Txt>

      {!!subtitle && (
        <Txt className="mt-1 text-xs text-muted">
          {subtitle}
        </Txt>
      )}

      <View className="mt-4">
        {children}
      </View>
    </View>
  );
}

function Field({
  title,
  value,
  onChange,
  placeholder,
  multiline = false
}: {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View className="mb-4">
      <Txt weight="semibold" className="mb-2 text-xs text-muted">
        {title}
      </Txt>

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        className={`rounded-xl border border-border bg-elevated px-4 py-3 text-sm text-ink ${multiline ? "min-h-[100px]" : ""}`}
        style={{ fontFamily: "Outfit_400Regular" }}
      />
    </View>
  );
}

function Choices({
  title,
  items,
  selected,
  onPress,
  multi = false
}: {
  title: string;
  items: TaxonomyItem[];
  selected: string[];
  onPress: (code: string) => void;
  multi?: boolean;
}) {
  return (
    <View className="mb-5">
      <Txt weight="semibold" className="mb-2 text-xs text-muted">
        {title}
      </Txt>

      <View className="flex-row flex-wrap gap-2">
        {items.map(item => {
          const active = selected.includes(item.code);

          return (
            <Pressable
              key={item.code}
              onPress={() => onPress(item.code)}
              className={`rounded-xl border px-3 py-2.5 ${active ? "border-brand bg-brand" : "border-border bg-elevated"}`}
            >
              <Txt weight="semibold" className={`text-xs ${active ? "text-bg" : "text-ink"}`}>
                {multi && active ? "✓ " : ""}
                {item.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function AdminExerciseForm({
  exerciseId
}: {
  exerciseId?: string;
}) {
  const router = useRouter();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [taxonomy, setTaxonomy] =
    useState<ExerciseTaxonomies | null>(null);

  const [draft, setDraft] = useState<ExerciseInput>(initial);
  const [saved, setSaved] = useState<Exercise | null>(null);

  const [instructions, setInstructions] = useState("");
  const [tips, setTips] = useState("");
  const [mistakes, setMistakes] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");

  const [mediaCredit, setMediaCredit] = useState("");
  const [mediaLicense, setMediaLicense] = useState("");
  const [mediaSourceUrl, setMediaSourceUrl] = useState("");

  const slugTouched = useRef(false);

  function edit(values: Partial<ExerciseInput>) {
    setDraft(previous => ({
      ...previous,
      ...values
    }));
  }

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [permissions, tax] = await Promise.all([
          getExercisePermissions(),
          getTaxonomies()
        ]);

        if (!active) return;

        setIsAdmin(permissions.canManageExercises);
        setTaxonomy(tax);

        if (!permissions.canManageExercises) return;

        if (exerciseId) {
          const exercise = await getExercise(exerciseId);

          if (!active) return;

          slugTouched.current = true;

          setSaved(exercise);
          setDraft(exerciseToInput(exercise));

          setInstructions(exercise.instructions.join("\n"));
          setTips(exercise.tips.join("\n"));
          setMistakes(exercise.mistakes.join("\n"));
          setSafetyNotes(exercise.safetyNotes.join("\n"));
        }
      } catch (error) {
        Alert.alert(
          "Unable to load exercise",
          error instanceof Error ? error.message : "Try again."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [exerciseId]);

  function toggle(
    key: "primaryMuscles" | "secondaryMuscles" | "equipment",
    code: string
  ) {
    const current = draft[key];
    const adding = !current.includes(code);

    const updated = adding
      ? [...current, code]
      : current.filter(item => item !== code);

    if (key === "primaryMuscles" && adding) {
      edit({
        primaryMuscles: updated,
        secondaryMuscles: draft.secondaryMuscles.filter(
          item => item !== code
        )
      });
      return;
    }

    if (key === "secondaryMuscles" && adding) {
      edit({
        secondaryMuscles: updated,
        primaryMuscles: draft.primaryMuscles.filter(
          item => item !== code
        )
      });
      return;
    }

    edit({ [key]: updated });
  }

  function getPayload(): ExerciseInput {
    return {
      ...draft,
      instructions: parseLines(instructions),
      tips: parseLines(tips),
      mistakes: parseLines(mistakes),
      safetyNotes: parseLines(safetyNotes)
    };
  }

  async function persist(
    status: "draft" | "published" | "archived"
  ) {
    const payload: ExerciseInput = {
      ...getPayload(),
      status
    };

    if (
      !payload.name.trim() ||
      !payload.slug.trim() ||
      payload.instructions.length === 0
    ) {
      Alert.alert(
        "Missing information",
        "Name, slug and at least one instruction are required."
      );
      return;
    }

    if (
      status === "published" &&
      !saved?.media.length
    ) {
      Alert.alert(
        "Add a demonstration",
        "Upload an exercise image or video before publishing."
      );
      return;
    }

    setBusy(true);

    try {
      const result = saved
        ? await editExercise(saved.id, payload)
        : await createExercise(payload);

      setSaved(result);
      setDraft(exerciseToInput(result));

      Alert.alert(
        "Exercise saved",
        status === "published"
          ? "Your exercise is now available in the library."
          : "Your changes were saved."
      );
    } catch (error) {
      Alert.alert(
        "Could not save exercise",
        error instanceof Error ? error.message : "Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function pickMedia(kind: "image" | "video") {
    if (!saved) {
      Alert.alert(
        "Save draft first",
        "Save the exercise before uploading media."
      );
      return;
    }

    if (!mediaLicense.trim()) {
      Alert.alert(
        "Usage rights required",
        "Enter how you have permission to use this image or video."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "image" ? ["images"] : ["videos"],
      allowsEditing: false,
      quality: 1
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    const mimeType = asset.mimeType ??
      (kind === "video" ? "video/mp4" : "image/jpeg");

    setBusy(true);

    try {
      const exercise = await uploadExerciseMedia(
        saved.id,
        asset.uri,
        mimeType,
        {
          altText: draft.name,
          credit: mediaCredit,
          license: mediaLicense.trim(),
          sourceUrl: mediaSourceUrl
        }
      );

      setSaved(exercise);

      Alert.alert(
        "Upload complete",
        kind === "video"
          ? "Video saved to Cloudinary."
          : "Image saved to Supabase."
      );
    } catch (error) {
      Alert.alert(
        "Upload failed",
        error instanceof Error ? error.message : "Try again."
      );
    } finally {
      setBusy(false);
    }
  }

  function removeMedia(mediaId: string) {
    if (!saved) return;

    Alert.alert(
      "Delete demonstration?",
      "This will permanently remove the media file.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);

            try {
              const updated = await deleteExerciseMedia(
                saved.id,
                mediaId
              );

              setSaved(updated);
            } catch (error) {
              Alert.alert(
                "Delete failed",
                error instanceof Error ? error.message : "Try again."
              );
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color={C.brand} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <Txt>Admin access required.</Txt>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 22, paddingBottom: 80 }}
    >
      <Pressable
        onPress={() => router.back()}
        className="mb-5 h-11 w-11 items-center justify-center rounded-full border border-border"
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={23}
          color={C.ink}
        />
      </Pressable>

      <Txt weight="medium" className="text-xs tracking-[2px] text-brand">
        FITSYNC ADMIN STUDIO
      </Txt>

      <Txt weight="extra" className="mt-2 text-[28px]">
        {saved ? "EDIT EXERCISE" : "CREATE EXERCISE"}
      </Txt>

      <Txt className="mt-1 text-sm text-muted">
        Create a draft, add demonstrations, then publish.
      </Txt>

      {saved && (
        <Txt className="mt-3 text-xs text-brand">
          {pretty(saved.status)} · {saved.slug}
        </Txt>
      )}

      <Section
        title="01 / Exercise identity"
        subtitle="Give the exercise a searchable name."
      >
        <Field
          title="Exercise name *"
          value={draft.name}
          placeholder="Incline Dumbbell Press"
          onChange={name => {
            edit({
              name,
              slug: slugTouched.current
                ? draft.slug
                : slugify(name)
            });
          }}
        />

        <Field
          title="Slug *"
          value={draft.slug}
          placeholder="incline-dumbbell-press"
          onChange={value => {
            slugTouched.current = true;
            edit({ slug: slugify(value) });
          }}
        />

        <Field
          title="Description"
          value={draft.description}
          multiline
          onChange={description => edit({ description })}
        />
      </Section>

      <Section
        title="02 / Classification"
        subtitle="Select from your database-defined categories."
      >
        <Choices
          title="Category"
          items={taxonomy?.categories ?? []}
          selected={[draft.category]}
          onPress={category => {
            const firstActivity = taxonomy?.activityTypes.find(
              item => item.category === category
            );

            edit({
              category,
              activityType: firstActivity?.code ?? ""
            });
          }}
        />

        <Choices
          title="Activity type"
          items={(taxonomy?.activityTypes ?? []).filter(
            item => item.category === draft.category
          )}
          selected={[draft.activityType]}
          onPress={activityType => edit({ activityType })}
        />

        <Choices
          title="Body region"
          items={taxonomy?.bodyRegions ?? []}
          selected={[draft.bodyRegion]}
          onPress={bodyRegion => edit({ bodyRegion })}
        />

        <Choices
          title="Difficulty"
          items={[
            "beginner",
            "intermediate",
            "advanced"
          ].map(code => ({
            code,
            label: pretty(code)
          }))}
          selected={[draft.difficulty]}
          onPress={value => edit({
            difficulty: value as ExerciseInput["difficulty"]
          })}
        />

        <Choices
          title="Tracking type"
          items={[
            "reps_weight",
            "reps",
            "duration",
            "distance_duration"
          ].map(code => ({
            code,
            label: pretty(code)
          }))}
          selected={[draft.trackingType]}
          onPress={value => edit({
            trackingType: value as ExerciseInput["trackingType"]
          })}
        />

        <Choices
          title="Movement pattern"
          items={[
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
            "other"
          ].map(code => ({
            code,
            label: pretty(code)
          }))}
          selected={[draft.movementPattern]}
          onPress={value => edit({
            movementPattern: value as ExerciseInput["movementPattern"]
          })}
        />
      </Section>

      <Section
        title="03 / Muscles & equipment"
        subtitle="An exercise can target several muscles and require multiple equipment types."
      >
        <Choices
          title="Primary muscles"
          multi
          items={taxonomy?.muscleGroups ?? []}
          selected={draft.primaryMuscles}
          onPress={value => toggle("primaryMuscles", value)}
        />

        <Choices
          title="Secondary muscles"
          multi
          items={taxonomy?.muscleGroups ?? []}
          selected={draft.secondaryMuscles}
          onPress={value => toggle("secondaryMuscles", value)}
        />

        <Choices
          title="Equipment"
          multi
          items={taxonomy?.equipmentTypes ?? []}
          selected={draft.equipment}
          onPress={value => toggle("equipment", value)}
        />
      </Section>

      <Section
        title="04 / Coaching guide"
        subtitle="Write one instruction or tip per line."
      >
        <Field
          title="Step-by-step instructions *"
          value={instructions}
          multiline
          placeholder={"Set up your position\nPerform the movement\nReturn with control"}
          onChange={setInstructions}
        />

        <Field
          title="Technique tips"
          value={tips}
          multiline
          onChange={setTips}
        />

        <Field
          title="Common mistakes"
          value={mistakes}
          multiline
          onChange={setMistakes}
        />

        <Field
          title="Safety notes"
          value={safetyNotes}
          multiline
          onChange={setSafetyNotes}
        />

        <Field
          title="Breathing instructions"
          value={draft.breathingTip}
          multiline
          onChange={breathingTip => edit({ breathingTip })}
        />
      </Section>

      <Section
        title="05 / Exercise demonstrations"
        subtitle="Images are stored in Supabase; MP4 videos are stored in Cloudinary."
      >
        <Field
          title="Media creator"
          value={mediaCredit}
          placeholder="Filmed by FitSync"
          onChange={setMediaCredit}
        />

        <Field
          title="Media ownership / license *"
          value={mediaLicense}
          placeholder="Original content owned by FitSync"
          onChange={setMediaLicense}
        />

        <Field
          title="Source URL (optional)"
          value={mediaSourceUrl}
          placeholder="https://..."
          onChange={setMediaSourceUrl}
        />

        {!saved && (
          <Txt className="mb-4 text-xs text-muted">
            Save this exercise as a draft before uploading media.
          </Txt>
        )}

        <View className="flex-row gap-3">
          <Pressable
            disabled={!saved || busy}
            onPress={() => pickMedia("image")}
            className="min-h-[55px] flex-1 flex-row items-center justify-center rounded-xl border border-border bg-elevated"
          >
            <MaterialCommunityIcons
              name="image-plus"
              size={22}
              color={C.brand}
            />

            <Txt className="ml-2 text-sm">
              Add image
            </Txt>
          </Pressable>

          <Pressable
            disabled={!saved || busy}
            onPress={() => pickMedia("video")}
            className="min-h-[55px] flex-1 flex-row items-center justify-center rounded-xl border border-border bg-elevated"
          >
            <MaterialCommunityIcons
              name="video-plus"
              size={22}
              color={C.brand}
            />

            <Txt className="ml-2 text-sm">
              Add video
            </Txt>
          </Pressable>
        </View>

        {saved?.media.map(media => (
          <View
            key={media.id}
            className="mt-3 flex-row items-center rounded-xl bg-elevated p-3"
          >
            {media.kind === "image" ? (
              <Image
                source={{ uri: media.url }}
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 9
                }}
              />
            ) : (
              <MaterialCommunityIcons
                name="play-circle"
                size={48}
                color={C.brand}
              />
            )}

            <View className="ml-3 flex-1">
              <Txt className="text-sm">
                {media.kind === "video"
                  ? "Cloudinary video"
                  : "Supabase image"}
              </Txt>

              <Txt className="mt-1 text-xs text-muted">
                {media.license}
              </Txt>
            </View>

            <Pressable
              disabled={busy}
              onPress={() => removeMedia(media.id)}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={25}
                color={C.muted}
              />
            </Pressable>
          </View>
        ))}
      </Section>

      <View className="mt-8 gap-3">
        <PrimaryButton
          title={busy ? "SAVING..." : "SAVE DRAFT / CHANGES"}
          loading={busy}
          onPress={() => persist(saved?.status === "published" ? "published" : "draft")}
        />

        <Pressable
          disabled={busy || !saved}
          onPress={() => persist("published")}
          className="h-14 items-center justify-center rounded-2xl border border-brand bg-panel"
        >
          <Txt weight="bold" className="text-brand">
            PUBLISH EXERCISE →
          </Txt>
        </Pressable>

        {saved?.status === "published" && (
          <Pressable
            disabled={busy}
            onPress={() => persist("draft")}
            className="items-center py-3"
          >
            <Txt className="text-muted">
              Unpublish and return to draft
            </Txt>
          </Pressable>
        )}

        {!!saved && (
          <Pressable
            onPress={() => router.replace({
              pathname: "/exercise/[id]",
              params: { id: saved.id }
            })}
            className="items-center py-3"
          >
            <Txt className="text-brand">
              Preview exercise
            </Txt>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}
