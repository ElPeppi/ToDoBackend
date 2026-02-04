import express, { type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

import { pool } from "../db";
import { verifyEmail } from "./verifyToken";
import { sendVerificationEmail } from "./email.service";
import { getUserByEmail } from "../users/users.service";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "supersecretito123";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "supersecretito_refresh";

interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  password: string;
  verified: 0 | 1 | boolean;
}

interface EmailTokenRow extends RowDataPacket {
  token: string;
}

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const [rows] = await pool.query<UserRow[]>(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });

    const user = rows[0];

    // MySQL puede traer 0/1
    const isVerified = user.verified === true || user.verified === 1;

    if (!isVerified) {
      // ⚠️ Esto solo funciona en Node 20 si tienes fetch global.
      // En Lambda también hay fetch, pero si algo falla, lo cambiamos a llamar directo a tu función.
      await fetch("http://localhost:4000/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      return res.status(403).json({
        message: "Debes verificar tu correo antes de iniciar sesión, se envio el correo nuevamente",
      });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Contraseña incorrecta" });

    const accessToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "8h" });
    const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: "7d" });
    
    const tasksUser = await getUserByEmail(user.email);
    return res.json({ accessToken, refreshToken, user: { ...user, ...tasksUser } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al iniciar sesión" });
  }
});

router.post("/refresh", (req: Request, res: Response) => {
  const { token } = req.body as { token?: string };
  if (!token) return res.status(401).json({ message: "Falta refresh token" });

  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as { id: number; email?: string };
    const newAccessToken = jwt.sign({ id: decoded.id, email: decoded.email }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.error("Error al refrescar token:", err);
    return res.status(403).json({ message: "Refresh token inválido o expirado" });
  }
});

// CORS preflight para auth
router.options("*", (_req: Request, res: Response) => res.sendStatus(200));

router.get("/check-token", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Falta token" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Falta token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, user: decoded });
  } catch {
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
});

router.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as { name: string; email: string; password: string };

    const [exists] = await pool.query<UserRow[]>("SELECT * FROM users WHERE email = ?", [email]);
    if (exists.length > 0) return res.status(400).json({ message: "Usuario ya existe" });

    const hashed = await bcrypt.hash(password, 10);

    const [result] = await pool.query<ResultSetHeader>(
      "INSERT INTO users (name, email, password, verified) VALUES (?, ?, ?, false)",
      [name, email, hashed]
    );

    const userId = result.insertId;
    const token = crypto.randomBytes(32).toString("hex");

    await pool.query<ResultSetHeader>(
      "INSERT INTO email_verification_tokens (user_id, token) VALUES (?, ?)",
      [userId, token]
    );

    await sendVerificationEmail(email, token);

    return res.json({ message: "✅ Usuario registrado. Revisa tu correo para verificar la cuenta." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error en el registro" });
  }
});

router.get("/verify", verifyEmail);

router.post("/resend-verification", async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };

    const [rows] = await pool.query<UserRow[]>("SELECT id, verified FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    const user = rows[0];
    const isVerified = user.verified === true || user.verified === 1;

    if (isVerified) {
      return res.status(400).json({ message: "Este usuario ya está verificado ✅" });
    }

    const [existingToken] = await pool.query<EmailTokenRow[]>(
      "SELECT token FROM email_verification_tokens WHERE user_id = ?",
      [user.id]
    );

    let token: string;

    if (existingToken.length > 0) {
      token = existingToken[0].token;
    } else {
      token = crypto.randomBytes(32).toString("hex");
      await pool.query<ResultSetHeader>(
        "INSERT INTO email_verification_tokens (user_id, token) VALUES (?, ?)",
        [user.id, token]
      );
    }

    await sendVerificationEmail(email, token);

    return res.json({ message: "📧 Enviamos nuevamente el correo de verificación." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al reenviar verificación" });
  }
});

export default router;
