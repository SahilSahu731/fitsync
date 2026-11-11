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
      "Build a routine or start from your program. Log sets, weight, reps, time, distance and effort. Add notes, use the rest timer and revisit your history.",
    label: "Workout logging",
  },
  {
    icon: Sparkles,
    title: "A starting point that fits.",
    description:
      "Create a free four-week starter plan from your goal, experience, equipment, session length and available training days.",
    label: "Personal starter plans",
  },
  {
    icon: CalendarDays,
    title: "A week with a little structure.",
    description:
      "Follow a published program, choose a start date and set reminders. See training and recovery days together, with missed sessions still available.",
    label: "Programs & calendar",
  },
  {
    icon: ClipboardList,
    title: "Get to know the movement.",
    description:
      "Find exercises by muscle, equipment and experience. Learn from instructions and visual demonstrations before you start.",
    label: "Exercise library",
  },
  {
    icon: Heart,
    title: "Your whole day matters.",
    description:
      "Track activity, nutrition, body measurements and recovery. Set personal targets, add notes and find the check-ins that matter to you.",
    label: "Daily health tracking",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Progress you can look back on.",
    description:
      "Explore training volume, estimated one-rep max, workout history and weekly consistency alongside your health trends.",
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
      "Optionally import steps, sleep and body weight from Apple Health on iOS or Health Connect on Android. Access is read-only.",
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
      "With Pro, reschedule a missed session and the rest of your plan. Keep your training moving as your week changes.",
    label: "Flexible scheduling",
    pro: true,
  },
  {
    icon: WandSparkles,
    title: "A clearer next step.",
    description:
      "With Pro, review progression suggestions from completed logs and get a weekly review with practical actions and notes about missing data.",
    label: "Progression & weekly review",
    pro: true,
  },
];

export const metricGroups = [
  {
    title: "Activity",
    description: "The movement outside your workouts.",
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
    description: "Know what goes into your day.",
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
    description: "Changes that go beyond a scale.",
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
    description: "Make space for how you feel.",
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
