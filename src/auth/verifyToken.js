import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretito123";

export const verifyToken = (req, res, next) => {
  // ✅ Deja pasar el preflight CORS
  if (req.method === "OPTIONS") return res.sendStatus(200);

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Falta token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Token inválido:", err.message);
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
};

export async function verifyEmail(req, res) {
  const { token } = req.query;

  const [rows] = await pool.query(
    "SELECT user_id FROM email_verification_tokens WHERE token = ?",
    [token]
  );

  if (rows.length === 0) {
    return res.status(400).json({ message: "Token inválido o expirado" });
  }

  const userId = rows[0].user_id;

  await pool.query("UPDATE users SET verified = true WHERE id = ?", [userId]);
  await pool.query("DELETE FROM email_verification_tokens WHERE user_id = ?", [userId]);

  res.json({ message: "Correo verificado correctamente ✅" });
}
