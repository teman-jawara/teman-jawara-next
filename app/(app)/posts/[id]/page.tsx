
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { mapRowToPost, type PostRow } from "@/lib/posts";
import type { Post } from "@/types";
import { PostCard } from "@/components/posts/post-card";
import { PostInteractions } from "@/components/posts/post-interactions";
import { ArrowLeft } from "lucide-react";
import { getAuthenticatedUser } from "@/lib/auth";
interface PostDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const [rows] = await db.query<PostRow[]>(
      "SELECT title, description FROM posts WHERE id = ?",
      [id],
    );

    if (rows.length > 0) {
      return {
        title: rows[0].title,
        description: rows[0].description.slice(0, 160),
      };
    }
  } catch {
    // Gunakan judul default jika query gagal.
  }

  return { title: "Detail Postingan" };
}

export default async function PostDetailPage({
  params,
}: PostDetailPageProps) {
  const { id } = await params;

  let post: Post | null = null;

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
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.faculty AS author_faculty,
        pr.study_program AS author_study_program,
        pr.nim AS author_nim,
        pr.generation AS author_generation,
        pr.bio AS author_bio
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      WHERE p.id = ?`,
      [id],
    );

    if (rows.length > 0) {
      post = mapRowToPost(rows[0]);
    }
  } catch (error) {
    console.error("Error fetching post detail:", error);
  }

  if (!post) {
    notFound();
  }
  const currentUser = await getAuthenticatedUser();
  
return (
  <main className="mx-auto w-full max-w-2xl">
    <div className="mb-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-2 text-sm font-medium text-navy-800 hover:text-navy-600"
      >
        <ArrowLeft size={18} />
        Kembali ke Feed
      </Link>
    </div>

    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
  <PostCard
  post={post}
  currentUserId={currentUser?.id}
  showActions={false}
  viewMode="detail"
/>
  <PostInteractions postId={post.id} />
</div>
  </main>
);
}
