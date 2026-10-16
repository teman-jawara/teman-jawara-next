import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Payload tidak valid." },
        { status: 400 },
      );
    }

    const fullName = String(body.full_name || "").trim();
    const nim = body.nim ? String(body.nim).trim() : null;
    const faculty = body.faculty ? String(body.faculty).trim() : null;
    const studyProgram = body.study_program
      ? String(body.study_program).trim()
      : null;
    const generation = body.generation ? Number(body.generation) : null;
    const bio = body.bio ? String(body.bio).trim() : null;
    const skills = Array.isArray(body.skills) ? body.skills : [];
    const competitionInterests = Array.isArray(body.competition_interests)
      ? body.competition_interests
      : [];

    if (!fullName) {
      return NextResponse.json(
        { success: false, message: "Nama lengkap wajib diisi." },
        { status: 400 },
      );
    }

    // Check unique NIM if provided
    if (nim) {
      const [existing] = await db.query<RowDataPacket[]>(
        "SELECT id FROM profiles WHERE nim = ? AND user_id != ? LIMIT 1",
        [nim, user.id],
      );

      if (existing.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "NIM ini sudah terdaftar oleh pengguna lain.",
          },
          { status: 409 },
        );
      }
    }

    await db.query(
      `UPDATE profiles SET
        full_name = ?,
        nim = ?,
        faculty = ?,
        study_program = ?,
        generation = ?,
        bio = ?,
        skills = ?,
        competition_interests = ?
      WHERE user_id = ?`,
      [
        fullName,
        nim,
        faculty,
        studyProgram,
        generation,
        bio,
        JSON.stringify(skills),
        JSON.stringify(competitionInterests),
        user.id,
      ],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Profil berhasil diperbarui.",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Update Profile Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memperbarui profil.",
      },
      { status: 500 },
    );
  }
}
