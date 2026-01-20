import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretito123";

type JwtPayload = {
  id: number;
  email?: string;
  iat?: number;
  exp?: number;
};

interface EmailTokenRow extends RowDataPacket {
  user_id: number;
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  // ✅ Deja pasar preflight
  if (req.method === "OPTIONS") return res.sendStatus(200);

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Falta token" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Falta token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Guardamos solo lo que usas
    req.user = { id: decoded.id, email: decoded.email };
    return next();
  } catch (err: any) {
    console.error("Token inválido:", err?.message);
    return res.status(403).json({ message: "Token inválido o expirado" });
  }
};

export async function verifyEmail(req: Request, res: Response) {
  const token = String(req.query.token ?? "");
  if (!token) return res.status(400).json({ message: "Falta token" });

  const [rows] = await pool.query<EmailTokenRow[]>(
    "SELECT user_id FROM email_verification_tokens WHERE token = ?",
    [token]
  );

  if (rows.length === 0) {
    return res.status(400).json({ message: "Token inválido o expirado" });
  }

  const userId = rows[0].user_id;

  await pool.query<ResultSetHeader>("UPDATE users SET verified = true WHERE id = ?", [userId]);
  await pool.query<ResultSetHeader>("DELETE FROM email_verification_tokens WHERE user_id = ?", [userId]);

  return res.json({ message: "Correo verificado correctamente ✅" });
}
