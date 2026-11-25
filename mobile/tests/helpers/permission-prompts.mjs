import * as permissionPrompts from "../../src/services/permission-prompts.ts";

// Existing native-service fixtures opt in to the app explanation; their own
// native permission responses still decide whether the OS grants access.
permissionPrompts.registerPermissionPresenter((_prompt, complete) => complete(true));

export const { explainPermission, registerPermissionPresenter, requestPermissionWithExplanation } =
  permissionPrompts;
