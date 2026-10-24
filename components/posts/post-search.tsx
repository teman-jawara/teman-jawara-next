"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertCircle, Loader2, Search, X } from "lucide-react";
import type { Post } from "@/types";

type SortMode = "latest" | "oldest";

type SearchItem = {
  post: Post;
};

type SearchResponse = {
  success: boolean;
  data?: SearchItem[];
  total?: number;
  message?: string;
};

type Status = "idle" | "loading" | "success" | "error";

type PostSearchProps = {
  renderPost: (post: Post) => ReactNode;
  children?: ReactNode;
  endpoint?: string;
  className?: string;
  listClassName?: string;
};

export default function PostSearch({
  renderPost,
  children,
  endpoint = "/api/posts/search",
  className,
  listClassName,
}: PostSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("latest");
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const q = query.trim();
  const hasQuery = q !== "";

  // Feed lama selalu urut terbaru. Kalau ada kata kunci ATAU urutan "terlama",
  // daftar diambil dari endpoint pencarian supaya urutannya sesuai pilihan.
  const isActive = hasQuery || sort === "oldest";

  // Tunggu 400 ms setelah berhenti mengetik sebelum memanggil API
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debouncedQuery === "" && sort === "latest") {
      setStatus("idle");
      setItems([]);
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const params = new URLSearchParams({ sort });
    if (debouncedQuery !== "") params.set("q", debouncedQuery);

    fetch(`${endpoint}?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as SearchResponse | null;
        if (!res.ok || !json?.success || !Array.isArray(json.data)) {
          throw new Error(json?.message || "Pencarian gagal.");
        }
        setItems(json.data);
        setTotal(json.total ?? json.data.length);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrorMessage(err instanceof Error ? err.message : "Pencarian gagal.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [debouncedQuery, sort, endpoint, retryCount]);

  return (
    <section className={className ?? "w-full"}>
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul, skill, atau biodata penulis"
              aria-label="Cari postingan"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-navy-800 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Hapus kata kunci"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            aria-label="Urutkan postingan"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-navy-800 focus:outline-none"
          >
            <option value="latest">Terbaru</option>
            <option value="oldest">Terlama</option>
          </select>
        </div>
      </form>

      <div className="mt-4" aria-live="polite">
        {/* Tanpa kata kunci dan urutan terbaru: tampilkan Feed seperti biasa */}
        {!isActive && children}

        {isActive && (status === "loading" || status === "idle") && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat postingan...
          </div>
        )}

        {isActive && status === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-10 text-center">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-red-700">
              {errorMessage || "Pencarian gagal."}
            </p>
            <button
              type="button"
              onClick={() => setRetryCount((n) => n + 1)}
              className="rounded-xl bg-navy-800 px-4 py-2 text-sm font-semibold text-white"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {isActive && status === "success" && items.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center">
            <Search className="h-6 w-6 text-slate-400" />
            <p className="font-semibold text-slate-500">
              Tidak ada postingan yang cocok.
            </p>
            <p className="text-sm text-slate-500">Coba kata kunci lain.</p>
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-xl bg-navy-800 px-4 py-2 text-sm font-semibold text-white"
              >
                Hapus Pencarian
              </button>
            )}
          </div>
        )}

        {isActive && status === "success" && items.length > 0 && (
          <div>
            <p className="mb-2 text-sm text-slate-500">
              {total} postingan ditemukan
            </p>
            <div className={listClassName ?? "space-y-4"}>
              {items.map((item) => (
                <div key={item.post.id}>{renderPost(item.post)}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}