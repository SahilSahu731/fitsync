export type ExperiencePreferences = {
  sounds: boolean;
  haptics: boolean;
  reduceMotion: boolean;
  keepAwake: boolean;
};
export const DEFAULT_EXPERIENCE: ExperiencePreferences = {
  sounds: true, haptics: true, reduceMotion: false, keepAwake: true,
};
export function parseExperience(value: string | null): ExperiencePreferences {
  if (!value) return { ...DEFAULT_EXPERIENCE };
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ...DEFAULT_EXPERIENCE };
    return Object.fromEntries(Object.entries(DEFAULT_EXPERIENCE).map(([key, fallback]) => [key,
      typeof (parsed as Record<string, unknown>)[key] === "boolean" ? (parsed as Record<string, boolean>)[key] : fallback,
    ])) as ExperiencePreferences;
  } catch { return { ...DEFAULT_EXPERIENCE }; }
}
