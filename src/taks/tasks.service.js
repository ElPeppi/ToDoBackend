import {pool} from "../db.js";

export const getAllTasks = async (userId) => {
    const [rows] = await pool.query(`SELECT DISTINCT t.*
      FROM tareas t
      LEFT JOIN colaboradores_tareas ct ON t.id = ct.tarea_id
      LEFT JOIN miembros_grupo mg ON t.grupo_id = mg.grupo_id
      WHERE 
          t.creador_id = ? 
          OR ct.usuario_id = ? 
          OR mg.usuario_id = ?;`,[userId, userId, userId]);

    return rows;
};

export const addatask = async (title, description, creatorId, dueDate, groupId) => {
    const [result] = await pool.query(
      `INSERT INTO tareas (titulo, descripcion, creador_id, fecha_vencimiento, grupo_id, estado)
       VALUES (?, ?, ?, ?, ?, 'pendiente')`,
      [title, description, creatorId, dueDate, groupId || null]
    );

    return result;
};

export const updatetask = async (id, title, description, dueDate, estado) => {
    await pool.query(
      `UPDATE tareas SET 
         titulo = COALESCE(?, titulo),
         descripcion = COALESCE(?, descripcion),
         fecha_vencimiento = COALESCE(?, fecha_vencimiento),
         estado = COALESCE(?, estado)
       WHERE id = ?`,
      [title, description, dueDate, estado, id]
    );
}

export const deleteTask = async (id) => {
    
    await pool.query("DELETE FROM colaboradores_tareas WHERE tarea_id = ?", [id]);

    await pool.query("DELETE FROM tareas WHERE id = ?", [id]);

    
};
