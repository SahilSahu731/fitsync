export const DATABASE_NAME = "fitsync.db";

export const DATABASE_VERSION = 2;

export const CREATE_V1_SCHEMA = `
CREATE TABLE IF NOT EXISTS local_workouts (
  local_id TEXT PRIMARY KEY NOT NULL,

  user_id TEXT NOT NULL,

  client_workout_id TEXT NOT NULL,

  server_id TEXT,

  server_revision INTEGER,

  payload_json TEXT NOT NULL,

  payload_version INTEGER NOT NULL DEFAULT 2,

  local_status TEXT NOT NULL
    CHECK (
      local_status IN (
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
      )
    ),

  sync_status TEXT NOT NULL
    CHECK (
      sync_status IN (
        'LOCAL_ONLY',
        'DIRTY',
        'SYNCING',
        'SYNCED',
        'CONFLICT',
        'ERROR'
      )
    ),

  dirty INTEGER NOT NULL DEFAULT 1
    CHECK (
      dirty IN (0, 1)
    ),

  local_version INTEGER NOT NULL DEFAULT 1,

  last_synced_payload_json TEXT,

  last_sync_error TEXT,

  retry_count INTEGER NOT NULL DEFAULT 0,

  next_retry_at TEXT,

  created_at TEXT NOT NULL,

  updated_at TEXT NOT NULL,

  last_synced_at TEXT,

  UNIQUE (
    user_id,
    client_workout_id
  )
);


CREATE UNIQUE INDEX IF NOT EXISTS
uq_local_workout_one_active_per_user
ON local_workouts (
  user_id
)
WHERE local_status = 'IN_PROGRESS';


CREATE UNIQUE INDEX IF NOT EXISTS
uq_local_workout_server_id
ON local_workouts (
  server_id
)
WHERE server_id IS NOT NULL;


CREATE INDEX IF NOT EXISTS
idx_local_workout_sync
ON local_workouts (
  user_id,
  dirty,
  sync_status,
  next_retry_at
);


CREATE INDEX IF NOT EXISTS
idx_local_workout_history
ON local_workouts (
  user_id,
  local_status,
  updated_at DESC
);


CREATE TABLE IF NOT EXISTS workout_runtime (
  workout_local_id TEXT PRIMARY KEY NOT NULL,

  rest_ends_at TEXT,

  rest_exercise_id TEXT,

  rest_exercise_name TEXT,

  rest_notification_id TEXT,

  FOREIGN KEY (
    workout_local_id
  )
  REFERENCES local_workouts (
    local_id
  )
  ON DELETE CASCADE
);


CREATE TABLE IF NOT EXISTS cached_exercises (
  user_id TEXT NOT NULL,

  exercise_id TEXT NOT NULL,

  payload_json TEXT NOT NULL,

  cached_at TEXT NOT NULL,

  PRIMARY KEY (
    user_id,
    exercise_id
  )
);


CREATE INDEX IF NOT EXISTS
idx_cached_exercises_user
ON cached_exercises (
  user_id
);


CREATE TABLE IF NOT EXISTS cached_templates (
  user_id TEXT NOT NULL,

  template_id TEXT NOT NULL,

  payload_json TEXT NOT NULL,

  cached_at TEXT NOT NULL,

  PRIMARY KEY (
    user_id,
    template_id
  )
);


CREATE INDEX IF NOT EXISTS
idx_cached_templates_user
ON cached_templates (
  user_id
);
`;
