import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  validateProjectInput,
  getUserProjects,
} from "@/lib/profile-details";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("user_id");

    let userId: string;

    if (targetUserId && targetUserId.trim()) {
      userId = targetUserId.trim();
    } else {
      const authUser = await getAuthenticatedUser(request);
      if (!authUser) {
        return NextResponse.json(
          { success: false, message: "Unauthorized. Silakan masuk terlebih dahulu." },
          { status: 401 },
        );
      }
      userId = authUser.id;
    }

    const projects = await getUserProjects(userId);
    return NextResponse.json({ success: true, data: projects }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/profile/projects Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data proyek." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Silakan masuk terlebih dahulu." },
        { status: 401 },
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

    const recordId = crypto.randomUUID();
    const { title, category, description, technologies, project_url } = validation.data;

    await db.query(
      `INSERT INTO projects (id, user_id, title, category, description, technologies, project_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        authUser.id,
        title,
        category,
        description,
        JSON.stringify(technologies),
        project_url,
      ],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Proyek berhasil ditambahkan.",
        data: {
          id: recordId,
          user_id: authUser.id,
          title,
          category,
          description,
          technologies,
          project_url,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[POST /api/profile/projects Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan data proyek." },
      { status: 500 },
    );
  }
}
