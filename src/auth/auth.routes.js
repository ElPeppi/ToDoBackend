import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { pool } from "../db.js";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretito123"; 

// 🔹 Registro
router.post("/register", async (req, res) => {
  try {
    const { name, email,team, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const [exists] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (exists.length > 0) return res.status(400).json({ message: "Usuario ya existe" });

    await pool.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashed]);
    res.json({ message: "✅ Usuario registrado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error en el registro" });
  }
});

// 🔹 Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });
    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ access_token: token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

export default router;
