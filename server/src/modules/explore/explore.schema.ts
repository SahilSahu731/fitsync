import { z } from "zod";

export const calculatorIds = ["one-rep-max", "plate-calculator", "workout-volume", "warmup-sets", "percentage-load", "rep-target", "weight-converter", "pace-calculator", "session-time", "progression", "rest-planner", "distance-converter", "training-density", "rep-tempo"] as const;
const text = (max: number) => z.string().trim().min(1).max(max);
const image = z.url().max(2000).refine(value => value.startsWith("https://"), "Use an HTTPS URL.").nullable().default(null);
const link = z.object({ label: text(160), url: z.string().max(2000).refine(value => /^https:\/\//.test(value) && URL.canParse(value) || /^\/explore\/resources\/[a-z0-9-]+$/.test(value), "Use HTTPS or a related resource path.") });
export const stepSchema = z.object({
  title: text(160), seconds: z.number().int().min(5).max(900), instruction: text(3000),
  image_url: image, image_alt: z.string().trim().max(240).default(""),
  modification: z.string().trim().max(1000).default(""), video_url: image,
});
export const sectionSchema = z.object({
  heading: text(160), paragraphs: z.array(text(4000)).min(1).max(20),
  image_url: image, image_alt: z.string().trim().max(240).default(""),
  links: z.array(link).max(10).default([]),
});
const common = {
  slug: text(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), title: text(160), summary: z.string().trim().max(1000).default(""),
  cover_url: image, featured_rank: z.number().int().min(1).max(10000).nullable().default(null), published: z.boolean().default(false),
};
export const resourceSchema = z.object({
  ...common, kind: z.enum(["mobility", "guide"]), duration_minutes: z.number().int().min(1).max(180),
  tags: z.array(text(40).refine(tag => !tag.startsWith("fitsync:") && !tag.startsWith("calculator:"), "This tag is reserved for system content.")).max(12).default([]), steps: z.array(stepSchema).max(60).default([]), body: z.array(sectionSchema).max(40).default([]),
}).superRefine((value, ctx) => {
  if (!value.published) return;
  if (!value.cover_url || !value.summary) ctx.addIssue({ code: "custom", path: ["cover_url"], message: "Published content needs a cover and summary." });
  if (value.kind === "mobility") {
    if (!value.steps.length) ctx.addIssue({ code: "custom", path: ["steps"], message: "Add movements before publishing." });
    if (Math.ceil(value.steps.reduce((sum, step) => sum + step.seconds, 0) / 60) !== value.duration_minutes) ctx.addIssue({ code: "custom", path: ["duration_minutes"], message: "Duration must match the movement timers, rounded up to minutes." });
  } else if (!value.body.length) ctx.addIssue({ code: "custom", path: ["body"], message: "Add article sections before publishing." });
});
export const toolSchema = z.object({
  ...common, calculator_key: z.enum(calculatorIds), explanation: z.string().trim().max(6000).default(""), example: z.string().trim().max(2000).default(""),
}).superRefine((value, ctx) => {
  if (value.published && (!value.cover_url || !value.summary || !value.explanation || !value.example)) ctx.addIssue({ code: "custom", message: "Published tools need a cover, summary, explanation and worked example." });
});
