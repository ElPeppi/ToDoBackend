import type { Request, Response } from "express";
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  getAllMyGroups,
  getAllTasksGroupIds,
  getAllTasksInGroup,
  getGroupById,
  getGroupMembers,
  removeGroupMember,
  updateGroupTransaction,
} from "./groups.service";
import { notifyUsers } from "../realtime/notify";

export const getMyGroupsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const groups = await getAllMyGroups(userId);

    let tasks: any[] = [];
    for (const group of groups) {
      const groupTasks = await getAllTasksInGroup(group.id);
      tasks = tasks.concat(groupTasks);
    }
    return res.json({ groups, tasks });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener grupos" });
  }
};

export const getGroupMembersController = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) return res.status(400).json({ message: "groupId inválido" });

    const members = await getGroupMembers(groupId);
    return res.json(members);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener miembros del grupo" });
  }
};

export const getGroupByIdController = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) return res.status(400).json({ message: "groupId inválido" });

    const group = await getGroupById(groupId);
    return res.json(group);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener grupo" });
  }
};

export const getAllTasksGroupIdsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });
    const groupId = req.query.groupId ? Number(req.query.groupId) : null;
    if (groupId !== null && !Number.isFinite(groupId)) {
      return res.status(400).json({ message: "groupId inválido" });
    }
    if (groupId === null) {
      return res.status(400).json({ message: "groupId es requerido" });
    }
    const tasks = await getAllTasksGroupIds(groupId);
    return res.json(tasks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al obtener tareas" });
  }
};

export const createGroupController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const { name, description, members } = req.body as {
      name: string;
      description?: string | null;
      members?: number[];
    };

    const memberIds = Array.isArray(members) ? members : [];
    const groupId = await createGroup(name, description ?? null, userId, memberIds);
    if (!groupId) {
      return res.status(500).json({ message: "No se pudo crear el grupo" });
    }
    await notifyUsers(memberIds, { type: "group:created", groupId, name });
    return res.json({ message: "Grupo creado correctamente", groupId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al crear grupo" });
  }
};

export const addGroupMemberController = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) return res.status(400).json({ message: "groupId inválido" });

    const { userId } = req.body as { userId: number };
    if (!Number.isFinite(userId)) return res.status(400).json({ message: "userId inválido" });

    await addGroupMember(groupId, userId);
    const tasks = await getAllTasksGroupIds(groupId);

    await notifyUsers([userId], { type: "group:member_added", groupId, tasks });
    return res.json({ message: "Miembro agregado correctamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al agregar miembro al grupo" });
  }
};

export const deleteGroupController = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) return res.status(400).json({ message: "groupId inválido" });

    const members = await getGroupMembers(groupId);
    const memberIds = members.map((m) => m.userId);

    await deleteGroup(groupId);
    
    await notifyUsers(memberIds, { type: "group:deleted", groupId });

    return res.json({ message: "Grupo eliminado correctamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al eliminar grupo" });
  }
};

export const deleteGroupMemberController = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.params.userId); 
    if (!Number.isFinite(groupId) || !Number.isFinite(userId)) {
      return res.status(400).json({ message: "groupId/userId inválido" });
    }

    await removeGroupMember(groupId, userId);

    await notifyUsers([userId], { type: "group:member_removed", groupId });

    return res.json({ message: "Miembro eliminado correctamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al eliminar miembro del grupo" });
  }
};

export const updateGroupController = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    if (!Number.isFinite(groupId)) return res.status(400).json({ message: "groupId inválido" });

    const { name, description, members } = req.body as {
      name?: string | null;
      description?: string | null;
      members?: Array<number | { userId: number; rol?: string }>;
    };
    const oldMembers = await getGroupMembers(groupId);
    const oldMemberIds = oldMembers.map((m) => m.userId);
     const newMemberIds = Array.isArray(members)
      ? members.map((m) => (typeof m === "number" ? m : m.userId))
      : [];
    const addedMemberIds = newMemberIds.filter((id) => !oldMemberIds.includes(id));
    const removedMemberIds = oldMemberIds.filter((id) => !newMemberIds.includes(id));
    await updateGroupTransaction(groupId, name ?? null, description ?? null, members ?? []);

    await notifyUsers(addedMemberIds, { type: "group:member_added", groupId });
    await notifyUsers(removedMemberIds, { type: "group:member_removed", groupId });

    return res.json({ message: "Grupo actualizado correctamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar grupo" });
  }
};
