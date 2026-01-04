import { pool } from "../db.js";

export const getAllTasks = async (userId) => {
  const [rows] = await pool.query(`SELECT DISTINCT t.*
      FROM tasks t
      LEFT JOIN task_colaborators ct ON t.id = ct.task_id
      LEFT JOIN group_members mg ON t.group_id = mg.group_id
      WHERE 
          t.creator_id = ? 
          OR ct.user_id = ? 
          OR mg.user_id = ?;`, [userId, userId, userId]);
    for (const row of rows) {
      const[creator] =await pool.query(`SELECT name FROM users WHERE id = ?`, [row.creator_id])
      row.creator_name = creator[0].name;
    }
  return rows;
};

export const getTaskById = async (taskId) => {
  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [taskId]);
  return rows[0];
};

export const addatask = async (title, description, creatorId, dueDate, groupId, colabs) => {
  
  const [result] = await pool.query(
    `INSERT INTO tasks (title, description, creator_id, dueDate, group_id, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
    [title, description, creatorId, dueDate, groupId || null]
  ); 

  for (const colabId of (colabs || [])) {
    await pool.query(
      `INSERT INTO task_colaborators (task_id, user_id)
          VALUES (?, ?)`,
      [result.insertId, colabId]
    );
  }

  return result.insertId;
};

export const updatetask = async (id, title, description, dueDate, estado) => {
  await pool.query(
    `UPDATE tasks SET 
         title = COALESCE(?, title),
         description = COALESCE(?, description),
         due_date = COALESCE(?, due_date),
         status = COALESCE(?, status)
       WHERE id = ?`,
    [title, description, dueDate, estado, id]
  );
}

export const deleteTask = async (id) => {

  await pool.query("DELETE FROM task_colaborators WHERE task_id = ?", [id]);

  await pool.query("DELETE FROM tasks WHERE id = ?", [id]);


};
