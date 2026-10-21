
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
  CLOUDINARY_API_SECRET: z.string().min(1)
});

export const env = schema.parse(process.env);
