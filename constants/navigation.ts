import type { IconName } from "@/components/ui/icon";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

/** Menu utama area aplikasi (setelah login). */
export const appNavItems: NavItem[] = [
  { label: "Feed", href: "/feed", icon: "home" },
  { label: "Tersimpan", href: "/saved", icon: "bookmark" },
  { label: "Koneksi", href: "/connections", icon: "users" },
  { label: "Notifikasi", href: "/notifications", icon: "bell" },
  { label: "Profil saya", href: "/me", icon: "user" },
];

export const createPostItem: NavItem = {
  label: "Buat postingan",
  href: "/posts/create",
  icon: "plus",
};

/** Menu bar bawah di layar kecil (urutan = urutan tampil). */
export const mobileNavItems: NavItem[] = [
  appNavItems[0], // Feed
  appNavItems[1], // Tersimpan
  createPostItem,
  appNavItems[2], // Koneksi
  appNavItems[3], // Notifikasi
];
