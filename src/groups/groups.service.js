import {pool} from "../db.js";

export const getAllMyGroups = async (userId) => {
    const [rows] = await pool.query(
      `SELECT FROM grupos g
       JOIN miembros_grupo mg ON g.id = mg.grupo_id
       WHERE mg.usuario_id = ?`, 
        [userId]
    );

    return rows;
};

export const createGroup = async (name, description, creatorId, members) => {
    const [result] = await pool.query(
      `INSERT INTO grupos (nombre, descripcion, creador_id)
       VALUES (?, ?, ?)
       `,
      [name, description, creatorId]
    );
    const groupId = result.insertId;

    // Agregar el creador como miembro del grupo
    await pool.query(
      `INSERT INTO miembros_grupo (grupo_id, usuario_id)
       VALUES (?, ?)`,
      [groupId, creatorId]
    );
    // Agregar otros miembros al grupo
    for (const memberId of members) {
        await pool.query(  
            `INSERT INTO miembros_grupo (grupo_id, usuario_id)
                VALUES (?, ?)`,
            [groupId, memberId]
        );
    }
    return groupId;
};

export const addGroupMember = async (groupId, userId) => {
    await pool.query(
      `INSERT INTO miembros_grupo (grupo_id, usuario_id)
         VALUES (?, ?)`,
        [groupId, userId]
    );
};
export const removeGroupMember = async (groupId, userId) => {
    await pool.query(
      `DELETE FROM miembros_grupo
            WHERE grupo_id = ? AND usuario_id = ?`,
        [groupId, userId]
    );
};

export const deleteGroup = async (groupId) => {
    await pool.query("DELETE FROM miembros_grupo WHERE grupo_id = ?", [groupId]);
    await pool.query("DELETE FROM grupos WHERE id = ?", [groupId]);
};

export const getGroupById = async (groupId) => {
    const [rows] = await pool.query("SELECT * FROM grupos WHERE id = ?", [groupId]);
    return rows[0];
};
export const updateGroup = async (groupId, name, description) => {
    await pool.query(
      `UPDATE grupos SET
            nombre = COALESCE(?, nombre),
            descripcion = COALESCE(?, descripcion)
        WHERE id = ?`,
        [name, description, groupId]
    );
};

export const getGroupMembers = async (groupId) => {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.email
         FROM usuarios u
            JOIN miembros_grupo mg ON u.id = mg.usuario_id
            WHERE mg.grupo_id = ?`,
        [groupId]
    );
    return rows;
}

