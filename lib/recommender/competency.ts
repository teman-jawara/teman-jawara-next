/**
 * Teammate Competency and Compatibility Scoring Engine for TemanJawara.
 *
 * Implements a 5-component weighted scoring model:
 * 1. Post relevance: 25% (TF-IDF + Cosine Similarity)
 * 2. Profile skill match: 25% (Skills, Bio, Competition Interests)
 * 3. Achievement evidence: 20% (Structured achievements + context-aware post claims)
 * 4. Portfolio & project evidence: 20% (Projects, technologies, links, completed vs practice)
 * 5. Relevant experience: 10% (Roles, organizations, duration, practice vs leadership)
 *
 * All pure functions, deterministically testable, without runtime/DB dependencies.
 */

import {
  normalizeText,
  tokenize,
  countTerms,
  buildIdfTable,
  buildVector,
  cosineSimilarity,
  buildPostFields,
  type SearchablePost,
  type WeightedField,
} from "../search/tfidf.ts";
import type { Achievement, Project, Experience } from "../../types/index.ts";

/* ------------------------------------------------------------------ */
/* Configurable Scoring Weights                                       */
/* ------------------------------------------------------------------ */

export interface CompetencyWeights {
  postRelevance: number;
  profileSkillMatch: number;
  achievementEvidence: number;
  projectEvidence: number;
  experienceEvidence: number;
}

export const DEFAULT_COMPETENCY_WEIGHTS: CompetencyWeights = {
  postRelevance: 0.25,
  profileSkillMatch: 0.25,
  achievementEvidence: 0.20,
  projectEvidence: 0.20,
  experienceEvidence: 0.10,
};

/* ------------------------------------------------------------------ */
/* Category Vocabularies                                              */
/* ------------------------------------------------------------------ */

export const CATEGORY_VOCABULARY: Record<string, readonly string[]> = {
  Hackathon: [
    "hackathon", "software", "aplikasi", "app", "web", "fullstack", "backend",
    "frontend", "developer", "coding", "iot", "api", "prototype", "mvp", "engineer",
  ],
  "UI/UX": [
    "ui", "ux", "design", "desain", "figma", "wireframe", "prototype", "user",
    "research", "interface", "antarmuka", "experience", "usability", "interaction", "hifi",
  ],
  Business: [
    "business", "bisnis", "plan", "model", "canvas", "pitch", "pitching", "market",
    "pemasaran", "financial", "keuangan", "startup", "revenue", "strategy", "bmc",
  ],
  Design: [
    "design", "desain", "graphic", "grafis", "illustrator", "photoshop", "visual",
    "branding", "logo", "poster", "vektor", "vektoris", "kreatif",
  ],
  Poster: [
    "poster", "infografis", "infographic", "canva", "illustrator", "visual",
    "desain", "grafis", "konten", "publikasi",
  ],
  Programming: [
    "programming", "competitive", "cp", "algorithm", "algoritma", "struktur", "data",
    "code", "python", "java", "cpp", "csharp", "react", "node", "typescript", "golang", "rust",
  ],
  "Data/AI": [
    "data", "ai", "machine", "learning", "ml", "deep", "python", "pandas",
    "tensorflow", "pytorch", "analytics", "nlp", "vision", "dataset", "model", "scikit",
  ],
  "Scientific Writing": [
    "karya", "tulis", "ilmiah", "kti", "paper", "research", "riset",
    "jurnal", "metodologi", "abstrak", "analisis", "penelitian",
  ],
  PKM: [
    "pkm", "pkmk", "pkmkc", "pkmre", "pimnas", "proposal", "kemendikbud",
    "penelitian", "pengabdian", "karsa", "cipta", "gagasan", "futuristik",
  ],
  "Debate/Public Speaking": [
    "debate", "debat", "public", "speaking", "parliamentary", "pidato",
    "speech", "argument", "adjudicator", "speaker", "retorika", "orasi",
  ],
  Other: [],
};

/* ------------------------------------------------------------------ */
/* Context and Target Topic Extraction                                */
/* ------------------------------------------------------------------ */

export interface ScoringContext {
  category?: string | null;
  query?: string | null;
}

/**
 * Extracts normalized topic tokens from query and/or category.
 * Handles specific category + empty query, all categories + query,
 * specific category + non-empty query without double-counting.
 */
