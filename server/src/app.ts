
import express from "express";
import helmet from "helmet";

import authRoutes from "./modules/auth/auth.routes.js";
import profileRoutes from "./modules/profile/profile.routes.js";
import accountRoutes from "./modules/account/account.routes.js";
import exerciseRoutes from "./modules/exercises/exercise.routes.js";

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

// New exercise module.
app.use("/api/exercises", exerciseRoutes);

app.use(notFound);
app.use(errorHandler);
