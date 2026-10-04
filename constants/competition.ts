/** Kategori lomba sesuai PRD bagian 6. */
export const COMPETITION_CATEGORIES = [
  "Hackathon",
  "UI/UX",
  "Business",
  "Design",
  "Poster",
  "Programming",
  "Data/AI",
  "Scientific Writing",
  "PKM",
  "Debate/Public Speaking",
  "Other",
] as const;

export type CompetitionCategory = (typeof COMPETITION_CATEGORIES)[number];
