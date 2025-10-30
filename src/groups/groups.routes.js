import express from "express";
import { verifyToken } from "../auth/verifyToken.js";
import{
    getMyGroupsController, 
    createGroupController, 
    deleteGroupController, 
    getGroupByIdController, 
    getGroupMembersController,
    addGroupMemberController,
    removeGroupMemberController,
    updateGroupController
} from "./groups.controller.js";

const router = express.Router();

// 🟢 Obtener todos mis grupos
router.get("/", verifyToken, getMyGroupsController);

// 🟢 Crear un nuevo grupo
router.post("/", verifyToken, createGroupController);

// 🟢 Eliminar un grupo
router.delete("/:groupId", verifyToken, deleteGroupController);

// 🟢 Obtener un grupo por ID
router.get("/:groupId", verifyToken, getGroupByIdController);

// 🟢 Obtener miembros de un grupo
router.get("/:groupId/members", verifyToken, getGroupMembersController);

// 🟢 Agregar miembro a un grupo
router.post("/:groupId/members", verifyToken, addGroupMemberController);

// 🟢 Eliminar miembro de un grupo
router.delete("/:groupId/members/:userId", verifyToken, removeGroupMemberController);

// 🟢 Actualizar información del grupo
router.put("/:groupId", verifyToken, updateGroupController);

export default router;
