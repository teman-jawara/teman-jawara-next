"use client";

import { useEffect, useState, useTransition } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { Search } from "lucide-react";

interface FeedSearchProps {
  children: React.ReactNode;
}

export function FeedSearch({ children }: FeedSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const queryString = searchParams.toString();

  const [search, setSearch] = useState(
    searchParams.get("search") ?? "",
  );

  // Sinkronkan kolom pencarian ketika parameter URL berubah.
  useEffect(() => {
    setSearch(
      new URLSearchParams(queryString).get("search") ?? "",
    );
  }, [queryString]);

  // Perbarui URL dan pertahankan parameter lainnya.
  function updateParams(changes: Record<string, string>) {
    const params = new URLSearchParams(queryString);

    for (const [key, value] of Object.entries(changes)) {
      const trimmedValue = value.trim();

      if (trimmedValue) {
        params.set(key, trimmedValue);
      } else {
        params.delete(key);
      }
    }

    const query = params.toString();

    startTransition(() => {
      router.replace(
        query ? `${pathname}?${query}` : pathname,
        { scroll: false },
      );
    });
  }

  // Jalankan pencarian setelah pengguna berhenti mengetik 400 ms.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentSearch =
        new URLSearchParams(queryString).get("search") ?? "";

      if (search.trim() !== currentSearch) {
        updateParams({ search });
      }
    }, 400);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, queryString]);

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-navy-800 focus:ring-2 focus:ring-navy-100";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row">
          {/* Kolom pencarian */}
          <div className="relative flex-1">
            <Search
              size={18}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NIM, jurusan, fakultas, atau angkatan"
              aria-label="Cari postingan"
              className={`${inputClass} pl-10`}
            />
          </div>

          {/* Pengurutan postingan */}
          <select
            value={searchParams.get("sort") ?? "terbaru"}
            onChange={(event) =>
              updateParams({ sort: event.target.value })
            }
            aria-label="Urutkan postingan"
            className={`${inputClass} sm:w-40`}
          >
            <option value="terbaru">Terbaru</option>
            <option value="terlama">Terlama</option>
          </select>
        </div>
      </div>

      {/* Daftar postingan */}
      <div
        className={
          isPending
            ? "opacity-60 transition-opacity"
            : "transition-opacity"
        }
        aria-busy={isPending}
      >
        {children}
      </div>
    </div>
  );
}
