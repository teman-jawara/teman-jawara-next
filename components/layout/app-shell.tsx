import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

/** Kerangka halaman area aplikasi: sidebar (desktop), topbar, konten, bar bawah (mobile). */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-10">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
