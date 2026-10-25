"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Pencil, Trash2, X, AlertCircle, Calendar } from "lucide-react";
import { COMPETITION_CATEGORIES } from "@/constants/competition";
import type { Experience } from "@/types";

interface ExperiencesSectionProps {
  initialExperiences: Experience[];
  userId: string;
  isEditable?: boolean;
}

export function ExperiencesSection({
  initialExperiences,
  userId,
  isEditable = false,
}: ExperiencesSectionProps) {
  const router = useRouter();
  const [experiences, setExperiences] = useState<Experience[]>(initialExperiences);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Experience | null>(null);

  // Form states
  const [role, setRole] = useState("");
  const [organizationOrProject, setOrganizationOrProject] = useState("");
  const [category, setCategory] = useState<string>(COMPETITION_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [technologiesInput, setTechnologiesInput] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isOngoing, setIsOngoing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  function openAddModal() {
    setEditingItem(null);
    setRole("");
    setOrganizationOrProject("");
    setCategory(COMPETITION_CATEGORIES[0]);
    setDescription("");
    setTechnologiesInput("");
    setStartDate("");
    setEndDate("");
    setIsOngoing(false);
    setErrorMsg("");
    setIsModalOpen(true);
  }

  function openEditModal(item: Experience) {
    setEditingItem(item);
    setRole(item.role);
    setOrganizationOrProject(item.organization_or_project);
    setCategory(item.category || COMPETITION_CATEGORIES[0]);
    setDescription(item.description);
    setTechnologiesInput(item.technologies ? item.technologies.join(", ") : "");
    setStartDate(item.start_date || "");
    setEndDate(item.end_date || "");
    setIsOngoing(!item.end_date);
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
      role: role.trim(),
      organization_or_project: organizationOrProject.trim(),
      category: category.trim(),
      description: description.trim(),
      technologies: techArray,
      start_date: startDate.trim(),
      end_date: isOngoing ? null : endDate.trim() || null,
    };

    try {
      if (editingItem) {
        const res = await fetch(`/api/profile/experiences/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Gagal memperbarui pengalaman.");
        }
        setExperiences((prev) =>
          prev.map((item) => (item.id === editingItem.id ? { ...item, ...payload } : item)),
        );
      } else {
        const res = await fetch("/api/profile/experiences", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!res.ok || !result.success) {
          throw new Error(result.message || "Gagal menambahkan pengalaman.");
        }
        setExperiences((prev) => [result.data, ...prev]);
      }

      closeModal();
      router.refresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: Experience) {
    const confirmed = window.confirm(
      `Apakah kamu yakin ingin menghapus pengalaman "${item.role} di ${item.organization_or_project}"? Tindakan ini tidak dapat dibatalkan.`,
    );
    if (!confirmed) return;

    setDeleteLoadingId(item.id);
    try {
      const res = await fetch(`/api/profile/experiences/${item.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Gagal menghapus pengalaman.");
      }
      setExperiences((prev) => prev.filter((e) => e.id !== item.id));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus pengalaman.");
    } finally {
      setDeleteLoadingId(null);
    }
  }

  function formatPeriod(start: string, end: string | null) {
    const formatDate = (val: string) => {
      try {
        const d = new Date(val);
        return d.toLocaleDateString("id-ID", { month: "short", year: "numeric" });
      } catch {
        return val;
      }
    };

    const startText = formatDate(start);
    const endText = end ? formatDate(end) : "Saat ini";
    return `${startText} - ${endText}`;
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gold-100 text-gold-600">
            <Briefcase className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-navy-900 sm:text-lg">
              Pengalaman
            </h2>
            <p className="text-xs text-muted sm:text-sm">
              Riwayat organisasi, kepanitiaan lomba, atau pengalaman kerja kolaboratif.
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
            Tambah Pengalaman
          </button>
        )}
      </div>

      {experiences.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-4 py-8 text-center">
          <Briefcase className="size-10 text-muted opacity-40" />
          <p className="mt-2 text-sm font-medium text-navy-900">Belum ada riwayat pengalaman</p>
          <p className="mt-0.5 text-xs text-muted">
            {isEditable
              ? "Bagikan pengalaman organisasi, kepanitiaan, atau peran dalam proyek sebelumnya."
              : "Pengguna ini belum menambahkan riwayat pengalaman."}
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
          {experiences.map((item) => (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-xl border border-line bg-surface/50 p-4 transition hover:border-navy-200 hover:bg-white"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-0.5 text-xs font-medium text-muted">
                        <Calendar className="size-3" />
                        {formatPeriod(item.start_date, item.end_date)}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
                        {item.category}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-sm font-bold text-navy-900 sm:text-base">
                      {item.role}
                    </h3>
                    <p className="text-xs font-medium text-navy-700 sm:text-sm">
                      {item.organization_or_project}
                    </p>
                  </div>

                  {isEditable && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-muted hover:bg-navy-50 hover:text-navy-800"
                        title="Edit Pengalaman"
                        aria-label="Edit Pengalaman"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deleteLoadingId === item.id}
                        className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Hapus Pengalaman"
                        aria-label="Hapus Pengalaman"
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
                {editingItem ? "Ubah Pengalaman" : "Tambah Pengalaman Baru"}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-navy-800">
                    Peran / Posisi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Lead Frontend, UI Designer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                    maxLength={150}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-800">
                    Organisasi / Tim Proyek <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BEM FT Untirta, Tim Gemastik"
                    value={organizationOrProject}
                    onChange={(e) => setOrganizationOrProject(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                    maxLength={200}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Kategori Pengalaman <span className="text-red-500">*</span>
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-navy-800">
                    Tanggal Mulai <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 focus:border-navy-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-800">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    disabled={isOngoing}
                    value={isOngoing ? "" : endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 disabled:bg-surface disabled:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                  />
                  <label className="mt-1.5 flex items-center gap-1.5 text-xs text-navy-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isOngoing}
                      onChange={(e) => setIsOngoing(e.target.checked)}
                      className="rounded border-line text-navy-800 focus:ring-navy-500"
                    />
                    Masih berlangsung / Saat ini
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Deskripsi Tanggung Jawab & Capaian <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Jelaskan kontribusi, tanggung jawab utama, dan hasil yang kamu capai..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
                  maxLength={3000}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-800">
                  Teknologi / Keahlian yang Diterapkan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Figma, Scrum, Next.js, Team Leadership (pisahkan koma)"
                  value={technologiesInput}
                  onChange={(e) => setTechnologiesInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-500 focus:outline-hidden"
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
