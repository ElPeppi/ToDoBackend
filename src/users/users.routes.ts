import { Router } from "express";
import { verifyToken } from "../auth/verifyToken";
import {
  getUserByEmailController,
  getUserByNameController,
  updateUserController,
  getUserForGroupController,
  getProfilePhotoUploadUrlController,
  updateMyPhotoController,
  getProfilePhotoController,
} from "./users.controller";

const router = Router();

router.get("/email/:email", verifyToken, getUserByEmailController);
router.get("/name/:name", verifyToken, getUserByNameController);
router.get("/search", verifyToken, getUserForGroupController);
router.get("/me/photo", verifyToken, getProfilePhotoController),
router.put("/", verifyToken, updateUserController);
router.post("/me/photo/upload-url", verifyToken, getProfilePhotoUploadUrlController);
router.put("/me/photo", verifyToken, updateMyPhotoController);

export default router;
