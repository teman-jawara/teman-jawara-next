
import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import { Logo } from "@/components/layout/logo";
import { NavLink } from "@/components/layout/nav-link";
import { buttonStyles } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { appNavItems, createPostItem } from "@/constants/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface CountRow extends RowDataPacket {
  total: number | string;
}

/** Sidebar desktop dengan badge notifikasi dari MySQL. */
export async function AppSidebar() {
  let notificationCount = 0;
  let connectionRequestCount = 0;

  try {
    const user = await getAuthenticatedUser();

    if (user) {
      const [notificationRows] = await db.query<CountRow[]>(
        `SELECT COUNT(*) AS total
         FROM notifications
         WHERE user_id = ? AND is_read = 0`,
        [user.id],
      );

      const [connectionRows] = await db.query<CountRow[]>(
        `SELECT COUNT(*) AS total
         FROM notifications
         WHERE user_id = ?
           AND type = 'connection_request'
           AND is_read = 0`,
        [user.id],
      );

      notificationCount = Number(notificationRows[0]?.total ?? 0);
      connectionRequestCount = Number(connectionRows[0]?.total ?? 0);
    }
  } catch (error) {
    console.error("Error loading sidebar badge counts:", error);
  }

  return (
    <aside className="sticky top-0 hidden h-screen max-h-screen w-64 shrink-0 flex-col gap-6 self-start overflow-y-auto border-r border-line bg-navy-900/95 px-4 py-6 lg:flex">
      <Logo href="/feed" className="px-2" />

      <Link
        href={createPostItem.href}
        className={buttonStyles({
          variant: "accent",
          fullWidth: true,
        })}
      >
        <Icon name="plus" />
        {createPostItem.label}
      </Link>

      <nav aria-label="Menu utama" className="flex flex-col gap-1">
        {appNavItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            badgeCount={
              item.href === "/notifications"
                ? notificationCount
                : item.href === "/connections"
                  ? connectionRequestCount
                  : 0
            }
          />
        ))}
      </nav>
    </aside>
  );
}
 