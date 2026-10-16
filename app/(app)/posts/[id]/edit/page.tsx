import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { mapRowToPost, type PostRow } from "@/lib/posts";
import { PageHeader } from "@/components/ui/page-header";
import { PostForm } from "@/components/posts/post-form";

export const metadata: Metadata = { title: "Edit postingan" };

interface EditPostPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { id } = await params;

  let post = null;
  try {
    const [rows] = await db.query<PostRow[]>(
      `SELECT * FROM posts WHERE id = ?`,
      [id],
    );

    if (rows.length > 0) {
      post = mapRowToPost(rows[0]);
    }
  } catch (error) {
    console.error("Error fetching post for edit:", error);
  }

  if (!post) {
    notFound();
  }

  const currentUser = await getAuthenticatedUser();
  if (currentUser && currentUser.id !== post.user_id) {
    redirect(`/posts/${post.id}`);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit postingan"
        description="Perbarui informasi lomba atau kriteria rekan tim yang kamu butuhkan."
      />
      <PostForm initialData={post} isEdit={true} />
    </div>
  );
}
