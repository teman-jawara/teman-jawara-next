import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  validateProjectInput,
  mapRowToProject,
} from "@/lib/profile-details";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM projects WHERE id = ? LIMIT 1",
      [id],
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data proyek tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: true, data: mapRowToProject(rows[0]) },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[GET /api/profile/projects/[id] Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data proyek." },
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
      "SELECT user_id FROM projects WHERE id = ? LIMIT 1",
      [id],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data proyek tidak ditemukan." },
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
    const validation = validateProjectInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 },
      );
    }

    const { title, category, description, technologies, project_url } = validation.data;

    await db.query(
      `UPDATE projects SET
        title = ?,
        category = ?,
        description = ?,
        technologies = ?,
        project_url = ?
       WHERE id = ? AND user_id = ?`,
      [
        title,
        category,
        description,
        JSON.stringify(technologies),
        project_url,
        id,
        authUser.id,
      ],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Proyek berhasil diperbarui.",
        data: {
          id,
          user_id: authUser.id,
          title,
          category,
          description,
          technologies,
          project_url,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[PUT /api/profile/projects/[id] Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memperbarui data proyek." },
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
      "SELECT user_id FROM projects WHERE id = ? LIMIT 1",
      [id],
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, message: "Data proyek tidak ditemukan." },
        { status: 404 },
      );
    }

    if (existing[0].user_id !== authUser.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden. Kamu tidak memiliki izin untuk menghapus data ini." },
        { status: 403 },
      );
    }

    await db.query("DELETE FROM projects WHERE id = ? AND user_id = ?", [
      id,
      authUser.id,
    ]);

    return NextResponse.json(
      { success: true, message: "Proyek berhasil dihapus." },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[DELETE /api/profile/projects/[id] Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menghapus data proyek." },
      { status: 500 },
    );
  }
}
