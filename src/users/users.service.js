import {pool} from '../db.js';

export const getUserByEmail = async (email) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
}

export const getUserByName = async (email) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
    return rows[0];
}

export const updateUser = async ( username, email) => {
    await pool.query(
        `UPDATE users SET
            username = COALESCE(?, username),
            email = COALESCE(?, email)`,
        [username, email]
    );
}

export const getUserForGroup = async (startsWith) => {
    const [rows] = await pool.query(
    `SELECT id, name, email 
     FROM users 
     WHERE name LIKE ? OR email LIKE ? 
     LIMIT 200`,
    [`${startsWith}%`, `${startsWith}%`]
  );
    return rows;
}