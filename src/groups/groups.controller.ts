import type { Request, Response } from "express";
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  getAllMyGroups,
  getGroupById,
  getGroupMembers,
  removeGroupMember,
  updateGroupTransaction,
} from "./groups.service";

export const getMyGroupsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const groups = await getAllMyGroups(userId);
    return res.json(groups);
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

    await deleteGroup(groupId);
    return res.json({ message: "Grupo eliminado correctamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al eliminar grupo" });
  }
};

export const deleteGroupMemberController = async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.groupId);
    const userId = Number(req.params.userId); // ✅ viene por params, no body
    if (!Number.isFinite(groupId) || !Number.isFinite(userId)) {
      return res.status(400).json({ message: "groupId/userId inválido" });
    }

    await removeGroupMember(groupId, userId);
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

    await updateGroupTransaction(groupId, name ?? null, description ?? null, members ?? []);
    return res.json({ message: "Grupo actualizado correctamente" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar grupo" });
  }
};
