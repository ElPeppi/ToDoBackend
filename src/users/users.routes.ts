import { Router } from "express";
import { verifyToken } from "../auth/verifyToken";
import {
  getUserByEmailController,
  getUserByNameController,
  updateUserController,
  getUserForGroupController,
} from "./users.controller";

const router = Router();

router.get("/email/:email", verifyToken, getUserByEmailController);
router.get("/name/:name", verifyToken, getUserByNameController);
router.get("/search", verifyToken, getUserForGroupController);
router.put("/", verifyToken, updateUserController);

export default router;
