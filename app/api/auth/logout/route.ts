import { NextResponse, type NextRequest } from "next/server";
import { deleteSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      await deleteSession(token);
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Berhasil keluar.",
      },
      { status: 200 },
    );

    // Invalidate and clear the session cookie
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error: unknown) {
    console.error("[Logout Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memproses permintaan keluar.",
      },
      { status: 500 },
    );
  }
}
