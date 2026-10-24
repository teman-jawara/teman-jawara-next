
import mysql from "mysql2/promise";

// Preserve the connection pool during Next.js development hot reloads.
const globalForDb = globalThis as unknown as {
  dbPool?: mysql.Pool;
};

// Aiven CA certificate supplied through the DB_SSL_CA environment variable.
const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");

export const db =
  globalForDb.dbPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // Verify the Aiven server certificate over TLS.
    ssl: {
      ca: sslCa,
      rejectUnauthorized: true,
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = db;
}
