import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { COMPETITION_CATEGORIES } from "../constants/competition.ts";
import { PROFILE_WEIGHTS, searchPosts } from "../lib/search/tfidf.ts";
import { posts, users, likes, comments, SEED_EMAIL_DOMAIN } from "../scripts/seed-data.mjs";
import { buildSeedRows, cleanSeed, seedDatabase } from "../scripts/seed.mjs";

const NOW = new Date("2026-10-22T10:00:00Z");
const counterId = () => {
  let n = 0;
  return () => `id${String(++n).padStart(3, "0")}`;
};

function fakeConnection({ failOn } = {}) {
  const calls = [];
  return {
    calls,
    beginTransaction: async () => calls.push({ op: "begin" }),
    commit: async () => calls.push({ op: "commit" }),
    rollback: async () => calls.push({ op: "rollback" }),
    query: async (sql, values = []) => {
      calls.push({ op: "query", sql: sql.replace(/\s+/g, " ").trim(), values });
      if (failOn && sql.includes(failOn)) throw new Error("boom");
      return [{ affectedRows: 3 }];
    },
  };
}

describe("integritas data seed", () => {
  test("kategori valid dan sesuai batas kolom schema", () => {
    for (const p of posts) {
      assert.ok(COMPETITION_CATEGORIES.includes(p.category), `${p.key}: ${p.category}`);
      assert.ok(p.title.length <= 200 && (p.event ?? "").length <= 200, p.key);
      assert.ok(["active", "closed", undefined].includes(p.status), p.key);
    }
  });

  test("key unik, relasi valid, email & NIM unik", () => {
    const userKeys = new Set(users.map((u) => u.key));
    const postKeys = new Set(posts.map((p) => p.key));
    assert.equal(userKeys.size, users.length);
    assert.equal(postKeys.size, posts.length);
    assert.equal(new Set(users.map((u) => u.nim)).size, users.length);
    for (const p of posts) assert.ok(userKeys.has(p.user), p.key);
    for (const [u, p] of likes) assert.ok(userKeys.has(u) && postKeys.has(p));
    for (const [u, p] of comments) assert.ok(userKeys.has(u) && postKeys.has(p));
    assert.equal(new Set(likes.map((l) => l.join("|"))).size, likes.length); // UNIQUE(user_id, post_id)
  });

  test("ada tepat 1 postingan closed, dan ada pengguna dengan profil kosong", () => {
    assert.equal(posts.filter((p) => p.status === "closed").length, 1);
    assert.ok(users.some((u) => u.skills.length === 0 && !u.bio));
  });
});

describe("buildSeedRows", () => {
  test("semua id unik, JSON valid, created_at urut sesuai daysAgo", () => {
    const rows = buildSeedRows({ now: NOW, newId: counterId() });
    const ids = [...rows.userRows, ...rows.profileRows, ...rows.postRows, ...rows.likeRows, ...rows.commentRows].map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const p of rows.postRows) assert.ok(Array.isArray(JSON.parse(p.required_skills)));
    const byKey = new Map(posts.map((p, i) => [p.key, rows.postRows[i]]));
    assert.ok(byKey.get("p05").created_at > byKey.get("p02").created_at);
    assert.ok(byKey.get("p16").created_at > byKey.get("p15").created_at);
    assert.match(byKey.get("p01").deadline, /^\d{4}-\d{2}-\d{2}$/);
  });

  test("email seed memakai domain khusus", () => {
    const rows = buildSeedRows({ now: NOW, newId: counterId() });
    assert.ok(rows.userRows.every((u) => u.email.endsWith(`@${SEED_EMAIL_DOMAIN}`)));
  });
});

