import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./auth/auth.routes.js";
import taksRoutes from "./taks/tasks.routes.js";
import groupsRoutes from "./groups/groups.routes.js";
import usersRoutes from "./users/users.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taksRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/users", usersRoutes);

// opcional: healthcheck
app.get("/health", (req, res) => res.json({ ok: true }));

export default app;
