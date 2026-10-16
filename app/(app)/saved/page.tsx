
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostCard } from "@/components/posts/post-card";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { mapRowToPost, type PostRow } from "@/lib/posts";
import type { Post } from "@/types";

export const metadata: Metadata = { title: "Tersimpan" };

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    redirect("/login");
  }

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
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.faculty AS author_faculty,
        pr.study_program AS author_study_program,
        pr.nim AS author_nim,
        pr.generation AS author_generation,
        pr.bio AS author_bio
      FROM saved_posts sp
      INNER JOIN posts p ON p.id = sp.post_id
      LEFT JOIN profiles pr ON pr.user_id = p.user_id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
      LIMIT 100`,
      [currentUser.id],
    );

    posts = rows.map(mapRowToPost);
  } catch (error) {
    console.error("Error loading saved posts:", error);
  }

  return (
    <div className="space-y-6 ">
      <PageHeader
        title="Tersimpan"
        description="Postingan lomba yang kamu simpan."
      />

      {posts.length === 0 ? (
        <EmptyState
          icon="bookmark"
          title="Belum ada postingan tersimpan"
          description="Postingan yang kamu simpan dari feed akan tampil di sini."
        />
      ) : (
        <div className="mx-auto w-full max-w-2xl divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUser.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
