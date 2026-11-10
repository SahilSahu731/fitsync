
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),

  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  GOOGLE_WEB_CLIENT_ID: z.string().endsWith(
    ".apps.googleusercontent.com"
  ),

  JWT_SECRET: z.string().min(48),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Billing is optional for local/free use. Only the server receives the secret key.
  REVENUECAT_SECRET_API_KEY: z.preprocess(value => value === "" ? undefined : value, z.string().trim().min(10).optional()),
  REVENUECAT_ENTITLEMENT_ID: z.string().trim().min(1).default("pro"),
  REVENUECAT_WEBHOOK_AUTHORIZATION: z.preprocess(value => value === "" ? undefined : value, z.string().min(32).optional()),
  REVENUECAT_ALLOW_SANDBOX: z.enum(["true", "false"]).default("false").transform(value => value === "true")
});

export const env = schema.parse(process.env);
