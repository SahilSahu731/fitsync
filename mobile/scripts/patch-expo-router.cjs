// Workaround for expo-router 57.0.19: initial URL resolution can notify React
// before the navigation container commits. Remove when upgrading to a fixed release.
const fs = require("node:fs");
const path = require("node:path");
function patchExpoRouter() {
const packagePath = require.resolve("expo-router/package.json");
const version = JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
if (version !== "57.0.19") {
  console.warn(`Review the initial-link workaround for expo-router ${version}.`);
  return;
}
const file = path.join(path.dirname(packagePath), "build/fork/useLinking.native.js");
let source = fs.readFileSync(file, "utf8");
const marker = "// FitSync: defer initial-link notifications until commit.";
if (source.includes(marker)) return;
const anchor = "    const getInitialState = (0, react_1.useCallback)(() => {";
if (!source.includes(anchor)) throw new Error("Expo Router patch target changed");
source = source.replace(anchor, `    ${marker}
    const initialLinkLifecycle = (0, react_1.useRef)({ mounted: false, pending: undefined });
    (0, react_1.useEffect)(() => {
        const lifecycle = initialLinkLifecycle.current;
        lifecycle.mounted = true;
        if (lifecycle.pending !== undefined) {
            onUnhandledLinking(lifecycle.pending);
            lifecycle.pending = undefined;
        }
        return () => { lifecycle.mounted = false; };
    }, [onUnhandledLinking]);
    const reportInitialLink = (0, react_1.useCallback)((path) => {
        const lifecycle = initialLinkLifecycle.current;
        if (lifecycle.mounted) {
            onUnhandledLinking(path);
        } else {
            lifecycle.pending = path;
        }
    }, [onUnhandledLinking]);
${anchor}`);
const start = source.indexOf(anchor);
const end = source.indexOf("    (0, react_1.useEffect)(() => {", start);
const original = source.slice(start, end);
const patched = original.replaceAll("onUnhandledLinking(", "reportInitialLink(")
  .replace("[getStateFromURL, onUnhandledLinking, prefixes]", "[getStateFromURL, reportInitialLink, prefixes]");
if (original === patched) throw new Error("Expo Router initial-link patch did not apply");
source = source.slice(0, start) + patched + source.slice(end);
// Replace the local file without changing any pnpm store hardlinks.
fs.writeFileSync(`${file}.fitsync-tmp`, source);
fs.renameSync(`${file}.fitsync-tmp`, file);
console.log("Applied Expo Router initial-link lifecycle fix.");

}
module.exports = patchExpoRouter;
if (require.main === module) patchExpoRouter();
