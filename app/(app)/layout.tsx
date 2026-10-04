import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout semua halaman area aplikasi.
 * Proteksi rute (wajib login) ditambahkan di Build 2 bersama Supabase Auth.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
