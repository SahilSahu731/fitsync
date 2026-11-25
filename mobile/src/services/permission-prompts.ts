export const PERMISSION_CONTENT = {
  testPush: {
    icon: "bell-outline",
    title: "Test notifications",
    message: "Allow notifications so this phone can display the test you send.",
    detail: "You can copy this installation’s Expo push token after granting access.",
  },
  notifications: {
    icon: "bell-outline",
    title: "Workout reminders",
    message: "Allow notifications for the workout, water and habit reminders you choose.",
    detail: "You can change your schedule in FitSync or keep logging with reminders off.",
  },
  rest: {
    icon: "timer-outline",
    title: "Rest timer alerts",
    message: "Get a notification when your rest ends, even while FitSync is in the background.",
    detail: "The timer still works on screen if you skip this.",
  },
  meals: {
    icon: "silverware-fork-knife",
    title: "Meal reminders",
    message: "Allow notifications for meals you’ve chosen to be reminded about.",
    detail: "You choose each time. Meal planning and food logging work with reminders off.",
  },
  trial: {
    icon: "calendar-check-outline",
    title: "Trial reminder",
    message: "Get a notification before your trial ends.",
    detail: "To cancel renewal, manage your subscription in Google Play.",
  },
  motion: {
    icon: "walk",
    title: "Count this walk",
    message: "Allow physical activity access to count your steps while this screen is open.",
    detail:
      "Counting stops when you leave this screen or switch apps. Save the walk when you finish, or add steps manually.",
  },
  steps: {
    icon: "shoe-print",
    title: "Import your steps",
    message:
      "FitSync reads daily steps from Health Connect, adds them to your journal and syncs them to your FitSync account.",
    detail: "Access is read-only. You choose what to share and can still add steps manually.",
  },
  health: {
    icon: "heart-pulse",
    title: "Connect Health Connect",
    message:
      "FitSync reads the last seven days of steps, sleep and body weight. Imported entries join your journal and sync to your FitSync account.",
    detail:
      "Access is read-only. Choose which records to share on the next screen, or keep tracking manually.",
  },
} as const;

export type PermissionKind = keyof typeof PERMISSION_CONTENT;
export type PermissionPrompt = { kind: PermissionKind; blocked: boolean };
type Presenter = (prompt: PermissionPrompt, complete: (continueRequest: boolean) => void) => void;
type Registration = { present: Presenter; cancel: Set<() => void>; restDeclined: boolean };
let registration: Registration | null = null;

// The UI owns consent. A missing or unmounted host must never approve an OS prompt.
export function registerPermissionPresenter(present: Presenter) {
  const previous = registration;
  const next: Registration = { present, cancel: new Set(), restDeclined: false };
  registration = next;
  previous?.cancel.forEach((cancel) => cancel());
  return () => {
    if (registration === next) registration = null;
    next.cancel.forEach((cancel) => cancel());
  };
}

export function explainPermission(kind: PermissionKind, blocked = false): Promise<boolean> {
  const host = registration;
  if (!host) return Promise.resolve(false);
  return new Promise((resolve) => {
    let finished = false;
    const complete = (accepted: boolean) => {
      if (finished) return;
      finished = true;
      host.cancel.delete(cancel);
      resolve(accepted);
    };
    const cancel = () => complete(false);
    host.cancel.add(cancel);
    try {
      host.present({ kind, blocked }, complete);
    } catch {
      complete(false);
    }
  });
}

type PermissionState = { granted: boolean; canAskAgain?: boolean };
const requests = new Map<string, { host: Registration | null; operation: Promise<boolean> }>();

// Sharing the whole request prevents two features opening duplicate explanations
// and OS dialogs. Already allowed access never adds an extra tap.
export function requestPermissionWithExplanation<T extends PermissionState>(
  kind: PermissionKind,
  current: T,
  request: () => Promise<T>,
  allowed: (permission: T) => boolean = (permission) => permission.granted,
): Promise<boolean> {
  if (allowed(current)) return Promise.resolve(true);
  const host = registration;
  // Rest starts automatically after logging a set. Declining this optional alert
  // must not put the explanation in front of every subsequent set this session.
  if (kind === "rest" && host?.restDeclined) return Promise.resolve(false);
  const scope = kind === "motion" ? "motion" : "notifications";
  const existing = requests.get(scope);
  if (existing && existing.host === host) return existing.operation;
  const blocked = current.canAskAgain === false;
  const operation = explainPermission(kind, blocked)
    .then(async (accepted) => {
      let granted = false;
      try {
        if (accepted && registration === host && !blocked) {
          const result = await request();
          granted = registration === host && allowed(result);
        }
        return granted;
      } finally {
        if (scope === "notifications" && !granted && host) host.restDeclined = true;
      }
    })
    .finally(() => {
      if (requests.get(scope)?.operation === operation) requests.delete(scope);
    });
  requests.set(scope, { host, operation });
  return operation;
}