export function extractTargetTokens(context: ScoringContext): string[] {
  const tokens = new Set<string>();

  const category = context.category?.trim();
  const query = context.query?.trim() || "";

  // Query tokens
  if (query) {
    for (const t of tokenize(query)) {
      tokens.add(t);
    }
  }

  // Category vocabulary tokens
  if (category && category !== "All" && category !== "Semua" && category !== "Other") {
    const vocab = CATEGORY_VOCABULARY[category] || [];
    for (const term of vocab) {
      for (const t of tokenize(term)) {
        tokens.add(t);
      }
    }
  }

  return Array.from(tokens);
}

/* ------------------------------------------------------------------ */
/* Component 1: Post Relevance (25%)                                  */
/* ------------------------------------------------------------------ */

export function calculatePostRelevanceScore(
  post: SearchablePost,
  context: ScoringContext,
  allPostsInCorpus?: readonly SearchablePost[],
): number {
  const query = context.query?.trim() || "";
  const category = context.category?.trim();

  // If query is provided, use TF-IDF cosine similarity against query
  if (query) {
    const queryParts: WeightedField[] = [{ text: query, weight: 1 }];
    const corpus = allPostsInCorpus && allPostsInCorpus.length > 0 ? allPostsInCorpus : [post];
    const docCounts = corpus.map((p) => countTerms(buildPostFields(p)));
    const idf = buildIdfTable(docCounts);

    const queryVector = buildVector(countTerms(queryParts), idf);
    const postVector = buildVector(countTerms(buildPostFields(post)), idf);

    const cos = cosineSimilarity(queryVector, postVector);
    return Math.min(100, Math.round(cos * 100));
  }

  // If query is empty but category is specific, evaluate post match to category
  if (category && category !== "All" && category !== "Semua" && category !== "Other") {
    if (normalizeText(post.category) === normalizeText(category)) {
      return 85;
    }
    const targetTokens = extractTargetTokens(context);
    const postTokens = new Set(tokenize(`${post.title} ${post.description} ${post.required_skills.join(" ")}`));
    let matchCount = 0;
    for (const t of targetTokens) {
      if (postTokens.has(t)) matchCount++;
    }
    return Math.min(100, Math.round((matchCount / Math.max(1, targetTokens.length)) * 100));
  }

  // Fallback for empty query in All category: neutral base
  return 50;
}

/* ------------------------------------------------------------------ */
/* Component 2: Profile Skill Match (25%)                             */
/* ------------------------------------------------------------------ */

export interface AuthorProfileInput {
  skills?: string[] | null;
  bio?: string | null;
  competition_interests?: string[] | null;
}

export function calculateProfileSkillMatchScore(
  profile: AuthorProfileInput | null | undefined,
  context: ScoringContext,
): number {
  if (!profile) return 0;

  const targetTokens = extractTargetTokens(context);
  if (targetTokens.length === 0) return 0;

  const profileTokens = new Set<string>();

  if (Array.isArray(profile.skills)) {
    for (const skill of profile.skills) {
      for (const t of tokenize(skill)) profileTokens.add(t);
    }
  }

  if (Array.isArray(profile.competition_interests)) {
    for (const interest of profile.competition_interests) {
      for (const t of tokenize(interest)) profileTokens.add(t);
    }
  }

  if (profile.bio) {
    for (const t of tokenize(profile.bio)) profileTokens.add(t);
  }

  if (profileTokens.size === 0) return 0;

  let hits = 0;
  for (const t of targetTokens) {
    if (profileTokens.has(t)) hits++;
  }

  const rawFraction = hits / Math.min(targetTokens.length, 6);
  return Math.min(100, Math.round(Math.min(1, rawFraction) * 100));
}

/* ------------------------------------------------------------------ */
/* Component 3: Achievement Evidence (20%)                            */
/* ------------------------------------------------------------------ */

/**
 * Recognizes achievement tier levels:
 * Tier 1 (100): winner, first place, champion, juara 1, medali emas
 * Tier 2 (85): runner up, second place, juara 2, medali perak
 * Tier 3 (70): third place, juara 3, medali perunggu
 * Tier 4 (60): harapan, honorable mention, best paper, best speaker, best poster
 * Tier 5 (50): finalist, finalis, top 10, top 5, semifinalist, medal
 */
