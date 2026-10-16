
import type { Metadata } from "next";
import type { RowDataPacket } from "mysql2";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Heart, MessageCircle, Bookmark, Users, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Notifikasi" };
export const dynamic = "force-dynamic";

interface NotificationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: "connection_request" | "connection_accepted" | "like" | "comment" | "saved";
  message: string;
  reference_id: string | null;
  is_read: number | boolean;
  created_at: Date | string;
}

export default async function NotificationsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  try {
    // Membuka halaman notifikasi menandai seluruh notifikasi akun ini telah dibaca.
    await db.query(
      "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
      [user.id],
    );

    const [rows] = await db.query<NotificationRow[]>(
      `SELECT id, user_id, type, message, reference_id, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [user.id],
    );

    return (
      <main className="space-y-6">
        <PageHeader
          title="Notifikasi"
          description="Permintaan koneksi, suka, komentar, dan aktivitas postinganmu."
        />

        {rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-12 text-center">
            <Bell size={32} className="mx-auto text-gray-400" />
            <h2 className="mt-3 font-semibold text-gray-900">
              Belum ada notifikasi
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Notifikasi baru akan tampil di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {rows.map((notification) => {
              const href =
                notification.type === "like" ||
                notification.type === "comment" ||
                notification.type === "saved"
                  ? notification.reference_id
                    ? `/posts/${notification.reference_id}`
                    : "/feed"
                  : "/connections";

              const Icon =
                notification.type === "like"
                  ? Heart
                  : notification.type === "comment"
                    ? MessageCircle
                    : notification.type === "saved"
                      ? Bookmark
                      : notification.type === "connection_accepted"
                        ? CheckCircle
                        : Users;

              const date = new Date(notification.created_at);

              return (
                <Link
                  key={notification.id}
                  href={href}
                  className="flex items-start gap-3 p-4 transition hover:bg-gray-50"
                >
                  <div className="mt-0.5 rounded-full bg-gray-100 p-2.5 text-gray-700">
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-gray-900">
                      {notification.message}
                    </p>
                    <time className="mt-1 block text-xs text-gray-500">
                      {date.toLocaleString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    );
  } catch (error) {
    console.error("Error loading notifications:", error);

    return (
      <main className="space-y-6">
        <PageHeader
          title="Notifikasi"
          description="Permintaan koneksi, suka, dan komentar di postinganmu."
        />
        <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat notifikasi. Periksa koneksi database dan terminal aplikasi.
        </p>
      </main>
    );
  }
}
