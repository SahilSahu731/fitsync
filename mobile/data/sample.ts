
export type DemoExercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  focus: string;
  tips: string[];
  sets: string;
};

export const exercises: DemoExercise[] = [
  {
    id: "bench-press",
    name: "Barbell Bench Press",
    muscle: "Chest",
    equipment: "Barbell",
    focus: "Chest · Triceps",
    sets: "3 × 8–12",
    tips: [
      "Keep both feet planted.",
      "Lower the bar under control.",
      "Use a spotter or safety bars when appropriate."
    ]
  },
  {
    id: "incline-dumbbell",
    name: "Incline Dumbbell Press",
    muscle: "Chest",
    equipment: "Dumbbell",
    focus: "Upper chest",
    sets: "3 × 10",
    tips: [
      "Set the bench to a moderate incline.",
      "Keep wrists stacked.",
      "Use controlled repetitions."
    ]
  },
  {
    id: "lat-pulldown",
    name: "Lat Pulldown",
    muscle: "Back",
    equipment: "Cable",
    focus: "Lats · Upper back",
    sets: "3 × 10–12",
    tips: [
      "Keep your torso stable.",
      "Pull elbows down toward your sides.",
      "Avoid jerking the cable."
    ]
  },
  {
    id: "seated-row",
    name: "Seated Cable Row",
    muscle: "Back",
    equipment: "Cable",
    focus: "Mid-back",
    sets: "3 × 12",
    tips: [
      "Maintain a neutral back.",
      "Move your elbows back smoothly.",
      "Control the return."
    ]
  },
  {
    id: "shoulder-press",
    name: "Dumbbell Shoulder Press",
    muscle: "Shoulders",
    equipment: "Dumbbell",
    focus: "Front delts · Triceps",
    sets: "3 × 10",
    tips: [
      "Brace the torso.",
      "Use a comfortable range of motion.",
      "Avoid swinging weights."
    ]
  },
  {
    id: "lateral-raise",
    name: "Dumbbell Lateral Raise",
    muscle: "Shoulders",
    equipment: "Dumbbell",
    focus: "Side delts",
    sets: "3 × 12",
    tips: [
      "Use manageable weights.",
      "Keep a soft bend in elbows.",
      "Avoid shrugging up."
    ]
  },
  {
    id: "barbell-squat",
    name: "Barbell Back Squat",
    muscle: "Legs",
    equipment: "Barbell",
    focus: "Quads · Glutes",
    sets: "3 × 8",
    tips: [
      "Keep feet grounded.",
      "Brace your trunk.",
      "Use safeties and a comfortable depth."
    ]
  },
  {
    id: "leg-press",
    name: "Leg Press",
    muscle: "Legs",
    equipment: "Machine",
    focus: "Quads · Glutes",
    sets: "3 × 10",
    tips: [
      "Keep hips against the seat.",
      "Control the lowering phase.",
      "Avoid locking knees forcefully."
    ]
  },
  {
    id: "romanian-deadlift",
    name: "Romanian Deadlift",
    muscle: "Legs",
    equipment: "Barbell",
    focus: "Hamstrings · Glutes",
    sets: "3 × 10",
    tips: [
      "Hinge from your hips.",
      "Keep the load close.",
      "Stop before your back rounds."
    ]
  },
  {
    id: "biceps-curl",
    name: "Dumbbell Biceps Curl",
    muscle: "Arms",
    equipment: "Dumbbell",
    focus: "Biceps",
    sets: "3 × 12",
    tips: [
      "Avoid swinging the arms.",
      "Keep elbows close to your sides.",
      "Lower with control."
    ]
  },
  {
    id: "triceps-pushdown",
    name: "Rope Triceps Pushdown",
    muscle: "Arms",
    equipment: "Cable",
    focus: "Triceps",
    sets: "3 × 12",
    tips: [
      "Keep shoulders relaxed.",
      "Extend elbows smoothly.",
      "Do not use momentum."
    ]
  },
  {
    id: "plank",
    name: "Plank",
    muscle: "Core",
    equipment: "Bodyweight",
    focus: "Core stabilization",
    sets: "3 × 30 sec",
    tips: [
      "Keep your body in one line.",
      "Breathe steadily.",
      "Stop if you lose control."
    ]
  }
];

export const demoPlans = [
  {
    id: "upper",
    name: "Upper Body",
    subtitle: "Chest · Back · Shoulders",
    minutes: 45,
    count: 6,
    tag: "TODAY",
    exerciseIds: [
      "bench-press",
      "lat-pulldown",
      "incline-dumbbell",
      "seated-row",
      "shoulder-press",
      "lateral-raise"
    ]
  },
  {
    id: "lower",
    name: "Lower Body",
    subtitle: "Quads · Glutes · Hamstrings",
    minutes: 50,
    count: 3,
    tag: "DAY 02",
    exerciseIds: [
      "barbell-squat",
      "leg-press",
      "romanian-deadlift"
    ]
  },
  {
    id: "arms",
    name: "Arms & Core",
    subtitle: "Biceps · Triceps · Abs",
    minutes: 30,
    count: 3,
    tag: "DAY 03",
    exerciseIds: [
      "biceps-curl",
      "triceps-pushdown",
      "plank"
    ]
  }
];
