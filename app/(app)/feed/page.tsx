import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { LogoutButton } from "@/components/auth/logout-button";
export const metadata: Metadata = { title: "Feed" };

export default function FeedPage() {
  return (
  <>
    <PageHeader
      title="Feed lomba"
      description="Postingan lomba dan pencarian tim dari mahasiswa Untirta."
    />

    <div className="mb-6 flex justify-end">
      <LogoutButton />
    </div>

    <EmptyState
      icon="home"
      title="Belum ada postingan"
      description="Daftar postingan, pencarian, dan filter akan tampil di sini."
      action={
        <Link
          href="/posts/create"
          className={buttonStyles({ variant: "accent" })}
        >
          Buat postingan
        </Link>
      }
    />
  </>
);
}
