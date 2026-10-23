# Curated exercise catalog

The catalog targets 100 common strength and bodyweight exercises, including existing edited bench presses. Selection and naming reference: https://www.hevyapp.com/exercises/ and its public muscle libraries and workout guides. This is a practical selection, not an official Hevy ranking or export.

Coaching content combines original text with reviewed instructions from the existing public-domain yuhonas/free-exercise-db import. No Hevy descriptions or media are copied. New media slots are intentionally empty. New exercises remain drafts because publishing currently requires demonstration media.

From `server`, preview with:

```
node --import tsx scripts/curate-exercises.ts --checkpoint=.exercise-imports/<original-import>/state.json
```

Add `--apply` to apply. The script only removes untouched drafts matching the original import, including its content and media metadata. Published, edited, custom, or unrecognized records are protected. It stages replacements before cleanup, backs up all affected tables under ignored `.exercise-imports/core-*/`, checks for concurrent changes, and verifies preserved records and media afterwards. Existing provider assets remain available for backup recovery.

If interrupted during application, inspect that run's `plan.json` and `backup.json` before doing anything else. Do not blindly rerun an incomplete application; staging slugs deliberately fail on conflicts. A completed rerun preserves the curated records and adds no duplicates.
