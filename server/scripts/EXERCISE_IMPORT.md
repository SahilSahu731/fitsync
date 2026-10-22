# Import exercises and their images

The importer reads `yuhonas/free-exercise-db`, imports both demonstration photos supplied for each supported exercise, optimizes them through the app's media pipeline, uploads them to Cloudinary, and stores their delivery URLs and attribution in `exercise_media`. It does not require animations.

Prerequisites:

- Existing `server/.env`: Supabase service credentials, Cloudinary credentials, and `SEED_ADMIN_USER_ID` for the database administrator.
- Database migrations 001–005, including `005_cloudinary_exercise_images.sql` for Cloudinary images.

Run from `server/`:

```sh
# Read-only preview of the source, selected records, image count, and existing catalog.
npm run exercises:import -- --dry-run --reset

# Replace all existing exercise records, after backing up and staging replacements.
npm run exercises:import -- --reset --concurrency=4

# Add missing exercises and source images without clearing or overwriting existing exercises.
npm run exercises:import

# Optional smaller import (when combined with --reset, replaces the catalog with that subset).
npm run exercises:import -- --limit=25

# Continue an interrupted run using the exact checkpoint path printed by the script.
npm run exercises:import -- --resume=.exercise-imports/<run-directory>
```

The default limit is 1,000, enough for all currently compatible entries. Concurrency defaults to four and is capped at six. Source download and Cloudinary upload failures are retried. Already-attached source URLs are skipped when resuming, so completed images are not duplicated.

## Replacement safety

A reset saves raw exercise, relation, media, and taxonomy snapshots in a private git-ignored `.exercise-imports/<run-directory>/backup.json`. It also saves the source JSON, skipped-record report, and resumable `state.json`. These files contain catalog data and administrator IDs but no service keys or authentication tokens.

Replacement exercises are staged as drafts with temporary slugs. A pilot image checks Cloudinary and the database media constraint before bulk work begins. The script confirms every selected source image has a Cloudinary record before deleting the backed-up old exercise IDs and assigning the final slugs. If an exercise changes or a new one is added during staging, replacement stops before deletion. Avoid catalog edits while a replacement is running.

The database cleanup is resumable, not one transaction: if interrupted during the final deletion/slug steps, run `--resume` with the same directory. Do not launch another reset while a run is unfinished. Old provider files are retained for recovery if the old catalog had media; they are not permanently deleted by this importer. This run began with no old image records.

Imported content remains **draft** for review. Publish exercises through the web admin when ready. Each imported exercise already has the required demonstration images.

## Source and classification

- Source: https://github.com/yuhonas/free-exercise-db
- Image paths: `exercises/<source-id>/0.jpg`, `1.jpg`, as listed in the source JSON.
- Source license: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md (Unlicense/public domain according to the source repository).

Existing conservative mappings are retained. Unsupported categories, ambiguous primary muscles (such as an unspecific `shoulders` label when FitSync distinguishes front/side/rear delts), invalid records, and records without images are skipped and recorded in `skipped.json`. Importing photos does not silently invent exercise classifications.
