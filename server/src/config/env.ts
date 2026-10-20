
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),

  SUPABASE_URL: z.string().url(),

  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  GOOGLE_WEB_CLIENT_ID: z.string().endsWith(
    ".apps.googleusercontent.com"
  ),

  JWT_SECRET: z.string().min(48)
});

export const env = schema.parse(process.env);
