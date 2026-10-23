"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Plus, ExternalLink, Pencil, Trash2, X, AlertCircle } from "lucide-react";
import { COMPETITION_CATEGORIES } from "@/constants/competition";
import type { Achievement } from "@/types";

interface AchievementsSectionProps {
  initialAchievements: Achievement[];
  userId: string;
  isEditable?: boolean;
}

export function AchievementsSection({
  initialAchievements,
  userId,
  isEditable = false,
}: AchievementsSectionProps) {
  const router = useRouter();
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Achievement | null>(null);

  // Form states
  const [competitionName, setCompetitionName] = useState("");
  const [achievementTitle, setAchievementTitle] = useState("");
  const [category, setCategory] = useState<string>(COMPETITION_CATEGORIES[0]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [description, setDescription] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  function openAddModal() {
    setEditingItem(null);
    setCompetitionName("");
    setAchievementTitle("");
    setCategory(COMPETITION_CATEGORIES[0]);
    setYear(new Date().getFullYear());
    setDescription("");
    setProofUrl("");
    setErrorMsg("");
    setIsModalOpen(true);
  }

  function openEditModal(item: Achievement) {
    setEditingItem(item);
    setCompetitionName(item.competition_name);
    setAchievementTitle(item.achievement_title);
    setCategory(item.category || COMPETITION_CATEGORIES[0]);
    setYear(item.year || new Date().getFullYear());
    setDescription(item.description || "");
    setProofUrl(item.proof_url || "");
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

    const payload = {
      competition_name: competitionName.trim(),
      achievement_title: achievementTitle.trim(),
      category: category.trim(),
      year: Number(year),
      description: description.trim() || null,
      proof_url: proofUrl.trim() || null,
    };

    try {
      if (editingItem) {
        // Update
        const res = await fetch(`/api/profile/achievements/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Gagal memperbarui prestasi.");
        }
        setAchievements((prev) =>
          prev.map((a) => (a.id === editingItem.id ? { ...a, ...payload } : a)),
        );
      } else {
        // Create
        const res = await fetch("/api/profile/achievements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Gagal menambahkan prestasi.");
        }
        setAchievements((prev) => [result.data, ...prev]);
      }

      closeModal();
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Achievement) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus prestasi "${item.achievement_title} - ${item.competition_name}"? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) return;

    setDeleteLoadingId(item.id);
    try {
      const res = await fetch(`/api/profile/achievements/${item.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus prestasi.");
      }
      setAchievements((prev) => prev.filter((a) => a.id !== item.id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus prestasi.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
            <Trophy className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-navy-900 sm:text-lg">
              Prestasi & Pencapaian
            </h2>
            <p className="text-xs text-muted sm:text-sm">
              Rekam jejak kompetisi dan penghargaan yang pernah diraih.
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
            Tambah Prestasi
          </button>
        )}
      </div>

      {achievements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center">
          <Trophy className="size-10 text-muted opacity-40" />
          <p className="mt-2 text-sm font-medium text-navy-900">Belum ada prestasi</p>
          <p className="mt-0.5 text-xs text-muted">
            {isEditable
              ? "Tambahkan pencapaian kompetisi untuk meningkatkan daya tarik calon partner tim."
              : "Pengguna ini belum menambahkan catatan prestasi."}
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
          {achievements.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-xl border border-line bg-surface/50 p-4 transition hover:border-navy-200 hover:bg-white"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-bold text-navy-900">
                        {item.achievement_title}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-line bg-white px-2 py-0.5 text-xs font-medium text-muted">
                        {item.year}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-medium text-navy-800">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="mt-2 text-sm font-bold text-navy-900 sm:text-base">
                      {item.competition_name}
                    </h3>
                  </div>

                  {isEditable && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-muted hover:bg-navy-50 hover:text-navy-800"
                        title="Edit Prestasi"
                        aria-label="Edit Prestasi"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deleteLoadingId === item.id}
                        className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Hapus Prestasi"
                        aria-label="Hapus Prestasi"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>

                {item.description && (
                  <p className="whitespace-pre-wrap text-xs text-muted leading-relaxed sm:text-sm">
                    {item.description}
                  </p>
                )}
              </div>

              {item.proof_url && (
                <div className="mt-3 pt-2 border-t border-line/60">
                  <a
                    href={item.proof_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-navy-700 hover:text-navy-900 hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    Lihat Bukti Prestasi / Sertifikat
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
                {editingItem ? "Ubah Prestasi" : "Tambah Prestasi Baru"}
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
                  Nama Kompetisi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gemastik XVI, Hackathon Banten 2024"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                  maxLength={255}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-navy-800">
                    Capaian / Gelar <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Juara 1, Finalis, Top 10"
                    value={achievementTitle}
                    onChange={(e) => setAchievementTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                    maxLength={150}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-800">
                    Tahun <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1990}
                    max={new Date().getFullYear() + 2}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Kategori Lomba <span className="text-red-500">*</span>
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
                  Deskripsi / Rincian Capaian
                </label>
                <textarea
                  rows={3}
                  placeholder="Ceritakan peranmu atau proyek yang dilombakan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                  maxLength={2000}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Tautan Bukti / Sertifikat (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/... atau https://..."
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
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
