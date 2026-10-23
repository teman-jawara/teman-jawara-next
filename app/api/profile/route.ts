
import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { normalizeIndonesianWhatsAppNumber } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

interface ExistingProfileRow extends RowDataPacket {
  id: string;
}

interface WhatsAppRow extends RowDataPacket {
  whatsapp_number: string | null;
}

export async function PUT(request: NextRequest) {
  try {
    // 1. Pastikan pengguna sudah login.
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Silakan masuk terlebih dahulu.",
        },
        { status: 401 },
      );
    }

    // 2. Validasi payload.
    const bodyValue: unknown = await request.json().catch(() => null);

    if (
      !bodyValue ||
      typeof bodyValue !== "object" ||
      Array.isArray(bodyValue)
    ) {
      return NextResponse.json(
        { success: false, message: "Payload tidak valid." },
        { status: 400 },
      );
    }

    const body = bodyValue as Record<string, unknown>;

    // 3. Ambil data profil.
    const fullName = String(body.full_name ?? "").trim();
    const nim = body.nim ? String(body.nim).trim() : null;
    const faculty = body.faculty ? String(body.faculty).trim() : null;
    const studyProgram = body.study_program
      ? String(body.study_program).trim()
      : null;
    const generation = body.generation
      ? Number(body.generation)
      : null;
    const bio = body.bio ? String(body.bio).trim() : null;

    const skills = Array.isArray(body.skills) ? body.skills : [];
    const competitionInterests = Array.isArray(
      body.competition_interests,
    )
      ? body.competition_interests
      : [];

    if (!fullName) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama lengkap wajib diisi.",
        },
        { status: 400 },
      );
    }

    // 4. Periksa apakah NIM sudah digunakan pengguna lain.
    if (nim) {
      const [existingRows] = await db.query<ExistingProfileRow[]>(
        `SELECT id
         FROM profiles
         WHERE nim = ? AND user_id != ?
         LIMIT 1`,
        [nim, user.id],
      );

      if (existingRows.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: "NIM ini sudah terdaftar oleh pengguna lain.",
          },
          { status: 409 },
        );
      }
    }

    // 5. Validasi field WhatsApp.
    // Field WhatsApp opsional agar form lama tetap kompatibel.
    const hasWhatsAppNumber = Object.prototype.hasOwnProperty.call(
      body,
      "whatsapp_number",
    );

    const hasWhatsAppPublic = Object.prototype.hasOwnProperty.call(
      body,
      "whatsapp_public",
    );

    let whatsappNumber: string | null = null;

    if (hasWhatsAppNumber) {
      const rawNumber = body.whatsapp_number;

      if (
        rawNumber !== null &&
        rawNumber !== undefined &&
        typeof rawNumber !== "string"
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Format nomor WhatsApp tidak valid.",
          },
          { status: 400 },
        );
      }

      const raw =
        typeof rawNumber === "string" ? rawNumber.trim() : "";

      if (raw) {
        const normalized = normalizeIndonesianWhatsAppNumber(raw);

        if (!normalized) {
          return NextResponse.json(
            {
              success: false,
              message:
                "Nomor WhatsApp tidak valid. Gunakan nomor seluler Indonesia.",
            },
            { status: 400 },
          );
        }

        whatsappNumber = normalized;
      }
    }

    let whatsappPublic: boolean | undefined;

    if (hasWhatsAppPublic) {
      if (typeof body.whatsapp_public !== "boolean") {
        return NextResponse.json(
          {
            success: false,
            message: "Pengaturan izin kontak tidak valid.",
          },
          { status: 400 },
        );
      }

      whatsappPublic = body.whatsapp_public;
    }

    // 6. Pastikan nomor tersedia sebelum mengaktifkan kontak publik.
    if (whatsappPublic === true) {
      let effectiveNumber = whatsappNumber;

      if (!hasWhatsAppNumber) {
        const [contactRows] = await db.query<WhatsAppRow[]>(
          `SELECT whatsapp_number
           FROM profiles
           WHERE user_id = ?
           LIMIT 1`,
          [user.id],
        );

        effectiveNumber = contactRows[0]?.whatsapp_number ?? null;
      }

      if (!effectiveNumber) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Isi nomor WhatsApp sebelum mengizinkan kontak ditampilkan.",
          },
          { status: 400 },
        );
      }
    }

    // 7. Susun UPDATE menggunakan field yang sudah divalidasi.
    const assignments = [
      "full_name = ?",
      "nim = ?",
      "faculty = ?",
      "study_program = ?",
      "generation = ?",
      "bio = ?",
      "skills = ?",
      "competition_interests = ?",
    ];

    const values: (string | number | null)[] = [
      fullName,
      nim,
      faculty,
      studyProgram,
      generation,
      bio,
      JSON.stringify(skills),
      JSON.stringify(competitionInterests),
    ];

    // Field yang tidak dikirim tidak akan menimpa data WhatsApp lama.
    if (hasWhatsAppNumber) {
      assignments.push("whatsapp_number = ?");
      values.push(whatsappNumber);
    }

    if (whatsappPublic !== undefined) {
      assignments.push("whatsapp_public = ?");
      values.push(whatsappPublic ? 1 : 0);
    } else if (hasWhatsAppNumber && !whatsappNumber) {
      // Jika nomor dihapus, nonaktifkan kontak publik.
      assignments.push("whatsapp_public = 0");
    }

    // Ownership selalu berdasarkan session pengguna.
    values.push(user.id);

    await db.query(
      `UPDATE profiles
       SET ${assignments.join(", ")}
       WHERE user_id = ?`,
      values,
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
