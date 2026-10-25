
import { put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import crypto from "crypto";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return NextResponse.json(
        { success: false, message: "Form data tidak valid." },
        { status: 400 },
      );
    }

    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, message: "File gambar tidak ditemukan." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Format gambar tidak didukung." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Ukuran gambar maksimal 4 MB." },
        { status: 400 },
      );
    }

    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };

    const filename = `uploads/${crypto.randomUUID()}${extensions[file.type]}`;

    const blob = await put(filename, file, {
      access: "public",
      addRandomSuffix: false,
      contentType: file.type,
    });

    return NextResponse.json({
      success: true,
      message: "Gambar berhasil diunggah.",
      url: blob.url,
    });
  } catch (error: unknown) {
    console.error("[Upload Error]:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mengunggah gambar. Silakan coba lagi.",
      },
      { status: 500 },
    );
  }
}
