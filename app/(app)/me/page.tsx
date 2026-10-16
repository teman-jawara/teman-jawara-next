
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2";
import { getAuthenticatedUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { PostCard } from "@/components/posts/post-card";
import { mapRowToPost, type PostRow } from "@/lib/posts";
import type { Post } from "@/types";

export const metadata: Metadata = {
  title: "Profil saya",
};

interface ProfileRow extends RowDataPacket {
  id: string;
  user_id: string;
  full_name: string;
  nim: string | null;
  faculty: string | null;
  study_program: string | null;
  generation: number | null;
  avatar_url: string | null;
  bio: string | null;
  skills: unknown;
  competition_interests: unknown;
}

export default async function MyProfilePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const [rows] = await db.query<ProfileRow[]>(
    "SELECT * FROM profiles WHERE user_id = ? LIMIT 1",
    [user.id],
  );

  const rawProfile = rows[0];

  if (!rawProfile) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PageHeader
            title="Profil saya"
            description="Lihat dan ubah profilmu."
          />
          <LogoutButton />
        </div>

        <Card>
          <p className="text-sm text-red-600">
            Data profil belum ditemukan.
          </p>
        </Card>
      </div>
    );
  }

  const skills = Array.isArray(rawProfile.skills)
    ? rawProfile.skills
    : typeof rawProfile.skills === "string"
      ? JSON.parse(rawProfile.skills)
      : [];

  const competitionInterests = Array.isArray(
    rawProfile.competition_interests,
  )
    ? rawProfile.competition_interests
    : typeof rawProfile.competition_interests === "string"
      ? JSON.parse(rawProfile.competition_interests)
      : [];

  const profile = {
    id: rawProfile.id,
    full_name: rawProfile.full_name,
    nim: rawProfile.nim,
    faculty: rawProfile.faculty,
    study_program: rawProfile.study_program,
    generation: rawProfile.generation
      ? Number(rawProfile.generation)
      : null,
    bio: rawProfile.bio,
    skills,
    competition_interests: competitionInterests,
  };

  let posts: Post[] = [];

  try {
    const [postRows] = await db.query<PostRow[]>(
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
      [user.id],
    );

    posts = postRows.map(mapRowToPost);
  } catch (error) {
    console.error("Error loading my posts:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title="Profil saya"
          description="Lihat dan ubah profilmu."
        />

        <LogoutButton />
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">Nama lengkap</p>
            <p className="font-semibold text-navy-800">
              {profile.full_name || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">NIM</p>
            <p className="font-semibold text-navy-800">
              {profile.nim || "Belum diisi"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Fakultas</p>
            <p className="font-semibold text-navy-800">
              {profile.faculty || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Program Studi</p>
            <p className="font-semibold text-navy-800">
              {profile.study_program || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Angkatan</p>
            <p className="font-semibold text-navy-800">
              {profile.generation || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Bio</p>
            <p className="text-sm text-navy-800">
              {profile.bio || "Belum ada bio."}
            </p>
          </div>
        </div>
      </Card>

      <ProfileEditForm profile={profile} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy-800">
          Postingan Saya
          <span className="ml-2 text-sm font-normal text-gray-500">
            {posts.length}
          </span>
        </h2>

        {posts.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-10 text-center">
            <p className="font-medium text-gray-800">
              Belum ada postingan
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Postingan yang kamu buat akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user.id}
                viewMode="profile"
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
