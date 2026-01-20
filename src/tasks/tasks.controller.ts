import type { Request, Response } from "express";
import { notifyUsers } from "../realtime/notify";
import { getGroupMemberIds } from "../groups/groups.service";


import { addTask, deleteTask, getAllTasks, getTaskById, MemberRow, updateTask } from "./tasks.service";

export const getTasksController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "No autorizado" });

        const tareas = await getAllTasks(userId);
        return res.json(tareas);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error al obtener tareas" });
    }
};

export const createTaskController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        console.log("USER ID:", userId);
        if (!userId) return res.status(401).json({ message: "No autorizado" });
        console.log("REQUEST BODY:", req.body);
        const { title, description, dueDate, groupId, members } = req.body as {
            title: string;
            description?: string;
            dueDate?: string;
            groupId?: number;
            members?: MemberRow[];
        };

        const collaboratorIds = Array.isArray(members) ? members.map(m => m.id) : [];

        const taskId = await addTask(
            title,
            description ?? null,
            userId,
            dueDate ?? null,
            groupId ?? null,
            collaboratorIds
        );

        const created = await getTaskById(taskId);

        if (created) {
            await notifyUsers(collaboratorIds, { type: "task:created", task: created });
            return res.status(201).json(created);
        }

        return res.status(201).json({ id: taskId });
    } catch (err) {
        console.error("CREATE TASK ERROR:", err);
        return res.status(500).json({ message: "Error al crear tarea" });
    }
};

export const updateTaskController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "No autorizado" });

        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ message: "id inválido" });

        const { title, description, dueDate, status, colaborators, groupId } = req.body as {
            title?: string;
            description?: string | null;
            dueDate?: string | null;
            status?: string;
            colaborators?: number[];
            groupId?: number | null;
        };

        const task = await getTaskById(id);
        if (!task) return res.status(404).json({ message: "Tarea no encontrada" });

        const prevIds = (task.members ?? []).map((m) => m.id);
        const newIds = Array.isArray(colaborators) ? [...colaborators] : [];

        // miembros del grupo anterior y nuevo
        const oldGroupId = task.group_id ?? null;
        const oldGroupMemberIds = oldGroupId ? await getGroupMemberIds(oldGroupId) : [];

        const newGroupMemberIds = groupId ? await getGroupMemberIds(groupId) : [];


        // unificar ids que pudieron perder notificación
        for (const memberId of oldGroupMemberIds) {
            if (!prevIds.includes(memberId) && !newIds.includes(memberId) && !newGroupMemberIds.includes(memberId)) {
                prevIds.push(memberId);
            }
        }
        for (const memberId of newGroupMemberIds) {
            if (!newIds.includes(memberId)) newIds.push(memberId);
        }

        await updateTask(id, {
            title,
            description: description ?? null,
            dueDate: dueDate ?? null,
            status,
            groupId: groupId ?? null,
            collaboratorIds: newIds
        });

        const updated = await getTaskById(id);

        const allIds = Array.from(new Set([...prevIds, ...newIds]));
        await notifyUsers(allIds, {
            type: "task:updated",
            task: updated,
            newCollaboratorIds: newIds,
            previousCollaboratorIds: prevIds,
        });

        return res.json({ message: "Tarea actualizada correctamente" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error al actualizar tarea" });
    }
};

export const deleteTaskController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "No autorizado" });

        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ message: "id inválido" });

        const task = await getTaskById(id);
        if (!task) return res.status(404).json({ message: "Tarea no encontrada" });

        await deleteTask(id);

        const collaboratorIds = (task.members ?? []).map((m) => m.id);
        await notifyUsers(collaboratorIds, { type: "task:deleted", taskId: id });

        return res.json({ message: "Tarea eliminada correctamente" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Error al eliminar tarea" });
    }
};
