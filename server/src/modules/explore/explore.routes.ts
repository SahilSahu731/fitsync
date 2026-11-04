import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../../common/async-handler.js";
import { ApiError } from "../../common/errors.js";
import { requireAuth } from "../../middleware/auth.js";

import {
    exploreHome,
    getResource,
    listSection
} from "./explore.service.js";

const router = Router();

router.use(requireAuth);

const sectionSchema = z.enum([
    "workouts",
    "programs",
    "exercises",
    "mobility",
    "learn"
]);

const filtersSchema = z.object({
    page: z.coerce.number()
        .int()
        .min(1)
        .max(10000)
        .default(1),

    pageSize: z.coerce.number()
        .int()
        .min(1)
        .max(30)
        .default(12),

    q: z.string()
        .trim()
        .max(100)
        .default(""),

    level: z.enum([
        "beginner",
        "intermediate",
        "advanced"
    ]).optional(),

    goal: z.enum([
        "muscle",
        "strength",
        "fat_loss",
        "endurance",
        "general"
    ]).optional(),

    equipment: z.enum([
        "gym",
        "dumbbells",
        "bodyweight",
        "bands",
        "mixed"
    ]).optional()
});

router.get(
    "/home",
    asyncHandler(async (_req, res) => {
        res.json(await exploreHome());
    })
);

router.get(
    "/resources/:slug",
    asyncHandler(async (req, res) => {
        const slug = z.string()
            .regex(/^[a-z0-9-]{1,120}$/)
            .parse(req.params.slug);

        const resource = await getResource(slug);

        if (!resource) {
            throw new ApiError(
                404,
                "Resource not found."
            );
        }

        res.json(resource);
    })
);

router.get(
    "/:section",
    asyncHandler(async (req, res) => {
        const section = sectionSchema.parse(
            req.params.section
        );

        const filters = filtersSchema.parse(
            req.query
        );

        res.json(
            await listSection(section, filters)
        );
    })
);

export default router;