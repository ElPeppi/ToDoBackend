import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../db";

export interface GroupRow extends RowDataPacket {
  id: number;
  name: string;
  creator_id: number;
  description?: string | null;
}

export interface GroupMemberUserRow extends RowDataPacket {
  id: number;
  username: string;
  email: string;
}

export interface GroupMemberIdRow extends RowDataPacket {
  user_id: number;
}

export type GroupMemberInput =
  | number
  | { userId: number; rol?: string | null };

export const getAllMyGroups = async (userId: number): Promise<GroupRow[]> => {
  const [rows] = await pool.query<GroupRow[]>(
    "SELECT id, name, creator_id FROM `groups` WHERE creator_id = ? OR id IN (SELECT group_id FROM group_members WHERE user_id = ?)",
    [userId, userId]
  );
  return rows;
};

export const getGroupMembers = async (groupId: number): Promise<GroupMemberUserRow[]> => {
  const [rows] = await pool.query<GroupMemberUserRow[]>(
    `SELECT u.id, u.username, u.email
     FROM users u
     JOIN group_members mg ON u.id = mg.user_id
     WHERE mg.group_id = ?`,
    [groupId]
  );
  return rows;
};

// ✅ Para lógica (notificaciones, permisos, etc.)
export const getGroupMemberIds = async (groupId: number): Promise<number[]> => {
  const [rows] = await pool.query<GroupMemberIdRow[]>(
    `SELECT user_id FROM group_members WHERE group_id = ?`,
    [groupId]
  );
  return rows.map(r => r.user_id);
};

export const getGroupById = async (groupId: number): Promise<GroupRow | undefined> => {
  const [rows] = await pool.query<GroupRow[]>(
    "SELECT * FROM `groups` WHERE id = ?",
    [groupId]
  );
  return rows[0];
};

export const getAllTasksGroupIds = async (groupId: number): Promise<number[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT t.group_id
      FROM tasks t
      JOIN task_colaborators tc ON t.id = tc.task_id
      WHERE tc.user_id = ? AND t.group_id IS NOT NULL`,
    [groupId]
  );
  return rows.map(r => r.group_id);
}


export const getAllTasksInGroup = async (groupId: number): Promise<any[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT t.*
     FROM tasks t
     WHERE t.group_id = ?`,
    [groupId]
  );

  return rows ;
};


export const createGroup = async (
  name: string,
  description: string | null,
  creatorId: number,
  members: number[]
): Promise<number> => {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO \`groups\` (name, description, creator_id)
     VALUES (?, ?, ?)`,
    [name, description, creatorId]
  );

  const groupId = result.insertId;

  // creador como miembro
  await pool.query(
    `INSERT INTO group_members (group_id, user_id)
     VALUES (?, ?)`,
    [groupId, creatorId]
  );

  for (const memberId of members) {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES (?, ?)`,
      [groupId, memberId]
    );
  }

  return groupId;
};

export const addGroupMember = async (groupId: number, userId: number): Promise<void> => {
  await pool.query(
    `INSERT INTO group_members (group_id, user_id)
     VALUES (?, ?)`,
    [groupId, userId]
  );
};

export const removeGroupMember = async (groupId: number, userId: number): Promise<void> => {
  await pool.query(
    `DELETE FROM group_members
     WHERE group_id = ? AND user_id = ?`,
    [groupId, userId]
  );
};

export const deleteGroup = async (groupId: number): Promise<void> => {
  await pool.query("DELETE FROM group_members WHERE group_id = ?", [groupId]);
  await pool.query("DELETE FROM `groups` WHERE id = ?", [groupId]);
};

export const updateGroupTransaction = async (
  groupId: number,
  name: string | null | undefined,
  description: string | null | undefined,
  members: GroupMemberInput[]
): Promise<{ ok: true }> => {
  const conn: PoolConnection = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [upd] = await conn.query<ResultSetHeader>(
      `UPDATE \`groups\`
       SET name = COALESCE(?, name),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [name ?? null, description ?? null, groupId]
    );

    if (upd.affectedRows === 0) throw new Error("Grupo no encontrado");

    if (!Array.isArray(members) || members.length === 0) {
      throw new Error("El grupo no puede quedar sin miembros");
    }

    await conn.query(`DELETE FROM group_members WHERE group_id = ?`, [groupId]);

    // Valores: [group_id, user_id, rol]
    const values: Array<[number, number, string]> = members.map((m) => {
      if (typeof m === "number") return [groupId, m, "member"];
      return [groupId, m.userId, (m.rol ?? "member") || "member"];
    });

    // mysql2 permite VALUES ? con array de arrays
    await conn.query(
      `INSERT INTO group_members (group_id, user_id, rol) VALUES ?`,
      [values]
    );

    await conn.commit();
    return { ok: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};
