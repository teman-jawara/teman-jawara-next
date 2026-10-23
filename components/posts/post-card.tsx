"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import {
  MessageCircle,
  Heart,
  ChartNoAxesColumn,
  Bookmark,
  Share,
  MoreHorizontal,
} from "lucide-react";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  currentUserId?: string | null;
  showActions?: boolean;
  viewMode?: "feed" | "profile" | "detail";
}

export function PostCard({ post,currentUserId, showActions = true, viewMode = "feed" }: PostCardProps) {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isOwner = Boolean(currentUserId && currentUserId === post.user_id);
  const isDetailView = viewMode === "detail"; // Jika showActions false, berarti ini detail view
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? 0);
  const [likeLoading, setLikeLoading] = useState(false);

  const name = post.author?.full_name || "Mahasiswa Untirta";
  const username = String(post.author?.nim ?? "").trim();

  const time = post.created_at
    ? new Date(post.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      })
    : "";

  useEffect(() => {
    let cancelled = false;

    async function loadLikeStatus() {
      try {
        const response = await fetch(
          `/api/posts/${post.id}/interactions`,
          { cache: "no-store" },
        );

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Server tidak mengembalikan JSON.");
        }

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal memuat status like.");
        }

        if (!cancelled) {
          setLiked(Boolean(result.data.isLiked));
          setLikeCount(
            Number(result.data.likeCount ?? post.like_count ?? 0),
          );
          setBookmarked(Boolean(result.data.isSaved));
        }
      } catch (error) {
        console.error("Gagal memuat status like:", error);
      }
    }

    void loadLikeStatus();

    return () => {
      cancelled = true;
    };
  }, [post.id, post.like_count]);

  async function handleLike() {
    if (likeLoading) return;

    const action = liked ? "unlike" : "like";

    setLikeLoading(true);

    try {
      const response = await fetch(
        `/api/posts/${post.id}/interactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      const result = await response.json();

      if (response.status === 401) {
        router.push("/login");
        router.refresh();
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal menyimpan like.");
      }

      setLiked(action === "like");
      setLikeCount((count) =>
        Math.max(0, count + (action === "like" ? 1 : -1)),
      );
    } catch (error) {
      console.error("Gagal memproses like:", error);
      alert(
        error instanceof Error ? error.message : "Gagal menyimpan like.",
      );
    } finally {
      setLikeLoading(false);
    }
  }

  async function handleBookmark() {
  if (bookmarkLoading) return;

  const action = bookmarked ? "unsave" : "save";
  setBookmarkLoading(true);

  try {
    const response = await fetch(
      `/api/posts/${post.id}/interactions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      },
    );

    const result = await response.json();

    if (response.status === 401) {
      router.push("/login");
      router.refresh();
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal menyimpan postingan.");
    }

    setBookmarked(action === "save");
  } catch (error) {
    console.error("Gagal menyimpan postingan:", error);
    alert(
      error instanceof Error
        ? error.message
        : "Gagal menyimpan postingan.",
    );
  } finally {
    setBookmarkLoading(false);
  }
}
  async function handleShare() {
    const url = `${window.location.origin}/posts/${post.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: post.description,
          url,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;

        try {
          await navigator.clipboard.writeText(url);
          alert("Tautan berhasil disalin.");
        } catch {
          window.prompt("Salin tautan postingan:", url);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Tautan berhasil disalin.");
      } catch {
        window.prompt("Salin tautan postingan:", url);
      }
    }
  }

  async function handleDelete() {
  if (!window.confirm("Yakin ingin menghapus postingan ini?")) {
    return;
  }

  setDeleteLoading(true);

  try {
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "DELETE",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Gagal menghapus postingan.",
      );
    }

    setMenuOpen(false);

    if (viewMode === "profile") {
      router.refresh();
    } else {
      router.push("/feed");
      router.refresh();
    }
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat menghapus postingan.",
    );
  } finally {
    setDeleteLoading(false);
  }
}
  return (
    <article className="border-b border-gray-200 bg-white px-4 py-4 transition hover:bg-gray-50/50">
      <div className="flex gap-3">
        <Link
          href={`/profile/${post.user_id}`}
          className="shrink-0"
          aria-label={`Lihat profil ${name}`}
        >
          <Avatar name={name} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1 text-sm">
            <Link
              href={`/profile/${post.user_id}`}
              className="truncate font-bold text-gray-950 hover:underline"
            >
              {name}
            </Link>

            <span className="truncate text-gray-500">
              @{username || "NIM kosong"}
            </span>

            {time && (
              <span className="shrink-0 text-gray-500">· {time}</span>
            )}

            

{(
  viewMode === "feed" ||
  ((viewMode === "profile" || viewMode === "detail") && isOwner)
) && (
  <div className="relative ml-auto shrink-0">
    <button
      type="button"
      aria-label="Opsi postingan"
      aria-expanded={menuOpen}
      onClick={() => setMenuOpen((value) => !value)}
      className="rounded-full p-1 text-gray-500 hover:bg-blue-50 hover:text-blue-600"
    >
      <MoreHorizontal size={19} />
    </button>

    {menuOpen && (
      <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
        {viewMode !== "feed" ? (
          <>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                router.push(`/posts/${post.id}/edit`);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Edit postingan
            </button>

            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleteLoading}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleteLoading ? "Menghapus..." : "Hapus postingan"}
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/posts/${post.id}`}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Lihat postingan
            </Link>

            <Link
              href={`/profile/${post.user_id}`}
              onClick={() => setMenuOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Lihat profil
            </Link>
          </>
        )}
      </div>
    )}
  </div>
)}


          </div>

          <Link href={`/posts/${post.id}`} className="block">
            {post.category && (
              <div className="mt-2 mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {post.category}
                </span>

                {post.category !== "Other" && post.partner_match && (
                  post.partner_match.has_sufficient_data && post.partner_match.score !== null ? (
                    <span
                      title="Skor kecocokan kompetensi dan relevansi partner"
                      className="inline-flex items-center gap-1 rounded-full border border-gold-400 bg-gold-50 px-2.5 py-0.5 text-xs font-semibold text-navy-900"
                    >
                      ⚡ {post.partner_match.display_label}
                    </span>
                  ) : (
                    <span
                      title="Data profil atau kompetensi belum mencukupi untuk penilaian kecocokan"
                      className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                    >
                      {post.partner_match.display_label || "Data belum cukup"}
                    </span>
                  )
                )}
              </div>
            )}

            {post.description && (
              <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-6 text-gray-900">
                {post.description}
              </p>
            )}

            {post.image_url && (
              <img
                src={post.image_url}
                alt="Gambar postingan"
                className="mt-3 max-h-[550px] w-full rounded-2xl border border-gray-200 object-contain"
              />
            )}
          </Link>

          {showActions && (
            <div className="mt-3 flex items-center justify-between text-gray-500">
              <Link
                href={`/posts/${post.id}`}
                aria-label="Buka postingan untuk membalas"
                className="flex items-center gap-1 rounded-full p-1 hover:text-sky-600"
              >
                <MessageCircle size={19} />
                <span>{post.comment_count ?? 0}</span>
              </Link>

              <button
                type="button"
                aria-label={liked ? "Batal menyukai" : "Sukai postingan"}
                onClick={() => void handleLike()}
                disabled={likeLoading}
                className={`flex items-center gap-1 rounded-full p-1 transition hover:text-pink-600 disabled:opacity-50 ${
                  liked ? "text-pink-600" : ""
                }`}
              >
                <Heart
                  size={19}
                  fill={liked ? "currentColor" : "none"}
                />
                <span>{likeCount}</span>
              </button>

              <Link
  href={`/posts/${post.id}`}
  aria-label={`${post.view_count ?? 0} views`}
  className="flex items-center gap-1 rounded-full p-1 hover:text-sky-600"
>
  <ChartNoAxesColumn size={19} />
  <span>{post.view_count ?? 0}</span>
</Link>

              <button
                type="button"
                aria-label="Simpan postingan"
                onClick={handleBookmark}
                disabled={bookmarkLoading}
                className={`rounded-full p-1 hover:text-sky-600 ${
                  bookmarked ? "text-sky-600" : ""
                }`}
              >
                <Bookmark
                  size={19}
                  fill={bookmarked ? "currentColor" : "none"}
                />
              </button>

              <button
                type="button"
                aria-label="Bagikan postingan"
                onClick={handleShare}
                className="rounded-full p-1 hover:text-sky-600"
              >
                <Share size={19} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
