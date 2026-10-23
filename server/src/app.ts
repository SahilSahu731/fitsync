import express from "express";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import accountRoutes from "./modules/account/account.routes.js";
import exerciseRoutes from "./modules/exercises/exercise.routes.js";
import workoutRoutes from "./modules/workouts/workout.routes.js";
import catalogAdminRoutes from "./modules/training-catalog/catalog.admin.routes.js";
import programFollowRoutes from "./modules/program-follow/program.routes.js";
import catalogRoutes from "./modules/training-catalog/catalog.routes.js";

import {
  notFound,
  errorHandler
} from "./middleware/error-handler.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "64kb" }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "fitsync-api"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/me", profileRoutes);
app.use("/api/me", accountRoutes);
app.use("/api/exercises", exerciseRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/program-follow", programFollowRoutes);
app.use("/api/catalog/admin", catalogAdminRoutes);
app.use("/api/catalog", catalogRoutes);

app.use(notFound);
app.use(errorHandler);