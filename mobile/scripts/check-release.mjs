import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { releaseIssues } = require("./release-config.cjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { expo: config } = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
export function checkRelease(
  env,
  { profile = "production", log = console.log, error = console.error } = {},
) {
  if (!["production", "store-test", "preview"].includes(profile)) {
    error("Choose production, store-test or preview as the release-check profile.");
    return 1;
  }
  const issues = releaseIssues(env, { profile, config, root });
  if (issues.length) {
    error(`Android ${profile} configuration is incomplete:`);
    for (const issue of issues) error(`- ${issue}`);
  } else {
    log(`Android ${profile} local configuration checks passed.`);
  }
  log(
    "This offline check prints no configured values and contacts no services. It does not verify EAS secrets, live URLs, signing, a native AAB, device behavior or Play Console approval.",
  );
  return issues.length ? 1 : 0;
}
if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] ?? ""))
  process.exitCode = checkRelease(process.env, { profile: process.argv[2] ?? "production" });
