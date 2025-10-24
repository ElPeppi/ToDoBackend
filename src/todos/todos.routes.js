import express from "express";
import { pool } from "../db.js";
import { verifyToken } from "../auth/verifyToken.js";

const router = express.Router();

// Obtener todas las tareas del usuario autenticado
router.get("/", verifyToken, async (req, res) => {
  try {
    const [rows] = await pool.query(`
  SELECT DISTINCT t.*
  FROM tareas t
  LEFT JOIN colaboradores_tareas ct ON t.id = ct.tarea_id
  LEFT JOIN miembros_grupo mg ON t.grupo_id = mg.grupo_id
  WHERE 
      t.creador_id = ? 
      OR ct.usuario_id = ? 
      OR mg.usuario_id = ?;
`, [usuarioId, usuarioId, usuarioId]);

    res.json(rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener tareas" });
  }
});

// Crear una nueva tarea
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title, description, dueDate } = req.body;
    await pool.query("INSERT INTO tareas (titulo, descripcion, creador_id, fecha_vencimiento, estado) VALUES (?, ?, ?, ?, ?)", [title, description, req.user.id, dueDate, "pendiente"]);
    res.json({ message: "Tarea creada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear tarea" });
  }
});

// Actualizar el estado de una tarea
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { done } = req.body;
    await pool.query("UPDATE todos SET done = ? WHERE id = ?", [done, id]);
    res.json({ message: "Tarea actualizada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al actualizar tarea" });
  }
});

// Eliminar una tarea
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM todos WHERE id = ?", [id]);
    res.json({ message: "Tarea eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar tarea" });
  }
});

export default router;
