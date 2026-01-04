import { pool } from "../db.js";

export const getAllMyGroups = async (userId) => {
const [rows] = await pool.query(
  "SELECT id, name, creator_id FROM `groups` WHERE creator_id = ? OR id IN (SELECT group_id FROM group_members WHERE user_id = ?)",
  [userId, userId]
);
console.log("creator groups:", rows);

  return rows;
};


export const createGroup = async (name, description, creatorId, members) => {
    const [result] = await pool.query(
        `INSERT INTO  \`groups\` (name, description, creator_id)
       VALUES (?, ?, ?)
       `,
        [name, description, creatorId]
    );
    const groupId = result.insertId;

    // Agregar el creador como miembro del grupo
    await pool.query(
        `INSERT INTO group_members (group_id, user_id)
       VALUES (?, ?)`,
        [groupId, creatorId]
    );
    // Agregar otros miembros al grupo
    for (const memberId of members) {
        await pool.query(
            `INSERT INTO group_members (group_id, user_id)
                VALUES (?, ?)`,
            [groupId, memberId]
        );
    }
    return groupId;
};

export const addGroupMember = async (groupId, userId) => {
    await pool.query(
        `INSERT INTO group_members (group_id, user_id)
         VALUES (?, ?)`,
        [groupId, userId]
    );
};
export const removeGroupMember = async (groupId, userId) => {
    await pool.query(
        `DELETE FROM group_members
            WHERE group_id = ? AND user_id = ?`,
        [groupId, userId]
    );
};

export const deleteGroup = async (groupId) => {
    await pool.query("DELETE FROM group_members WHERE group_id = ?", [groupId]);
    await pool.query("DELETE FROM  \`groups\` WHERE id = ?", [groupId]);
};

export const getGroupById = async (groupId) => {
    const [rows] = await pool.query("SELECT * FROM  \`groups\` WHERE id = ?", [groupId]);
    return rows[0];
};
export const updateGroupTransaction = async (groupId, name, description, members) => {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Actualizar grupo
    const [upd] = await conn.query(
      `UPDATE  \`groups\`
       SET name = COALESCE(?, name),
           description = COALESCE(?, description)
       WHERE id = ?`,
      [name ?? null, description ?? null, groupId]
    );

    if (upd.affectedRows === 0) {
      throw new Error("Grupo no encontrado");
    }
    // 2) Validación mínima (opcional pero recomendado)
    if (!Array.isArray(members) || members.length === 0) {
      throw new Error("El grupo no puede quedar sin miembros");
    }

    // 3) Borrar miembros actuales
    await conn.query(`DELETE FROM group_members WHERE group_id = ?`, [groupId]);

    // 4) Insertar miembros nuevos
    const values = members.map((m) => {
      if (typeof m === "number") return [groupId, m, "member"];
      return [groupId, m.userId, m.rol ?? "member"];
    });

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

export const getGroupMembers = async (groupId) => {
    const [rows] = await pool.query(
        `SELECT u.id, u.username, u.email
         FROM users u
            JOIN group_members mg ON u.id = mg.user_id
            WHERE mg.group_id = ?`,
        [groupId]
    );
    return rows;
}

