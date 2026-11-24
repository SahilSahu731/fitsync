import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

export function accountPreferences(storage) {
  const exports = {};
  const source = readFileSync(
    new URL("../../src/services/account-preferences.ts", import.meta.url),
    "utf8",
  );
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText,
    {
      exports,
      require(name) {
        if (name === "@react-native-async-storage/async-storage") return storage;
        throw new Error(name);
      },
    },
  );
  return exports;
}
