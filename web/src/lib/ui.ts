/** Shared Tailwind variants for database-backed status and difficulty values. */
export const badgeClasses: Record<string, string> = {
  published: "bg-brand/40! text-ink!",
  draft: "bg-surface! text-muted! ring-1 ring-line",
  archived: "bg-panel-raised! text-muted!",
  beginner: "bg-brand! text-background!",
  intermediate: "bg-panel-raised! text-ink! ring-1 ring-inset ring-line",
  advanced: "bg-background! text-brand! ring-1 ring-inset ring-line",
};
