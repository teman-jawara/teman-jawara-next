import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PostCard } from "@/components/posts/post-card";
import { FeedSearch } from "@/components/posts/feed-search";
import { COMPETITION_CATEGORIES } from "@/constants/competition";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { searchPosts } from "@/lib/search/tfidf";
import type { RowDataPacket } from "mysql2";
import {
  parseSkills,
  mapRowToPost,
  type PostRow,
} from "@/lib/posts";
import {
  calculatePartnerMatch,
  DEFAULT_COMPETENCY_WEIGHTS,
  type AuthorFullProfileData,
} from "@/lib/recommender/competency";
import {
  mapRowToAchievement,
  mapRowToProject,
  mapRowToExperience,
} from "@/lib/profile-details";
import type {
  Achievement,
  Experience,
  Post,
  Project,
} from "@/types";
export const metadata: Metadata = { title: "Feed" };

/** Postingan terbaru yang diberi peringkat saat mencari (TF-IDF dihitung di memori). */
const CANDIDATE_LIMIT = 300;
/** Jumlah postingan yang ditampilkan di Feed. */
const FEED_PAGE_SIZE = 50;
interface FeedPostRow extends PostRow {
  author_skills: unknown;
  author_competition_interests: unknown;
}
function timeOf(post: Post): number {
  const t = Date.parse(post.created_at);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Pencarian memakai TF-IDF + cosine similarity (lib/search/tfidf.ts).
 * sort=relevan  : urut kemiripan (default saat ada kata kunci)
 * sort=terbaru  : hasil yang cocok, urut terbaru (default tanpa kata kunci)
 * sort=terlama  : hasil yang cocok, urut terlama
 */
function applySearchAndSort(
  candidates: Post[],
  search: string | undefined,
  sort: string | undefined,
): Post[] {
  const query = search?.trim() ?? "";
  let list = candidates; // sudah terbaru -> terlama dari SQL

  if (query) {
    const { mode, ranked } = searchPosts(candidates, query);
    list = ranked.map((entry) => entry.item);
    // Urutan relevansi hanya bermakna bila skor benar-benar dihitung.
    if (mode === "relevance" && (sort === undefined || sort === "relevan")) {
      return list;
    }
  }

  const sorted = [...list].sort((a, b) => timeOf(b) - timeOf(a));
  return sort === "terlama" ? sorted.reverse() : sorted;
}

interface FeedPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: string;
  }>;
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const { category, search, sort } = await searchParams;

  const whereClauses: string[] = [];
  const params: (string | number)[] = [];

  if (category && category !== "Semua") {
    whereClauses.push("p.category = ?");
    params.push(category);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  let posts: Post[] = [];
  try {
    const [rows] = await db.query<FeedPostRow[]>(
      `SELECT 
        p.id,
        p.user_id,
        p.title,
        p.description,
        p.category,
        p.required_skills,
        p.event_name,
        p.deadline,
        p.teammate_count,
        p.faculty_preference,
        p.study_program_preference,
        p.image_url,
        p.status,
        p.created_at,
        p.updated_at,
        p.view_count,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
        pr.full_name AS author_name,
        pr.avatar_url AS author_avatar,
        pr.faculty AS author_faculty,
        pr.study_program AS author_study_program,
        pr.nim AS author_nim,
        pr.generation AS author_generation,
        pr.bio AS author_bio,
        pr.skills AS author_skills,
pr.competition_interests AS author_competition_interests
      FROM posts p
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      ${whereSql}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${CANDIDATE_LIMIT}`,
      params,
    );


    const allCandidates = rows.map(mapRowToPost);

    let orderedPosts = applySearchAndSort(
      allCandidates,
      search,
      sort,
    );

    const query = search?.trim() ?? "";
    const selectedCategory =
      category &&
        category !== "Semua" &&
        category !== "All"
        ? category
        : undefined;

    const shouldCalculateCompetency =
      category !== "Other" &&
      (Boolean(query) || Boolean(selectedCategory));

    if (shouldCalculateCompetency && orderedPosts.length > 0) {
      try {
        const authorIds = Array.from(
          new Set(rows.map((row) => row.user_id).filter(Boolean)),
        );

        const achievementsByUser = new Map<string, Achievement[]>();
        const projectsByUser = new Map<string, Project[]>();
        const experiencesByUser = new Map<string, Experience[]>();

        const profileByUser = new Map(
          rows.map((row) => [
            row.user_id,
            {
              skills: parseSkills(row.author_skills),
              interests: parseSkills(
                row.author_competition_interests,
              ),
            },
          ]),
        );

        if (authorIds.length > 0) {
          const [achievementRows] = await db.query<RowDataPacket[]>(
            "SELECT * FROM achievements WHERE user_id IN (?)",
            [authorIds],
          );

          for (const row of achievementRows) {
            const item = mapRowToAchievement(row);
            const records = achievementsByUser.get(item.user_id) ?? [];
            records.push(item);
            achievementsByUser.set(item.user_id, records);
          }

          const [projectRows] = await db.query<RowDataPacket[]>(
            "SELECT * FROM projects WHERE user_id IN (?)",
            [authorIds],
          );

          for (const row of projectRows) {
            const item = mapRowToProject(row);
            const records = projectsByUser.get(item.user_id) ?? [];
            records.push(item);
            projectsByUser.set(item.user_id, records);
          }

          const [experienceRows] = await db.query<RowDataPacket[]>(
            "SELECT * FROM experiences WHERE user_id IN (?)",
            [authorIds],
          );

          for (const row of experienceRows) {
            const item = mapRowToExperience(row);
            const records = experiencesByUser.get(item.user_id) ?? [];
            records.push(item);
            experiencesByUser.set(item.user_id, records);
          }
        }

        for (const post of orderedPosts) {
          const profile = profileByUser.get(post.user_id);

          const authorData: AuthorFullProfileData = {
            profile: {
              skills: profile?.skills ?? [],
              bio: post.author?.bio ?? null,
              competition_interests: profile?.interests ?? [],
            },
            achievements: achievementsByUser.get(post.user_id) ?? [],
            projects: projectsByUser.get(post.user_id) ?? [],
            experiences: experiencesByUser.get(post.user_id) ?? [],
          };

          const match = calculatePartnerMatch(
            post,
            authorData,
            {
              category: selectedCategory,
              query,
            },
            DEFAULT_COMPETENCY_WEIGHTS,
            allCandidates,
          );

          if (match.isEligible) {
            post.partner_match = {
              score: match.score,
              display_label: match.displayLabel,
              has_sufficient_data: match.hasSufficientData,
              breakdown: match.breakdown
                ? {
                  post_relevance: match.breakdown.postRelevance,
                  profile_match: match.breakdown.profileMatch,
                  achievement_score: match.breakdown.achievementScore,
                  project_score: match.breakdown.projectScore,
                  experience_score: match.breakdown.experienceScore,
                }
                : undefined,
            };
          }
        }

        // Gunakan skor kompetensi sebagai ranking utama
        // untuk pencarian atau kategori spesifik.
        // Ranking TF-IDF menjadi pemecah skor yang sama.
        if (!sort || sort === "relevan") {
          const originalOrder = new Map(
            orderedPosts.map((post, index) => [post.id, index]),
          );

          orderedPosts.sort((a, b) => {
            const scoreA = a.partner_match?.score ?? -1;
            const scoreB = b.partner_match?.score ?? -1;

            if (scoreB !== scoreA) {
              return scoreB - scoreA;
            }

            return (
              (originalOrder.get(a.id) ?? 0) -
              (originalOrder.get(b.id) ?? 0)
            );
          });
        }
      } catch (error) {
        console.error(
          "Error calculating feed competency scores:",
          error,
        );
      }
    }

    posts = orderedPosts.slice(0, FEED_PAGE_SIZE);

  } catch (error) {
    console.error("Error loading feed posts from MySQL:", error);
  }

  const currentUser = await getAuthenticatedUser();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="Siap Ukir Prestasi Baru lagi?"
          description="Yuk Cari Partner lagi"
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <Link
          href="/feed"
          className={`inline-flex whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${!category || category === "Semua"
              ? "bg-navy-800 text-white"
              : "border border-line bg-surface text-muted hover:bg-navy-50 hover:text-navy-800"
            }`}
        >
          Semua Kategori
        </Link>
        {COMPETITION_CATEGORIES.map((cat) => {
          const isSelected = category === cat;
          return (
            <Link
              key={cat}
              href={`/feed?category=${encodeURIComponent(cat)}`}
              className={`inline-flex whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${isSelected
                  ? "bg-navy-800 text-white"
                  : "border border-line bg-surface text-muted hover:bg-navy-50 hover:text-navy-800"
                }`}
            >
              {cat}
            </Link>
          );
        })}
      </div>

      <FeedSearch>
        {posts.length === 0 ? (
          <EmptyState
            icon="home"
            title="Belum ada postingan"
            description={
              category
                ? `Belum ada postingan untuk kategori "${category}".`
                : "Daftar postingan, pencarian, dan filter akan tampil di sini."
            }
            action={
              <Link
                href="/posts/create"
                className={buttonStyles({ variant: "accent" })}
              >
                Buat postingan
              </Link>
            }
          />
        ) : (
          <div className="mx-auto w-full max-w-2xl divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
              />
            ))}
          </div>
        )}
      </FeedSearch>
    </div>
  );
}
