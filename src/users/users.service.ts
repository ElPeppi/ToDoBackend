import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../db";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import type { ResultSetHeader } from "mysql2/promise";
export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  photo: string | null;
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
    WHERE creator_id = ?
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



const REGION = process.env.AWS_REGION || "us-east-1";
const PHOTO_LAMBDA = process.env.PROFILE_PHOTO_LAMBDA_NAME; // nombre o ARN

if (!PHOTO_LAMBDA) {
  throw new Error("Missing env PROFILE_PHOTO_LAMBDA_NAME");
}

const lambda = new LambdaClient({ region: REGION });

export async function getUploadUrlFromLambda(input: { userId: number; contentType: string }) {
  // Esto depende de cómo espera el event tu lambda `todo-getProfilePhotoUploadUrl`.
  // Como tú la probaste con un event que simulaba API Gateway + authorizer,
  // te conviene invocarla enviando headers/authorizer.

  const payload = {
    headers: {
      origin: "https://todo.jan-productions.com", // opcional, o req.headers.origin si lo pasas
    },
    requestContext: {
      http: { method: "POST" },
      authorizer: {
        jwt: {
          claims: { sub: String(input.userId) }, // <- aquí viaja el userId para que no salga "unknown"
        },
      },
    },
    body: JSON.stringify({ contentType: input.contentType }),
    isBase64Encoded: false,
  };

  const cmd = new InvokeCommand({
    FunctionName: PHOTO_LAMBDA,
    InvocationType: "RequestResponse",
    Payload: Buffer.from(JSON.stringify(payload)),
  });

  const resp = await lambda.send(cmd);
  const raw = resp.Payload ? Buffer.from(resp.Payload).toString("utf-8") : "";

  // Tu lambda probablemente retorna { statusCode, headers, body: "json-string" }
  const parsed = raw ? JSON.parse(raw) : null;

  if (!parsed) throw new Error("Lambda returned empty payload");

  // Si viene estilo API Gateway:
  if (parsed.statusCode && parsed.body) {
    if (parsed.statusCode >= 400) {
      throw new Error(`Photo lambda error: ${parsed.statusCode} ${parsed.body}`);
    }
    return typeof parsed.body === "string" ? JSON.parse(parsed.body) : parsed.body;
  }

  // Si viene directo:
  return parsed;
}

export async function updateMyPhoto(input: { userId: number; photoUrl?: string; key?: string }) {
  // Decide qué guardas en DB:
  // - lo más práctico: guardar photoUrl final (S3/CloudFront)
  // - alternativo: guardar solo key
  const value = input.photoUrl ?? input.key ?? null;
  if (!value) throw new Error("No photo para guardar");

  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE users SET photo = ? WHERE id = ?",
    [value, input.userId]
  );

  return { ok: result.affectedRows > 0, photo: value };
}