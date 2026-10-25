import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import {
  validateAchievementInput,
  getUserAchievements,
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

    const achievements = await getUserAchievements(userId);
    return NextResponse.json({ success: true, data: achievements }, { status: 200 });
  } catch (error: unknown) {
    console.error("[GET /api/profile/achievements Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memuat data prestasi." },
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
    const validation = validateAchievementInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 },
      );
    }

    const recordId = crypto.randomUUID();
    const { competition_name, achievement_title, category, year, description, proof_url } =
      validation.data;

    await db.query(
      `INSERT INTO achievements (id, user_id, competition_name, achievement_title, category, year, description, proof_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        authUser.id,
        competition_name,
        achievement_title,
        category,
        year,
        description,
        proof_url,
      ],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Prestasi berhasil ditambahkan.",
        data: {
          id: recordId,
          user_id: authUser.id,
          competition_name,
          achievement_title,
          category,
          year,
          description,
          proof_url,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[POST /api/profile/achievements Error]:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menambahkan data prestasi." },
      { status: 500 },
    );
  }
}
