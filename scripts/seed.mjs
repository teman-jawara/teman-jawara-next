/**
 * Seeder data uji TemanJawara (MySQL lokal).
 *
 *   npm run seed          hapus data seed lama lalu isi ulang (aman dijalankan berulang)
 *   npm run seed:clean    hanya hapus data seed
 *
 * Hanya baris dengan email @seed.temanjawara.test yang dihapus/dibuat. Data asli
 * (akun yang Anda daftarkan sendiri) tidak disentuh. Profil, postingan, like, dan
 * komentar seed ikut terhapus otomatis lewat ON DELETE CASCADE.
 */
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  SEED_EMAIL_DOMAIN,
  SEED_PASSWORD,
  comments,
  likes,
  posts,
  users,
} from "./seed-data.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export const seedEmail = (key) => `${key}@${SEED_EMAIL_DOMAIN}`;

function toDateOnly(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Susun semua baris yang akan di-insert (murni, tanpa database) agar mudah diuji.
 * `newId` dan `now` bisa diganti saat pengujian.
 */
export function buildSeedRows({ now = new Date(), newId = randomUUID } = {}) {
  const userIds = new Map(users.map((u) => [u.key, newId()]));
  const postIds = new Map(posts.map((p) => [p.key, newId()]));

  const userRows = users.map((u) => ({ id: userIds.get(u.key), email: seedEmail(u.key) }));

  const profileRows = users.map((u) => ({
    id: newId(),
    user_id: userIds.get(u.key),
    full_name: u.full_name,
    nim: u.nim,
    faculty: u.faculty,
    study_program: u.study_program,
    generation: u.generation,
    bio: u.bio || null,
    skills: JSON.stringify(u.skills),
    competition_interests: JSON.stringify(u.competition_interests),
  }));

  const postRows = posts.map((p, index) => {
    // Menit berbeda per postingan agar urutan created_at tidak bentrok.
    const createdAt = new Date(now.getTime() - p.daysAgo * DAY_MS - (index + 1) * 20 * 60 * 1000);
    return {
      id: postIds.get(p.key),
      user_id: userIds.get(p.user),
      title: p.title,
      description: p.description,
      category: p.category,
      required_skills: JSON.stringify(p.skills),
      event_name: p.event,
      deadline: toDateOnly(new Date(now.getTime() + p.deadlineInDays * DAY_MS)),
      teammate_count: p.teammates,
      status: p.status ?? "active",
      created_at: createdAt,
    };
  });

  const likeRows = likes.map(([u, p]) => ({
    id: newId(),
    user_id: userIds.get(u),
    post_id: postIds.get(p),
  }));

  const commentRows = comments.map(([u, p, content]) => ({
    id: newId(),
    user_id: userIds.get(u),
    post_id: postIds.get(p),
    content,
  }));

  return { userRows, profileRows, postRows, likeRows, commentRows };
}

/** Hapus hanya data seed (cascade ke profiles/posts/likes/comments). */
export async function cleanSeed(conn) {
  const [result] = await conn.query("DELETE FROM users WHERE email LIKE ?", [
    `%@${SEED_EMAIL_DOMAIN}`,
  ]);
  return result?.affectedRows ?? 0;
}

/**
 * Isi data seed di dalam satu transaksi. `conn` cukup punya `.query(sql, values)`,
 * `.beginTransaction()`, `.commit()`, `.rollback()` (koneksi mysql2/promise).
 */
export async function seedDatabase(conn, { passwordHash, now = new Date(), newId = randomUUID } = {}) {
  if (!passwordHash) throw new Error("passwordHash wajib diisi.");
  const rows = buildSeedRows({ now, newId });

  await conn.beginTransaction();
  try {
    const removed = await cleanSeed(conn);

    for (const u of rows.userRows) {
      await conn.query("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", [
        u.id,
        u.email,
        passwordHash,
      ]);
    }

    for (const p of rows.profileRows) {
      await conn.query(
        `INSERT INTO profiles
           (id, user_id, full_name, nim, faculty, study_program, generation, bio, skills, competition_interests)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.user_id, p.full_name, p.nim, p.faculty, p.study_program, p.generation, p.bio, p.skills, p.competition_interests],
      );
    }

    for (const p of rows.postRows) {
      await conn.query(
        `INSERT INTO posts
           (id, user_id, title, description, category, required_skills, event_name,
            deadline, teammate_count, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.user_id, p.title, p.description, p.category, p.required_skills, p.event_name,
         p.deadline, p.teammate_count, p.status, p.created_at, p.created_at],
      );
    }

    for (const l of rows.likeRows) {
      await conn.query("INSERT INTO likes (id, user_id, post_id) VALUES (?, ?, ?)", [l.id, l.user_id, l.post_id]);
    }

    for (const c of rows.commentRows) {
      await conn.query("INSERT INTO comments (id, user_id, post_id, content) VALUES (?, ?, ?, ?)", [
        c.id,
        c.user_id,
        c.post_id,
        c.content,
      ]);
    }

    await conn.commit();
    return {
      removed,
      users: rows.userRows.length,
      posts: rows.postRows.length,
      likes: rows.likeRows.length,
      comments: rows.commentRows.length,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const cleanOnly = args.has("--clean");

  if (process.env.NODE_ENV === "production") {
    console.error("Seeder ditolak: NODE_ENV=production.");
    process.exit(1);
  }

  const host = process.env.DB_HOST || "127.0.0.1";
  if (!LOCAL_HOSTS.has(host) && !args.has("--force")) {
    console.error(`Seeder ditolak: DB_HOST=${host} bukan database lokal. Tambahkan --force jika Anda yakin.`);
    process.exit(1);
  }

  // Impor dinamis supaya file ini bisa diimpor oleh test tanpa memuat driver.
  const mysql = (await import("mysql2/promise")).default;
  const conn = await mysql.createConnection({
    host,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    if (cleanOnly) {
      const removed = await cleanSeed(conn);
      console.log(`Selesai: ${removed} akun seed dihapus (beserta profil, postingan, like, komentar).`);
      return;
    }

    const bcrypt = (await import("bcryptjs")).default;
    const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
    const result = await seedDatabase(conn, { passwordHash });

    console.log(`Seed berhasil ke database "${process.env.DB_NAME}":`);
    console.log(`  akun lama dihapus : ${result.removed}`);
    console.log(`  akun dibuat       : ${result.users}`);
    console.log(`  postingan         : ${result.posts} (1 berstatus closed)`);
    console.log(`  like / komentar   : ${result.likes} / ${result.comments}`);
    console.log("\nLogin untuk uji (kata sandi sama untuk semua):");
    for (const u of users) console.log(`  ${seedEmail(u.key).padEnd(34)} ${u.full_name}`);
    console.log(`  kata sandi: ${SEED_PASSWORD}`);
  } finally {
    await conn.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Seed gagal:", error?.message ?? error);
    process.exit(1);
  });
}
