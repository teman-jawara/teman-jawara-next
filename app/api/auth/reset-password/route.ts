
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { hashPassword, SESSION_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface ResetTokenRow extends RowDataPacket {
  id: string;
  user_id: string;
}

const INVALID_TOKEN_MESSAGE =
  "Tautan reset tidak valid, sudah digunakan, atau sudah kedaluwarsa. Minta tautan baru.";

export async function POST(request: NextRequest) {
  let connection: Awaited<ReturnType<typeof db.getConnection>> | undefined;
  let transactionStarted = false;

  try {
    const rateLimit = checkRateLimit(
      getClientIp(request),
      "reset-password",
      { limit: 10, windowMs: 60_000 },
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Terlalu banyak percobaan. Silakan coba lagi nanti.",
        },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body.token !== "string" ||
      typeof body.password !== "string"
    ) {
      return NextResponse.json(
        { success: false, message: "Permintaan tidak valid." },
        { status: 400 },
      );
    }

    const token = body.token;
    const password = body.password;

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { success: false, message: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Kata sandi minimal 8 karakter." },
        { status: 400 },
      );
    }

    // bcrypt membatasi input efektif sampai 72 byte.
    if (Buffer.byteLength(password, "utf8") > 72) {
      return NextResponse.json(
        { success: false, message: "Kata sandi terlalu panjang. Maksimal 72 byte." },
        { status: 400 },
      );
    }

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    connection = await db.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    // Kunci baris agar satu token tidak dapat digunakan secara bersamaan.
    const [tokens] = await connection.query<ResetTokenRow[]>(
      `SELECT id, user_id
       FROM password_reset_tokens
       WHERE token_hash = ?
         AND used_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1
       FOR UPDATE`,
      [tokenHash],
    );

    if (tokens.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { success: false, message: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    const resetToken = tokens[0];
    const passwordHash = await hashPassword(password);

    const [userResult] = await connection.query<ResultSetHeader>(
      `UPDATE users
       SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [passwordHash, resetToken.user_id],
    );

    if (userResult.affectedRows !== 1) {
      throw new Error("Pengguna untuk token reset tidak ditemukan.");
    }

    const [tokenResult] = await connection.query<ResultSetHeader>(
      `UPDATE password_reset_tokens
       SET used_at = CURRENT_TIMESTAMP
       WHERE id = ? AND used_at IS NULL`,
      [resetToken.id],
    );

    if (tokenResult.affectedRows !== 1) {
      await connection.rollback();
      transactionStarted = false;

      return NextResponse.json(
        { success: false, message: INVALID_TOKEN_MESSAGE },
        { status: 400 },
      );
    }

    // Logout semua sesi lama setelah password berubah.
    await connection.query(
      "DELETE FROM sessions WHERE user_id = ?",
      [resetToken.user_id],
    );

    await connection.commit();
    transactionStarted = false;

    const response = NextResponse.json({
      success: true,
      message: "Kata sandi berhasil diubah. Silakan masuk kembali.",
    });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback().catch(() => {});
    }

    console.error("[Reset Password Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengubah kata sandi. Silakan coba lagi.",
      },
      { status: 500 },
    );
  } finally {
    connection?.release();
  }
}
