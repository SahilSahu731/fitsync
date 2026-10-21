import { File } from "expo-file-system";

export async function createAvatarForm(uri: string, mimeType: string) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new Error("Please select a JPEG, PNG, or WebP image.");
  }

  const file = new File(uri);
  if (file.size > 3 * 1024 * 1024) {
    throw new Error("Choose a photo smaller than 3 MB.");
  }

  // Expo's encoder reads File.bytes() directly. Android's Blob constructor
  // cannot wrap ArrayBuffers, and URI-only parts are unsupported by fetch.
  const form = new FormData();
  form.append("avatar", file);
  return form;
}
