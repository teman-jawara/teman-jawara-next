/**
 * Parsing parameter pencarian dan pembuat klausa SQL berparameter.
 * Murni (tanpa import runtime): semua nilai dari pengguna selalu masuk lewat
 * placeholder `?`, tidak pernah digabung ke string SQL.
 */

export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 50;
export const DEFAULT_CANDIDATE_LIMIT = 300;
export const MAX_CANDIDATE_LIMIT = 500;
export const MAX_QUERY_LENGTH = 200;
export const MAX_SKILL_FILTERS = 10;
const MAX_SKILL_LENGTH = 50;

export type StatusFilter = "active" | "closed" | "all";

export interface SearchParams {
  q: string;
  category: string | null;
  status: StatusFilter;
  skills: string[];
  page: number;
  limit: number;
  candidateLimit: number;
  useProfile: boolean;
}

export type SearchParamsResult =
  | { ok: true; params: SearchParams }
  | { ok: false; error: string };

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (raw === null || raw.trim() === "" || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Parse & validasi query string. Nilai tak valid di-clamp, kecuali `status` (400). */
export function parseSearchParams(searchParams: URLSearchParams): SearchParamsResult {
  const q = (searchParams.get("q") ?? searchParams.get("search") ?? "")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);

  const categoryRaw = (searchParams.get("category") ?? "").trim();
  const category =
    categoryRaw && categoryRaw !== "All" && categoryRaw !== "Semua"
      ? categoryRaw.slice(0, 100)
      : null;

  const statusRaw = (searchParams.get("status") ?? "active").trim().toLowerCase();
  if (statusRaw !== "active" && statusRaw !== "closed" && statusRaw !== "all") {
    return { ok: false, error: "Parameter status harus 'active', 'closed', atau 'all'." };
  }

  // skills=react,figma (boleh diulang: skills=react&skills=figma). Unik & case-insensitive.
  const seen = new Set<string>();
  const skills: string[] = [];
  for (const raw of searchParams.getAll("skills")) {
    for (const part of raw.split(",")) {
      const skill = part.trim().slice(0, MAX_SKILL_LENGTH);
      const key = skill.toLowerCase();
      if (skill && !seen.has(key) && skills.length < MAX_SKILL_FILTERS) {
        seen.add(key);
        skills.push(skill);
      }
    }
  }

  const profileRaw = (searchParams.get("profile") ?? "").trim().toLowerCase();

  return {
    ok: true,
    params: {
      q,
      category,
      status: statusRaw,
      skills,
      page: clampInt(searchParams.get("page"), 1, 1, 1000),
      limit: clampInt(searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT),
      candidateLimit: clampInt(
        searchParams.get("candidate_limit"),
        DEFAULT_CANDIDATE_LIMIT,
        1,
        MAX_CANDIDATE_LIMIT,
      ),
      useProfile: profileRaw === "1" || profileRaw === "true",
    },
  };
}

/** Escape karakter khusus LIKE (\, %, _) agar dicocokkan secara harfiah. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

export interface CandidateWhere {
  whereSql: string;
  values: Array<string | number>;
}

/**
 * Klausa WHERE untuk kandidat. Skills memakai logika ANY (cukup salah satu cocok),
 * case-insensitive, dan mencocokkan elemen JSON utuh (`"react"` tidak cocok dengan
 * `"reactive"`). Hanya kolom yang ada di schema.sql yang dipakai.
 */
export function buildCandidateWhere(
  params: Pick<SearchParams, "category" | "status" | "skills">,
): CandidateWhere {
  const clauses: string[] = [];
  const values: Array<string | number> = [];

  if (params.status !== "all") {
    clauses.push("p.status = ?");
    values.push(params.status);
  }

  if (params.category) {
    clauses.push("p.category = ?");
    values.push(params.category);
  }

  if (params.skills.length > 0) {
    const ors = params.skills.map(() => "LOWER(CAST(p.required_skills AS CHAR)) LIKE ?");
    clauses.push(`(${ors.join(" OR ")})`);
    for (const skill of params.skills) {
      values.push(`%${escapeLike(JSON.stringify(skill.toLowerCase()))}%`);
    }
  }

  return {
    whereSql: clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}
