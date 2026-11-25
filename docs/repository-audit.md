# Repository audit — 24 November 2026

This pass covered the Android app, API, web app, SQL migrations and isolated SQL
tests, exercise import tooling, native widget/config plugins, release settings,
and CI. It prioritized reproducible bugs, privacy, data integrity, security, and
work that affects everyday use. Existing changes in the working tree were kept.
This is a verified audit checkpoint, not a guarantee that no other defects exist.

## Fixed in this pass

| Area                       | Finding and change                                                                                                                                                                                                                                                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Offline startup            | Saved workouts were inaccessible after a cold launch without a successful network session restore. The app now restores a validated account snapshot from SecureStore, opens local data promptly, and verifies the session in the background. Missing or rejected credentials remove cached identity; temporary connection failures preserve local access.     |
| Account deletion           | Server deletion left progress, food, workout and onboarding data on the phone. Owner-scoped deletion now drains pending writes and fences late saves/import responses so they cannot recreate that data. Other accounts and shared device preferences are retained. The screen distinguishes a completed server deletion from failed device cleanup.           |
| Sign-out                   | A native credential-removal error could leave the UI signed in. Identity reset now runs even when cleanup fails, and the settings action handles the error. Credential and cached-identity removals are both attempted.                                                                                                                                        |
| Progress notes             | The notes input had been commented out while its toggle remained visible. Restored the input and its save behavior.                                                                                                                                                                                                                                            |
| Step permissions           | Automatic import warnings were only visible to the screen that manually started an import. The latest result is now shared with current-account consumers, so revoked step access can be shown on Home and Progress. Results remain scoped to the API session; older overlapping reads cannot replace newer status.                                            |
| OTA compatibility          | An app-version runtime could reuse a native runtime after dependencies changed without a marketing-version bump. Switched to Expo's fingerprint runtime policy. This takes effect in a newly built Android binary.                                                                                                                                             |
| CI and instructions        | CI now compiles the Android production bundle. Replaced misleading mobile starter/reset instructions and removed the broken reset command. Web now has a typecheck command and accurate setup instructions.                                                                                                                                                    |
| API request errors         | Malformed, oversized and unsupported request bodies could become generic 500 errors or crash reports. Known parser failures now return safe 400/413/415 responses without including rejected bodies.                                                                                                                                                           |
| API validation             | Added bounds matching database numeric limits and rejected malformed refresh-session identifiers before database calls. Catalog prescription/rest bounds now match the values the logger accepts.                                                                                                                                                              |
| Public catalog             | A published plan could expose draft, private, archived or otherwise unusable descendants. Public detail reads now validate the complete referenced graph and keep validation metadata out of public responses.                                                                                                                                                 |
| Exercise reset importer    | `--reset` could delete users' private/custom exercises, including from resumed mixed checkpoints. Resets now target shared exercises only, validate saved timestamps again on resume, and guard each deletion by ID, timestamp and null ownership. Updated the import guide. The final multi-batch replacement is still resumable rather than one transaction. |
| Web request bodies         | Proxy routes could buffer an entire chunked request before checking its size. Streaming reads now stop at the allowed limit.                                                                                                                                                                                                                                   |
| Web logout                 | An expired access cookie could prevent revoking the still-valid refresh session. Logout now recovers the access session before revocation when needed.                                                                                                                                                                                                         |
| Web account isolation      | Late profile responses could restore stale identity, and open editors could submit against a different account's changed cookies. Session responses are guarded; editors bind writes to the account that rendered them, including retries and uploads. Added direct proxy regressions.                                                                         |
| Web navigation and headers | Added accessible sign-out at mobile widths, clickjacking protection, and noindex metadata for private workspaces. Removed existing lint warnings.                                                                                                                                                                                                              |
| Server dependencies        | Patched `body-parser` to 2.4.0 and `multer` to 2.5.0, resolving the two high advisories returned by the successful initial server audit. Express remains 5.3.0.                                                                                                                                                                                                |

The shared button wrapper also no longer subscribes static controls to React
interaction renders. Native feedback and functional pressed/hovered styles are
preserved, including switching styles during a press. Additional deletion fences
cover companion rest state, saved training order, upgrade impressions, onboarding
flags and account-specific catalog preferences.

