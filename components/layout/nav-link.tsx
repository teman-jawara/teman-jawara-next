
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils/cn";

type NavLinkProps = {
  href: string;
  label: string;
  icon: IconName;
  badgeCount?: number;
  variant?: "sidebar" | "tab";
};

export function NavLink({
  href,
  label,
  icon,
  badgeCount = 0,
  variant = "sidebar",
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);
  const showBadge = badgeCount > 0 && !isActive;

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
  ? "bg-white/15 text-white"
  : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      <span className="relative inline-flex shrink-0">
        <Icon
          name={icon}
          className={variant === "tab" ? "size-6" : "size-5"}
        />

        {showBadge && (
          <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </span>

      <span>{label}</span>

      {showBadge && variant === "sidebar" && (
        <span className="ml-auto rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold leading-none text-white">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
