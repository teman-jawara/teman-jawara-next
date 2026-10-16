
import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface ConnectionRow extends RowDataPacket {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);

    const [profileRows] = await db.query<RowDataPacket[]>(
      "SELECT user_id FROM profiles WHERE user_id = ? LIMIT 1",
      [id],
    );

    if (!profileRows.length) {
      return NextResponse.json(
        { success: false, message: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }

    const [countRows] = await db.query<CountRow[]>(
      `SELECT COUNT(*) AS total
       FROM connections
       WHERE status = 'accepted'
       AND (requester_id = ? OR receiver_id = ?)`,
      [id, id],
    );

    let relationship = null;

    if (user && user.id !== id) {
      const [rows] = await db.query<ConnectionRow[]>(
        `SELECT id, requester_id, receiver_id, status
         FROM connections
         WHERE (requester_id = ? AND receiver_id = ?)
            OR (requester_id = ? AND receiver_id = ?)
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.id, id, id, user.id],
      );

      relationship = rows[0] ?? null;
    }

    return NextResponse.json({
      success: true,
      connectionCount: Number(countRows[0]?.total ?? 0),
      status: relationship?.status ?? null,
      isConnected: relationship?.status === "accepted",
      isRequester: relationship?.requester_id === user?.id,
      isOwnProfile: user?.id === id,
    });
  } catch (error) {
    console.error("[GET connection]", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data koneksi." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    if (user.id === id) {
      return NextResponse.json(
        { success: false, message: "Tidak bisa connect ke diri sendiri." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (!["connect", "accept", "reject", "remove"].includes(action)) {
      return NextResponse.json(
        { success: false, message: "Aksi koneksi tidak valid." },
        { status: 400 },
      );
    }

    const [profileRows] = await db.query<RowDataPacket[]>(
      "SELECT user_id FROM profiles WHERE user_id = ? LIMIT 1",
      [id],
    );

    if (!profileRows.length) {
      return NextResponse.json(
        { success: false, message: "Profil tidak ditemukan." },
        { status: 404 },
      );
    }

    const [rows] = await db.query<ConnectionRow[]>(
      `SELECT id, requester_id, receiver_id, status
       FROM connections
       WHERE (requester_id = ? AND receiver_id = ?)
          OR (requester_id = ? AND receiver_id = ?)
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, id, id, user.id],
    );

    const connection = rows[0];

    if (action === "connect") {
      if (connection?.status === "accepted") {
        return NextResponse.json({ success: true, status: "accepted" });
      }

      if (connection?.status === "pending") {
        return NextResponse.json({ success: true, status: "pending" });
      }

      if (connection) {
        await db.query(
          `UPDATE connections
           SET requester_id = ?, receiver_id = ?, status = 'pending'
           WHERE id = ?`,
          [user.id, id, connection.id],
        );
      } else {
        await db.query(
          `INSERT INTO connections
           (id, requester_id, receiver_id, status)
           VALUES (?, ?, ?, 'pending')`,
          [crypto.randomUUID(), user.id, id],
        );
      }

      return NextResponse.json({ success: true, status: "pending" });
    }

    if (action === "accept" || action === "reject") {
      if (
        !connection ||
        connection.requester_id !== id ||
        connection.receiver_id !== user.id ||
        connection.status !== "pending"
      ) {
        return NextResponse.json(
          { success: false, message: "Permintaan koneksi tidak ditemukan." },
          { status: 404 },
        );
      }

      const status = action === "accept" ? "accepted" : "rejected";

      await db.query(
        "UPDATE connections SET status = ? WHERE id = ?",
        [status, connection.id],
      );

      return NextResponse.json({ success: true, status });
    }

    if (!connection || connection.status !== "accepted") {
      return NextResponse.json(
        { success: false, message: "Koneksi tidak ditemukan." },
        { status: 404 },
      );
    }

    await db.query(
      "DELETE FROM connections WHERE id = ?",
      [connection.id],
    );

    return NextResponse.json({ success: true, status: null });
  } catch (error) {
    console.error("[POST connection]", error);

    return NextResponse.json(
      { success: false, message: "Gagal memproses koneksi." },
      { status: 500 },
    );
  }
}
