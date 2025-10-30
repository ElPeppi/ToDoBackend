import express from "express";
import { verifyToken } from "../auth/verifyToken.js";
import {getTasksController, createTaskController,updateTaskController, deletetaskController} from "./tasks.controller.js";

const router = express.Router();

// 🟢 Obtener todas las tareas del usuario (creadas, colaboradas o de grupo)
router.get("/", verifyToken, getTasksController);

// 🟢 Crear una nueva tarea (opcional: grupo o colaboradores)
router.post("/", verifyToken, createTaskController);

// 🟢 Actualizar una tarea (estado o info general)
router.put("/:id", verifyToken, updateTaskController);

// 🟢 Eliminar una tarea
router.delete("/:id", verifyToken, deletetaskController);

export default router;
