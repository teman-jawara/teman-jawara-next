import { NextResponse, type NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Silakan masuk terlebih dahulu." },
        { status: 401 },
      );
    }

    // 2. Parse form data
    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, message: "Form data tidak valid." },
        { status: 400 },
      );
    }

    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, message: "File gambar tidak ditemukan." },
        { status: 400 },
      );
    }

    // 3. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Format file tidak didukung. Harap unggah gambar JPG, PNG, WebP, atau GIF.",
        },
        { status: 400 },
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: "Ukuran gambar terlalu besar. Maksimal 5 MB.",
        },
        { status: 400 },
      );
    }

    // 5. Determine extension safely
    let ext = ".jpg";
    if (file.type === "image/png") ext = ".png";
    else if (file.type === "image/webp") ext = ".webp";
    else if (file.type === "image/gif") ext = ".gif";

    const filename = `${crypto.randomUUID()}${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    // 6. Ensure uploads folder exists
    await fs.mkdir(uploadDir, { recursive: true });

    // 7. Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, Buffer.from(arrayBuffer));

    const publicUrl = `/uploads/${filename}`;

    return NextResponse.json(
      {
        success: true,
        message: "Gambar berhasil diunggah.",
        url: publicUrl,
      },
      { status: 200 },
    );
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
