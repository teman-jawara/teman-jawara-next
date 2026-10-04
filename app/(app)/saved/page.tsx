import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Tersimpan" };

export default function SavedPage() {
  return (
    <>
      <PageHeader title="Tersimpan" description="Postingan lomba yang kamu simpan." />
      <EmptyState
        icon="bookmark"
        title="Belum ada postingan tersimpan"
        description="Postingan yang kamu simpan dari feed akan tampil di sini."
      />
    </>
  );
}
