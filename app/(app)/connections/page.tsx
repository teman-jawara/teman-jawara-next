import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Koneksi" };

export default function ConnectionsPage() {
  return (
    <>
      <PageHeader
        title="Koneksi"
        description="Kelola permintaan koneksi dan lihat teman satu tim."
      />
      <EmptyState
        icon="users"
        title="Belum ada koneksi"
        description="Permintaan yang masuk dan koneksi yang sudah diterima akan tampil di sini."
      />
    </>
  );
}
