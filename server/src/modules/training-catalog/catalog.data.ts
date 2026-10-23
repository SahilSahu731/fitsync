export type Level = "beginner" | "intermediate" | "advanced";

export type Goal =
  | "muscle"
  | "strength"
  | "fat_loss"
  | "endurance"
  | "general";

export type Equipment =
  | "gym"
  | "dumbbells"
  | "bodyweight"
  | "bands"
  | "mixed";

export type ExercisePrescription = {
  name: string;
  sets: number;
  minReps: number;
  maxReps: number;
  rest: number;
  notes: string;
};

export type RoutineDefinition = {
  slug: string;
  name: string;
  description: string;
  category: string;
  level: Level;
  goal: Goal;
  equipment: Equipment;
  minutes: number;
  exercises: ExercisePrescription[];
};

export type ProgramDefinition = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  level: Level;
  goal: Goal;
  equipment: Equipment;
  weeks: number;
  featuredRank?: number;
  schedule: Array<string | null>;
};

export const categories = [
  {
    slug: "at-home",
    name: "At Home",
    description: "Train at home with minimal equipment."
  },
  {
    slug: "travel",
    name: "Travel",
    description: "Compact workouts wherever you go."
  },
  {
    slug: "dumbbells",
    name: "Dumbbells Only",
    description: "Strength training with dumbbells."
  },
  {
    slug: "bands",
    name: "Resistance Bands",
    description: "Portable resistance training."
  },
  {
    slug: "cardio-hiit",
    name: "Cardio & HIIT",
    description: "Conditioning and cardiovascular training."
  },
  {
    slug: "gym",
    name: "Gym",
    description: "Complete gym-based strength routines."
  },
  {
    slug: "bodyweight",
    name: "Bodyweight",
    description: "Train using your own bodyweight."
  },
  {
    slug: "suspension",
    name: "Suspension Bands",
    description: "Suspension-based strength and stability."
  }
];

const ex = (
  name: string,
  sets: number,
  minReps: number,
  maxReps: number,
  rest: number,
  notes: string
): ExercisePrescription => ({
  name,
  sets,
  minReps,
  maxReps,
  rest,
  notes
});

