import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/constants/site";
import { cn } from "@/lib/utils/cn";

type LogoProps = {
  href?: string;
  className?: string;
};

export function Logo({ href = "/", className }: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Image
        src="/image/logo.png"
        alt={`${siteConfig.name} logo`}
        width={180}
        height={54}
        priority
        className="h-[54px] w-auto object-contain"
      />

      <div className="flex flex-col leading-tight">
        <span className="text-lg font-extrabold tracking-tight text-yellow-400 sm:text-xl">
          {siteConfig.name}
        </span>
        <span className="text-[11px] text-muted text-white">
          Dari Untirta, Menuju Juara
        </span>
      </div>
    </Link>
  );
}