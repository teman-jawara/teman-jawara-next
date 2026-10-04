import { Container } from "@/components/ui/container";
import { siteConfig } from "@/constants/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e3e5e8] bg-white">
      <Container className="flex flex-col gap-5 py-7 text-xs text-[#777] sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. All right reserved
        </p>

        <div className="flex flex-wrap gap-6">
          <a href="#" className="transition-colors hover:text-navy-800">
            Kebijakan Privasi
          </a>
          <a href="#" className="transition-colors hover:text-navy-800">
            Syarat
          </a>
          <a href="#" className="transition-colors hover:text-navy-800">
            Ketentuan
          </a>
        </div>
      </Container>
    </footer>
  );
}