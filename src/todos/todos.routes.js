import express from "express";
import { pool } from "../db.js";
import { verifyToken } from "../auth/verifyToken.js";

const router = express.Router();

// Listar tareas
router.get("/", verifyToken, async (req, res) => {
  try {
    const userSub = req.user.sub;
    const [user] = await pool.query("SELECT id FROM users WHERE cognito_sub = ?", [userSub]);
    if (user.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    const [todos] = await pool.query("SELECT * FROM todos WHERE user_id = ?", [user[0].id]);
    res.json(todos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener tareas" });
  }
});

// Crear tarea
router.post("/", verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    const userSub = req.user.sub;
    const [user] = await pool.query("SELECT id FROM users WHERE cognito_sub = ?", [userSub]);
    if (user.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    await pool.query("INSERT INTO todos (title, done, user_id) VALUES (?, ?, ?)", [
      title,
      false,
      user[0].id,
    ]);

    res.json({ message: "Tarea creada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear tarea" });
  }
});

// Actualizar tarea
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

// Eliminar tarea
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
