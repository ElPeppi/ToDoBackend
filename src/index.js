import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./auth/auth.routes.js";
import todoRoutes from "./taks/tasks.routes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/tasks", todoRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