export function getAchievementTierScore(title: string): number {
  const norm = normalizeText(title);

  if (
    norm.includes("juara 1") ||
    norm.includes("juara i") ||
    norm.includes("first place") ||
    norm.includes("1st place") ||
    norm.includes("champion") ||
    norm.includes("winner") ||
    norm.includes("medali emas") ||
    norm.includes("gold medal")
  ) {
    return 100;
  }

  if (
    norm.includes("juara 2") ||
    norm.includes("juara ii") ||
    norm.includes("second place") ||
    norm.includes("2nd place") ||
    norm.includes("runner up") ||
    norm.includes("medali perak") ||
    norm.includes("silver medal")
  ) {
    return 85;
  }

  if (
    norm.includes("juara 3") ||
    norm.includes("juara iii") ||
    norm.includes("third place") ||
    norm.includes("3rd place") ||
    norm.includes("medali perunggu") ||
    norm.includes("bronze medal")
  ) {
    return 70;
  }

  if (
    norm.includes("harapan") ||
    norm.includes("honorable mention") ||
    norm.includes("best speaker") ||
    norm.includes("best paper") ||
    norm.includes("best poster") ||
    norm.includes("best design") ||
    norm.includes("favorit")
  ) {
    return 60;
  }

  if (
    norm.includes("finalis") ||
    norm.includes("finalist") ||
    norm.includes("top 10") ||
    norm.includes("top 5") ||
    norm.includes("top 3") ||
    norm.includes("semifinalis") ||
    norm.includes("semifinalist") ||
    norm.includes("medali") ||
    norm.includes("medal")
  ) {
    return 50;
  }

  if (norm.includes("peserta") || norm.includes("participant")) {
    return 25;
  }

  return 40;
}

/**
 * Checks field relevance of achievement to target context.
 */
function getCategoryRelevanceMultiplier(
  recordCategory: string,
  recordTitle: string,
  context: ScoringContext,
): number {
  const targetCategory = context.category?.trim();
  if (!targetCategory || targetCategory === "All" || targetCategory === "Semua") {
    // In all categories, check match against query tokens
    const targetTokens = extractTargetTokens(context);
    if (targetTokens.length === 0) return 0.8;
    const itemTokens = new Set(tokenize(`${recordCategory} ${recordTitle}`));
    for (const t of targetTokens) {
      if (itemTokens.has(t)) return 1.0;
    }
    return 0.5;
  }

  if (normalizeText(recordCategory) === normalizeText(targetCategory)) {
    return 1.0;
  }

  // Cross-category check
  const targetTokens = new Set(CATEGORY_VOCABULARY[targetCategory] || []);
  const itemTokens = tokenize(`${recordCategory} ${recordTitle}`);
  for (const t of itemTokens) {
    if (targetTokens.has(t)) return 0.8;
  }

  return 0.3; // Unrelated category
}

/**
 * Context detection for post content:
 * Detects whether an achievement keyword in post description is a SEEKING requirement
 * (e.g. "Dicari anggota yang pernah juara", "Butuh finalis") or an author claim.
 */
export function extractPostAchievementClaims(postText: string): string[] {
  if (!postText) return [];

  // Split into clauses by sentence delimiters, commas, and conjunctions (dan, tetapi, namun)
  const clauses = postText.split(/[.\n;!?]+|,\s*|\s+(?:dan|tetapi|namun|serta)\s+/i);
  const claims: string[] = [];

  const seekingRegex =
    /\b(dicari|mencari|butuh|syarat|kriteria|open\s+recruitment|looking\s+for|needed|wanted|diutamakan|prefer|minimal)\b/i;
  const achievementKeywordsRegex =
    /\b(juara|winner|champion|pemenang|finalis|finalist|top\s+10|medali|medal|first\s+place)\b/i;

  for (const raw of clauses) {
    const s = raw.trim();
    if (!s) continue;
    // If this clause expresses a seeking requirement, skip it
    if (seekingRegex.test(s)) {
      continue;
    }
    if (achievementKeywordsRegex.test(s)) {
      claims.push(s);
    }
  }

  return claims;
}

