import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <EmptyState
        title="Halaman tidak ditemukan"
        description="Alamat yang kamu buka tidak ada atau sudah dipindahkan."
        action={
          <Link href="/" className={buttonStyles()}>
            Kembali ke beranda
          </Link>
        }
      />
    </main>
  );
}
