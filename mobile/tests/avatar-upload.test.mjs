import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function load(path, dependencies = {}, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, Blob, FormData, Uint8Array, TextEncoder, ...globals,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

const { convertFormDataAsync } = load(
  "../node_modules/expo/src/winter/fetch/convertFormData.ts",
  { "../../utils/blobUtils": load("../node_modules/expo/src/utils/blobUtils.ts") },
);
const bytes = new Uint8Array([0, 255, 128, 42]);
class NativeBlob {
  constructor() {
    throw new Error("Creating blobs from ArrayBuffer and ArrayBufferView is not supported");
  }
}
const { installFormDataPatch } = load("../node_modules/expo/src/winter/FormData.ts", {}, { Blob: NativeBlob });
// React Native stores raw parts; Expo patches the methods used by its encoder.
class NativeFormData { _parts = []; }
installFormDataPatch(NativeFormData);

function uploader(size = bytes.length) {
  return load("../src/services/avatar-upload.ts", {
    "expo-file-system": {
      File: class {
        size = size;
        constructor(uri) {
          this.name = uri.split("/").pop();
          this.type = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[uri.split(".").pop()];
        }
        async bytes() { return bytes; }
      },
    },
  }, { Blob: NativeBlob, FormData: NativeFormData }).createAvatarForm;
}

test("Expo rejects the old URI-only photo part", async () => {
  const form = { entries: () => [["avatar", { uri: "file:///photo.jpg", name: "photo.jpg", type: "image/jpeg" }]] };
  await assert.rejects(convertFormDataAsync(form), /Unsupported FormDataPart implementation/);
});

for (const [mimeType, extension] of [["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"]]) {
  test(`encodes ${mimeType} with filename and original bytes`, async () => {
    const form = await uploader()(`file:///photo.${extension}`, mimeType);
    const { body } = await convertFormDataAsync(form, "test-boundary");
    const encoded = Buffer.from(body);
    assert.ok(encoded.includes(Buffer.from(`name="avatar"; filename="photo.${extension}"`)));
    assert.ok(encoded.includes(Buffer.from(`content-type: ${mimeType}\r\n`)));
    assert.ok(encoded.includes(Buffer.from(bytes)));
    const retry = await convertFormDataAsync(form, "test-boundary");
    assert.deepEqual(retry.body, body);
  });
}

test("rejects oversized and unsupported photos before upload", async () => {
  await assert.rejects(uploader(3 * 1024 * 1024 + 1)("file:///photo", "image/png"), /smaller than 3 MB/);
  await assert.rejects(uploader()("file:///photo", "image/gif"), /JPEG, PNG, or WebP/);
});
