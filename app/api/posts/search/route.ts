import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mapRowToPost, type PostRow } from "@/lib/posts";

export const dynamic = "force-dynamic";

// SEMENTARA untuk menguji UI. JANGAN di-commit: endpoint asli bagian Orang 2.
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim();
  const sort = sp.get("sort") === "oldest" ? "oldest" : "latest";

  const where: string[] = [];
  const params: string[] = [];

  if (q) {
    // Isi postingan + biodata profil penulis (nama, NIM, fakultas, prodi, angkatan, bio)
    where.push(
      "(p.title LIKE ? OR p.description LIKE ? OR p.event_name LIKE ? OR CAST(p.required_skills AS CHAR) LIKE ? OR pr.full_name LIKE ? OR pr.nim LIKE ? OR pr.faculty LIKE ? OR pr.study_program LIKE ? OR CAST(pr.generation AS CHAR) LIKE ? OR pr.bio LIKE ?)",
    );
    const like = `%${q}%`;
    params.push(like, like, like, like, like, like, like, like, like, like);
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql =
    sort === "oldest"
      ? "ORDER BY p.created_at ASC"
      : "ORDER BY p.created_at DESC";

  try {
    const [rows] = await db.query<PostRow[]>(
      `SELECT
        p.id, p.user_id, p.title, p.description, p.category, p.required_skills,
        p.event_name, p.deadline, p.teammate_count, p.faculty_preference,
        p.study_program_preference, p.image_url, p.status, p.created_at,
        p.updated_at, p.view_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.faculty AS author_faculty,
        pr.study_program AS author_study_program,
        pr.nim AS author_nim,
        pr.generation AS author_generation,
        pr.bio AS author_bio
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      ${whereSql}
      ${orderSql}
      LIMIT 50`,
      params,
    );

    const data = rows.map(mapRowToPost).map((post) => ({ post }));
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error) {
    console.error("SEARCH ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Pencarian gagal." },
      { status: 500 },
    );
  }
}