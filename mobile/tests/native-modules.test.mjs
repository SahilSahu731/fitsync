import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/services/native-modules.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
});

function runtime(nativeModules = []) {
  const imported = [];
  const secureStore = { getItemAsync: async () => "saved-refresh-token" };
  const imagePicker = { launchImageLibraryAsync: async () => ({ canceled: true }) };
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      if (name === "expo") {
        return {
          requireOptionalNativeModule: nativeName => nativeModules.includes(nativeName) ? {} : null
        };
      }
      imported.push(name);
      if (name === "expo-secure-store") return secureStore;
      if (name === "expo-image-picker") return imagePicker;
      throw new Error(`Unexpected import: ${name}`);
    }
  });
  return { exports, imported, secureStore, imagePicker };
}

test("an outdated binary can load the service without importing unavailable packages", () => {
  const { exports, imported } = runtime();
  assert.deepEqual(imported, []);
  assert.deepEqual(Array.from(exports.getMissingNativeModules()), [
    "expo-secure-store", "expo-image-picker"
  ]);
});

test("missing secure storage fails clearly without importing or substituting storage", async () => {
  const { exports, imported } = runtime(["ExponentImagePicker"]);
  await assert.rejects(exports.loadSecureStore(), /missing expo-secure-store.*new Android development build/);
  assert.deepEqual(imported, []);
});

test("missing image picker fails before its module can crash route evaluation", async () => {
  const { exports, imported } = runtime(["ExpoSecureStore"]);
  await assert.rejects(exports.loadImagePicker(), /missing expo-image-picker/);
  assert.deepEqual(imported, []);
});

test("a rebuilt binary loads secure storage and the picker on demand", async () => {
  const { exports, imported, secureStore, imagePicker } = runtime([
    "ExpoSecureStore", "ExponentImagePicker"
  ]);
  assert.deepEqual(Array.from(exports.getMissingNativeModules()), []);
  assert.deepEqual(imported, []);
  const loadedStore = await exports.loadSecureStore();
  const loadedPicker = await exports.loadImagePicker();
  assert.equal(loadedStore.getItemAsync, secureStore.getItemAsync);
  assert.equal(loadedPicker.launchImageLibraryAsync, imagePicker.launchImageLibraryAsync);
  assert.equal(await loadedStore.getItemAsync(), "saved-refresh-token");
  assert.deepEqual(imported, ["expo-secure-store", "expo-image-picker"]);
});
