import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  POSTHOG_PROJECT_TOKEN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .trim()
      .regex(/^phc_[A-Za-z0-9_-]+$/, "Use the PostHog project token.")
      .optional(),
  ),
  POSTHOG_HOST: z
    .enum(["https://us.i.posthog.com", "https://eu.i.posthog.com"])
    .default("https://us.i.posthog.com"),
  POSTHOG_TRACE_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.01),
  POSTHOG_ENVIRONMENT: z.enum(["development", "test", "staging", "production"]).optional(),
  WEB_PROXY_SECRET: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  SENTRY_DSN: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .url()
      .refine((value) => {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          /^[a-zA-Z0-9]+$/.test(url.username) &&
          !url.password &&
          /\/\d+$/.test(url.pathname) &&
          !url.search &&
          !url.hash
        );
      }, "Use an HTTPS Sentry DSN with a public key and numeric project ID.")
      .optional(),
  ),
  SENTRY_RELEASE: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .max(200)
      .regex(/^[\w.@+-]+$/)
      .optional(),
  ),
  PORT: z.coerce.number().int().positive().default(4000),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  GOOGLE_WEB_CLIENT_ID: z.string().endsWith(".apps.googleusercontent.com"),

  JWT_SECRET: z.string().min(48),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Billing is optional for local/free use. Only the server receives the secret key.
  REVENUECAT_SECRET_API_KEY: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().trim().min(10).optional(),
  ),
  REVENUECAT_ENTITLEMENT_ID: z.string().trim().min(1).default("pro"),
  REVENUECAT_WEBHOOK_AUTHORIZATION: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(32).optional(),
  ),
  REVENUECAT_ALLOW_SANDBOX: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

export const env = schema
  .superRefine((value, context) => {
    if (value.NODE_ENV === "production" && !value.WEB_PROXY_SECRET) {
      context.addIssue({
        code: "custom",
        path: ["WEB_PROXY_SECRET"],
        message: "Production requires the shared web proxy secret.",
      });
    }
  })
  .parse(process.env);
