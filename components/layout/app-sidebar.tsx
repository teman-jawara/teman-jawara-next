import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { NavLink } from "@/components/layout/nav-link";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { appNavItems, createPostItem } from "@/constants/navigation";

/** Sidebar untuk layar lebar (lg ke atas). */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 border-r border-line bg-white px-4 py-6 lg:flex">
      <Logo href="/feed" className="px-2" />

      <Link href={createPostItem.href} className={buttonStyles({ variant: "accent", fullWidth: true })}>
        <Icon name="plus" />
        {createPostItem.label}
      </Link>

      <nav aria-label="Menu utama" className="flex flex-col gap-1">
        {appNavItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
