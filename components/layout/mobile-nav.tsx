import { NavLink } from "@/components/layout/nav-link";
import { mobileNavItems } from "@/constants/navigation";

/** Bar navigasi bawah untuk layar kecil (di bawah lg). */
export function MobileNav() {
  return (
    <nav
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {mobileNavItems.map((item) => (
        <NavLink key={item.href} {...item} variant="tab" />
      ))}
    </nav>
  );
}
