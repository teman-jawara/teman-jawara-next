import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  validateAchievementInput,
  mapRowToAchievement,
} from "@/lib/profile-details";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM achievements WHERE id = ? LIMIT 1",
      [id],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data prestasi tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: mapRowToAchievement(rows[0]) },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[GET /api/profile/achievements/[id] Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data prestasi." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT user_id FROM achievements WHERE id = ? LIMIT 1",
      [id],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data prestasi tidak ditemukan." },
        { status: 404 },
      );
    }

    if (existing[0].user_id !== authUser.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden. Kamu tidak memiliki izin untuk mengubah data ini." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const validation = validateAchievementInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 },
      );
    }

    const { competition_name, achievement_title, category, year, description, proof_url } =
      validation.data;

    await db.query(
      `UPDATE achievements SET
        competition_name = ?,
        achievement_title = ?,
        category = ?,
        year = ?,
        description = ?,
        proof_url = ?
       WHERE id = ? AND user_id = ?`,
      [
        competition_name,
        achievement_title,
        category,
        year,
        description,
        proof_url,
        id,
        authUser.id,
      ],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Prestasi berhasil diperbarui.",
        data: {
          id,
          user_id: authUser.id,
          competition_name,
          achievement_title,
          category,
          year,
          description,
          proof_url,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[PUT /api/profile/achievements/[id] Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data prestasi." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const { id } = await params;

    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT user_id FROM achievements WHERE id = ? LIMIT 1",
      [id],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data prestasi tidak ditemukan." },
        { status: 404 },
      );
    }

    if (existing[0].user_id !== authUser.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden. Kamu tidak memiliki izin untuk menghapus data ini." },
        { status: 403 },
      );
    }

    await db.query("DELETE FROM achievements WHERE id = ? AND user_id = ?", [
      id,
      authUser.id,
    ]);

    return NextResponse.json(
      { success: true, message: "Prestasi berhasil dihapus." },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[DELETE /api/profile/achievements/[id] Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus data prestasi." },
      { status: 500 },
    );
  }
}
