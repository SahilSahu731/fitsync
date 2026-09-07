import { Platform, TurboModuleRegistry } from "react-native";

import { env } from "@/config/env";

type GoogleProvider = typeof import("react-native-nitro-google-signin");

let googleProvider: GoogleProvider | undefined;

async function getGoogleProvider(): Promise<GoogleProvider> {
  if (googleProvider) return googleProvider;

  // Loading the native package during route discovery crashes Expo Go and
  // development builds that do not yet include NitroModules.
  if (
    Platform.OS === "web" ||
    !TurboModuleRegistry.get("NitroModules")
  ) {
    throw new Error(
      "Google Sign-In requires a FitSync development build with native Google Sign-In support. Use email sign-in in this app, or install a rebuilt development app.",
    );
  }

  const provider = await import("react-native-nitro-google-signin");
  provider.GoogleOneTapSignIn.configure({
    webClientId: env.googleWebClientId,
    offlineAccess: false,
    autoSelectOnSignIn: false,
  });
  googleProvider = provider;
  return provider;
}

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
  const {
    GoogleOneTapSignIn,
    isCancelledResponse,
    isErrorWithCode,
    isNoSavedCredentialFoundResponse,
    isSuccessResponse,
    statusCodes,
  } = await getGoogleProvider();

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
    if (!googleProvider) return;
    await googleProvider.GoogleOneTapSignIn.signOut();
  } catch {
    /*
     * FitSync logout should still
     * succeed even if provider cleanup
     * fails locally.
     */
  }
}