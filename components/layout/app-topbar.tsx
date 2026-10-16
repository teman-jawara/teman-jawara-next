
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";
import { getAuthenticatedUser } from "@/lib/auth";

export async function AppTopbar() {
  const user = await getAuthenticatedUser();
  const name = user?.full_name || "Mahasiswa Untirta";

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-navy-900/95 px-4 backdrop-blur sm:px-6">
      <Logo href="/feed" className="lg:invisible" />

      <Link
        href="/me"
        aria-label="Buka profil saya"
        className="rounded-full"
      >
        <Avatar name={name} size="sm" />
      </Link>
    </header>
  );
}
