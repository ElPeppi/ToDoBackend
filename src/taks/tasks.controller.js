import { getAllTasks, addatask, updatetask, deleteTask, getTaskById } from "./tasks.service.js";

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
    console.log("BODY:", req.body);
    console.log("USER:", req.user);

    const tareaId = await addatask(title, description, req.user.id, dueDate, groupId, members);

    const tareaCreada = await getTaskById(tareaId);

    res.status(201).json(tareaCreada);
  } catch (err) {
  console.error("CREATE TASK ERROR:", err);
  return res.status(500).json({
    message: "Error al crear tarea",
    code: err.code,
    sqlMessage: err.sqlMessage,
    sqlState: err.sqlState,
  });
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
