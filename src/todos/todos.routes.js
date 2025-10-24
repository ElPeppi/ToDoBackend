import express from "express";
import { pool } from "../db.js";
import { verifyToken } from "../auth/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const [todos] = await pool.query("SELECT * FROM todos WHERE user_id = ?", [req.user.id]);
    res.json(todos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener tareas" });
  }
});

router.post("/", verifyToken, async (req, res) => {
  try {
    const { title } = req.body;
    await pool.query("INSERT INTO todos (title, done, user_id) VALUES (?, ?, ?)", [title, false, req.user.id]);
    res.json({ message: "Tarea creada correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear tarea" });
  }
});

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
