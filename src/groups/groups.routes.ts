import { Router } from "express";
import { verifyToken } from "../auth/verifyToken";
import {
  getMyGroupsController,
  createGroupController,
  deleteGroupController,
  getGroupByIdController,
  getGroupMembersController,
  addGroupMemberController,
  deleteGroupMemberController,
  updateGroupController,
} from "./groups.controller";

const router = Router();

router.get("/", verifyToken, getMyGroupsController);
router.get("/:groupId", verifyToken, getGroupByIdController);
router.get("/:groupId/members", verifyToken, getGroupMembersController);

router.post("/", verifyToken, createGroupController);
router.post("/:groupId/members", verifyToken, addGroupMemberController);

router.delete("/:groupId", verifyToken, deleteGroupController);
router.delete("/:groupId/members/:userId", verifyToken, deleteGroupMemberController);

router.put("/:groupId", verifyToken, updateGroupController);

export default router;
