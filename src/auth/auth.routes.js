import express from "express";
import { pool } from "../db.js";
import { verifyToken } from "./verifyToken.js";

const router = express.Router();

router.post("/cognito", verifyToken, async (req, res) => {
  const { sub, email, name } = req.user;

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE cognito_sub = ?", [sub]);

    if (rows.length === 0) {
      await pool.query("INSERT INTO users (cognito_sub, email, name) VALUES (?, ?, ?)", [
        sub,
        email,
        name,
      ]);
    }

    const [user] = await pool.query("SELECT * FROM users WHERE cognito_sub = ?", [sub]);
    res.json(user[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al sincronizar usuario" });
  }
});

export default router;
