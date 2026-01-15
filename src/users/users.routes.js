import express from "express";
import { verifyToken } from "../auth/verifyToken.js";
import { getUserByEmailController,getUserByNameController,updateUserController, getUserForGroupController } from "./users.controller.js";

const router = express.Router();

// 🟢 Obtener usuario por email
router.get("/email/:email", verifyToken, getUserByEmailController);

// 🟢 Obtener usuario por nombre
router.get("/name/:name", verifyToken, getUserByNameController);

// 🟢 Buscar usuarios para agregar a grupo
router.get("/search", verifyToken, getUserForGroupController);

// 🟢 Actualizar usuario
router.put("/", verifyToken, updateUserController);



export default router;