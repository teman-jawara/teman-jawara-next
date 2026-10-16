import mysql from "mysql2/promise";

// Preserve pool across hot reloads in Next.js development
const globalForDb = globalThis as unknown as {
  dbPool?: mysql.Pool;
};

export const db =
  globalForDb.dbPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = db;
}