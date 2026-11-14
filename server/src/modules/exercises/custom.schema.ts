import { z } from "zod";
import { exerciseInputSchema } from "./exercise.schema.js";
export const customExerciseInputSchema = z
  .object(exerciseInputSchema.shape)
  .omit({ slug: true, status: true })
  .strict()
  .superRefine((value, ctx) => {
    for (const field of ["primaryMuscles", "secondaryMuscles", "equipment"] as const)
      if (new Set(value[field]).size !== value[field].length)
        ctx.addIssue({ code: "custom", path: [field], message: "Choose each value only once." });
    if (!value.primaryMuscles.length)
      ctx.addIssue({
        code: "custom",
        path: ["primaryMuscles"],
        message: "Choose at least one primary muscle.",
      });
    if (value.secondaryMuscles.some((m) => value.primaryMuscles.includes(m)))
      ctx.addIssue({
        code: "custom",
        path: ["secondaryMuscles"],
        message: "Primary and supporting muscles must be distinct.",
      });
  });
export type CustomExerciseInput = z.infer<typeof customExerciseInputSchema>;