export const routines: RoutineDefinition[] = [
  {
    slug: "push-gym",
    name: "Push Day",
    description:
      "Build chest, shoulders and triceps with pressing movements and isolation exercises.",
    category: "gym",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    minutes: 65,
    exercises: [
      ex("Bench Press (Barbell)", 3, 6, 10, 150,
        "Control the lowering phase and keep your feet planted."),
      ex("Incline Bench Press (Dumbbell)", 3, 8, 12, 120,
        "Use a comfortable incline and avoid flaring your elbows excessively."),
      ex("Overhead Press (Barbell)", 3, 6, 10, 150,
        "Brace your core and press through a controlled path."),
      ex("Lateral Raise (Dumbbell)", 3, 12, 15, 75,
        "Raise with control and avoid swinging."),
      ex("Triceps Pushdown (Cable)", 3, 10, 15, 75,
        "Keep upper arms relatively still.")
    ]
  },
  {
    slug: "pull-gym",
    name: "Pull Day",
    description:
      "Develop your back and biceps through vertical pulls, rows and curls.",
    category: "gym",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    minutes: 60,
    exercises: [
      ex("Lat Pulldown (Cable)", 3, 8, 12, 120,
        "Pull toward the upper chest without excessive momentum."),
      ex("Bent Over Row (Barbell)", 3, 8, 12, 120,
        "Maintain a stable torso and pull toward your body."),
      ex("Inverted Row", 3, 8, 12, 90,
        "Keep your body aligned throughout the movement."),
      ex("Bicep Curl (Dumbbell)", 3, 10, 12, 75,
        "Keep your upper arms steady."),
      ex("Hammer Curl (Dumbbell)", 2, 10, 15, 75,
        "Control both the lifting and lowering phases.")
    ]
  },
  {
    slug: "legs-gym",
    name: "Leg Day",
    description:
      "Train quads, hamstrings and glutes with compound and accessory exercises.",
    category: "gym",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    minutes: 70,
    exercises: [
      ex("Squat (Barbell)", 3, 6, 10, 180,
        "Brace before each repetition and use a comfortable depth."),
      ex("Romanian Deadlift (Barbell)", 3, 8, 12, 150,
        "Hinge through your hips and keep the bar close."),
      ex("Leg Press (Machine)", 3, 10, 12, 120,
        "Control the lowering phase."),
      ex("Lying Leg Curl (Machine)", 3, 10, 15, 90,
        "Avoid lifting your hips off the pad."),
      ex("Leg Extensions", 2, 12, 15, 75,
        "Use controlled movement without swinging.")
    ]
  },
  {
    slug: "full-body-a",
    name: "Full Body A",
    description:
      "A beginner-friendly workout covering the main movement patterns.",
    category: "gym",
    level: "beginner",
    goal: "general",
    equipment: "gym",
    minutes: 45,
    exercises: [
      ex("Goblet Squat", 2, 8, 12, 90,
        "Keep the weight close to your chest."),
      ex("Bench Press (Dumbbell)", 2, 8, 12, 90,
        "Use a weight you can control."),
      ex("Lat Pulldown (Cable)", 2, 10, 12, 90,
        "Pull smoothly without swinging."),
      ex("Glute Bridge", 2, 12, 15, 75,
        "Pause briefly at the top."),
      ex("Plank", 2, 20, 40, 60,
        "Hold for 20–40 seconds while maintaining a stable trunk.")
    ]
  },
  {
    slug: "full-body-b",
    name: "Full Body B",
    description:
      "A complementary beginner full-body session.",
    category: "gym",
    level: "beginner",
    goal: "general",
    equipment: "gym",
    minutes: 45,
    exercises: [
      ex("Leg Press (Machine)", 2, 10, 12, 90,
        "Use a controlled range of motion."),
      ex("Bent Over Row (Barbell)", 2, 8, 12, 90,
        "Keep your torso stable and start with a light load."),
      ex("Arnold Press (Dumbbell)", 2, 8, 12, 90,
        "Rotate smoothly without forcing shoulder motion."),
      ex("Hip Thrust (Barbell)", 2, 10, 12, 90,
        "Avoid excessive lower-back extension."),
      ex("Crunch", 2, 12, 15, 60,
        "Lift using your abdominal muscles, not momentum.")
    ]
  },
  {
    slug: "upper-gym",
    name: "Upper Body",
    description:
      "A balanced upper-body workout for muscle development.",
    category: "gym",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    minutes: 60,
    exercises: [
      ex("Bench Press (Barbell)", 3, 6, 10, 150,
        "Maintain a stable bench position."),
      ex("Lat Pulldown (Cable)", 3, 8, 12, 120,
        "Control the return phase."),
      ex("Incline Bench Press (Dumbbell)", 2, 8, 12, 90,
        "Use a comfortable incline."),
      ex("Bent Over Row (Barbell)", 2, 8, 12, 120,
        "Keep your back stable."),
      ex("Lateral Raise (Dumbbell)", 2, 12, 15, 60,
        "Avoid using momentum."),
      ex("Bicep Curl (Dumbbell)", 2, 10, 15, 60,
        "Control each repetition.")
    ]
  },
  {
    slug: "lower-gym",
    name: "Lower Body",
    description:
      "Build lower-body strength with squats, hinges and accessory work.",
    category: "gym",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    minutes: 60,
    exercises: [
      ex("Squat (Barbell)", 3, 6, 10, 180,
        "Brace before each repetition."),
      ex("Romanian Deadlift (Barbell)", 3, 8, 10, 150,
        "Maintain a controlled hip hinge."),
      ex("Leg Press (Machine)", 2, 10, 12, 90,
        "Keep your hips supported."),
      ex("Lying Leg Curl (Machine)", 2, 10, 15, 75,
        "Control the eccentric phase."),
      ex("Bulgarian Split Squat", 2, 8, 12, 90,
        "Maintain balance and use a comfortable depth.")
    ]
  },
  {
    slug: "bodyweight-foundations",
    name: "Bodyweight Foundations",
    description:
      "An accessible bodyweight session using pushing, single-leg and core exercises.",
    category: "bodyweight",
    level: "beginner",
    goal: "general",
    equipment: "bodyweight",
    minutes: 30,
    exercises: [
      ex("Incline Push Up", 3, 8, 12, 75,
        "Choose an incline that allows controlled repetitions."),
      ex("Glute Bridge", 3, 12, 15, 60,
        "Keep the trunk stable."),
      ex("Bulgarian Split Squat", 2, 8, 10, 90,
        "Use bodyweight only and hold a stable support for balance."),
      ex("Crunch", 2, 12, 15, 60,
        "Avoid pulling on your neck."),
      ex("Plank", 2, 20, 40, 60,
        "Hold for 20–40 seconds.")
    ]
  }
];

