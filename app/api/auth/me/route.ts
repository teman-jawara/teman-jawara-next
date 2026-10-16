import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthenticated",
          user: null,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        user,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Auth Me Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve authenticated user.",
      },
      { status: 500 },
    );
  }
}
