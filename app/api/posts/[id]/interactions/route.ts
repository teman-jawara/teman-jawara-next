
import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{ id: string }>;
};

interface PostRow extends RowDataPacket {
  id: string;
  view_count: number;
}

interface PostOwnerRow extends RowDataPacket {
  id: string;
  user_id: string;
  title: string;
}

interface ActorProfileRow extends RowDataPacket {
  full_name: string | null;
  nim: string | null;
}

interface CountRow extends RowDataPacket {
  total: number | string;
}

interface ExistsRow extends RowDataPacket {
  id: string;
}

interface CommentRow extends RowDataPacket {
  id: string;
  user_id: string;
  content: string;
  created_at: Date | string;
  author_name: string | null;
  author_avatar: string | null;
  author_nim: string | null;
}

// GET: jumlah interaksi dan 5 komentar terbaru.
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;

    const [postRows] = await db.query<PostRow[]>(
      "SELECT id, view_count FROM posts WHERE id = ? LIMIT 1",
      [id],
    );

    if (!postRows.length) {
      return NextResponse.json(
        { success: false, message: "Postingan tidak ditemukan." },
        { status: 404 },
      );
    }

    const user = await getAuthenticatedUser(request);

    const [likeRows] = await db.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM likes WHERE post_id = ?",
      [id],
    );

    const [commentCountRows] = await db.query<CountRow[]>(
      "SELECT COUNT(*) AS total FROM comments WHERE post_id = ?",
      [id],
    );

    const [comments] = await db.query<CommentRow[]>(
      `SELECT
        c.id,
        c.user_id,
        c.content,
        c.created_at,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.nim AS author_nim
      FROM comments c
      LEFT JOIN profiles pr ON c.user_id = pr.user_id
      WHERE c.post_id = ?
      ORDER BY c.created_at DESC
      LIMIT 5`,
      [id],
    );

    let isLiked = false;
    let isSaved = false;

    if (user) {
      const [likedRows] = await db.query<ExistsRow[]>(
        "SELECT id FROM likes WHERE user_id = ? AND post_id = ? LIMIT 1",
        [user.id, id],
      );

      const [savedRows] = await db.query<ExistsRow[]>(
        "SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ? LIMIT 1",
        [user.id, id],
      );

      isLiked = likedRows.length > 0;
      isSaved = savedRows.length > 0;
    }

    return NextResponse.json({
      success: true,
      data: {
        likeCount: Number(likeRows[0]?.total ?? 0),
        commentCount: Number(commentCountRows[0]?.total ?? 0),
        viewCount: Number(postRows[0].view_count ?? 0),
        isLiked,
        isSaved,
        comments,
      },
    });
  } catch (error) {
    console.error("[GET post interactions]", error);

    return NextResponse.json(
      { success: false, message: "Gagal mengambil data interaksi." },
      { status: 500 },
    );
  }
}

// POST: like, unlike, save, unsave, comment, atau view.
export async function POST(
  request: NextRequest,
  { params }: RouteParams,
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Request tidak valid." },
        { status: 400 },
      );
    }

    const payload = body as Record<string, unknown>;
    const action = payload.action;

    const [postRows] = await db.query<PostOwnerRow[]>(
  "SELECT id, user_id, title FROM posts WHERE id = ? LIMIT 1",
  [id],
);

    if (!postRows.length) {
      return NextResponse.json(
        { success: false, message: "Postingan tidak ditemukan." },
        { status: 404 },
      );
    }

    // View dapat dicatat tanpa harus login.
    if (action === "view") {
      await db.query(
        "UPDATE posts SET view_count = view_count + 1 WHERE id = ?",
        [id],
      );

      return NextResponse.json({ success: true });
    }

    // Like, bookmark, dan komentar membutuhkan login.
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Silakan login terlebih dahulu." },
        { status: 401 },
      );
    }

    const [actorRows] = await db.query<ActorProfileRow[]>(
  `SELECT full_name, nim
   FROM profiles
   WHERE user_id = ?
   LIMIT 1`,
  [user.id],
);

const actorName = actorRows[0]?.full_name || "Mahasiswa Untirta";
const actorUsername = actorRows[0]?.nim
  ? `@${actorRows[0].nim}`
  : "";
const actorLabel = actorUsername
  ? `${actorName} (${actorUsername})`
  : actorName;

    if (action === "like") {
  const [rows] = await db.query<ExistsRow[]>(
    "SELECT id FROM likes WHERE user_id = ? AND post_id = ? LIMIT 1",
    [user.id, id],
  );

  if (!rows.length) {
    await db.query(
      "INSERT INTO likes (id, user_id, post_id) VALUES (?, ?, ?)",
      [crypto.randomUUID(), user.id, id],
    );

    if (postRows[0].user_id !== user.id) {
      await db.query(
        `INSERT INTO notifications
          (id, user_id, type, message, reference_id)
         VALUES (?, ?, 'like', ?, ?)`,
        [
          crypto.randomUUID(),
          postRows[0].user_id,
          `${actorLabel} menyukai postinganmu.`,
          id,
        ],
      );
    }
  }
} else if (action === "unlike") {
      await db.query(
        "DELETE FROM likes WHERE user_id = ? AND post_id = ?",
        [user.id, id],
      );
    } else if (action === "save") {
  const [rows] = await db.query<ExistsRow[]>(
    "SELECT id FROM saved_posts WHERE user_id = ? AND post_id = ? LIMIT 1",
    [user.id, id],
  );

  if (!rows.length) {
    await db.query(
      "INSERT INTO saved_posts (id, user_id, post_id) VALUES (?, ?, ?)",
      [crypto.randomUUID(), user.id, id],
    );

    if (postRows[0].user_id !== user.id) {
      await db.query(
        `INSERT INTO notifications
          (id, user_id, type, message, reference_id)
         VALUES (?, ?, 'saved', ?, ?)`,
        [
          crypto.randomUUID(),
          postRows[0].user_id,
          `${actorLabel} menyimpan postinganmu.`,
          id,
        ],
      );
    }
  }
} else if (action === "unsave") {
      await db.query(
        "DELETE FROM saved_posts WHERE user_id = ? AND post_id = ?",
        [user.id, id],
      );
    } else if (action === "comment") {
      const content =
        typeof payload.content === "string" ? payload.content.trim() : "";

      if (!content || content.length > 2000) {
        return NextResponse.json(
          {
            success: false,
            message: "Komentar wajib diisi dan maksimal 2.000 karakter.",
          },
          { status: 400 },
        );
      }

      const commentId = crypto.randomUUID();

await db.query(
  `INSERT INTO comments (id, user_id, post_id, content)
   VALUES (?, ?, ?, ?)`,
  [commentId, user.id, id, content],
);

if (postRows[0].user_id !== user.id) {
  await db.query(
    `INSERT INTO notifications
      (id, user_id, type, message, reference_id)
     VALUES (?, ?, 'comment', ?, ?)`,
    [
      crypto.randomUUID(),
      postRows[0].user_id,
      `${actorLabel} menambahkan komentar di postinganmu.`,
      id,
    ],
  );
}
    } else {
      return NextResponse.json(
        { success: false, message: "Aksi interaksi tidak dikenal." },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST post interactions]", error);

    return NextResponse.json(
      { success: false, message: "Gagal menyimpan interaksi." },
      { status: 500 },
    );
  }
}
