import type { RowDataPacket } from "mysql2";
import { db } from "./db.ts";
import type { Achievement, Project, Experience } from "../types/index.ts";

/* ------------------------------------------------------------------ */
/* URL Validation & Sanitization                                       */
/* ------------------------------------------------------------------ */

export function validateHttpUrl(
  url: unknown,
  fieldName = "URL",
): { valid: boolean; normalized: string | null; error?: string } {
  if (url === null || url === undefined || url === "") {
    return { valid: true, normalized: null };
  }

  if (typeof url !== "string") {
    return { valid: false, normalized: null, error: `${fieldName} harus berupa teks.` };
  }

  const trimmed = url.trim();
  if (trimmed === "") {
    return { valid: true, normalized: null };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      normalized: null,
      error: `${fieldName} tidak boleh lebih dari 500 karakter.`,
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        valid: false,
        normalized: null,
        error: `${fieldName} harus diawali dengan http:// atau https://.`,
      };
    }
    return { valid: true, normalized: parsed.toString() };
  } catch {
    return {
      valid: false,
      normalized: null,
      error: `Format ${fieldName} tidak valid. Pastikan format diawali http:// atau https://.`,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Date Helper                                                        */
/* ------------------------------------------------------------------ */

function isValidDateString(val: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
  const d = new Date(val);
  return !Number.isNaN(d.getTime());
}

function normalizeDateInput(val: unknown): string | null {
  if (val === null || val === undefined || val === "") return null;
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  // Handle YYYY-MM
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }
  // Handle ISO string or YYYY-MM-DD
  if (trimmed.includes("T")) {
    const parts = trimmed.split("T")[0];
    if (isValidDateString(parts)) return parts;
  }
  if (isValidDateString(trimmed)) {
    return trimmed;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Technology Tag Parsing & Sanitization                              */
/* ------------------------------------------------------------------ */

export function parseTechnologies(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0 && item.length <= 50)
      .slice(0, 20);
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parseTechnologies(parsed);
      }
    } catch {
      // Treat as comma-separated
    }
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0 && item.length <= 50)
      .slice(0, 20);
  }

  return [];
}

/* ------------------------------------------------------------------ */
/* Achievement Validation                                              */
/* ------------------------------------------------------------------ */

export interface ValidatedAchievementInput {
  competition_name: string;
  achievement_title: string;
  category: string;
  year: number;
  description: string | null;
  proof_url: string | null;
}

