import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  hashPassword,
  createSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting: max 5 registration attempts per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp, "register", {
      limit: 5,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan pendaftaran. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
        },
        { status: 429 },
      );
    }

    // 2. Parse request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Payload JSON tidak valid." },
        { status: 400 },
      );
    }

    const fullName = String(body.fullName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    // 3. Validation
    const errors: string[] = [];
    if (!fullName) {
      errors.push("Nama lengkap wajib diisi.");
    } else if (fullName.length > 150) {
      errors.push("Nama lengkap maksimal 150 karakter.");
    }

    if (!email) {
      errors.push("Email wajib diisi.");
    } else if (!isValidEmail(email)) {
      errors.push("Format email tidak valid.");
    }

    if (!password) {
      errors.push("Kata sandi wajib diisi.");
    } else if (password.length < 8) {
      errors.push("Kata sandi minimal 8 karakter.");
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors[0], errors },
        { status: 400 },
      );
    }

    // 4. Check if email already registered in MySQL
    const [existingUsers] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.",
        },
        { status: 409 },
      );
    }

    // 5. Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // 6. Generate UUIDs for user and profile
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    // 7. Atomic transaction for user + profile creation
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Insert into users
      await connection.query(
        "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
        [userId, email, passwordHash],
      );

      // Insert corresponding profile record
      await connection.query(
        `INSERT INTO profiles (id, user_id, full_name, nim, skills, competition_interests)
         VALUES (?, ?, ?, NULL, '[]', '[]')`,
        [profileId, userId, fullName],
      );

      await connection.commit();
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }

    // 8. Create session directly (no email verification barrier)
    const { token, expiresAt } = await createSession(userId);

    const response = NextResponse.json(
      {
        success: true,
        message: "Pendaftaran akun berhasil.",
        user: {
          id: userId,
          email,
          full_name: fullName,
        },
      },
      { status: 201 },
    );

    // 9. Set HTTP-only session cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error: unknown) {
    console.error("[Register Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal membuat akun. Silakan coba beberapa saat lagi.",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "REGISTRATION_FAILED",
      },
      { status: 500 },
    );
  }
}
