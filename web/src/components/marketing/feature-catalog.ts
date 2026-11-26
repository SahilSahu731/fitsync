import {
  Activity,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  Dumbbell,
  Heart,
  Leaf,
  SlidersHorizontal,
  Sparkles,
  Timer,
  WandSparkles,
} from "lucide-react";

// Product scope verified against mobile/src/features and the shared training catalog.
export const featureGroups = [
  {
    icon: Dumbbell,
    title: "Workouts, remembered.",
    description:
      "Open a saved routine on Android and see your previous weight and reps as you log each set. Use the rest timer between sets and add a note for next time.",
    label: "Workout logging",
  },
  {
    icon: Sparkles,
    title: "A starting point that fits.",
    description:
      "Choose the equipment you have and the days you can train. Pro builds four weeks of exercises and sets around those choices, ready to follow on Android.",
    label: "Personal training plans",
    pro: true,
  },
  {
    icon: CalendarDays,
    title: "A week with a little structure.",
    description:
      "Browse programs by equipment, level and schedule. With Pro, follow one on Android, choose a start date and set reminders for training days.",
    label: "Programs & calendar",
  },
  {
    icon: ClipboardList,
    title: "Get to know the movement.",
    description:
      "Filter by muscle, equipment or experience. Read the cues for an unfamiliar lift and check its demonstration when one is available.",
    label: "Exercise library",
  },
  {
    icon: Heart,
    title: "Your whole day matters.",
    description:
      "Record water, protein, body measurements and sleep. Set a daily target for the numbers you care about. Pro also includes a food diary and weekly meal plans.",
    label: "Daily health tracking",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Progress you can look back on.",
    description:
      "Look back at personal records and compare training volume and estimated strength. Free includes 90 days of standard graphs. Pro opens your full graph history and muscle workload trends.",
    label: "Progress & insights",
  },
  {
    icon: Leaf,
    title: "Make room for recovery.",
    description:
      "Follow guided mobility sessions and track how you feel, from sleep and soreness to energy, mood and stress.",
    label: "Mobility & recovery",
  },
  {
    icon: BookOpen,
    title: "Understand your next move.",
    description:
      "Read short fitness articles and use built-in calculators for practical estimates, including training volume and strength.",
    label: "Learn & fitness tools",
  },
  {
    icon: Activity,
    title: "Bring your health data along.",
    description:
      "Optionally import steps, sleep and body weight from Health Connect on Android. Access is read-only, and extra steps you add stay separate from detected steps.",
    label: "Connected health",
  },
  {
    icon: SlidersHorizontal,
    title: "Let the plan meet your day.",
    description:
      "With Pro, shorten a session, change equipment, swap a movement or choose an easier day. Review the changes before you train.",
    label: "Session adaptation",
    pro: true,
  },
  {
    icon: Timer,
    title: "Keep moving after a missed day.",
    description:
      "Move a missed session to a day you can train. Preview the new dates for the sessions that follow before you accept the change.",
    label: "Flexible scheduling",
    pro: true,
  },
  {
    icon: WandSparkles,
    title: "A clearer next step.",
    description:
      "Review suggested targets from your completed sets. Your weekly review shows what you trained and where you could adjust the next session.",
    label: "Progression & weekly review",
    pro: true,
  },
];

export const metricGroups = [
  {
    title: "Activity",
    description: "Count walks, active minutes and the flights of stairs in between.",
    metrics: [
      "Steps",
      "Active calories",
      "Walking / running distance",
      "Active minutes",
      "Floors climbed",
    ],
  },
  {
    title: "Nutrition",
    description: "Follow your meals and water against your daily targets.",
    metrics: [
      "Food calories",
      "Protein",
      "Carbohydrates",
      "Fat",
      "Water",
      "Fiber",
      "Sugar",
      "Sodium",
      "Caffeine",
    ],
  },
  {
    title: "Body",
    description: "Keep a record of your weight and tape measurements.",
    metrics: [
      "Body weight",
      "Waist",
      "Body fat",
      "Chest",
      "Hips",
      "Upper arm",
      "Thigh",
      "Calf",
      "Neck",
    ],
  },
  {
    title: "Recovery",
    description: "Log how you slept and how sore you feel before training.",
    metrics: [
      "Sleep duration",
      "Sleep quality",
      "Resting heart rate",
      "Heart rate variability",
      "Energy",
      "Mood",
      "Stress",
      "Muscle soreness",
    ],
  },
];
