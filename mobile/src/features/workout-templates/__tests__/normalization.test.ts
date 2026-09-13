import type { WorkoutTemplate } from "@/features/workouts/types";
import { normalizeRoutine } from "../normalization";
it("normalizes positions and removes orphan supersets", () => {
  const routine = {
    id: "r",
    client_template_id: "r",
    name: "R",
    description: null,
    folder_client_id: null,
    is_favorite: false,
    position: 0,
    archived: false,
    exercise_count: 1,
    set_count: 3,
    muscle_groups: [],
    revision: 1,
    times_performed: 0,
    last_performed_at: null,
    created_at: "x",
    updated_at: "x",
    exercises: [
      {
        id: "e",
        exercise_id: "e",
        exercise_name: "E",
        thumbnail_url: null,
        tracking_type: "WEIGHT_REPS",
        laterality: "BILATERAL",
        load_mode: "TOTAL",
        primary_muscles: [],
        position: 17,
        rest_seconds: 60,
        notes: null,
        superset_group_id: "orphan",
        planned_sets: [4, 12, 50].map((position) => ({
          id: String(position),
          position,
          type: "NORMAL" as const,
          target_reps_min: null,
          target_reps_max: null,
          target_weight: null,
          target_duration_seconds: null,
          target_distance_meters: null,
          target_rpe: null,
          target_rir: null,
        })),
      },
    ],
  } satisfies WorkoutTemplate;
  const result = normalizeRoutine(routine);
  expect(result.exercises[0].position).toBe(0);
  expect(result.exercises[0].planned_sets.map((set) => set.position)).toEqual([
    0, 1, 2,
  ]);
  expect(result.exercises[0].superset_group_id).toBeNull();
});
