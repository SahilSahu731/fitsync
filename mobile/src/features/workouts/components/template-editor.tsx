import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import type {
  Exercise,
} from "@/features/exercises/types";

import {
  ExercisePickerModal,
} from "./exercise-picker-modal";

import type {
  WorkoutSetType,
  WorkoutTemplate,
  WorkoutTemplateInput,
} from "../types";


interface LocalSet {
  id: string;

  type: WorkoutSetType;

  repsMin: string;

  repsMax: string;

  weight: string;

  rpe: string;
}


interface LocalExercise {
  localId: string;

  exerciseId: string;

  exerciseName: string;

  restSeconds: number;

  notes: string;

  sets: LocalSet[];
}


function randomId(): string {
  return (
    `${Date.now()}-` +
    `${Math.random()}`
  );
}


function makeSet(): LocalSet {
  return {
    id:
      randomId(),

    type:
      "NORMAL",

    repsMin:
      "",

    repsMax:
      "",

    weight:
      "",

    rpe:
      "",
  };
}


function fromTemplate(
  template:
    WorkoutTemplate,
): LocalExercise[] {
  return template.exercises.map(
    (
      exercise,
    ) => ({
      localId:
        exercise.id,

      exerciseId:
        exercise.exercise_id,

      exerciseName:
        exercise.exercise_name,

      restSeconds:
        exercise.rest_seconds,

      notes:
        exercise.notes ??
        "",

      sets:
        exercise
          .planned_sets
          .map(
            (
              plannedSet,
            ) => ({
              id:
                plannedSet.id,

              type:
                plannedSet.type,

              repsMin:
                plannedSet
                  .target_reps_min
                  ?.toString() ??
                "",

              repsMax:
                plannedSet
                  .target_reps_max
                  ?.toString() ??
                "",

              weight:
                plannedSet
                  .target_weight
                  ?.toString() ??
                "",

              rpe:
                plannedSet
                  .target_rpe
                  ?.toString() ??
                "",
            }),
          ),
    }),
  );
}


interface Props {
  initial?:
    WorkoutTemplate;

  saving:
    boolean;

  onSave: (
    input:
      WorkoutTemplateInput,
  ) => Promise<void>;
}


