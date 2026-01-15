import { getAllTasks, addatask, updatetask, deleteTask, getTaskById } from "./tasks.service.js";

import { getGroupMembersController } from "../groups/groups.controller.js";

import { notifyUsers } from "../realtime/notify.js";

export const getTasksController = async (req, res) => {
  try {
    const tareas = await getAllTasks(req.user.id);
    res.json(tareas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener tareas" });
  }
};

export const createTaskController = async (req, res) => {
  try {
    const { title, description, dueDate, groupId, members } = req.body;

    const tareaId = await addatask(
      title,
      description,
      req.user.id,
      dueDate,
      groupId,
      members
    );

    const tareaCreada = await getTaskById(tareaId);

    const collaboratorIds = Array.isArray(members) ? [...members] : [];

    await notifyUsers(collaboratorIds, {
      type: "task:created",
      task: tareaCreada,
    });

    return res.status(201).json(tareaCreada);

  } catch (err) {
    console.error("CREATE TASK ERROR:", err);
    return res.status(500).json({ message: "Error al crear tarea" });
  }
};

export const updateTaskController = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate, status,colaborators, groupId } = req.body;
    const task = await getTaskById(id);

    const previousCollaboratorIds = task.members.map(colaborators => colaborators.id);
    const newCollaboratorIds = Array.isArray(colaborators) ? colaborators : [];
    const oldGroupMembers = id ? await getGroupMembers(id) : [];
    const oldGroupMemberIds = oldGroupMembers.map(member => member.user_id);
    const newGroupMemberIds = groupId ? await getGroupMembers(groupId).then(members => members.map(member => member.user_id)) : [];

    for (const memberId of oldGroupMemberIds) {
      if (!previousCollaboratorIds.includes(memberId) && !newCollaboratorIds.includes(memberId) && !newGroupMemberIds.includes(memberId)) {
        previousCollaboratorIds.push(memberId);
      }
    }
    for (const memberId of newGroupMemberIds) {
      if (!newCollaboratorIds.includes(memberId)) {
        newCollaboratorIds.push(memberId);
      }
    }

    await updatetask(id, title, description, dueDate, status, newCollaboratorIds, groupId);
    const updatedTask = await getTaskById(id);
    const allCollaboratorIds = Array.from(new Set([...previousCollaboratorIds, ...newCollaboratorIds]));

    await notifyUsers(allCollaboratorIds, {
      type: "task:updated",
      task: updatedTask,
      newCollaboratorIds: newCollaboratorIds,
      previousCollaboratorIds: previousCollaboratorIds, 
    });
    res.json({ message: "Tarea actualizada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar tarea" });
  }
};

export const deletetaskController = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await getTaskById(id);
    await deleteTask(id);
      const collaboratorIds = task.members.map(member => member.id);
      await notifyUsers(collaboratorIds, {
        type: "task:deleted",
        taskId: id,
      });

    res.json({ message: "Tarea eliminada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar tarea" });
  }
};
