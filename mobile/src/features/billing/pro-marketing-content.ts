export const PRO_BENEFITS = [
  {
    art: "trainer",
    title: "A plan that adapts to you",
    description:
      "Build a rule-based training plan around your schedule, then review and accept adjustments.",
  },
  {
    art: "history",
    title: "Unlimited graph history",
    description: "See your whole training story. Every session, every personal best.",
  },
  {
    art: "muscles",
    title: "Advanced muscle insights",
    description: "Explore your training balance, muscle workload and exercise trends.",
  },
  {
    art: "custom",
    title: "Your own exercise library",
    description:
      "Create movements for your equipment, with your own instructions and muscle labels.",
  },
  {
    art: "progression",
    title: "Your next rep, explained",
    description: "Review working-set targets and progression based on the work you log.",
  },
  {
    art: "calculator",
    title: "Warm-up & plate tools",
    description: "Build up to your working weight. Know exactly what goes on the bar.",
  },
  {
    art: "meals",
    title: "A week of meals, sorted",
    description: "Personalised meal plans, easy swaps and a ready-to-share shopping list.",
  },
  {
    art: "review",
    title: "A clearer way forward",
    description: "Bring your week together with a training review and practical next steps.",
  },
] as const;
export type ProArt = (typeof PRO_BENEFITS)[number]["art"];

export const PRO_COMPARISON: { feature: string; free: string | boolean; pro: string | boolean }[] =
  [
    { feature: "Workout logging", free: "Unlimited", pro: "Unlimited" },
    { feature: "Previous-session hints", free: true, pro: true },
    { feature: "Rest timer & personal records", free: true, pro: true },
    { feature: "Workout reminders", free: true, pro: true },
    { feature: "Saved routines", free: true, pro: true },
    { feature: "Create custom exercises", free: false, pro: true },
    { feature: "Daily health tracking", free: true, pro: true },
    { feature: "Graph history", free: "90 days", pro: "All time" },
    { feature: "Muscle & training insights", free: "Basic", pro: "Advanced" },
    { feature: "Choose a training program", free: false, pro: true },
    { feature: "Structured training plan", free: false, pro: true },
    { feature: "Plan adjustments & progression", free: false, pro: true },
    { feature: "Weekly training reviews", free: false, pro: true },
    { feature: "Warm-up & plate tools", free: false, pro: true },
    { feature: "Weekly meal planning", free: false, pro: true },
    { feature: "Meal, hydration & wind-down reminders", free: false, pro: true },
  ];

export const PRO_FAQS = [
  {
    question: "What does FitSync Pro include?",
    answer:
      "Pro brings together your choice of training program, personal plans, all-time graph history, advanced muscle insights, custom exercises, progression and weekly reviews, warm-up and plate tools, meal planning, and customizable meal, hydration and wind-down reminders. Logging, previous-session hints, rest timers, personal records, workout reminders, routines and daily tracking remain available on Free, with the latest 90 days of standard graphs.",
  },
  {
    question: "How are training recommendations made?",
    answer:
      "FitSync uses rules based on your fitness profile, saved plan and recorded training. Recommendations are automated and are not provided by a human trainer. You review and accept changes to your plan.",
  },
  {
    question: "Will my subscription renew automatically?",
    answer:
      "Monthly and yearly subscriptions renew through your app store until you cancel. Lifetime Pro, when offered, is a one-time purchase with no automatic renewal. The selected plan’s price, billing period and any eligible introductory offer are shown before you confirm the purchase.",
  },
  {
    question: "Can I cancel whenever I want?",
    answer:
      "You can manage or cancel renewal in the app store where you subscribed. Open Membership & billing in FitSync to reach your store’s subscription settings. Your verified access continues until the end of the paid period.",
  },
  {
    question: "What happens to my progress if I cancel?",
    answer:
      "Your account and saved workouts remain yours. When Pro access ends, you can keep logging workouts and using Free. Free graphs show the most recent 90 days; Pro unlocks your full saved graph history.",
  },
  {
    question: "How do I restore an existing purchase?",
    answer:
      "Sign in to the same FitSync account and use Restore purchases below with the store account you used to subscribe. If verification is still pending, check your status before buying again.",
  },
  {
    question: "Can I switch plans or request a refund?",
    answer:
      "Plan changes and refund requests are handled by the app store where you purchased. Membership & billing links to your store’s subscription settings and purchase history, where you can see the available options.",
  },
  {
    question: "What if I change devices?",
    answer:
      "Sign in to the same FitSync account on your new device. FitSync checks your membership with the server. If your purchase does not appear, use Restore purchases with the original store account.",
  },
] as const;
