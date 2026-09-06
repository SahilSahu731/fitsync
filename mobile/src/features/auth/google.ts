import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from "react-native-nitro-google-signin";

import {
  env,
} from "@/config/env";

GoogleOneTapSignIn.configure({
  webClientId:
    env.googleWebClientId,

  /*
   * We only need identity.
   *
   * We do NOT need Google Calendar,
   * Drive, contacts, etc.
   */
  offlineAccess:
    false,

  autoSelectOnSignIn:
    false,
});

export type GoogleSignInResult =
  | {
      type: "success";

      idToken: string;
    }
  | {
      type: "cancelled";
    };

export async function startGoogleSignIn():
  Promise<GoogleSignInResult> {
  try {
    /*
     * Android:
     * validates Play Services.
     *
     * iOS:
     * harmless no-op.
     */
    await GoogleOneTapSignIn
      .checkPlayServices();

    /*
     * 1. Try saved / previous credential.
     */
    let response =
      await GoogleOneTapSignIn
        .signIn();

    /*
     * 2. If nothing is saved,
     * show account/create flow.
     */
    if (
      isNoSavedCredentialFoundResponse(
        response,
      )
    ) {
      response =
        await GoogleOneTapSignIn
          .createAccount();
    }

    /*
     * 3. Final explicit Google
     * sign-in UI fallback.
     */
    if (
      isNoSavedCredentialFoundResponse(
        response,
      )
    ) {
      response =
        await GoogleOneTapSignIn
          .presentExplicitSignIn();
    }

    if (
      isCancelledResponse(
        response,
      )
    ) {
      return {
        type:
          "cancelled",
      };
    }

    if (
      !isSuccessResponse(
        response,
      )
    ) {
      throw new Error(
        "Google Sign-In did not return a credential.",
      );
    }

    const idToken =
      response.data.idToken;

    if (!idToken) {
      throw new Error(
        "Google did not return an ID token.",
      );
    }

    return {
      type:
        "success",

      idToken,
    };
  } catch (error) {
    if (
      isErrorWithCode(
        error,
      )
    ) {
      switch (
        error.code
      ) {
        case statusCodes
          .SIGN_IN_CANCELLED:
          return {
            type:
              "cancelled",
          };

        case statusCodes
          .PLAY_SERVICES_NOT_AVAILABLE:
          throw new Error(
            "Google Play Services is unavailable on this device.",
          );

        case statusCodes
          .IN_PROGRESS:
          throw new Error(
            "Google Sign-In is already in progress.",
          );

        case statusCodes
          .DEVELOPER_ERROR:
          throw new Error(
            "Google Sign-In is not configured correctly for this build.",
          );
      }
    }

    throw error;
  }
}

export async function signOutGoogleProvider():
  Promise<void> {
  try {
    await GoogleOneTapSignIn
      .signOut();
  } catch {
    /*
     * FitSync logout should still
     * succeed even if provider cleanup
     * fails locally.
     */
  }
}