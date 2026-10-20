
import { OAuth2Client } from "google-auth-library";

import { env } from "../../config/env.js";
import { db } from "../../config/supabase.js";
import { ApiError, checkDbError } from "../../common/errors.js";

import { createSession } from "./tokens.js";
import { getFullUser } from "../profile/profile.service.js";

const googleClient = new OAuth2Client(env.GOOGLE_WEB_CLIENT_ID);

export async function loginWithGoogle(idToken: string) {
  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.GOOGLE_WEB_CLIENT_ID
    });

    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, "Google authentication failed.");
  }

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new ApiError(401, "Invalid Google account.");
  }

  const googleSub = payload.sub;
  const email = payload.email;
  const name = (payload.name || "Athlete").slice(0, 100);
  const photo = payload.picture || null;

  const lookup = await db
    .from("app_users")
    .select("id")
    .eq("google_sub", googleSub)
    .maybeSingle();

  checkDbError(lookup.error, "find Google user");

  let userId = lookup.data?.id;

  if (!userId) {
    const inserted = await db
      .from("app_users")
      .insert({
        google_sub: googleSub,
        email,
        display_name: name,
        google_photo_url: photo
      })
      .select("id")
      .maybeSingle();

    if (inserted.data) {
      userId = inserted.data.id;
    } else if (inserted.error?.code === "23505") {
      // Concurrent first-time sign-in.
      const retry = await db
        .from("app_users")
        .select("id")
        .eq("google_sub", googleSub)
        .single();

      checkDbError(retry.error, "find concurrent user");
      userId = retry.data?.id;
    } else {
      checkDbError(inserted.error, "create Google user");
      throw new ApiError(500, "Could not create account.");
    }
  } else {
    const updated = await db
      .from("app_users")
      .update({
        email,
        google_photo_url: photo,
        updated_at: new Date().toISOString()
      })
      .eq("id", userId);

    checkDbError(updated.error, "update Google identity");
  }

  const settings = await db
    .from("user_settings")
    .upsert(
      { user_id: userId },
      {
        onConflict: "user_id",
        ignoreDuplicates: true
      }
    );

  checkDbError(settings.error, "initialize user settings");

  const tokens = await createSession(userId);
  const me = await getFullUser(userId);

  return { ...tokens, ...me };
}