describe("seedDatabase (koneksi tiruan)", () => {
  test("transaksi: begin -> delete seed -> insert -> commit; placeholder = jumlah nilai", async () => {
    const conn = fakeConnection();
    const summary = await seedDatabase(conn, { passwordHash: "hash", now: NOW, newId: counterId() });

    const ops = conn.calls.map((c) => c.op);
    assert.equal(ops[0], "begin");
    assert.equal(ops.at(-1), "commit");
    assert.ok(!ops.includes("rollback"));

    const queries = conn.calls.filter((c) => c.op === "query");
    assert.match(queries[0].sql, /^DELETE FROM users WHERE email LIKE \?$/);
    assert.deepEqual(queries[0].values, [`%@${SEED_EMAIL_DOMAIN}`]);

    for (const q of queries) {
      assert.equal((q.sql.match(/\?/g) ?? []).length, q.values.length, q.sql);
    }

    const count = (table) => queries.filter((q) => q.sql.startsWith(`INSERT INTO ${table} `)).length;
    assert.equal(count("users"), users.length);
    assert.equal(count("profiles"), users.length);
    assert.equal(count("posts"), posts.length);
    assert.equal(count("likes"), likes.length);
    assert.equal(count("comments"), comments.length);
    assert.equal(summary.removed, 3);
    assert.equal(summary.posts, posts.length);
  });

  test("urutan insert menghormati foreign key (users -> profiles -> posts -> likes/comments)", async () => {
    const conn = fakeConnection();
    await seedDatabase(conn, { passwordHash: "hash", now: NOW, newId: counterId() });
    const tables = conn.calls
      .filter((c) => c.op === "query" && c.sql.startsWith("INSERT"))
      .map((c) => c.sql.split(" ")[2]);
    const first = (t) => tables.indexOf(t);
    assert.ok(first("users") < first("profiles") && first("profiles") < first("posts"));
    assert.ok(first("posts") < first("likes") && first("posts") < first("comments"));
  });

  test("rollback bila insert gagal, dan error diteruskan", async () => {
    const conn = fakeConnection({ failOn: "INSERT INTO posts" });
    await assert.rejects(
      seedDatabase(conn, { passwordHash: "hash", now: NOW, newId: counterId() }),
      /boom/,
    );
    const ops = conn.calls.map((c) => c.op);
    assert.ok(ops.includes("rollback"));
    assert.ok(!ops.includes("commit"));
  });

  test("passwordHash wajib; cleanSeed hanya menghapus domain seed", async () => {
    await assert.rejects(seedDatabase(fakeConnection(), {}), /passwordHash/);
    const conn = fakeConnection();
    assert.equal(await cleanSeed(conn), 3);
    assert.deepEqual(conn.calls[0].values, [`%@${SEED_EMAIL_DOMAIN}`]);
  });
});

describe("pencarian pada data seed (skenario uji manual di docs)", () => {
  const rows = buildSeedRows({ now: NOW, newId: counterId() });
  const keyById = new Map(rows.postRows.map((r, i) => [r.id, posts[i].key]));
  const all = rows.postRows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    event_name: r.event_name,
    required_skills: JSON.parse(r.required_skills),
    created_at: r.created_at.toISOString(),
    status: r.status,
  }));
  const active = all.filter((p) => p.status === "active");
  const keys = (result) => result.ranked.map((x) => keyById.get(x.item.id));

  test("'figma' (status active): poster & UI/UX atas, postingan closed tidak ikut", () => {
    const r = searchPosts(active, "figma");
    assert.equal(r.mode, "relevance");
    assert.deepEqual(new Set(keys(r)), new Set(["p05", "p01", "p09"]));
    assert.ok(!keys(r).includes("p13"));
  });

  test("status=all menyertakan postingan closed (p13)", () => {
    assert.ok(keys(searchPosts(all, "figma")).includes("p13"));
  });

  test("'figm' (kata belum lengkap) memakai mode substring", () => {
    const r = searchPosts(active, "figm");
    assert.equal(r.mode, "substring");
    assert.deepEqual(new Set(keys(r)), new Set(["p05", "p01", "p09"]));
  });

  test("'node' cocok dengan 'Node.js' (p02) dan 'NodeJS' (p17)", () => {
    assert.deepEqual(new Set(keys(searchPosts(active, "node"))), new Set(["p02", "p17"]));
  });

  test("'robotik': dua postingan identik, yang lebih baru (p16) di atas", () => {
    assert.deepEqual(keys(searchPosts(active, "robotik")), ["p16", "p15"]);
  });

  test("kueri spesifik menempatkan postingan yang tepat di peringkat 1", () => {
    assert.equal(keys(searchPosts(active, "debat"))[0], "p03");
    assert.equal(keys(searchPosts(active, "mysql node"))[0], "p02");
    assert.equal(keys(searchPosts(active, "lomba data python"))[0], "p04");
    assert.equal(keys(searchPosts(active, "poster"))[0], "p05");
  });

  test("kueri kosong -> terbaru (p05 lalu p02); tak cocok -> kosong", () => {
    const recent = searchPosts(active, "");
    assert.equal(recent.mode, "recent");
    assert.deepEqual(keys(recent).slice(0, 2), ["p05", "p02"]);
    assert.equal(searchPosts(active, "astronomi").ranked.length, 0);
  });

  test("rekomendasi dari profil (profile=1 tanpa q) sesuai minat tiap pengguna", () => {
    const part = (k) => {
      const u = users.find((x) => x.key === k);
      return [
        { text: u.skills, weight: PROFILE_WEIGHTS.skills },
        { text: u.competition_interests, weight: PROFILE_WEIGHTS.competition_interests },
        { text: u.bio, weight: PROFILE_WEIGHTS.bio },
      ];
    };
    const top = { rina: "p01", dimas: "p02", sari: "p03", bayu: "p04" };
    for (const [user, post] of Object.entries(top)) {
      const r = searchPosts(active, "", part(user));
      assert.equal(r.mode, "relevance", user);
      assert.equal(keys(r)[0], post, user);
    }
    // profil kosong (nadia) -> fallback terbaru
    assert.equal(searchPosts(active, "", part("nadia")).mode, "recent");
  });
});
