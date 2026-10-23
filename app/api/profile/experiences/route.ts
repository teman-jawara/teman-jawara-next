import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  validateExperienceInput,
  getUserExperiences,
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

    const experiences = await getUserExperiences(userId);
    return NextResponse.json({ success: true, data: experiences }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/profile/experiences Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data pengalaman." },
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
    const validation = validateExperienceInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 },
      );
    }

    const recordId = crypto.randomUUID();
    const {
      role,
      organization_or_project,
      category,
      description,
      technologies,
      start_date,
      end_date,
    } = validation.data;

    await db.query(
      `INSERT INTO experiences (id, user_id, role, organization_or_project, category, description, technologies, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        authUser.id,
        role,
        organization_or_project,
        category,
        description,
        JSON.stringify(technologies),
        start_date,
        end_date,
      ],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Pengalaman berhasil ditambahkan.",
        data: {
          id: recordId,
          user_id: authUser.id,
          role,
          organization_or_project,
          category,
          description,
          technologies,
          start_date,
          end_date,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[POST /api/profile/experiences Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan data pengalaman." },
      { status: 500 },
    );
  }
}
