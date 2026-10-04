import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Edit postingan" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Edit postingan" description={`Postingan: ${id}`} />
      <EmptyState
        icon="plus"
        title="Formulir edit postingan"
        description="Formulir untuk mengubah postinganmu akan tampil di sini."
      />
    </>
  );
}
