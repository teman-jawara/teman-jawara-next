
import type { RowDataPacket } from "mysql2";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/posts/post-card";
import { mapRowToPost, parseSkills, type PostRow } from "@/lib/posts";
import type { Achievement, Project, Experience, Post } from "@/types";
import { ProfileConnect } from "@/components/profile/profile-connect";
import { AchievementsSection } from "@/components/profile/achievements-section";
import { ProjectsSection } from "@/components/profile/projects-section";
import { ExperiencesSection } from "@/components/profile/experiences-section";
import {
  getUserAchievements,
  getUserProjects,
  getUserExperiences,
} from "@/lib/profile-details";
import { normalizeIndonesianWhatsAppNumber } from "@/lib/whatsapp";


interface ProfileRow extends RowDataPacket {
  user_id: string;
  full_name: string | null;
  nim: string | null;
  avatar_url: string | null;
  faculty: string | null;
  study_program: string | null;
  generation: number | null;
  bio: string | null;
  skills: unknown;
  competition_interests: unknown;
  whatsapp_number: string | null;
  whatsapp_public: number | boolean;
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [rows] = await db.query<ProfileRow[]>(
    `SELECT
      user_id,
      full_name,
      nim,
      avatar_url,
      faculty,
      study_program,
      generation,
      bio,
      skills,
      competition_interests,
      whatsapp_number,
      whatsapp_public
    FROM profiles
    WHERE user_id = ?
    LIMIT 1`,
    [id],
  );

  const profile = rows[0];

  if (!profile) {
    notFound();
  }

  const [posts, achievements, projects, experiences] = await Promise.all([
    db
      .query<PostRow[]>(
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
          pr.bio AS author_bio
        FROM posts p
        LEFT JOIN profiles pr ON pr.user_id = p.user_id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC
        LIMIT 50`,
        [id],
      )
      .then(([postRows]) => postRows.map(mapRowToPost))
      .catch((error) => {
        console.error("Error loading profile posts:", error);
        return [] as Post[];
      }),
    getUserAchievements(id).catch(() => [] as Achievement[]),
    getUserProjects(id).catch(() => [] as Project[]),
    getUserExperiences(id).catch(() => [] as Experience[]),
  ]);

  const currentUser = await getAuthenticatedUser();
  const name = profile.full_name || "Mahasiswa Untirta";
  const skills = parseSkills(profile.skills);
  const interests = parseSkills(profile.competition_interests);
  const isOwner = currentUser?.id === profile.user_id;
    const normalizedWhatsApp =
    Number(profile.whatsapp_public) === 1
      ? normalizeIndonesianWhatsAppNumber(
          profile.whatsapp_number,
        )
      : null;

  const canShowWhatsApp = !isOwner && Boolean(normalizedWhatsApp);

  const whatsappMessage =
    `Halo ${name}, aku menemukan profilmu di TemanJawara. ` +
    "Aku tertarik berdiskusi tentang kolaborasi lomba. " +
    "Apakah kamu terbuka untuk berdiskusi?";

  const whatsappUrl = normalizedWhatsApp
    ? `https://wa.me/${normalizedWhatsApp}?text=${encodeURIComponent(whatsappMessage)}`
    : null;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 p-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <Avatar name={name} size="md" />

          <div className="min-w-0">
            <h1 className="break-words text-xl font-bold text-gray-950">
              {name}
            </h1>

            <p className="text-sm text-gray-500">
              @{profile.nim || "NIM belum diisi"}
            </p>
          </div>
        </div>
        <ProfileConnect profileId={profile.user_id} />
        
        {canShowWhatsApp && whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1DA851] focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.5 0 .14 5.36.14 11.94c0 2.1.55 4.15 1.59 5.96L0 24l6.26-1.64a11.93 11.93 0 0 0 5.81 1.48h.01C18.65 23.84 24 18.48 24 11.9c0-3.18-1.24-6.17-3.48-8.42ZM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.85 9.85 0 0 1-1.52-5.25c0-5.46 4.44-9.9 9.91-9.9a9.82 9.82 0 0 1 7.01 2.91 9.82 9.82 0 0 1 2.9 7.02c0 5.46-4.44 9.9-9.92 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35Z" />
            </svg>
            Hubungi via WhatsApp
          </a>
        )}

        <div className="mt-6 space-y-3 border-t border-gray-200 pt-4">
          <div>
            <p className="text-sm text-gray-500">NIM</p>
            <p className="text-gray-900">{profile.nim || "Belum diisi"}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Fakultas</p>
            <p className="text-gray-900">
              {profile.faculty || "Belum diisi"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Program Studi</p>
            <p className="text-gray-900">
              {profile.study_program || "Belum diisi"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Angkatan</p>
            <p className="text-gray-900">
              {profile.generation ?? "Belum diisi"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">Tentang</p>
            <p className="whitespace-pre-wrap text-gray-900">
              {profile.bio || "Belum ada bio."}
            </p>
          </div>

          {skills.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1.5">Keahlian (Skills)</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, idx) => (
                  <Badge key={idx} tone="navy">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {interests.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-1.5">Minat Kompetisi</p>
              <div className="flex flex-wrap gap-1.5">
                {interests.map((interest, idx) => (
                  <Badge key={idx} tone="gold">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Structured Achievements, Projects, and Experiences */}
      <AchievementsSection
        initialAchievements={achievements}
        userId={profile.user_id}
        isEditable={isOwner}
      />

      <ProjectsSection
        initialProjects={projects}
        userId={profile.user_id}
        isEditable={isOwner}
      />

      <ExperiencesSection
        initialExperiences={experiences}
        userId={profile.user_id}
        isEditable={isOwner}
      />

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-950">
          Postingan
        </h2>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center">
            <p className="font-medium text-gray-800">
              Belum ada postingan
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Postingan yang dibuat pengguna ini akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                viewMode="profile"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
