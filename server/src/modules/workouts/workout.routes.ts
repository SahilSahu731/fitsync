import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../common/async-handler.js";
import { requireAuth, getAuth } from "../../middleware/auth.js";

import {
    createTemplateSchema,
    updateSetSchema,
    addSessionExerciseSchema,
    addSessionExercisesSchema,
    addSessionSetSchema,
    finishWorkoutSchema
} from "./workout.schema.js";

import * as service from "./workout.service.js";

const router = Router();
router.use(requireAuth);

const idSchema = z.uuid();

router.get("/templates", asyncHandler(async (req, res) => {
    res.json(await service.listTemplates(getAuth(req).userId));
}));

router.post("/templates", asyncHandler(async (req, res) => {
    const input = createTemplateSchema.parse(req.body);

    res.status(201).json(
        await service.createTemplate(getAuth(req).userId, input)
    );
}));

router.get("/templates/:id", asyncHandler(async (req, res) => {
    res.json(
        await service.getTemplate(
            getAuth(req).userId,
            idSchema.parse(req.params.id)
        )
    );
}));

router.patch("/templates/:id", asyncHandler(async (req, res) => {
    const { name } = z.object({ name: z.string().trim().min(1).max(120) }).parse(req.body);
    res.json(await service.renameTemplate(getAuth(req).userId, idSchema.parse(req.params.id), name));
}));

router.delete("/templates/:id", asyncHandler(async (req, res) => {
    await service.deleteTemplate(
        getAuth(req).userId,
        idSchema.parse(req.params.id)
    );

    res.status(204).send();
}));

router.get("/active", asyncHandler(async (req, res) => {
    res.json(await service.getActiveSession(getAuth(req).userId));
}));

router.get("/history", asyncHandler(async (req, res) => {
    res.json(await service.listHistory(getAuth(req).userId));
}));

router.post("/start", asyncHandler(async (req, res) => {
    const input = z.object({
        templateId: z.uuid().optional()
    }).parse(req.body);

    res.status(201).json(
        await service.startWorkout(
            getAuth(req).userId,
            input.templateId
        )
    );
}));

router.patch("/sessions/:id", asyncHandler(async (req, res) => {
    const { notes } = z.object({ notes: z.string().max(2000) }).parse(req.body);
    res.json(await service.updateSessionNotes(getAuth(req).userId, idSchema.parse(req.params.id), notes));
}));

router.get("/sessions/:id", asyncHandler(async (req, res) => {
    res.json(
        await service.getSession(
            getAuth(req).userId,
            idSchema.parse(req.params.id)
        )
    );
}));

router.post("/sessions/:id/exercises/batch", asyncHandler(async (req, res) => {
    const input = addSessionExercisesSchema.parse(req.body);
    res.status(201).json(await service.addSessionExercises(
        getAuth(req).userId, idSchema.parse(req.params.id), input.exerciseIds, input.restSeconds
    ));
}));

router.post("/sessions/:id/exercises", asyncHandler(async (req, res) => {
    const input = addSessionExerciseSchema.parse(req.body);

    res.status(201).json(
        await service.addSessionExercise(
            getAuth(req).userId,
            idSchema.parse(req.params.id),
            input.exerciseId,
            input.restSeconds
        )
    );
}));

router.post(
    "/sessions/:id/exercises/:exerciseItemId/sets",
    asyncHandler(async (req, res) => {
        const input = addSessionSetSchema.parse(req.body);

        res.status(201).json(
            await service.addSet(
                getAuth(req).userId,
                idSchema.parse(req.params.id),
                idSchema.parse(req.params.exerciseItemId),
                input
            )
        );
    })
);

router.patch(
    "/sessions/:id/sets/:setId",
    asyncHandler(async (req, res) => {
        const input = updateSetSchema.parse(req.body);

        res.json(
            await service.updateSet(
                getAuth(req).userId,
                idSchema.parse(req.params.id),
                idSchema.parse(req.params.setId),
                input,
                req.query.compact === "true"
            )
        );
    })
);

router.post("/sessions/:id/finish", asyncHandler(async (req, res) => {
    const input = finishWorkoutSchema.parse(req.body);

    res.json(
        await service.finishWorkout(
            getAuth(req).userId,
            idSchema.parse(req.params.id),
            "completed",
            input.notes,
            input.elapsedSeconds
        )
    );
}));

router.post("/sessions/:id/discard", asyncHandler(async (req, res) => {
    res.json(
        await service.finishWorkout(
            getAuth(req).userId,
            idSchema.parse(req.params.id),
            "discarded"
        )
    );
}));

export default router;
