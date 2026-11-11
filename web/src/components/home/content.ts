export const homeImages = {
  studio: "/art/training-studio.webp",
  athlete: "/art/athlete-motion.webp",
  preparation: "/art/auth-ready.webp",
};

export const heroContent = {
  eyebrow: "TRAIN. TRACK. ADAPT.",
  title: "Train smarter.",
  secondLine: "Show up",
  accent: "stronger.",
  description:
    "Follow a program, log every set, and track 31 health metrics. Get a free four-week starter plan built around your goal, equipment and schedule.",
  primary: { label: "Get started free", href: "/register" },
  secondary: { label: "Explore training", href: "/programs" },
};

export const stats = [
  ["4 weeks", "free starter plan, built for you"],
  ["31", "health metrics you can track"],
  ["14", "built-in fitness calculators"],
  ["1 account", "across web and mobile"],
] as const;

export const pillars = [
  {
    art: "log",
    title: "Log every set",
    text: "Record weight, reps and effort as you train, with a rest timer and a full workout history to look back on.",
    href: "/features",
    action: "See how logging works",
  },
  {
    art: "program",
    title: "Follow a program",
    text: "Pick a published program and start on a date you choose. Reminders arrive at your time, and missed sessions stay available.",
    href: "/programs",
    action: "Browse programs",
  },
  {
    art: "coach",
    title: "Get a starter plan",
    text: "A four-week plan from your goal, experience, equipment, session length and training days. No guesswork, no made-up exercises.",
    href: "/features",
    action: "How plans are built",
  },
  {
    art: "progress",
    title: "See real progress",
    text: "Sessions, volume, estimated 1RM and weekly consistency, plus activity, nutrition, body and recovery metrics. Export your data any time.",
    href: "/features",
    action: "Explore progress",
  },
  {
    art: "explore",
    title: "Learn and recover",
    text: "Guided mobility sessions, short articles and 14 calculators, so warm-ups and rest days count too.",
    href: "/exercises",
    action: "Explore the library",
  },
  {
    art: "sync",
    title: "Bring your health data",
    text: "Optionally import steps, sleep and weight from Health Connect on Android or Apple Health on iOS. Import is read-only.",
    href: "/features",
    action: "About health import",
  },
] as const;

export const planTiers = {
  free: [
    "Workout logging and full history",
    "Free four-week starter plan",
    "Follow programs with reminders",
    "All 31 health metrics and targets",
    "Exercise library, mobility and tools",
    "Raw data export",
  ],
  pro: [
    "Shorten a session to the time you have",
    "Switch to gym, dumbbells or bodyweight",
    "Swap an exercise within the same movement pattern",
    "Choose an easier day when you need one",
    "Progression suggestions",
    "Move a missed session and the rest of the schedule",
    "A weekly review with clear next actions",
  ],
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
    question: "What is free and what is Pro?",
    answer:
      "Free includes workout logging and history, a four-week starter plan, program following with reminders, all 31 health metrics and targets, the exercise library, and data export. Optional Pro adds plan adaptation: shorter sessions, equipment changes, easier days, exercise swaps, progression suggestions, rescheduling and a weekly review.",
  },
  {
    question: "How is my starter plan created?",
    answer:
      "From your saved goal, experience, equipment, session length and training days. Beginners get up to three strength days a week and other levels up to four. Plans only use published exercises, never guess a starting weight, and week four reduces sets.",
  },
  {
    question: "Do I need a gym or special equipment?",
    answer:
      "No. Plans and the exercise library work for a full gym, a pair of dumbbells or just your bodyweight. Filter by equipment and experience to find movements that fit.",
  },
  {
    question: "Can I follow more than one program?",
    answer:
      "One active program at a time. If you switch, your old enrollment, journal and workout logs are kept. Missed sessions stay available, and days with nothing scheduled are recovery days.",
  },
  {
    question: "Which health data can FitSync import?",
    answer:
      "Steps, sleep and body weight, from Health Connect on Android and Apple Health on iOS, for the last seven days. It is optional and read-only: FitSync does not write to your health records.",
  },
  {
    question: "How do the website and mobile app work together?",
    answer:
      "Explore exercises and programs, learn technique and manage your profile on the website. Log workouts and daily check-ins in the mobile app with the same account.",
  },
];