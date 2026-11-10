/** Shared Tailwind variants for database-backed status and difficulty values. */
export const badgeClasses: Record<string, string> = {
  published: "bg-brand/40! text-ink!",
  draft: "bg-surface! text-muted! ring-1 ring-line",
  archived: "bg-ink/10! text-muted!",
  beginner: "bg-brand! text-ink!",
  intermediate: "bg-white! text-ink! ring-1 ring-inset ring-ink/20",
  advanced: "bg-ink! text-white!",
};
