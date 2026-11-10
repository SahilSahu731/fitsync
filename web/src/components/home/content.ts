// Edit homepage copy, image paths, and illustrative data here.
// Section layout and styling live in the neighboring *-section.tsx files.
export const homeImages = {
  studio: "/art/training-studio.webp",
  athlete: "/art/athlete-motion.webp",
  preparation: "/art/auth-ready.webp",
};

export const heroContent = {
  eyebrow: "FOR THE EVERYDAY ATHLETE",
  title: "Train smarter.",
  secondLine: "Show up",
  accent: "stronger.",
  description:
    "A little structure. A lot more possibility. Find your training, build your rhythm, and keep your good thing going.",
  primary: { label: "Get started free", href: "/register" },
  secondary: { label: "Explore training", href: "/programs" },
};

export const movementLabels = [
  "Strength",
  "Mobility",
  "Bodyweight",
  "Progress",
  "Recovery",
  "Your pace",
];

export const storyContent = {
  statement:
    "The right movement. A plan that fits your week. A place to remember the work. More room for the athlete in you.",
  steps: [
    {
      title: "Find your focus.",
      description:
        "Explore exercises by muscle, equipment, and experience. Get to know the movement before your first rep.",
      href: "/exercises",
      action: "Explore exercises",
    },
    {
      title: "Build your rhythm.",
      description:
        "Choose a program around the days you actually have. A little consistency goes a long way.",
      href: "/programs",
      action: "Find your program",
    },
    {
      title: "Keep the feeling.",
      description:
        "Log your sessions in the mobile app. Keep your sets, check-ins, and progress in one place.",
      href: "/features",
      action: "Meet FitSync mobile",
    },
  ],
};

export const movementStudies = [
  {
    kind: "strength",
    label: "Strength",
    title: "A little stronger, rep by rep.",
    detail: "Learn the squat, press, and row. Find exercises for your equipment and experience.",
    equipment: "Gym or dumbbells",
    href: "/exercises",
    action: "Explore strength exercises",
  },
  {
    kind: "mobility",
    label: "Mobility",
    title: "Make room for better movement.",
    detail:
      "Explore controlled stretches and movement guides for a warm-up, recovery, or a moment to yourself.",
    equipment: "A little floor space",
    href: "/exercises",
    action: "Explore movement guides",
  },
  {
    kind: "bodyweight",
    label: "Bodyweight",
    title: "Less equipment. All you.",
    detail:
      "Simple movements, plenty of possibility. Build control with exercises you can take almost anywhere.",
    equipment: "No equipment needed",
    href: "/exercises",
    action: "Find bodyweight exercises",
  },
] as const;

export const workoutExamples = [
  {
    label: "Upper",
    title: "Upper body",
    exercises: [
      { name: "Bench press", sets: ["60 × 8", "60 × 8", "60 × 7"] },
      { name: "Seated row", sets: ["40 × 10", "40 × 10", "40 × 9"] },
    ],
  },
  {
    label: "Lower",
    title: "Lower body",
    exercises: [
      { name: "Back squat", sets: ["60 × 8", "60 × 8", "60 × 6"] },
      { name: "Leg curl", sets: ["25 × 12", "25 × 10", "25 × 10"] },
    ],
  },
  {
    label: "Full",
    title: "Full body",
    exercises: [
      { name: "Goblet squat", sets: ["16 × 10", "16 × 10", "16 × 8"] },
      { name: "Dumbbell row", sets: ["18 × 10", "18 × 10", "18 × 9"] },
    ],
  },
] as const;

export const questions = [
  {
    question: "Can I get started for free?",
    answer:
      "Yes. Create a FitSync account to start exploring. Workout logging, daily tracking, your starting plan, and progress history are available in the mobile app. Optional Pro features add plan adjustments and deeper guidance.",
  },
  {
    question: "Do I need a gym or special equipment?",
    answer:
      "No. Explore exercises for a full gym, a pair of dumbbells, or just your bodyweight. Use the equipment and experience filters to find movements that suit your setup.",
  },
  {
    question: "How do the website and mobile app work together?",
    answer:
      "Explore exercises and programs, learn techniques, and manage your profile on the website. Log sessions and daily check-ins in the mobile app, with the same FitSync account.",
  },
  {
    question: "What if I’m just getting started?",
    answer:
      "Start with the beginner filters, preview the movements, then choose a program with a schedule you can repeat. Your starting point is a starting point, not a finish line.",
  },
];
