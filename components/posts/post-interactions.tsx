
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  ChartNoAxesColumn,
  Bookmark,
  Share,
  Send,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

interface CommentItem {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  author_nim: string | null;
}

interface InteractionData {
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLiked: boolean;
  isSaved: boolean;
  comments: CommentItem[];
}

interface PostInteractionsProps {
  postId: string;
}

type InteractionAction =
  | "like"
  | "unlike"
  | "save"
  | "unsave"
  | "comment";

const initialData: InteractionData = {
  likeCount: 0,
  commentCount: 0,
  viewCount: 0,
  isLiked: false,
  isSaved: false,
  comments: [],
};

export function PostInteractions({ postId }: PostInteractionsProps) {
  const router = useRouter();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const viewTracked = useRef<string | null>(null);

  const [data, setData] = useState<InteractionData>(initialData);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refreshData = useCallback(async () => {
    const response = await fetch(
      `/api/posts/${postId}/interactions`,
      { cache: "no-store" },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memuat interaksi.");
    }

    setData(result.data as InteractionData);
  }, [postId]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        if (viewTracked.current !== postId) {
  viewTracked.current = postId;

          const viewResponse = await fetch(
            `/api/posts/${postId}/interactions`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "view" }),
            },
          );

          if (!viewResponse.ok) {
            throw new Error("Gagal mencatat kunjungan postingan.");
          }
        }

        const response = await fetch(
          `/api/posts/${postId}/interactions`,
          { cache: "no-store" },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal memuat interaksi.");
        }

        if (active) {
          setData(result.data as InteractionData);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memuat interaksi.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [postId]);

  async function performAction(
    action: InteractionAction,
    content?: string,
  ): Promise<boolean> {
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/posts/${postId}/interactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, content }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        if (response.status === 401) {
          router.push("/login");
          router.refresh();
          return false;
        }

        throw new Error(result.message || "Interaksi gagal disimpan.");
      }

      await refreshData();
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat menyimpan interaksi.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCommentSubmit(
  event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const content = comment.trim();
    if (!content || busy) return;

    const success = await performAction("comment", content);

    if (success) {
      setComment("");
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/posts/${postId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Postingan TemanJawara",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Tautan berhasil disalin.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;

      try {
        await navigator.clipboard.writeText(url);
        setNotice("Tautan berhasil disalin.");
      } catch {
        window.prompt("Salin tautan postingan:", url);
      }
    }
  }

  return (
    <div className="bg-white">
      <div className="flex items-center justify-around border-b border-gray-200 px-2 py-3">
        <button
          type="button"
          onClick={() =>
            void performAction(data.isLiked ? "unlike" : "like")
          }
          disabled={loading || busy}
          aria-label={data.isLiked ? "Batal menyukai" : "Sukai postingan"}
          className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition hover:bg-pink-50 ${
            data.isLiked ? "text-pink-600" : "text-gray-600"
          }`}
        >
          <Heart
            size={19}
            fill={data.isLiked ? "currentColor" : "none"}
          />
          <span>{data.likeCount}</span>
        </button>

        <button
          type="button"
          onClick={() => commentInputRef.current?.focus()}
          aria-label="Tulis komentar"
          className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
        >
          <MessageCircle size={19} />
          <span>{data.commentCount}</span>
        </button>

        <div
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600"
          aria-label={`${data.viewCount} views`}
        >
          <ChartNoAxesColumn size={19} />
          <span>{data.viewCount}</span>
        </div>

        <button
          type="button"
          onClick={() =>
            void performAction(data.isSaved ? "unsave" : "save")
          }
          disabled={loading || busy}
          aria-label={data.isSaved ? "Hapus dari simpanan" : "Simpan postingan"}
          className={`rounded-full p-2 transition hover:bg-blue-50 ${
            data.isSaved ? "text-blue-600" : "text-gray-600"
          }`}
        >
          <Bookmark
            size={19}
            fill={data.isSaved ? "currentColor" : "none"}
          />
        </button>

        <button
          type="button"
          onClick={() => void handleShare()}
          aria-label="Bagikan postingan"
          className="rounded-full p-2 text-gray-600 transition hover:bg-blue-50 hover:text-blue-600"
        >
          <Share size={19} />
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <h2 className="mb-4 font-semibold text-gray-900">
          Komentar terbaru
          <span className="ml-2 text-sm font-normal text-gray-500">
            {data.commentCount}
          </span>
        </h2>

        <form onSubmit={handleCommentSubmit} className="mb-5">
          <textarea
            ref={commentInputRef}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Tulis komentar..."
            maxLength={2000}
            rows={2}
            disabled={busy}
            className="w-full resize-y rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-blue-400 disabled:opacity-60"
          />

          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={busy || !comment.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500  disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Kirim komentar
            </button>
          </div>
        </form>

        {error && (
          <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="mb-3 text-sm text-emerald-700">
            {notice}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Memuat komentar...
          </div>
        ) : data.comments.length === 0 ? (
          <p className="py-5 text-center text-sm text-gray-500">
            Belum ada komentar. Jadilah yang pertama berkomentar!
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.comments.map((item) => {
              const authorName =
                item.author_name || "Mahasiswa Untirta";

              return (
                <article key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
                  <Link
                    href={`/profile/${item.user_id}`}
                    aria-label={`Profil ${authorName}`}
                    className="shrink-0"
                  >
                    <Avatar name={authorName} size="sm" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <Link
                        href={`/profile/${item.user_id}`}
                        className="text-sm font-semibold text-gray-900 hover:underline"
                      >
                        {authorName}
                      </Link>

                      {item.author_nim && (
                        <span className="text-xs text-gray-500">
                          @{item.author_nim}
                        </span>
                      )}

                      <time className="text-xs text-gray-400">
                        {new Date(item.created_at).toLocaleString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>

                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                      {item.content}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && data.commentCount > 5 && (
          <p className="mt-4 border-t border-gray-100 pt-3 text-center text-xs text-gray-500">
            Menampilkan 5 komentar terbaru dari {data.commentCount} komentar.
          </p>
        )}
      </div>
    </div>
  );
}
