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
    "See what you lifted last time, log today’s sets and time your rest on Android. Between workouts, track your steps, nutrition and sleep in the same app.",
  primary: { label: "Get started free", href: "/register" },
  secondary: { label: "Explore training", href: "/programs" },
};

export const stats = [
  ["90 days", "of training graphs on Free"],
  ["31", "health metrics you can track"],
  ["14", "built-in fitness calculators"],
  ["1 account", "across web and mobile"],
] as const;

export const pillars = [
  {
    art: "log",
    title: "Log every set",
    text: "See last session’s numbers on Android, record today’s weight and reps, then start the rest timer. Your workout history keeps the numbers for next time.",
    href: "/features",
    action: "See how logging works",
  },
  {
    art: "program",
    title: "Follow a program",
    text: "Browse the weekly schedule before you commit. With Pro, choose a start date, follow the program on Android and set session reminders.",
    href: "/programs",
    action: "Browse programs",
  },
  {
    art: "coach",
    title: "Train with a four-week plan",
    text: "With Pro, build a plan around the days you can train and the equipment you have. Swap an exercise or shorten a session when your week changes.",
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
    text: "Follow a guided mobility session on a recovery day, or use the strength and volume calculators to understand a recent workout.",
    href: "/exercises",
    action: "Explore the library",
  },
  {
    art: "sync",
    title: "Bring your health data",
    text: "Optionally import steps, sleep and weight from Health Connect on Android. Import is read-only, and extra steps you add are tracked separately.",
    href: "/features",
    action: "About health import",
  },
] as const;

export const planTiers = {
  free: [
    "Android workout logging, rest timers and personal records",
    "Saved routines with exercises from the library",
    "Workout reminders and 90 days of standard graphs",
    "31 health metrics, personal targets and Health Connect import",
    "Exercise library, guided mobility and fitness calculators",
    "Raw data export and monthly training reports",
  ],
  pro: [
    "Scheduled programs with session reminders",
    "Personal plans with exercise swaps and flexible training days",
    "Progression suggestions and weekly training reviews",
    "All-time graphs and muscle workload insights",
    "Custom exercises, warm-up sets and plate calculators",
    "Weekly meal plans, meal swaps and shopping lists",
    "Private progress photos and read-only training links",
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
      "A free account lets you save routines, log workouts, track daily health and see 90 days of standard graphs. Pro adds scheduled programs, adjustable training plans, weekly reviews, all-time graphs and weekly meal planning.",
  },
  {
    question: "How does Pro build my training plan?",
    answer:
      "In the Android app, choose your goal, experience, equipment, training days and session length. Pro uses those choices to build a four-week plan. You can review each session and accept changes when you need a shorter or easier day.",
  },
  {
    question: "Do I need a gym or special equipment?",
    answer:
      "No. Plans and the exercise library work for a full gym, a pair of dumbbells or just your bodyweight. Filter by equipment and experience to find movements that fit.",
  },
  {
    question: "Can I follow more than one program?",
    answer:
      "With Pro, you can follow one program at a time. Pick a start date and turn on session reminders if you want them. If you switch programs, your earlier workout logs stay in your history.",
  },
  {
    question: "Which health data can FitSync import?",
    answer:
      "With your permission, FitSync reads steps, sleep and body weight for the past seven days from Health Connect on Android. You can also log measurements yourself. Extra steps you enter are counted separately from imported steps.",
  },
  {
    question: "How do the website and mobile app work together?",
    answer:
      "Use the website to browse training programs, save a routine and manage your account. Open Train on Android with the same account to log your sets. The member web workspace is in development. We’ll post an update here when it’s ready.",
  },
];
