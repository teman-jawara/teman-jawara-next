import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Buat postingan" };

export default function CreatePostPage() {
  return (
    <>
      <PageHeader
        title="Buat postingan"
        description="Ceritakan lomba yang kamu ikuti dan skill apa yang kamu cari."
      />
      <EmptyState
        icon="plus"
        title="Formulir postingan"
        description="Formulir untuk judul, deskripsi, kategori, dan skill yang dibutuhkan akan tampil di sini."
      />
    </>
  );
}
