import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Query MySQL to list all tables in the connected database
    const [rows] = await db.query<RowDataPacket[]>("SHOW TABLES");

    // Extract table names from query result rows
    const tables = rows.map((row) => String(Object.values(row)[0]));

    return NextResponse.json(
      {
        success: true,
        message: "Successfully connected to MySQL database",
        database: process.env.DB_NAME || "teman_jawara",
        tableCount: tables.length,
        tables,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    // Log full error details securely on the server console for debugging
    console.error("[Database Connection Error]:", error);

    // Return sanitized error response without exposing credentials or internal traces
    const errorCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "DATABASE_CONNECTION_ERROR";

    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect to MySQL database",
        code: errorCode,
      },
      { status: 500 }
    );
  }
}