import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

export function loadTypeScript(path, mocks = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const require = createRequire(import.meta.url);
  vm.runInNewContext(code, {
    exports,
    require: (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    Request,
    Response,
    Headers,
    URL,
    TextDecoder,
    Uint8Array,
    AbortSignal,
    ...globals,
  });
  return exports;
}
