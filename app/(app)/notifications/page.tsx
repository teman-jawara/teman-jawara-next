import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Notifikasi" };

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifikasi"
        description="Permintaan koneksi, suka, dan komentar di postinganmu."
      />
      <EmptyState
        icon="bell"
        title="Belum ada notifikasi"
        description="Notifikasi baru akan tampil di sini."
      />
    </>
  );
}
