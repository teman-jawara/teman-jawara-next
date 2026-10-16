
import type { RowDataPacket } from "mysql2";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { PostCard } from "@/components/posts/post-card";
import { mapRowToPost, type PostRow } from "@/lib/posts";
import type { Post } from "@/types";
import {ProfileConnect} from "@/components/profile/profile-connect";
interface ProfileRow extends RowDataPacket {
  user_id: string;
  full_name: string | null;
  nim: string | null;
  avatar_url: string | null;
  faculty: string | null;
  study_program: string | null;
  generation: number | null;
  bio: string | null;
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
      bio
    FROM profiles
    WHERE user_id = ?
    LIMIT 1`,
    [id],
  );

  const profile = rows[0];

  if (!profile) {
    notFound();
  }

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
      [id],
    );

    posts = postRows.map(mapRowToPost);
  } catch (error) {
    console.error("Error loading profile posts:", error);
  }

  const currentUser = await getAuthenticatedUser();
  const name = profile.full_name || "Mahasiswa Untirta";

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 p-4">
      <section className="rounded-2xl border border-gray-200 bg-white p-6">
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
        </div>
      </section>

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
