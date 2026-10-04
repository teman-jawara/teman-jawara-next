import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";

/**
 * Bar atas area aplikasi. Nama "Mahasiswa" masih placeholder;
 * akan diganti data profil asli setelah autentikasi (Build 2).
 */
export function AppTopbar() {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6">
      <Logo href="/feed" className="lg:invisible" />
      <Link href="/me" aria-label="Buka profil saya" className="rounded-full">
        <Avatar name="Mahasiswa Untirta" size="sm" />
      </Link>
    </header>
  );
}
