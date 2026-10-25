
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

interface UserRow extends RowDataPacket {
  id: string;
  email: string;
}

const GENERIC_MESSAGE =
  "Jika email terdaftar, tautan reset password akan dikirim ke email tersebut.";

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(
      getClientIp(request),
      "forgot-password",
      { limit: 5, windowMs: 60_000 },
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: `Terlalu banyak permintaan. Coba lagi dalam ${rateLimit.retryAfterSeconds} detik.`,
        },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body.email !== "string") {
      return NextResponse.json(
        { success: false, message: "Alamat email wajib diisi." },
        { status: 400 },
      );
    }

    const email = body.email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "Format email tidak valid." },
        { status: 400 },
      );
    }

    const [users] = await db.query<UserRow[]>(
      "SELECT id, email FROM users WHERE email = ? LIMIT 1",
      [email],
    );

    // Jangan membocorkan apakah alamat email terdaftar.
    if (users.length > 0) {
      const user = users[0];
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      const tokenId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await db.query(
        `INSERT INTO password_reset_tokens
          (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
        [tokenId, user.id, tokenHash, expiresAt],
      );

      const baseUrl = (
        process.env.APP_URL || request.nextUrl.origin
      ).replace(/\/+$/, "");

      const resetUrl =
        `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

      let emailSent = false;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
        emailSent = true;
      } catch (error) {
        console.error("[Password Reset Email Error]:", error);

        // Jangan meninggalkan token baru yang tidak terkirim.
        await db.query(
          "DELETE FROM password_reset_tokens WHERE id = ?",
          [tokenId],
        ).catch((deleteError) => {
          console.error("[Reset Token Cleanup Error]:", deleteError);
        });
      }

      if (emailSent) {
        // Jika email terkirim, tautan yang lebih lama tidak lagi berlaku.
        await db.query(
          `DELETE FROM password_reset_tokens
           WHERE user_id = ? AND id <> ?`,
          [user.id, tokenId],
        ).catch((error) => {
          console.error("[Old Reset Token Cleanup Error]:", error);
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: GENERIC_MESSAGE,
    });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Permintaan belum bisa diproses. Silakan coba lagi nanti.",
      },
      { status: 500 },
    );
  }
}
