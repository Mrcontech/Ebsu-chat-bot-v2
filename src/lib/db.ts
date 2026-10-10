import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

/**
 * One shared MySQL connection pool for the whole app.
 * Defaults match XAMPP: host 127.0.0.1, port 3306, user root, empty password.
 * Override any of them in a .env file (see .env.example).
 */
export const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME || "ebsu_chatbot",
};

const globalForDb = globalThis as unknown as { ebsuPool?: Pool };

export function pool(): Pool {
  if (!globalForDb.ebsuPool) {
    globalForDb.ebsuPool = mysql.createPool({
      ...dbConfig,
      connectionLimit: 8,
      charset: "utf8mb4",
      dateStrings: true,
      decimalNumbers: true,
    });
  }
  return globalForDb.ebsuPool;
}

/** Run a SELECT and get typed rows back. */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool().query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

/** Run an INSERT, UPDATE or DELETE. */
export async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [result] = await pool().execute<ResultSetHeader>(sql, params as never[]);
  return result;
}

/** True when the error means MySQL is not running or the database is missing. */
export function isConnectionError(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return ["ECONNREFUSED", "ER_BAD_DB_ERROR", "ER_ACCESS_DENIED_ERROR", "ETIMEDOUT", "ENOTFOUND", "PROTOCOL_CONNECTION_LOST"].includes(code ?? "");
}
