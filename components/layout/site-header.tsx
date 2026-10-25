import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const sectionLinks = [
  { label: "Beranda", href: "#beranda" },
  { label: "Fitur", href: "#fitur" },
  { label: "Pedoman", href: "#pedoman" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#e7eaf0] bg-white/95 backdrop-blur-md">
      <Container className="flex h-[76px] items-center justify-between">

        <Logo href="#beranda" />

        <nav className="hidden items-center gap-8 md:flex">
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-bold text-navy-900 transition-colors hover:text-navy-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="px-2 py-2 text-sm font-bold text-navy-900 transition-colors hover:text-navy-600 sm:px-3"
          >
            Masuk
          </Link>

          <Link
            href="/register"
            className={buttonStyles({
              variant: "primary",
              size: "sm",
              className:
                "rounded-md bg-[#1257b9] px-4 font-bold shadow-sm hover:bg-[#0d479b] sm:px-5",
            })}
          >
            <span className="hidden sm:inline">Daftar Sekarang</span>
            <span className="sm:hidden">Daftar</span>
          </Link>
        </div>
      </Container>
    </header>
  );
}