export function validateAchievementInput(
  raw: unknown,
): { ok: true; data: ValidatedAchievementInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Payload data prestasi tidak valid." };
  }

  const body = raw as Record<string, unknown>;

  const competitionName = String(body.competition_name || "").trim();
  if (!competitionName) {
    return { ok: false, error: "Nama kompetisi wajib diisi." };
  }
  if (competitionName.length > 255) {
    return { ok: false, error: "Nama kompetisi maksimal 255 karakter." };
  }

  const achievementTitle = String(body.achievement_title || "").trim();
  if (!achievementTitle) {
    return { ok: false, error: "Gelar prestasi / capaian wajib diisi (contoh: Juara 1, Finalis, Top 10)." };
  }
  if (achievementTitle.length > 150) {
    return { ok: false, error: "Gelar prestasi maksimal 150 karakter." };
  }

  const category = String(body.category || "").trim();
  if (!category) {
    return { ok: false, error: "Kategori kompetisi wajib diisi." };
  }
  if (category.length > 100) {
    return { ok: false, error: "Kategori maksimal 100 karakter." };
  }

  const currentYear = new Date().getFullYear();
  const yearNum = Number(body.year);
  if (!Number.isInteger(yearNum) || yearNum < 1990 || yearNum > currentYear + 2) {
    return {
      ok: false,
      error: `Tahun harus berupa bilangan bulat antara 1990 dan ${currentYear + 2}.`,
    };
  }

  let description: string | null = null;
  if (body.description !== undefined && body.description !== null) {
    const descStr = String(body.description).trim();
    if (descStr.length > 2000) {
      return { ok: false, error: "Deskripsi prestasi maksimal 2000 karakter." };
    }
    description = descStr || null;
  }

  const urlCheck = validateHttpUrl(body.proof_url, "Tautan bukti prestasi (proof_url)");
  if (!urlCheck.valid) {
    return { ok: false, error: urlCheck.error || "Tautan bukti tidak valid." };
  }

  return {
    ok: true,
    data: {
      competition_name: competitionName,
      achievement_title: achievementTitle,
      category,
      year: yearNum,
      description,
      proof_url: urlCheck.normalized,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Project Validation                                                  */
/* ------------------------------------------------------------------ */

export interface ValidatedProjectInput {
  title: string;
  category: string;
  description: string;
  technologies: string[];
  project_url: string | null;
}

export function validateProjectInput(
  raw: unknown,
): { ok: true; data: ValidatedProjectInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Payload data proyek tidak valid." };
  }

  const body = raw as Record<string, unknown>;

  const title = String(body.title || "").trim();
  if (!title) {
    return { ok: false, error: "Judul proyek wajib diisi." };
  }
  if (title.length > 200) {
    return { ok: false, error: "Judul proyek maksimal 200 karakter." };
  }

  const category = String(body.category || "").trim();
  if (!category) {
    return { ok: false, error: "Kategori proyek wajib diisi." };
  }
  if (category.length > 100) {
    return { ok: false, error: "Kategori maksimal 100 karakter." };
  }

  const description = String(body.description || "").trim();
  if (!description) {
    return { ok: false, error: "Deskripsi proyek wajib diisi." };
  }
  if (description.length > 3000) {
    return { ok: false, error: "Deskripsi proyek maksimal 3000 karakter." };
  }

  const technologies = parseTechnologies(body.technologies);

  const urlCheck = validateHttpUrl(body.project_url, "Tautan proyek (project_url)");
  if (!urlCheck.valid) {
    return { ok: false, error: urlCheck.error || "Tautan proyek tidak valid." };
  }

  return {
    ok: true,
    data: {
      title,
      category,
      description,
      technologies,
      project_url: urlCheck.normalized,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Experience Validation                                               */
/* ------------------------------------------------------------------ */

export interface ValidatedExperienceInput {
  role: string;
  organization_or_project: string;
  category: string;
  description: string;
  technologies: string[];
  start_date: string;
  end_date: string | null;
}

export function validateExperienceInput(
  raw: unknown,
): { ok: true; data: ValidatedExperienceInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Payload data pengalaman tidak valid." };
  }

  const body = raw as Record<string, unknown>;

  const role = String(body.role || "").trim();
  if (!role) {
    return { ok: false, error: "Peran / posisi pengalaman wajib diisi." };
  }
  if (role.length > 150) {
    return { ok: false, error: "Peran / posisi maksimal 150 karakter." };
  }

  const org = String(body.organization_or_project || "").trim();
  if (!org) {
    return { ok: false, error: "Nama organisasi atau kegiatan/proyek wajib diisi." };
  }
  if (org.length > 200) {
    return { ok: false, error: "Nama organisasi/proyek maksimal 200 karakter." };
  }

  const category = String(body.category || "").trim();
  if (!category) {
    return { ok: false, error: "Kategori pengalaman wajib diisi." };
  }
  if (category.length > 100) {
    return { ok: false, error: "Kategori maksimal 100 karakter." };
  }

  const description = String(body.description || "").trim();
  if (!description) {
    return { ok: false, error: "Deskripsi pengalaman wajib diisi." };
  }
  if (description.length > 3000) {
    return { ok: false, error: "Deskripsi pengalaman maksimal 3000 karakter." };
  }

  const technologies = parseTechnologies(body.technologies);

  const startDate = normalizeDateInput(body.start_date);
  if (!startDate) {
    return {
      ok: false,
      error: "Tanggal mulai wajib diisi dengan format tanggal valid (YYYY-MM-DD atau YYYY-MM).",
    };
  }

  let endDate: string | null = null;
  if (body.end_date !== undefined && body.end_date !== null && body.end_date !== "") {
    endDate = normalizeDateInput(body.end_date);
    if (!endDate) {
      return {
        ok: false,
        error: "Format tanggal selesai tidak valid (gunakan YYYY-MM-DD atau kosongkan jika masih berlangsung).",
      };
    }

    if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
      return {
        ok: false,
        error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai.",
      };
    }
  }

  return {
    ok: true,
    data: {
      role,
      organization_or_project: org,
      category,
      description,
      technologies,
      start_date: startDate,
      end_date: endDate,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Database Mappers & Fetchers                                         */
/* ------------------------------------------------------------------ */

export function mapRowToAchievement(row: RowDataPacket): Achievement {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    competition_name: String(row.competition_name || ""),
    achievement_title: String(row.achievement_title || ""),
    category: String(row.category || ""),
    year: Number(row.year) || new Date().getFullYear(),
    description: row.description ? String(row.description) : null,
    proof_url: row.proof_url ? String(row.proof_url) : null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export function mapRowToProject(row: RowDataPacket): Project {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    title: String(row.title || ""),
    category: String(row.category || ""),
    description: String(row.description || ""),
    technologies: parseTechnologies(row.technologies),
    project_url: row.project_url ? String(row.project_url) : null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export function mapRowToExperience(row: RowDataPacket): Experience {
  const startDateStr =
    row.start_date instanceof Date
      ? row.start_date.toISOString().split("T")[0]
      : String(row.start_date || "");

  const endDateStr =
    row.end_date instanceof Date
      ? row.end_date.toISOString().split("T")[0]
      : row.end_date
        ? String(row.end_date)
        : null;

  return {
    id: String(row.id),
    user_id: String(row.user_id),
    role: String(row.role || ""),
    organization_or_project: String(row.organization_or_project || ""),
    category: String(row.category || ""),
    description: String(row.description || ""),
    technologies: parseTechnologies(row.technologies),
    start_date: startDateStr,
    end_date: endDateStr,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function getUserAchievements(userId: string): Promise<Achievement[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM achievements WHERE user_id = ? ORDER BY year DESC, created_at DESC`,
    [userId],
  );
  return rows.map(mapRowToAchievement);
}

export async function getUserProjects(userId: string): Promise<Project[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map(mapRowToProject);
}

export async function getUserExperiences(userId: string): Promise<Experience[]> {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM experiences WHERE user_id = ? ORDER BY start_date DESC, created_at DESC`,
    [userId],
  );
  return rows.map(mapRowToExperience);
}