Patched Next.js and its lint configuration from 16.4.2 to 16.4.6. The production
build now completes beyond the security check that rejected the original version;
the lockfile retains all eight optional SWC platform entries. This follows the
[November security release](https://nextjs.org/blog/november-2026-security-release)
and [16.4.6 release](https://github.com/vercel/next.js/releases/tag/v16.4.6).
The compatible `typescript-eslint` maintenance chain was also updated to 8.74.0,
which resolves the dev-toolchain matcher advisories through patched `minimatch`.

Mobile dependency fixes retain Expo SDK 57 and Router 57. A licensed local copy
of `query-string` 7.1.3 keeps its existing CommonJS API and uses upstream
`decode-uri-component` 0.5.1 with only its export adapted to CommonJS. Provenance
hashes, licenses, the reason for vendoring, and removal instructions are in the
[vendor guide](../mobile/vendor/README.md). Regression checks cover actual Router
resolution/navigation and bounded malformed-input parsing. Scoped overrides also
patch the fingerprint matcher and development-tunnel UUID dependency; compatible
TypeScript ESLint internals were updated to 8.74.0. Native SDK versions were kept.

The server dependency fixes follow the maintainers' advisories for
[body-parser](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828)
and [multer](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m).
The OTA change follows Expo's
[runtime compatibility guidance](https://docs.expo.dev/eas-update/runtime-versions/).

## Performance, product and steps work carried forward

The working tree also contains the earlier performance and automatic-step changes:
shared in-flight GETs and journal/history loads; fewer whole-screen timer updates;
stable workout control subscriptions; debounced uploads after durable local saves;
and pausing hidden-screen work. These address unnecessary work on local actions.
No before/after device frame-time or latency measurements were available, so the
size of the perceived improvement is not yet measured.

Steps can import automatically from Health Connect after explicit permission,
refresh on foreground and once per active minute, and retain separately added
manual extras on that device. Old manual/pedometer daily totals remain protected
from automatic replacement. Permission recovery, automatic/manual attribution,
and manual additions are exposed in the UI. FitSync does not run its own perpetual
background sensor service; supported phones or connected health sources collect
steps while the app is closed. See [health sync](health-sync.md).

Existing product/server improvements were reviewed alongside this work: free
previous-session logging hints, unit conversion, workout completion/PR sharing,
contextual Pro previews, honest rule-based planning language, health disclaimers,
Play cancellation guidance, telemetry setup, distributed rate limits, request IDs,
shutdown handling, refresh replay revocation, and SQL test isolation. Deployment
and external service configuration still determine their production behavior.

## Remaining concrete findings

| Priority | Finding                                                                                                                                                                                                           | Required follow-up                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2       | An Add set request that commits but loses its response can be retried as a second set. The provider only deduplicates requests while they are running.                                                            | Add a server-first idempotent creation contract and atomic append RPC; persist the client UUID and frozen request intent before sending. Keep that intent through failed responses, failed local saves and restarts. Confirming the result must atomically merge the row and clear the intent. Do not silently send an unknown field to the old endpoint: its schema strips unknown fields. |
| P2       | The API checks that a workout is active separately from some child mutations. Another device can finish between the check and update.                                                                             | Lock the owned parent session in the same transaction as child mutations, including set/exercise additions, edits, deletion and ordering. Preserve legitimate cascading account/session cleanup.                                                                                                                                                                                            |
| P2       | Daily metric values use last-write-wins snapshots. Two devices editing offline can overwrite each other's increments. A stale device's later automatic step snapshot can also carry an older manual-extra amount. | Introduce conflict-aware contributions or a server merge contract for automatic readings and manual adjustments, with deterministic correction/deletion semantics. Current serialization protects concurrent edits within one app process, not independent devices.                                                                                                                         |

Lower-priority follow-ups:

- The review invitation now reads completed workouts from the signed-in account’s
  journal. On upgraded devices, the first completion summary or visit to the Play
  listing replaces the old device-wide workout IDs with an anonymous preference.
  Devices that never open either flow can still retain the legacy IDs.
- Public web pages lack a sitemap, canonical URLs and complete social metadata.
  Confirm the production public origin before generating those URLs. Browsers
  without Web Locks also retain same-tab rather than cross-tab refresh coordination.
- Local journal saves still serialize the complete snapshot, including cached
  workout history. Long histories need device profiling and potentially separate
  history storage or incremental persistence; the new render/request reductions
  do not establish that large-journal saves are fast on lower-end phones.

Relevant code: [set creation](../server/src/modules/workouts/workout.service.ts),
[mobile add flow](../mobile/src/features/workouts/workout-context.tsx),
[workout drafts](../mobile/src/features/workouts/offline.ts),
[metric resolution](../mobile/src/features/progress/model.ts), and
[health import planning](../mobile/src/features/health-sync/model.ts).

These need coordinated data-contract changes and dedicated concurrency/rollout
tests. They are recorded as unresolved, not hidden by optimistic UI or retries.

## Verification and release limits

- Mobile: **746 tests passed**, typecheck passed, lint passed, and the Android
  production bundle exported successfully to `/tmp/fitsync-repo-audit-export`.
  A clean offline `npm ci` restored all 991 packages after integrity-checked
  downloads. Five direct dependency/security regressions and a complete Android
  fingerprint generation passed; Expo configuration resolves to SDK 57 and Android.
- Server: **226 tests passed**, **7 isolated SQL integration suites passed**,
  TypeScript checks and production build passed. The import script also passed a
  separate typecheck because scripts are outside the normal server build graph.
- Web: **18 regression cases across 6 files passed**; typecheck and lint passed
  with zero warnings. The Next 16.4.6 production Webpack build passed and generated
  27 static pages. Private noindex metadata and frame-protection headers were
  checked in generated output. The sandboxed Turbopack attempt stalled; the
  supported Webpack build completed.
- `git diff --check` passed. No live database, import reset, migration, deployment,
  or store submission was executed.
- Native widget/config review found no confirmed defect requiring a change.
  No Android device was connected, so native permissions, Health Connect behavior,
  billing, widgets and responsiveness still require a compatible installed build.
- After explicit approval to send dependency metadata to npm, fresh online audits
  for **mobile, server and web reported zero known vulnerabilities**, with and
  without development dependencies. The earlier web install summary resolved to
  one dev-toolchain root cause and was patched. npm's offline mode skips audit
  requests and was not treated as a clean security report.
- Production telemetry ingestion, billing entitlements/webhooks and notification
  delivery require environment configuration and real-service checks. Follow
  [observability setup](observability-setup.md), [billing](billing.md), and
  [conversion setup](pro-conversion-setup.md).

Follow-up test cleanup removed cosmetic/version assertions and consolidated
duplicate fixtures. Reverification passed **715 mobile tests**, **219 server tests**,
**6 isolated SQL suites**, and **18 web cases**, plus mobile lint and typecheck.
The audit verification counts above describe the suite before this cleanup.

Changes remain in the working tree for review. A new Android binary is required
for the runtime policy change; exporting JavaScript does not install that policy
on existing devices.
