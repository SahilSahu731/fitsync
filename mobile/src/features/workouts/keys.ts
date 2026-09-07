export const workoutTemplateKeys = {
  all: [
    "workout-templates",
  ] as const,

  list: () =>
    [
      ...workoutTemplateKeys.all,
      "list",
    ] as const,

  detail: (
    templateId: string,
  ) =>
    [
      ...workoutTemplateKeys.all,
      "detail",
      templateId,
    ] as const,
};


export const workoutSessionKeys = {
  all: [
    "workout-sessions",
  ] as const,

  active: () =>
    [
      ...workoutSessionKeys.all,
      "active",
    ] as const,

  detail: (
    sessionId: string,
  ) =>
    [
      ...workoutSessionKeys.all,
      "detail",
      sessionId,
    ] as const,

  history: () =>
    [
      ...workoutSessionKeys.all,
      "history",
    ] as const,
};