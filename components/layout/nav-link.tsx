"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

type NavLinkProps = {
  href: string;
  label: string;
  icon: IconName;
  /** "sidebar" = baris horizontal, "tab" = ikon di atas label (bar bawah mobile). */
  variant?: "sidebar" | "tab";
};

export function NavLink({ href, label, icon, variant = "sidebar" }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "transition-colors",
        variant === "sidebar" &&
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold",
        variant === "tab" &&
          "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium",
        isActive
          ? "bg-navy-100 text-navy-800"
          : "text-muted hover:bg-navy-50 hover:text-navy-800",
        variant === "tab" && isActive && "bg-transparent",
      )}
    >
      <Icon name={icon} className={variant === "tab" ? "size-6" : "size-5"} />
      {label}
    </Link>
  );
}
