import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostCard } from "@/components/posts/post-card";
import { COMPETITION_CATEGORIES } from "@/constants/competition";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { mapRowToPost, type PostRow } from "@/lib/posts";
import { Post } from "@/types";

export const metadata: Metadata = { title: "Feed" };

interface FeedPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
  }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const { category, search } = await searchParams;

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (category && category !== "Semua") {
    whereClauses.push("p.category = ?");
    params.push(category);
  }

  if (search && search.trim()) {
    whereClauses.push(
      "(p.title LIKE ? OR p.description LIKE ? OR p.event_name LIKE ?)",
    );
    const searchPattern = `%${search.trim()}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  let posts: Post[] = [];
  try {
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
      ORDER BY p.created_at DESC
      LIMIT 50`,
      params,
    );

    posts = rows.map(mapRowToPost);
  } catch (error) {
    console.error("Error loading feed posts from MySQL:", error);
  }

  const currentUser = await getAuthenticatedUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Siap Ukir Prestasi Baru lagi?"
          description="Yuk Cari Partner lagi"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <Link
          href="/feed"
          className={`inline-flex whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            !category || category === "Semua"
              ? "bg-navy-800 text-white"
              : "border border-line bg-surface text-muted hover:bg-navy-50 hover:text-navy-800"
          }`}
        >
          Semua Kategori
        </Link>
        {COMPETITION_CATEGORIES.map((cat) => {
          const isSelected = category === cat;
          return (
            <Link
              key={cat}
              href={`/feed?category=${encodeURIComponent(cat)}`}
              className={`inline-flex whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                isSelected
                  ? "bg-navy-800 text-white"
                  : "border border-line bg-surface text-muted hover:bg-navy-50 hover:text-navy-800"
              }`}
            >
              {cat}
            </Link>
          );
        })}
      </div>

      {/* Post List or Empty State */}
      {posts.length === 0 ? (
        <EmptyState
          icon="home"
          title="Belum ada postingan"
          description={
            category
              ? `Belum ada postingan untuk kategori "${category}".`
              : "Daftar postingan, pencarian, dan filter akan tampil di sini."
          }
          action={
            <Link
              href="/posts/create"
              className={buttonStyles({ variant: "accent" })}
            >
              Buat postingan
            </Link>
          }
        />
      ) : (
        <div className="mx-auto w-full max-w-2xl divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
  {posts.map((post) => (
    <PostCard
      key={post.id}
      post={post}
      currentUserId={currentUser?.id}
    />
  ))}
</div>
      )}
    </div>
  );
}
