"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderGit2, Plus, ExternalLink, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { COMPETITION_CATEGORIES } from "@/constants/competition";
import type { Project } from "@/types";

interface ProjectsSectionProps {
  initialProjects: Project[];
  userId: string;
  isEditable?: boolean;
}

export function ProjectsSection({
  initialProjects,
  userId,
  isEditable = false,
}: ProjectsSectionProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Project | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(COMPETITION_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [technologiesInput, setTechnologiesInput] = useState("");
  const [projectUrl, setProjectUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  function openAddModal() {
    setEditingItem(null);
    setTitle("");
    setCategory(COMPETITION_CATEGORIES[0]);
    setDescription("");
    setTechnologiesInput("");
    setProjectUrl("");
    setErrorMsg("");
    setIsModalOpen(true);
  }

  function openEditModal(item: Project) {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category || COMPETITION_CATEGORIES[0]);
    setDescription(item.description);
    setTechnologiesInput(item.technologies ? item.technologies.join(", ") : "");
    setProjectUrl(item.project_url || "");
    setErrorMsg("");
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingItem(null);
    setErrorMsg("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    const techArray = technologiesInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      technologies: techArray,
      project_url: projectUrl.trim() || null,
    };

    try {
      if (editingItem) {
        const res = await fetch(`/api/profile/projects/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Gagal memperbarui proyek.");
        }
        setProjects((prev) =>
          prev.map((p) => (p.id === editingItem.id ? { ...p, ...payload } : p)),
        );
      } else {
        const res = await fetch("/api/profile/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Gagal menambahkan proyek.");
        }
        setProjects((prev) => [result.data, ...prev]);
      }

      closeModal();
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Project) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus proyek "${item.title}"? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) return;

    setDeleteLoadingId(item.id);
    try {
      const res = await fetch(`/api/profile/projects/${item.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus proyek.");
      }
      setProjects((prev) => prev.filter((p) => p.id !== item.id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus proyek.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-navy-100 text-navy-800">
            <FolderGit2 className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-navy-900 sm:text-lg">
              Portofolio & Proyek
            </h2>
            <p className="text-xs text-muted sm:text-sm">
              Proyek nyata, implementasi sistem, dan karya yang pernah dibuat.
            </p>
          </div>
        </div>

        {isEditable && (
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-navy-700"
          >
            <Plus className="size-4" />
            Tambah Proyek
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center">
          <FolderGit2 className="size-10 text-muted opacity-40" />
          <p className="mt-2 text-sm font-medium text-navy-900">Belum ada portofolio atau proyek</p>
          <p className="mt-0.5 text-xs text-muted">
            {isEditable
              ? "Tampilkan portofolio terbaikmu untuk membuktikan keahlian teknismu."
              : "Pengguna ini belum menambahkan portofolio atau proyek."}
          </p>
          {isEditable && (
            <button
              type="button"
              onClick={openAddModal}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline"
            >
              <Plus className="size-3.5" /> Tambah sekarang
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {projects.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-xl border border-line bg-surface/50 p-4 transition hover:border-navy-200 hover:bg-white"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-sm font-bold text-navy-900 sm:text-base">
                      {item.title}
                    </h3>
                  </div>

                  {isEditable && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-muted hover:bg-navy-50 hover:text-navy-800"
                        title="Edit Proyek"
                        aria-label="Edit Proyek"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deleteLoadingId === item.id}
                        className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Hapus Proyek"
                        aria-label="Hapus Proyek"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="whitespace-pre-wrap text-xs text-muted leading-relaxed sm:text-sm">
                  {item.description}
                </p>

                {item.technologies && item.technologies.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {item.technologies.map((tech, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center rounded-md border border-line bg-white px-2 py-0.5 text-[11px] font-medium text-navy-800"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {item.project_url && (
                <div className="mt-3 pt-2 border-t border-line/60">
                  <a
                    href={item.project_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Buka Tautan Proyek
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-navy-900">
                {editingItem ? "Ubah Proyek" : "Tambah Proyek Baru"}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-muted hover:bg-navy-50 hover:text-navy-900"
              >
                <X className="size-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                <AlertCircle className="size-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Judul Proyek <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TemanJawara Platform, E-Commerce Untirta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Kategori Proyek <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-hidden"
                >
                  {COMPETITION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Deskripsi Proyek <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Jelaskan tujuan, fitur utama, dan kontribusimu dalam proyek ini..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                  maxLength={3000}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Teknologi / Tools yang Digunakan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: React, Next.js, MySQL, Tailwind CSS (pisahkan koma)"
                  value={technologiesInput}
                  onChange={(e) => setTechnologiesInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Pisahkan dengan koma untuk menambahkan beberapa teknologi.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Tautan Proyek / Demo / GitHub (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://github.com/... atau https://..."
                  value={projectUrl}
                  onChange={(e) => setProjectUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-semibold text-navy-800 hover:bg-surface disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg bg-navy-800 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : editingItem ? "Simpan Perubahan" : "Tambahkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
