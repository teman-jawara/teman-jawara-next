import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { PostForm } from "@/components/posts/post-form";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Buat postingan",
};

export default async function CreatePostPage() {
  const user = await getAuthenticatedUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buat postingan"
        description="Ceritakan lomba yang kamu ikuti dan kriteria rekan tim yang kamu cari."
      />

      <PostForm
        user={{
          full_name: user?.full_name ?? null,
          avatar_url: user?.avatar_url ?? null,
        }}
      />
    </div>
  );
}