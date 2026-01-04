import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Solo carga .env en local (Lambda ya recibe env vars por serverless)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
} = process.env;

// Si falta algo, falla con mensaje claro (en vez de irse a localhost)
for (const [key, val] of Object.entries({ DB_HOST, DB_USER, DB_PASSWORD, DB_NAME })) {
  if (!val) throw new Error(`${key} is missing`);
}

export const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: Number(DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // SSL: depende de tu configuración RDS, pero esto suele funcionar:
  ssl: { rejectUnauthorized: false },
});