export function TemplateEditor({
  initial,
  saving,
  onSave,
}: Props) {
  const [
    name,
    setName,
  ] = useState(
    initial?.name ??
      "",
  );

  const [
    description,
    setDescription,
  ] = useState(
    initial
      ?.description ??
      "",
  );

  const [
    exercises,
    setExercises,
  ] = useState<
    LocalExercise[]
  >(
    initial
      ? fromTemplate(
          initial
        )
      : [],
  );

  const [
    pickerOpen,
    setPickerOpen,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);


  function addExercises(
    selected:
      Exercise[],
  ) {
    setExercises(
      (
        current,
      ) => {
        const existing =
          new Set(
            current.map(
              (
                item,
              ) =>
                item
                  .exerciseId,
            ),
          );

        return [
          ...current,

          ...selected
            .filter(
              (
                exercise,
              ) =>
                !existing.has(
                  exercise.id
                ),
            )
            .map(
              (
                exercise,
              ) => ({
                localId:
                  randomId(),

                exerciseId:
                  exercise.id,

                exerciseName:
                  exercise.name,

                restSeconds:
                  exercise
                    .mechanic ===
                  "COMPOUND"
                    ? 180
                    : 90,

                notes:
                  "",

                sets: [
                  makeSet(),
                  makeSet(),
                  makeSet(),
                ],
              }),
            ),
        ];
      },
    );
  }


  function removeExercise(
    localId: string,
  ) {
    setExercises(
      (
        current,
      ) =>
        current.filter(
          (
            item,
          ) =>
            item.localId !==
            localId,
        ),
    );
  }


  function moveExercise(
    index: number,
    direction:
      | -1
      | 1,
  ) {
    setExercises(
      (
        current,
      ) => {
        const nextIndex =
          index +
          direction;

        if (
          nextIndex < 0 ||
          nextIndex >=
            current.length
        ) {
          return current;
        }

        const copy = [
          ...current,
        ];

        const [
          moved,
        ] = copy.splice(
          index,
          1,
        );

        copy.splice(
          nextIndex,
          0,
          moved,
        );

        return copy;
      },
    );
  }


  function updateExercise(
    localId: string,
    patch:
      Partial<
        LocalExercise
      >,
  ) {
    setExercises(
      (
        current,
      ) =>
        current.map(
          (
            item,
          ) =>
            item.localId ===
            localId
              ? {
                  ...item,
                  ...patch,
                }
              : item,
        ),
    );
  }


  function updateSet(
    exerciseId: string,
    setId: string,
    patch:
      Partial<
        LocalSet
      >,
  ) {
    setExercises(
      (
        current,
      ) =>
        current.map(
          (
            exercise,
          ) =>
            exercise.localId ===
            exerciseId
              ? {
                  ...exercise,

                  sets:
                    exercise
                      .sets
                      .map(
                        (
                          set,
                        ) =>
                          set.id ===
                          setId
                            ? {
                                ...set,
                                ...patch,
                              }
                            : set,
                      ),
                }
              : exercise,
        ),
    );
  }


  async function save() {
    if (
      !name.trim()
    ) {
      setError(
        "Give your template a name."
      );

      return;
    }

    if (
      exercises.length ===
      0
    ) {
      setError(
        "Add at least one exercise."
      );

      return;
    }

    setError(
      null
    );

    await onSave({
      name:
        name.trim(),

      description:
        description
          .trim() ||
        null,

      exercises:
        exercises.map(
          (
            exercise,
          ) => ({
            exercise_id:
              exercise
                .exerciseId,

            rest_seconds:
              exercise
                .restSeconds,

            notes:
              exercise
                .notes
                .trim() ||
              null,

            superset_group_id:
              null,

            planned_sets:
              exercise
                .sets
                .map(
                  (
                    set,
                  ) => ({
                    type:
                      set.type,

                    target_reps_min:
                      set.repsMin
                        ? Number(
                            set.repsMin
                          )
                        : null,

                    target_reps_max:
                      set.repsMax
                        ? Number(
                            set.repsMax
                          )
                        : null,

                    target_weight:
                      set.weight
                        ? Number(
                            set.weight
                          )
                        : null,

                    target_rpe:
                      set.rpe
                        ? Number(
                            set.rpe
                          )
                        : null,

                    target_rir:
                      null,
                  }),
                ),
          }),
        ),
    });
  }


  return (
    <>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          padding:
            24,

          paddingBottom:
            150,
        }}
      >
        <Text className="text-[12px] font-bold uppercase tracking-[1.8px] text-white/30">
          Template
        </Text>

        <TextInput
          value={
            name
          }
          onChangeText={
            setName
          }
          placeholder="Push Day"
          placeholderTextColor="rgba(255,255,255,.25)"
          selectionColor="#3B82F6"
          className="mt-3 min-h-[58px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[17px] font-bold text-white"
        />

        <TextInput
          value={
            description
          }
          onChangeText={
            setDescription
          }
          placeholder="Description (optional)"
          placeholderTextColor="rgba(255,255,255,.25)"
          multiline
          selectionColor="#3B82F6"
          className="mt-3 min-h-[90px] rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-[14px] leading-5 text-white"
        />

        <View className="mt-9 flex-row items-center justify-between">
          <Text className="text-[20px] font-extrabold text-white">
            Exercises
          </Text>

          <Pressable
            onPress={() => {
              setPickerOpen(
                true
              );
            }}
            className="flex-row items-center gap-2 rounded-xl bg-brand px-4 py-3"
          >
            <Ionicons
              name="add"
              size={18}
              color="#FFFFFF"
            />

            <Text className="text-[13px] font-bold text-white">
              Add
            </Text>
          </Pressable>
        </View>

        <View className="mt-5 gap-4">
          {exercises.map(
            (
              exercise,
              exerciseIndex,
            ) => (
              <View
                key={
                  exercise.localId
                }
                className="rounded-[24px] border border-white/10 bg-white/[0.025] p-4"
              >
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-[16px] font-extrabold text-white">
                      {exercise.exerciseName}
                    </Text>

                    <Text className="mt-1 text-[11px] text-white/30">
                      {exercise.sets.length}{" "}
                      sets ·{" "}
                      {exercise.restSeconds} sec rest
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => {
                      moveExercise(
                        exerciseIndex,
                        -1,
                      );
                    }}
                    className="h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"
                  >
                    <Ionicons
                      name="arrow-up"
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      moveExercise(
                        exerciseIndex,
                        1,
                      );
                    }}
                    className="ml-2 h-9 w-9 items-center justify-center rounded-xl bg-white/[0.05]"
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color="#FFFFFF"
                    />
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      removeExercise(
                        exercise.localId
                      );
                    }}
                    className="ml-2 h-9 w-9 items-center justify-center rounded-xl bg-red-400/[0.07]"
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#F87171"
                    />
                  </Pressable>
                </View>

                <Text className="mt-5 text-[11px] font-bold uppercase tracking-[1.4px] text-white/30">
                  Rest
                </Text>

                <View className="mt-2 flex-row gap-2">
                  {[
                    60,
                    90,
                    120,
                    180,
                    300,
                  ].map(
                    (
                      seconds,
                    ) => (
                      <Pressable
                        key={
                          seconds
                        }
                        onPress={() => {
                          updateExercise(
                            exercise.localId,
                            {
                              restSeconds:
                                seconds,
                            },
                          );
                        }}
                        className="flex-1 items-center rounded-xl border py-2"
                        style={{
                          borderColor:
                            exercise
                              .restSeconds ===
                            seconds
                              ? "rgba(59,130,246,.55)"
                              : "rgba(255,255,255,.08)",

                          backgroundColor:
                            exercise
                              .restSeconds ===
                            seconds
                              ? "rgba(37,99,235,.12)"
                              : "rgba(255,255,255,.025)",
                        }}
                      >
                        <Text
                          className="text-[11px] font-bold"
                          style={{
                            color:
                              exercise
                                .restSeconds ===
                              seconds
                                ? "#60A5FA"
                                : "rgba(255,255,255,.45)",
                          }}
                        >
                          {seconds <
                          120
                            ? `${seconds}s`
                            : `${seconds / 60}m`}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>

                <View className="mt-6 flex-row px-1">
                  <Text className="w-8 text-[10px] font-bold uppercase text-white/25">
                    Set
                  </Text>

                  <Text className="flex-1 text-center text-[10px] font-bold uppercase text-white/25">
                    Min
                  </Text>

                  <Text className="flex-1 text-center text-[10px] font-bold uppercase text-white/25">
                    Max
                  </Text>

                  <Text className="flex-1 text-center text-[10px] font-bold uppercase text-white/25">
                    Weight
                  </Text>

                  <Text className="flex-1 text-center text-[10px] font-bold uppercase text-white/25">
                    RPE
                  </Text>

                  <View className="w-8" />
                </View>

                <View className="mt-2 gap-2">
                  {exercise.sets.map(
                    (
                      set,
                      setIndex,
                    ) => (
                      <View
                        key={
                          set.id
                        }
                        className="flex-row items-center"
                      >
                        <View className="w-8">
                          <Text className="text-[12px] font-bold text-white/45">
                            {setIndex +
                              1}
                          </Text>
                        </View>

                        <TextInput
                          value={
                            set.repsMin
                          }
                          onChangeText={(
                            value,
                          ) => {
                            updateSet(
                              exercise.localId,
                              set.id,
                              {
                                repsMin:
                                  value.replace(
                                    /\D/g,
                                    ""
                                  ),
                              },
                            );
                          }}
                          keyboardType="number-pad"
                          placeholder="-"
                          placeholderTextColor="rgba(255,255,255,.2)"
                          className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[13px] font-semibold text-white"
                        />

                        <TextInput
                          value={
                            set.repsMax
                          }
                          onChangeText={(
                            value,
                          ) => {
                            updateSet(
                              exercise.localId,
                              set.id,
                              {
                                repsMax:
                                  value.replace(
                                    /\D/g,
                                    ""
                                  ),
                              },
                            );
                          }}
                          keyboardType="number-pad"
                          placeholder="-"
                          placeholderTextColor="rgba(255,255,255,.2)"
                          className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[13px] font-semibold text-white"
                        />

                        <TextInput
                          value={
                            set.weight
                          }
                          onChangeText={(
                            value,
                          ) => {
                            updateSet(
                              exercise.localId,
                              set.id,
                              {
                                weight:
                                  value.replace(
                                    /[^0-9.]/g,
                                    ""
                                  ),
                              },
                            );
                          }}
                          keyboardType="decimal-pad"
                          placeholder="-"
                          placeholderTextColor="rgba(255,255,255,.2)"
                          className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[13px] font-semibold text-white"
                        />

                        <TextInput
                          value={
                            set.rpe
                          }
                          onChangeText={(
                            value,
                          ) => {
                            updateSet(
                              exercise.localId,
                              set.id,
                              {
                                rpe:
                                  value.replace(
                                    /[^0-9.]/g,
                                    ""
                                  ),
                              },
                            );
                          }}
                          keyboardType="decimal-pad"
                          placeholder="-"
                          placeholderTextColor="rgba(255,255,255,.2)"
                          className="mx-1 min-h-[42px] flex-1 rounded-xl bg-white/[0.045] text-center text-[13px] font-semibold text-white"
                        />

                        <Pressable
                          onPress={() => {
                            updateExercise(
                              exercise.localId,
                              {
                                sets:
                                  exercise
                                    .sets
                                    .filter(
                                      (
                                        item,
                                      ) =>
                                        item.id !==
                                        set.id,
                                    ),
                              },
                            );
                          }}
                          className="h-8 w-8 items-center justify-center"
                        >
                          <Ionicons
                            name="close"
                            size={16}
                            color="rgba(255,255,255,.35)"
                          />
                        </Pressable>
                      </View>
                    ),
                  )}
                </View>

                <Pressable
                  onPress={() => {
                    updateExercise(
                      exercise.localId,
                      {
                        sets: [
                          ...exercise.sets,
                          makeSet(),
                        ],
                      },
                    );
                  }}
                  className="mt-4 flex-row items-center justify-center gap-2 rounded-xl bg-white/[0.04] py-3"
                >
                  <Ionicons
                    name="add"
                    size={16}
                    color="#60A5FA"
                  />

                  <Text className="text-[12px] font-bold text-brand-bright">
                    Add set
                  </Text>
                </Pressable>

                <TextInput
                  value={
                    exercise.notes
                  }
                  onChangeText={(
                    value,
                  ) => {
                    updateExercise(
                      exercise.localId,
                      {
                        notes:
                          value,
                      },
                    );
                  }}
                  placeholder="Exercise notes (optional)"
                  placeholderTextColor="rgba(255,255,255,.22)"
                  multiline
                  className="mt-4 min-h-[70px] rounded-xl bg-white/[0.035] px-3 py-3 text-[12px] leading-5 text-white"
                />
              </View>
            ),
          )}
        </View>

        {error ? (
          <Text className="mt-6 text-[13px] text-red-300">
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-white/[0.06] bg-background px-5 pb-5 pt-4">
        <Pressable
          disabled={
            saving
          }
          onPress={() => {
            void save();
          }}
          className="min-h-[58px] items-center justify-center rounded-2xl"
          style={({
            pressed,
          }) => ({
            backgroundColor:
              pressed
                ? "#1D4ED8"
                : "#2563EB",

            opacity:
              saving
                ? 0.6
                : 1,

            transform: [
              {
                scale:
                  pressed
                    ? 0.985
                    : 1,
              },
            ],
          })}
        >
          {saving ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text className="text-[16px] font-extrabold text-white">
              Save template
            </Text>
          )}
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={
          pickerOpen
        }
        onClose={() => {
          setPickerOpen(
            false
          );
        }}
        onAdd={
          addExercises
        }
      />
    </>
  );
}