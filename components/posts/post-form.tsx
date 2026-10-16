"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { X, Image as ImageIcon, Loader2 } from "lucide-react";
import type { Post } from "@/types";
import { COMPETITION_CATEGORIES } from "@/constants/competition";
interface PostFormProps {
  initialData?: Post;
  isEdit?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  user?: {
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function PostForm({
  initialData,
  isEdit = false,
  onClose,
  onSuccess,
  user,
}: PostFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState(
    initialData?.description ?? "",
  );
  const [category, setCategory] = useState<string>(
  initialData?.category &&
    COMPETITION_CATEGORIES.some(
      (item) => item === initialData.category,
    )
    ? initialData.category
    : "Other",
);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.image_url ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Pilih file gambar yang valid.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      return;
    }

    setError("");
    setImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  }

  function handleClose() {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!description.trim() && !imageFile && !imagePreview) {
      setError("Tulis sesuatu atau tambahkan gambar terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let imageUrl = initialData?.image_url ?? null;

      // Upload the image only if an existing upload endpoint is available.
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error(
            "Upload gambar gagal. Pastikan endpoint /api/upload tersedia.",
          );
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url ?? uploadData.image_url ?? null;

        if (!imageUrl) {
          throw new Error("Server upload tidak mengembalikan URL gambar.");
        }
      }

      // Keep compatibility with the existing MySQL posts schema.
      const payload = {
        title:
          description.trim().split(/\r?\n/)[0].slice(0, 200) ||
          (imageUrl ? "Postingan gambar" : "Postingan baru"),
        description: description.trim(),
        category: category,
        event_name: initialData?.event_name ?? null,
        deadline: initialData?.deadline ?? null,
        teammate_count: initialData?.teammate_count ?? 1,
        faculty_preference: initialData?.faculty_preference ?? null,
        study_program_preference:
          initialData?.study_program_preference ?? null,
        required_skills: initialData?.required_skills ?? [],
        status: initialData?.status ?? "active",
        image_url: imageUrl,
      };

      const response = await fetch(
        isEdit ? `/api/posts/${initialData?.id}` : "/api/posts",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Gagal memublikasikan postingan.",
        );
      }

      onSuccess?.();

      if (!onClose && !onSuccess) {
        router.push(isEdit ? `/posts/${initialData?.id}` : "/feed");
      }

      router.refresh();
    } catch (err: unknown) {
      console.error("Post submission error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengirim postingan.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">
          {isEdit ? "Edit postingan" : "Buat postingan"}
        </h2>

        <button
          type="button"
          onClick={handleClose}
          disabled={loading}
          aria-label="Tutup composer"
          className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="flex items-start gap-3">
          <Avatar
            name={user?.full_name || "Pengguna"}
            size="md"
            className="shrink-0"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's happening?"
            aria-label="Isi postingan"
            rows={4}
            maxLength={5000}
            disabled={loading}
            className="min-h-28 flex-1 resize-y border-0 bg-transparent py-2 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 disabled:opacity-60"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
  <label
    htmlFor="post-category"
    className="text-sm font-medium text-gray-700"
  >
    Kategori
  </label>

  <select
    id="post-category"
    value={category}
    onChange={(e) => setCategory(e.target.value)}
    disabled={loading}
    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500"
  >
    {COMPETITION_CATEGORIES.map((item) => (
      <option key={item} value={item}>
        {item}
      </option>
    ))}
  </select>
</div>

        {imagePreview && (
          <div className="relative mt-3 overflow-hidden rounded-xl border border-gray-200">
            <img
              src={imagePreview}
              alt="Preview gambar postingan"
              className="max-h-80 w-full object-contain"
            />

            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              aria-label="Hapus gambar"
              className="absolute right-2 top-2 rounded-full bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          aria-label="Pilih gambar"
        />

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            aria-label="Tambahkan gambar"
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-blue-900 transition hover:bg-yellow-200 disabled:opacity-50"
          >
            <ImageIcon size={20} />
            <span>Foto</span>
          </button>

          <button
            type="submit"
            disabled={loading || (!description.trim() && !imageFile && !imagePreview)}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Memposting..." : isEdit ? "Simpan" : "Post"}
          </button>
        </div>
      </form>
    </div>
  );
}