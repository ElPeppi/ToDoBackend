import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db";

export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
}

export type UserMini = Pick<UserRow, "id" | "name" | "email">;

export const getUserByEmail = async (email: string) => {
  const [users]: any = await pool.query(
    "SELECT id, name, email, photo FROM users WHERE email = ?",
    [email]
  );

  if (users.length === 0) return null;

  const user = users[0];

  // 🔥 Estadísticas de tareas
  const [stats]: any = await pool.query(
    `
    SELECT 
      COUNT(*) AS totalTasks,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedTasks
    FROM tasks
    WHERE createdBy = ?
    `,
    [user.id]
  );

  const total = stats[0].totalTasks || 0;
  const completed = stats[0].completedTasks || 0;
  const pending = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    ...user,
    tasks: total,
    completedTasks: completed,
    pendingTasks: pending,
    completionRate: rate,
  };
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
