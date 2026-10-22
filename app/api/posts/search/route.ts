import { NextResponse, type NextRequest } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { mapRowToPost, parseSkills, type PostRow } from "@/lib/posts";
import {
  PROFILE_WEIGHTS,
  searchPosts,
  type WeightedField,
} from "@/lib/search/tfidf";
import { buildCandidateWhere, parseSearchParams } from "@/lib/search/query";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

/** Post (kompatibel dengan PostCard) + metadata relevansi opsional. */
type SearchedPost = Post & {
  relevance_score: number;
  matched_terms: string[];
};

interface ProfileRow extends RowDataPacket {
  bio: string | null;
  skills: unknown;
  competition_interests: unknown;
}

/**
 * GET /api/posts/search
 *
 * Query string:
 *   q                 kata kunci (alias: search). Kosong -> fallback postingan terbaru.
 *   category          filter kategori persis (mis. "Hackathon")
 *   status            active (default) | closed | all
 *   skills            filter required_skills, dipisah koma (cocok jika salah satu ada)
 *   page, limit       paginasi hasil (limit maks 50, default 20)
 *   candidate_limit   batas kandidat yang diberi peringkat (maks 500, default 300)
 *   profile=1         opsional: tambahkan skills/minat/bio profil user yang login
 *                     sebagai sinyal berbobot rendah (diabaikan jika belum login)
 *
 * Alur: filter SQL berparameter -> ambil <= candidate_limit postingan terbaru
 * -> TF-IDF + cosine similarity di memori -> urut skor desc, lalu terbaru.
 * Bila tidak ada kata yang cocok utuh, dicoba kecocokan potongan teks
 * (mode "substring"), mis. "figm" menemukan "Figma".
 */
export async function GET(request: NextRequest) {
  try {
    const parsed = parseSearchParams(new URL(request.url).searchParams);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.error }, { status: 400 });
    }
    const params = parsed.params;

    // --- 1. Kandidat dari database (semua nilai lewat placeholder `?`) ---
    const { whereSql, values } = buildCandidateWhere(params);

    const [rows] = await db.query<PostRow[]>(
      `SELECT
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.category,
        p.required_skills,
        p.event_name,
        p.deadline,
        p.teammate_count,
        p.faculty_preference,
        p.study_program_preference,
        p.image_url,
        p.status,
        p.created_at,
        p.updated_at,
        p.view_count,
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
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ?`,
      [...values, params.candidateLimit],
    );

    const candidates: Post[] = rows.map(mapRowToPost);

    // --- 2. Bagian query: teks pengguna + (opsional) sinyal profil ---
    const profileParts: WeightedField[] = [];
    let profileUsed = false;

    if (params.useProfile) {
      const user = await getAuthenticatedUser(request);
      if (user) {
        const [profileRows] = await db.query<ProfileRow[]>(
          "SELECT bio, skills, competition_interests FROM profiles WHERE user_id = ? LIMIT 1",
          [user.id],
        );
        const profile = profileRows[0];
        if (profile) {
          const skills = parseSkills(profile.skills);
          const interests = parseSkills(profile.competition_interests);
          const bio = profile.bio?.trim() || null;
          profileParts.push(
            { text: skills, weight: PROFILE_WEIGHTS.skills },
            { text: interests, weight: PROFILE_WEIGHTS.competition_interests },
            { text: bio, weight: PROFILE_WEIGHTS.bio },
          );
          profileUsed = skills.length > 0 || interests.length > 0 || Boolean(bio);
        }
      }
    }

    // --- 3. TF-IDF + cosine similarity (fallback: potongan teks / terbaru) ---
    const { mode, ranked } = searchPosts(candidates, params.q, profileParts);
    if (mode !== "relevance") profileUsed = false;

    // --- 4. Paginasi hasil yang sudah diurutkan ---
    const offset = (params.page - 1) * params.limit;
    const posts: SearchedPost[] = ranked
      .slice(offset, offset + params.limit)
      .map(({ item, score, matchedTerms }) => ({
        ...item,
        relevance_score: score,
        matched_terms: matchedTerms,
      }));

    return NextResponse.json(
      {
        success: true,
        mode,
        query: params.q,
        count: posts.length,
        total: ranked.length,
        page: params.page,
        limit: params.limit,
        candidate_limit: params.candidateLimit,
        candidates_scanned: candidates.length,
        profile_used: profileUsed,
        posts,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[GET /api/posts/search Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to search posts",
        code:
          error && typeof error === "object" && "code" in error
            ? String((error as { code: unknown }).code)
            : "SEARCH_POSTS_FAILED",
      },
      { status: 500 },
    );
  }
}
