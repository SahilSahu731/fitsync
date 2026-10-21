
import "dotenv/config";

import { db } from "../src/config/supabase.js";
import {
  exerciseInputSchema
} from "../src/modules/exercises/exercise.schema.js";

const base = {
  description: "",
  difficulty: "beginner",
  trackingType: "reps_weight",
  movementPattern: "other",

  primaryMuscles: [],
  secondaryMuscles: [],
  equipment: [],

  tips: [],
  mistakes: [],
  safetyNotes: [],
  breathingTip: "",

  status: "draft"
};

const exercises = [
  {
    slug: "dumbbell-bench-press",
    name: "Dumbbell Bench Press",
    description: "A horizontal pressing exercise using dumbbells.",
    category: "strength",
    activityType: "weight-training",
    bodyRegion: "upper-body",
    movementPattern: "push",

    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "front-delts"],
    equipment: ["dumbbell", "bench"],

    instructions: [
      "Lie on a flat bench with your feet supported on the floor.",
      "Position the dumbbells near your chest with your wrists straight.",
      "Press the dumbbells upward in a controlled movement.",
      "Lower them slowly to a comfortable starting position."
    ],

    tips: [
      "Keep your shoulders supported against the bench.",
      "Control both the lifting and lowering phases."
    ],

    mistakes: [
      "Using momentum to move the weights.",
      "Allowing your wrists to bend excessively."
    ],

    safetyNotes: [
      "Choose weights you can comfortably control.",
      "Use a spotter when attempting challenging loads."
    ],

    breathingTip: "Exhale as you press, inhale while lowering."
  },
  {
    slug: "incline-dumbbell-press",
    name: "Incline Dumbbell Press",
    description: "An incline chest-press variation.",
    category: "strength",
    activityType: "weight-training",
    bodyRegion: "upper-body",
    movementPattern: "push",

    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "front-delts"],
    equipment: ["dumbbell", "bench"],

    instructions: [
      "Adjust the bench to a moderate incline.",
      "Sit back with your feet firmly supported.",
      "Start with the dumbbells near the upper chest.",
      "Press upward without losing control of your shoulders.",
      "Lower slowly and repeat."
    ],

    tips: [
      "Avoid setting the bench unnecessarily steep.",
      "Maintain a stable position during every repetition."
    ]
  },
  {
    slug: "goblet-squat",
    name: "Goblet Squat",
    description: "A squat variation holding a weight near the chest.",
    category: "strength",
    activityType: "weight-training",
    bodyRegion: "lower-body",
    movementPattern: "squat",

    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["abs", "adductors"],
    equipment: ["dumbbell"],

    instructions: [
      "Stand with your feet comfortably spaced.",
      "Hold one dumbbell vertically against your chest.",
      "Bend your hips and knees into a comfortable squat.",
      "Keep your feet planted and your movement controlled.",
      "Stand upright to finish the repetition."
    ],

    tips: [
      "Allow your knees to follow your toes.",
      "Use a range of motion that feels comfortable."
    ]
  },
  {
    slug: "lat-pulldown",
    name: "Lat Pulldown",
    description: "A cable-based vertical pulling exercise.",
    category: "strength",
    activityType: "weight-training",
    bodyRegion: "upper-body",
    movementPattern: "pull",

    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps", "upper-back"],
    equipment: ["cable", "machine"],

    instructions: [
      "Adjust the seat and thigh pad for a stable position.",
      "Hold the bar comfortably with both hands.",
      "Pull the bar toward the upper chest.",
      "Return slowly to the starting position."
    ],

    tips: [
      "Keep your torso mostly stable.",
      "Think about moving your elbows downward."
    ],

    mistakes: [
      "Swinging backward to lift more weight.",
      "Pulling the bar behind your neck."
    ]
  },
  {
    slug: "push-up",
    name: "Push-Up",
    description: "A classic bodyweight pressing exercise.",
    category: "calisthenics",
    activityType: "bodyweight-strength",
    bodyRegion: "upper-body",
    movementPattern: "push",
    trackingType: "reps",

    primaryMuscles: ["chest"],
    secondaryMuscles: ["triceps", "front-delts", "abs"],
    equipment: ["bodyweight"],

    instructions: [
      "Place your hands on the floor around shoulder width.",
      "Extend your legs behind you.",
      "Maintain a stable line through your torso.",
      "Lower your body under control.",
      "Push back to the starting position."
    ],

    tips: [
      "Try an elevated-hand variation if regular push-ups are difficult."
    ]
  },
  {
    slug: "pull-up",
    name: "Pull-Up",
    description: "A bodyweight vertical pulling movement.",
    category: "calisthenics",
    activityType: "bodyweight-strength",
    bodyRegion: "upper-body",
    movementPattern: "pull",
    difficulty: "advanced",
    trackingType: "reps",

    primaryMuscles: ["lats"],
    secondaryMuscles: ["biceps", "upper-back"],
    equipment: ["pull-up-bar", "bodyweight"],

    instructions: [
      "Grip a secure pull-up bar.",
      "Begin from a controlled hanging position.",
      "Pull yourself upward toward the bar.",
      "Lower your body slowly without dropping."
    ],

    tips: [
      "Use assisted variations when building strength."
    ],

    safetyNotes: [
      "Make sure the pull-up bar is securely installed."
    ]
  },
  {
    slug: "forearm-plank",
    name: "Forearm Plank",
    description: "An isometric exercise for trunk stability.",
    category: "calisthenics",
    activityType: "bodyweight-strength",
    bodyRegion: "core",
    movementPattern: "stillness",
    trackingType: "duration",

    primaryMuscles: ["abs"],
    secondaryMuscles: ["obliques", "glutes"],
    equipment: ["bodyweight", "yoga-mat"],

    instructions: [
      "Place your forearms on the floor.",
      "Extend your legs into a plank position.",
      "Brace your abdomen and maintain a stable torso.",
      "Continue breathing while holding the position."
    ],

    tips: [
      "End the set when you can no longer maintain good technique."
    ]
  },
  {
    slug: "outdoor-running",
    name: "Outdoor Running",
    description: "A distance-based cardiovascular activity.",
    category: "cardio",
    activityType: "running",
    bodyRegion: "full-body",
    movementPattern: "locomotion",
    trackingType: "distance_duration",

    primaryMuscles: ["quads", "hamstrings", "calves", "glutes"],
    secondaryMuscles: [],
    equipment: ["none"],

    instructions: [
      "Start with several minutes of comfortable walking.",
      "Begin running at a manageable pace.",
      "Maintain a sustainable effort.",
      "Slow down gradually before finishing."
    ],

    safetyNotes: [
      "Pay attention to traffic, terrain and weather.",
      "Increase training volume gradually."
    ]
  },
  {
    slug: "stationary-cycling",
    name: "Stationary Cycling",
    description: "Low-impact cardio using a stationary bicycle.",
    category: "cardio",
    activityType: "cycling",
    bodyRegion: "lower-body",
    movementPattern: "locomotion",
    trackingType: "duration",

    primaryMuscles: ["quads", "glutes"],
    secondaryMuscles: ["hamstrings", "calves"],
    equipment: ["stationary-bike"],

    instructions: [
      "Adjust the bike to a comfortable riding position.",
      "Begin pedaling at a light resistance.",
      "Increase resistance or cadence gradually.",
      "Return to an easy effort before finishing."
    ]
  },
  {
    slug: "standing-calf-stretch",
    name: "Standing Calf Stretch",
    description: "A standing stretch targeting the calf muscles.",
    category: "mobility",
    activityType: "stretching",
    bodyRegion: "lower-body",
    movementPattern: "mobility",
    trackingType: "duration",

    primaryMuscles: ["calves"],
    secondaryMuscles: [],
    equipment: ["none"],

    instructions: [
      "Place your hands on a stable wall.",
      "Step one foot backward.",
      "Keep the rear heel gently grounded.",
      "Lean forward until you feel a mild stretch.",
      "Repeat on the other side."
    ],

    safetyNotes: [
      "Do not force a painful stretch."
    ]
  },
  {
    slug: "downward-facing-dog",
    name: "Downward-Facing Dog",
    description: "A common yoga posture involving the full body.",
    category: "yoga",
    activityType: "yoga-pose",
    bodyRegion: "full-body",
    movementPattern: "mobility",
    trackingType: "duration",

    primaryMuscles: ["hamstrings", "calves"],
    secondaryMuscles: ["front-delts"],
    equipment: ["yoga-mat"],

    instructions: [
      "Start on your hands and knees.",
      "Press through your hands and lift your hips upward.",
      "Move toward an inverted V shape.",
      "Keep your knees slightly bent if needed.",
      "Breathe steadily while holding the pose."
    ]
  },
  {
    slug: "box-breathing",
    name: "Box Breathing",
    description: "A structured breathing practice.",
    category: "meditation",
    activityType: "breathwork",
    bodyRegion: "mind-body",
    movementPattern: "stillness",
    trackingType: "duration",

    primaryMuscles: [],
    secondaryMuscles: [],
    equipment: ["none"],

    instructions: [
      "Sit in a comfortable position.",
      "Breathe in gently for a count of four.",
      "Pause briefly if comfortable.",
      "Exhale gently for a count of four.",
      "Pause again if comfortable and repeat."
    ],

    safetyNotes: [
      "Avoid forcing your breathing or breath holds.",
      "Return to normal breathing if you feel dizzy."
    ]
  }
];

async function main() {
  const adminId = process.env.SEED_ADMIN_USER_ID;

  if (!adminId) {
    throw new Error(
      "Set SEED_ADMIN_USER_ID in server/.env first."
    );
  }

  const { data: admin, error } = await db
    .from("app_users")
    .select("role")
    .eq("id", adminId)
    .single();

  if (error || admin?.role !== "admin") {
    throw new Error("The seed user must be an administrator.");
  }

  for (const item of exercises) {
    const input = exerciseInputSchema.parse({
      ...base,
      ...item
    });

    const { error: saveError } = await db.rpc(
      "save_fitsync_exercise",
      {
        p_id: null,
        p_actor: adminId,
        p_data: input
      }
    );

    if (saveError?.code === "23505") {
      console.log("Already exists:", item.name);
      continue;
    }

    if (saveError) {
      throw new Error(`${item.name}: ${saveError.message}`);
    }

    console.log("Created draft:", item.name);
  }

  console.log("Starter exercises imported.");
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
