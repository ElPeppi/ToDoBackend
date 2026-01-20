import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db";

export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
}

export type UserMini = Pick<UserRow, "id" | "name" | "email">;

export const getUserByEmail = async (email: string): Promise<UserRow | undefined> => {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );
  return rows[0];
};

export const getUserByName = async (name: string): Promise<UserRow | undefined> => {
  const [rows] = await pool.query<UserRow[]>(
    "SELECT * FROM users WHERE name = ?",
    [name]
  );
  return rows[0];
};

export const getUserForGroup = async (startsWith: string): Promise<UserRow[]> => {
  const q = `${startsWith}%`;
  const [rows] = await pool.query<UserRow[]>(
    `SELECT id, name, email
     FROM users
     WHERE name LIKE ? OR email LIKE ?
     LIMIT 200`,
    [q, q]
  );
  return rows;
};

export const updateUser = async (
  id: number,
  data: { username?: string; email?: string }
): Promise<void> => {
  const { username, email } = data;

  await pool.query(
    `UPDATE users SET
        username = COALESCE(?, username),
        email = COALESCE(?, email)
     WHERE id = ?`,
    [username ?? null, email ?? null, id]
  );
};