export const programs: ProgramDefinition[] = [
  {
    slug: "ppl-six",
    name: "Push Pull Legs",
    tagline: "A six-day muscle-building split.",
    description:
      "An intermediate program organized around push, pull and leg sessions, repeated twice weekly. Adjust volume if recovery becomes difficult.",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    weeks: 8,
    featuredRank: 1,
    schedule: [
      "push-gym",
      "pull-gym",
      "legs-gym",
      "push-gym",
      "pull-gym",
      "legs-gym",
      null
    ]
  },
  {
    slug: "full-body-foundations",
    name: "Full Body Foundations",
    tagline: "Start strong with three weekly workouts.",
    description:
      "An approachable three-day program built around full-body strength training and recovery.",
    level: "beginner",
    goal: "general",
    equipment: "gym",
    weeks: 8,
    featuredRank: 2,
    schedule: [
      "full-body-a",
      null,
      "full-body-b",
      null,
      "full-body-a",
      null,
      null
    ]
  },
  {
    slug: "upper-lower-four",
    name: "Upper / Lower Split",
    tagline: "Four balanced training days.",
    description:
      "A four-day training split with two upper-body and two lower-body sessions each week.",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    weeks: 8,
    featuredRank: 3,
    schedule: [
      "upper-gym",
      "lower-gym",
      null,
      "upper-gym",
      "lower-gym",
      null,
      null
    ]
  },
  {
    slug: "ppl-three",
    name: "Three-Day PPL",
    tagline: "Push, pull and legs in three days.",
    description:
      "A simple three-day split for people who prefer fewer weekly gym sessions.",
    level: "intermediate",
    goal: "muscle",
    equipment: "gym",
    weeks: 8,
    featuredRank: 4,
    schedule: [
      "push-gym",
      null,
      "pull-gym",
      null,
      "legs-gym",
      null,
      null
    ]
  },
  {
    slug: "strength-foundations",
    name: "Strength Foundations",
    tagline: "Learn the fundamentals.",
    description:
      "An introductory full-body program emphasizing controlled technique and gradual progression.",
    level: "beginner",
    goal: "strength",
    equipment: "gym",
    weeks: 8,
    featuredRank: 5,
    schedule: [
      "full-body-a",
      null,
      "full-body-b",
      null,
      "full-body-a",
      null,
      null
    ]
  },
  {
    slug: "bodyweight-basics",
    name: "Bodyweight Basics",
    tagline: "Start training without a gym.",
    description:
      "A three-day bodyweight program focused on basic strength and movement control.",
    level: "beginner",
    goal: "general",
    equipment: "bodyweight",
    weeks: 6,
    schedule: [
      "bodyweight-foundations",
      null,
      "bodyweight-foundations",
      null,
      "bodyweight-foundations",
      null,
      null
    ]
  }
];