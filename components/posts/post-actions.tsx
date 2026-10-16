"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface PostActionsProps {
  postId: string | number;
}

export function PostActions({ postId }: PostActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Yakin ingin menghapus postingan ini?")) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Gagal menghapus postingan.");
      }

      router.push("/feed");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={loading}
        aria-label="Opsi postingan"
        className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
      >
        <MoreHorizontal size={20} />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-44 rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => router.push(`/posts/${postId}/edit`)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            <Pencil size={16} />
            Edit postingan
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={16} />
            {loading ? "Menghapus..." : "Hapus postingan"}
          </button>
        </div>
      )}
    </div>
  );
}