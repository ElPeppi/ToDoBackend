import { Router } from "express";
import { verifyToken } from "../auth/verifyToken";
import {
  getTasksController,
  createTaskController,
  updateTaskController,
  deleteTaskController,
} from "./tasks.controller";

const router = Router();

router.get("/", verifyToken, getTasksController);
router.post("/", verifyToken, createTaskController);
router.put("/:id", verifyToken, updateTaskController);
router.delete("/:id", verifyToken, deleteTaskController);

export default router;
