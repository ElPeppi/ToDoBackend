import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import { verifyEmail } from "../auth/verifyToken.js";
import { sendVerificationEmail } from "./email.service.js";
import crypto from "crypto";

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretito123";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "supersecretito_refresh";

// 🔹 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });

    const user = rows[0];
    if (!user.verified) {
      await fetch("http://localhost:4000/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      return res.status(403).json({ message: "Debes verificar tu correo antes de iniciar sesión, se envio el correo nuevamente" });

    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Contraseña incorrecta" });

    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "8h" });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: "7d" });

    res.json({ accessToken, refreshToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

// 🔹 REFRESH TOKEN
router.post("/refresh", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: "Falta refresh token" });

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { id: decoded.id, email: decoded.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Error al refrescar token:", err);
    res.status(403).json({ message: "Refresh token inválido o expirado" });
  }
});

// CORS preflight para auth
router.options("*", (req, res) => {
  res.sendStatus(200);
});


router.get("/check-token", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Falta token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(403).json({ message: "Token inválido o expirado" });
  }
});

// 🔹 Registro
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);

    const [exists] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    if (exists.length > 0) return res.status(400).json({ message: "Usuario ya existe" });

    const [result] = await pool.query(
      "INSERT INTO users (name, email, password, verified) VALUES (?, ?, ?, false)",
      [name, email, hashed]
    );

    const userId = result.insertId;
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query(
      "INSERT INTO email_verification_tokens (user_id, token) VALUES (?, ?)",
      [userId, token]
    );

    await sendVerificationEmail(email, token);

    res.json({ message: "✅ Usuario registrado. Revisa tu correo para verificar la cuenta." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error en el registro" });
  }
});
router.get("/verify", verifyEmail);
router.post("/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const [rows] = await pool.query("SELECT id, verified FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    const user = rows[0];

    if (user.verified) {
      return res.status(400).json({ message: "Este usuario ya está verificado ✅" });
    }

    // Ver si ya hay un token existente
    const [existingToken] = await pool.query(
      "SELECT token FROM email_verification_tokens WHERE user_id = ?",
      [user.id]
    );

    let token;

    if (existingToken.length > 0) {
      token = existingToken[0].token;
    } else {
      token = crypto.randomBytes(32).toString("hex");
      await pool.query(
        "INSERT INTO email_verification_tokens (user_id, token) VALUES (?, ?)",
        [user.id, token]
      );
    }

    await sendVerificationEmail(email, token);

    res.json({ message: "📧 Enviamos nuevamente el correo de verificación." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al reenviar verificación" });
  }
});


export default router;
