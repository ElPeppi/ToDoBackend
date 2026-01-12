import { getAllTasks, addatask, updatetask, deleteTask, getTaskById } from "./tasks.service.js";

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

    // ✅ EN LAMBDA: primero notifica (await), luego responde
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
    const { title, description, dueDate, status } = req.body;
    await updatetask(id, title, description, dueDate, status);
    res.json({ message: "Tarea actualizada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar tarea" });
  }
};

export const deletetaskController = async (req, res) => {
  try {
    const { id } = req.params;
    await deleteTask(id);
    res.json({ message: "Tarea eliminada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar tarea" });
  }
};