export function calculateAchievementEvidenceScore(
  achievements: Achievement[] = [],
  postDescription = "",
  context: ScoringContext,
): { score: number; count: number } {
  const seenFingerprints = new Set<string>();
  const scores: number[] = [];

  // 1. Structured achievements
  for (const ach of achievements) {
    const fp = normalizeText(`${ach.competition_name} ${ach.achievement_title}`);
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);

    const baseScore = getAchievementTierScore(ach.achievement_title);
    const rel = getCategoryRelevanceMultiplier(ach.category, `${ach.competition_name} ${ach.achievement_title}`, context);
    scores.push(baseScore * rel);
  }

  // 2. Post achievement claims (context-filtered)
  const postClaims = extractPostAchievementClaims(postDescription);
  for (const claim of postClaims) {
    const fp = normalizeText(claim);
    // Deduplication with structured records
    let isDuplicate = false;
    for (const existingFp of seenFingerprints) {
      if (fp.includes(existingFp) || existingFp.includes(fp)) {
        isDuplicate = true;
        break;
      }
    }
    if (isDuplicate) continue;
    seenFingerprints.add(fp);

    const baseScore = getAchievementTierScore(claim);
    // Post text claims carry lower certainty than structured verified records
    const postClaimMultiplier = 0.7;
    scores.push(baseScore * postClaimMultiplier);
  }

  if (scores.length === 0) {
    return { score: 0, count: 0 };
  }

  // Highest score weighted + diminishing returns for additional achievements
  scores.sort((a, b) => b - a);
  let total = scores[0];
  for (let i = 1; i < scores.length; i++) {
    total += scores[i] * Math.pow(0.5, i);
  }

  return {
    score: Math.min(100, Math.round(total)),
    count: scores.length,
  };
}

/* ------------------------------------------------------------------ */
/* Component 4: Portfolio and Project Evidence (20%)                  */
/* ------------------------------------------------------------------ */

const PRACTICE_INDICATORS =
  /\b(latihan|tutorial|practice|toy\s+project|iseng|masih\s+belajar|unfinished|belum\s+selesai|draft|percobaan)\b/i;

export function calculateProjectEvidenceScore(
  projects: Project[] = [],
  context: ScoringContext,
): { score: number; count: number } {
  if (projects.length === 0) {
    return { score: 0, count: 0 };
  }

  const targetTokens = new Set(extractTargetTokens(context));
  const projectScores: number[] = [];

  for (const proj of projects) {
    let score = 50; // base for a recorded project

    // Check completed vs practice
    const textBlob = `${proj.title} ${proj.description}`;
    const isPractice = PRACTICE_INDICATORS.test(textBlob);
    if (isPractice) {
      score *= 0.4; // practice is a limited signal
    } else {
      score += 20; // completed implementation
    }

    // Working project link adds verification credibility
    if (proj.project_url && (proj.project_url.startsWith("http://") || proj.project_url.startsWith("https://"))) {
      score += 15;
    }

    // Technology and domain relevance match
    let techMatchCount = 0;
    for (const tech of proj.technologies) {
      for (const t of tokenize(tech)) {
        if (targetTokens.has(t)) techMatchCount++;
      }
    }
    for (const t of tokenize(proj.category)) {
      if (targetTokens.has(t)) techMatchCount += 2;
    }

    if (targetTokens.size > 0) {
      const relevanceFactor = techMatchCount > 0 ? 1.0 : 0.4;
      score *= relevanceFactor;
    }

    projectScores.push(Math.min(100, score));
  }

  projectScores.sort((a, b) => b - a);
  let aggregate = projectScores[0];
  for (let i = 1; i < projectScores.length; i++) {
    aggregate += projectScores[i] * Math.pow(0.4, i);
  }

  return {
    score: Math.min(100, Math.round(aggregate)),
    count: projects.length,
  };
}

/* ------------------------------------------------------------------ */
/* Component 5: Relevant Experience Evidence (10%)                    */
/* ------------------------------------------------------------------ */

const LEARNING_INDICATORS =
  /\b(hanya\s+belajar|ikut\s+kursus|baru\s+mencoba|peserta\s+webinar|beginner|pemula)\b/i;
const LEADERSHIP_INDICATORS =
  /\b(lead|ketua|coordinator|koordinator|engineer|developer|designer|manager|head|founder|inisiator)\b/i;

