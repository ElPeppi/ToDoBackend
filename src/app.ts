import express from "express";
import cors from "cors";

import authRoutes from "./auth/auth.routes";
import tasksRoutes from "./tasks/tasks.routes";
import groupsRoutes from "./groups/groups.routes";
import usersRoutes from "./users/users.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/users", usersRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

export default app;