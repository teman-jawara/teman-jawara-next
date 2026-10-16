import type { RowDataPacket } from "mysql2";
import type { Post } from "@/types";

export interface PostRow extends RowDataPacket {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  required_skills: unknown;
  event_name: string | null;
  deadline: unknown;
  teammate_count: number | null;
  faculty_preference: string | null;
  study_program_preference: string | null;
  image_url: string | null;
  status: "active" | "closed";
  created_at: unknown;
  updated_at: unknown;
  author_name?: string | null;
  author_avatar?: string | null;
  author_faculty?: string | null;
  author_study_program?: string | null;
  author_nim?: string | null;
  author_generation?: number | null;
  author_bio?: string | null;
  like_count?: number | string | null;
  comment_count?: number | string | null;
  view_count?: number | string | null;
} 

export function parseSkills(skills: unknown): string[] {
  if (!skills) return [];
  if (Array.isArray(skills)) {
    return skills.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      return skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function formatDeadline(date: unknown): string | null {
  if (!date) return null;
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  if (typeof date === "string") {
    return date.split("T")[0];
  }
  return null;
}

export function formatTimestamp(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (ts instanceof Date) return ts.toISOString();
  if (typeof ts === "string") {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? ts : d.toISOString();
  }
  return String(ts);
}

export function mapRowToPost(row: PostRow): Post {
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    required_skills: parseSkills(row.required_skills),
    event_name: row.event_name || null,
    deadline: formatDeadline(row.deadline),
    teammate_count: Number(row.teammate_count || 1),
    faculty_preference: row.faculty_preference || null,
    study_program_preference: row.study_program_preference || null,
    image_url: row.image_url || null,
    status: row.status,
    created_at: formatTimestamp(row.created_at),
    updated_at: formatTimestamp(row.updated_at),
    like_count: row.like_count ? Number(row.like_count ?? 0) : 0,
    comment_count: row.comment_count ? Number(row.comment_count ?? 0) : 0,
    view_count: row.view_count ? Number(row.view_count ?? 0) : 0,
    author: row.author_name
  ? {
      id: row.user_id,
      full_name: row.author_name,
      avatar_url: row.author_avatar || null,
      faculty: row.author_faculty || null,
      study_program: row.author_study_program || null,
      nim: row.author_nim || null,
      generation: row.author_generation ?? null,
      bio: row.author_bio || null,
    }
  : null,
  };
}

export interface ValidatePostInputResult {
  valid: boolean;
  errors: string[];
  sanitized?: {
    title: string;
    description: string;
    category: string;
    required_skills: string[];
    event_name: string | null;
    deadline: string | null;
    teammate_count: number;
    faculty_preference: string | null;
    study_program_preference: string | null;
    image_url: string | null;
    status: "active" | "closed";
  };
}

export function validatePostInput(
  data: unknown,
  isPartial = false,
): ValidatePostInputResult {
  const errors: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Data payload must be an object"] };
  }

  const payload = data as Record<string, unknown>;

  // Image URL
  let image_url: string | null = null;
  if (payload.image_url !== undefined && payload.image_url !== null) {
    const trimmed = String(payload.image_url).trim();
    image_url = trimmed || null;
  }

  // Description
  let description =
    payload.description !== undefined
      ? String(payload.description).trim()
      : undefined;

  if (!isPartial || payload.description !== undefined) {
    if (!description && !image_url) {
      errors.push("Konten postingan atau gambar wajib diisi.");
    }
    if (!description && image_url) {
      description = "Foto";
    }
  }

  // Title: derive from description or default if not explicitly provided
  let title =
    payload.title !== undefined ? String(payload.title).trim() : undefined;
  if (!title && description) {
    const firstLine = description.split("\n")[0].trim();
    title = firstLine.slice(0, 100) || "Postingan";
  } else if (!title && image_url) {
    title = "Foto";
  }

  if (!isPartial || payload.title !== undefined) {
    if (!title) {
      errors.push("Judul postingan (title) wajib diisi.");
    } else if (title.length > 200) {
      title = title.slice(0, 200);
    }
  }

  // Category: default to 'Other' if omitted
  let category =
    payload.category !== undefined ? String(payload.category).trim() : undefined;
  if (!category) {
    category = "Other";
  }
  if (category.length > 100) {
    errors.push("Kategori maksimal 100 karakter.");
  }

  // Required skills
  const required_skills = parseSkills(payload.required_skills);

  // Event Name
  let event_name: string | null = null;
  if (payload.event_name !== undefined && payload.event_name !== null) {
    const trimmed = String(payload.event_name).trim();
    if (trimmed.length > 200) {
      errors.push("Nama lomba/event maksimal 200 karakter.");
    } else {
      event_name = trimmed || null;
    }
  }

  // Deadline
  let deadline: string | null = null;
  if (
    payload.deadline !== undefined &&
    payload.deadline !== null &&
    payload.deadline !== ""
  ) {
    if (payload.deadline instanceof Date) {
      deadline = payload.deadline.toISOString().split("T")[0];
    } else {
      const deadlineStr = String(payload.deadline).trim();
      const d = new Date(deadlineStr);
      if (isNaN(d.getTime())) {
        errors.push(
          "Format tanggal deadline tidak valid (gunakan YYYY-MM-DD).",
        );
      } else {
        deadline = d.toISOString().split("T")[0];
      }
    }
  }

  // Teammate count
  let teammate_count = 1;
  if (payload.teammate_count !== undefined && payload.teammate_count !== null) {
    const parsed = Number(payload.teammate_count);
    if (!Number.isInteger(parsed) || parsed < 1) {
      errors.push("Jumlah anggota tim (teammate_count) harus berupa bilangan bulat minimal 1.");
    } else {
      teammate_count = parsed;
    }
  }

  // Faculty preference
  let faculty_preference: string | null = null;
  if (
    payload.faculty_preference !== undefined &&
    payload.faculty_preference !== null
  ) {
    const trimmed = String(payload.faculty_preference).trim();
    if (trimmed.length > 150) {
      errors.push("Preferensi fakultas maksimal 150 karakter.");
    } else {
      faculty_preference = trimmed || null;
    }
  }

  // Study program preference
  let study_program_preference: string | null = null;
  if (
    payload.study_program_preference !== undefined &&
    payload.study_program_preference !== null
  ) {
    const trimmed = String(payload.study_program_preference).trim();
    if (trimmed.length > 150) {
      errors.push("Preferensi program studi maksimal 150 karakter.");
    } else {
      study_program_preference = trimmed || null;
    }
  }

  // Status
  let status: "active" | "closed" = "active";
  if (payload.status !== undefined && payload.status !== null) {
    const statusStr = String(payload.status).trim().toLowerCase();
    if (statusStr !== "active" && statusStr !== "closed") {
      errors.push("Status postingan harus 'active' atau 'closed'.");
    } else {
      status = statusStr;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      title: title || "",
      description: description || "",
      category: category || "",
      required_skills,
      event_name,
      deadline,
      teammate_count,
      faculty_preference,
      study_program_preference,
      image_url,
      status,
    },
  };
}