export function calculateExperienceEvidenceScore(
  experiences: Experience[] = [],
  context: ScoringContext,
): { score: number; count: number } {
  if (experiences.length === 0) {
    return { score: 0, count: 0 };
  }

  const targetTokens = new Set(extractTargetTokens(context));
  const expScores: number[] = [];

  for (const exp of experiences) {
    let score = 50;

    const fullText = `${exp.role} ${exp.organization_or_project} ${exp.description}`;
    if (LEARNING_INDICATORS.test(fullText)) {
      score *= 0.35; // learning language is a limited signal
    } else if (LEADERSHIP_INDICATORS.test(exp.role)) {
      score += 25; // leadership or execution role
    } else {
      score += 15;
    }

    // Ongoing experience (end_date null) or recent
    if (!exp.end_date) {
      score += 10;
    }

    // Relevance to context
    let relHits = 0;
    for (const tech of exp.technologies) {
      for (const t of tokenize(tech)) {
        if (targetTokens.has(t)) relHits++;
      }
    }
    for (const t of tokenize(`${exp.role} ${exp.category}`)) {
      if (targetTokens.has(t)) relHits += 2;
    }

    if (targetTokens.size > 0) {
      score *= relHits > 0 ? 1.0 : 0.4;
    }

    expScores.push(Math.min(100, score));
  }

  expScores.sort((a, b) => b - a);
  let total = expScores[0];
  for (let i = 1; i < expScores.length; i++) {
    total += expScores[i] * Math.pow(0.4, i);
  }

  return {
    score: Math.min(100, Math.round(total)),
    count: experiences.length,
  };
}

/* ------------------------------------------------------------------ */
/* Minimum Evidence Threshold & Overall Score                         */
/* ------------------------------------------------------------------ */

export interface AuthorFullProfileData {
  profile?: AuthorProfileInput | null;
  achievements?: Achievement[];
  projects?: Project[];
  experiences?: Experience[];
}

export interface PartnerMatchOutput {
  isEligible: boolean; // false for "Other" category
  hasSufficientData: boolean;
  score: number | null; // 0..100 or null if insufficient data or ineligible
  displayLabel: string; // e.g. "85% Kecocokan Partner" or "Data belum cukup"
  breakdown?: {
    postRelevance: number;
    profileMatch: number;
    achievementScore: number;
    projectScore: number;
    experienceScore: number;
  };
}

/**
 * Calculates the combined Teammate Competency and Compatibility score.
 */
export function calculatePartnerMatch(
  post: SearchablePost,
  authorData: AuthorFullProfileData,
  context: ScoringContext,
  weights: CompetencyWeights = DEFAULT_COMPETENCY_WEIGHTS,
  allPostsInCorpus?: readonly SearchablePost[],
): PartnerMatchOutput {
  const category = (context.category ?? post.category)?.trim();

  // Category "Other": Do not display a competency percentage and do not use for ranking
  if (category === "Other") {
    return {
      isEligible: false,
      hasSufficientData: false,
      score: null,
      displayLabel: "",
    };
  }

  // Calculate individual component scores (all normalized 0..100)
  const postRelevance = calculatePostRelevanceScore(post, context, allPostsInCorpus);
  const profileMatch = calculateProfileSkillMatchScore(authorData.profile, context);
  const { score: achievementScore, count: achievementCount } = calculateAchievementEvidenceScore(
    authorData.achievements || [],
    post.description,
    context,
  );
  const { score: projectScore, count: projectCount } = calculateProjectEvidenceScore(
    authorData.projects || [],
    context,
  );
  const { score: experienceScore, count: experienceCount } = calculateExperienceEvidenceScore(
    authorData.experiences || [],
    context,
  );

  // Check evidence sufficiency:
  // If author has 0 structured records AND no profile skills/bio match,
  // we cannot evaluate candidate competency reliably -> "Data belum cukup"
  const hasStructuredRecords =
    achievementCount > 0 || projectCount > 0 || experienceCount > 0;
  const hasProfileSignal = profileMatch > 0;

  if (!hasStructuredRecords && !hasProfileSignal) {
    return {
      isEligible: true,
      hasSufficientData: false,
      score: null,
      displayLabel: "Data belum cukup",
      breakdown: {
        postRelevance,
        profileMatch,
        achievementScore,
        projectScore,
        experienceScore,
      },
    };
  }

  // Combine components using configurable weights
  const totalWeight =
    weights.postRelevance +
    weights.profileSkillMatch +
    weights.achievementEvidence +
    weights.projectEvidence +
    weights.experienceEvidence;

  const rawCombined =
    (postRelevance * weights.postRelevance +
      profileMatch * weights.profileSkillMatch +
      achievementScore * weights.achievementEvidence +
      projectScore * weights.projectEvidence +
      experienceScore * weights.experienceEvidence) /
    (totalWeight || 1);

  const finalScore = Math.max(0, Math.min(100, Math.round(rawCombined)));

  return {
    isEligible: true,
    hasSufficientData: true,
    score: finalScore,
    displayLabel: `${finalScore}% Kecocokan Partner`,
    breakdown: {
      postRelevance,
      profileMatch,
      achievementScore,
      projectScore,
      experienceScore,
    },
  };
}
