import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "../db";

export interface MemberRow extends RowDataPacket {
    id: number;
    name: string;
    email: string;
}

export interface TaskRow extends RowDataPacket {
    id: number;
    title: string;
    description: string | null;
    creator_id: number;
    dueDate: string | null;
    group_id: number | null;
    status: string;
    creator_name?: string;
    members?: MemberRow[];
}

export const getAllTasks = async (userId: number): Promise<TaskRow[]> => {
    const [rows] = await pool.query<TaskRow[]>(
        `SELECT DISTINCT t.*
     FROM tasks t
     LEFT JOIN task_colaborators ct ON t.id = ct.task_id
     LEFT JOIN group_members mg ON t.group_id = mg.group_id
     WHERE t.creator_id = ?
        OR ct.user_id = ?
        OR mg.user_id = ?;`,
        [userId, userId, userId]
    );

    for (const row of rows) {
        const [creator] = await pool.query<RowDataPacket[]>(
            `SELECT name FROM users WHERE id = ?`,
            [row.creator_id]
        );
        row.creator_name = (creator[0] as any)?.name;

        const [collaborators] = await pool.query<MemberRow[]>(
            `SELECT u.id, u.name, u.email
       FROM users u
       JOIN task_colaborators tc ON u.id = tc.user_id
       WHERE tc.task_id = ?`,
            [row.id]
        );
        row.members = collaborators;
    }

    return rows;
};

export const getTaskById = async (taskId: number): Promise<TaskRow | undefined> => {
    const [rows] = await pool.query<TaskRow[]>(
        "SELECT * FROM tasks WHERE id = ?",
        [taskId]
    );


    const task = rows[0];
    if (!task) return undefined;

    const [creator] = await pool.query<RowDataPacket[]>(
        `SELECT name FROM users WHERE id = ?`,
        [task.creator_id]
    );
    task.creator_name = (creator[0] as any)?.name;

    const [collaborators] = await pool.query<MemberRow[]>(
        `SELECT u.id, u.name, u.email
   FROM users u
   JOIN task_colaborators tc ON u.id = tc.user_id
   WHERE tc.task_id = ?`,
        [task.id]
    );

    task.members = collaborators;


    return task;
};

export const addTask = async (
    title: string,
    description: string | null,
    creatorId: number,
    dueDate: string | null,
    groupId: number | null,
    collaboratorIds: number[],
    priority: string | null
): Promise<number> => {
    const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO tasks (title, description, creator_id, dueDate, group_id, status, priority)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        [title, description, creatorId, dueDate, groupId, priority]
    );
    console.log("COLABORATOR IDS:", collaboratorIds);
    for (const colabId of collaboratorIds) {
        await pool.query(
            `INSERT INTO task_colaborators (task_id, user_id)
       VALUES (?, ?)`,
            [result.insertId, colabId]
        );
    }

    return result.insertId;
};

export const updateTask = async (
    id: number,
    data: {
        title?: string;
        description?: string | null;
        dueDate?: string | null;
        status?: string;
        groupId?: number | null;
        collaboratorIds?: number[];
        priority?: string | null;
    }
): Promise<void> => {
    const { title, description, dueDate, status, groupId, collaboratorIds, priority } = data;

    await pool.query(
        `UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        dueDate = COALESCE(?, dueDate),
        status = COALESCE(?, status),
        group_id = COALESCE(?, group_id),
        priority = COALESCE(?, priority)
     WHERE id = ?`,
        [title ?? null, description ?? null, dueDate ?? null, status ?? null, groupId ?? null, id]
    );

    if (Array.isArray(collaboratorIds)) {
        await pool.query(`DELETE FROM task_colaborators WHERE task_id = ?`, [id]);

        for (const colabId of collaboratorIds) {
            await pool.query(
                `INSERT INTO task_colaborators (task_id, user_id)
         VALUES (?, ?)`,
                [id, colabId]
            );
        }
    }
};

export const deleteTask = async (id: number): Promise<void> => {
    await pool.query(`DELETE FROM task_colaborators WHERE task_id = ?`, [id]);
    await pool.query(`DELETE FROM tasks WHERE id = ?`, [id]);
};
