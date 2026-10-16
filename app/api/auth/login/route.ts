import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  verifyPassword,
  createSession,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import type { RowDataPacket } from "mysql2";

export const dynamic = "force-dynamic";

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting: max 8 login attempts per minute per IP
    const clientIp = getClientIp(request);
    const rateLimit = checkRateLimit(clientIp, "login", {
      limit: 8,
      windowMs: 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
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

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email dan kata sandi wajib diisi." },
        { status: 400 },
      );
    }

    // 3. Lookup user in MySQL
    const [rows] = await db.query<UserRow[]>(
      `SELECT u.id, u.email, u.password_hash, pr.full_name
       FROM users u
       LEFT JOIN profiles pr ON u.id = pr.user_id
       WHERE u.email = ?
       LIMIT 1`,
      [email],
    );

    // Generic error message to prevent user enumeration
    const invalidCredentialsMessage = "Email atau kata sandi tidak valid.";

    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, message: invalidCredentialsMessage },
        { status: 401 },
      );
    }

    const user = rows[0];

    // 4. Verify password with bcrypt
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: invalidCredentialsMessage },
        { status: 401 },
      );
    }

    // 5. Create new session in MySQL
    const { token, expiresAt } = await createSession(user.id);

    const response = NextResponse.json(
      {
        success: true,
        message: "Berhasil masuk.",
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
      },
      { status: 200 },
    );

    // 6. Set secure session cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error: unknown) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memproses permintaan masuk.",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "LOGIN_FAILED",
      },
      { status: 500 },
    );
  }
}
