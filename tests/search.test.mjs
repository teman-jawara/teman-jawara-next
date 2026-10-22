import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeText,
  tokenize,
  countTerms,
  termFrequency,
  inverseDocumentFrequency,
  buildIdfTable,
  buildVector,
  cosineSimilarity,
  rankByRelevance,
  searchPosts,
  INDONESIAN_STOPWORDS,
  PROFILE_WEIGHTS,
} from "../lib/search/tfidf.ts";
import {
  parseSearchParams,
  buildCandidateWhere,
  escapeLike,
} from "../lib/search/query.ts";

const near = (a, b, eps = 1e-9) =>
  assert.ok(Math.abs(a - b) < eps, `expected ${a} ≈ ${b}`);

const post = (over) => ({
  id: "p0",
  title: "",
  description: "",
  category: "Other",
  event_name: null,
  required_skills: [],
  created_at: "2026-10-01T00:00:00.000Z",
  ...over,
});

describe("normalisasi & tokenisasi", () => {
  test("lowercase, hapus diakritik, tangani null/undefined", () => {
    assert.equal(normalizeText("  Café  RÉSUMÉ "), "  cafe  resume ");
    assert.equal(normalizeText(null), "");
    assert.equal(normalizeText(undefined), "");
  });

  test("stopword Indonesia dibuang, kata penting dipertahankan", () => {
    assert.deepEqual(
      tokenize("Dicari anggota tim yang bisa desain untuk lomba UI/UX"),
      ["dicari", "anggota", "tim", "desain", "lomba", "ui", "ux"],
    );
    assert.ok(INDONESIAN_STOPWORDS.has("yang"));
    assert.ok(!INDONESIAN_STOPWORDS.has("lomba"));
  });

  test("alias teknis tidak rusak oleh tanda baca", () => {
    assert.deepEqual(tokenize("C++, C#, Node.js, .NET"), ["cpp", "csharp", "node", "dotnet"]);
    // semua varian ditulis pengguna menjadi token yang sama
    assert.deepEqual(tokenize("nodejs NodeJS node.js Node"), ["node", "node", "node", "node"]);
    assert.deepEqual(tokenize("Next.js Vue.js React.js"), ["next", "vue", "react"]);
  });

  test("token 1 huruf dibuang, angka dipertahankan, 'Data/AI' terpecah", () => {
    assert.deepEqual(tokenize("a b 2026 Data/AI"), ["2026", "data", "ai"]);
  });

  test("query kosong / hanya stopword / hanya simbol -> tanpa token", () => {
    assert.deepEqual(tokenize(""), []);
    assert.deepEqual(tokenize("   "), []);
    assert.deepEqual(tokenize("yang dan di ke"), []);
    assert.deepEqual(tokenize("!!! ??? ---"), []);
  });
});

describe("TF, IDF, vektor", () => {
  test("TF sublinear", () => {
    assert.equal(termFrequency(0), 0);
    assert.equal(termFrequency(1), 1);
    near(termFrequency(3), 1 + Math.log(3));
  });

  test("IDF smoothed: nilai terhitung manual", () => {
    // N=4, df=1 -> ln(5/2)+1 ; df=4 -> ln(5/5)+1 = 1
    near(inverseDocumentFrequency(4, 1), Math.log(2.5) + 1);
    near(inverseDocumentFrequency(4, 4), 1);
    assert.ok(Number.isFinite(inverseDocumentFrequency(0, 0)));
  });

  test("bobot field: judul (x3) > deskripsi (x1)", () => {
    const counts = countTerms([
      { text: "react", weight: 3 },
      { text: "react figma", weight: 1 },
      { text: "abaikan", weight: 0 },
      { text: "abaikan", weight: -2 },
    ]);
    assert.equal(counts.get("react"), 4);
    assert.equal(counts.get("figma"), 1);
    assert.ok(!counts.has("abaikan"));
  });

  test("array required_skills diratakan", () => {
    const counts = countTerms([{ text: ["React", "Node.js"], weight: 2 }]);
    assert.equal(counts.get("react"), 2);
    assert.equal(counts.get("node"), 2);
  });

  test("buildVector: norma benar & term asing dibuang", () => {
    const docs = [new Map([["a", 1]]), new Map([["a", 1], ["b", 1]])];
    const idf = buildIdfTable(docs);
    const v = buildVector(new Map([["b", 1], ["zzz", 5]]), idf);
    assert.equal(v.weights.size, 1);
    near(v.norm, idf.get("b"));
  });
});

describe("cosine similarity", () => {
  const idf = new Map([["a", 1], ["b", 1], ["c", 1]]);
  const vec = (o) => buildVector(new Map(Object.entries(o)), idf);

  test("vektor identik = 1", () => {
    near(cosineSimilarity(vec({ a: 1, b: 1 }), vec({ a: 1, b: 1 })), 1);
  });

  test("vektor ortogonal = 0", () => {
    assert.equal(cosineSimilarity(vec({ a: 1 }), vec({ b: 1 })), 0);
  });

  test("vektor nol / kosong = 0 (bukan NaN)", () => {
    const zero = vec({});
    assert.equal(zero.norm, 0);
    assert.equal(cosineSimilarity(zero, vec({ a: 1 })), 0);
    assert.equal(cosineSimilarity(vec({ a: 1 }), zero), 0);
    assert.equal(cosineSimilarity(zero, zero), 0);
  });

  test("simetris dan terhitung manual", () => {
    // q = a+b (w=1 tiap term), d = a (w=1): dot=1, |q|=√2, |d|=1 -> 1/√2
    const s = cosineSimilarity(vec({ a: 1, b: 1 }), vec({ a: 1 }));
    near(s, 1 / Math.SQRT2);
    near(s, cosineSimilarity(vec({ a: 1 }), vec({ a: 1, b: 1 })));
  });
});

describe("rankByRelevance", () => {
  const corpus = [
    post({
      id: "design",
      title: "Cari partner UI/UX untuk lomba desain aplikasi",
      description: "Butuh anggota tim yang menguasai Figma dan riset pengguna.",
      category: "UI/UX",
      event_name: "Gemastik",
      required_skills: ["Figma", "UI Design"],
      created_at: "2026-10-10T00:00:00.000Z",
    }),
    post({
      id: "hack",
      title: "Hackathon nasional mencari backend developer",
      description: "Tim butuh programmer Node.js dan database MySQL.",
      category: "Hackathon",
      event_name: "Hack4Good",
      required_skills: ["Node.js", "MySQL"],
      created_at: "2026-10-12T00:00:00.000Z",
    }),
    post({
      id: "debate",
      title: "Tim debat mencari pembicara",
      description: "Lomba debat tingkat nasional, kemampuan public speaking.",
      category: "Debate/Public Speaking",
      created_at: "2026-10-05T00:00:00.000Z",
    }),
  ];

  test("query relevan menempatkan dokumen yang tepat di atas", () => {
    const { mode, ranked } = rankByRelevance(corpus, [{ text: "figma desain", weight: 1 }]);
    assert.equal(mode, "relevance");
    assert.equal(ranked[0].item.id, "design");
    assert.ok(ranked[0].matchedTerms.includes("figma"));
    assert.ok(ranked.every((r) => r.score > 0 && r.score <= 1));
  });

  test("hanya dokumen dengan skor > 0 yang dikembalikan", () => {
    const { ranked } = rankByRelevance(corpus, [{ text: "mysql", weight: 1 }]);
    assert.deepEqual(ranked.map((r) => r.item.id), ["hack"]);
  });

  test("query ada tapi tidak cocok apa pun -> kosong, mode relevance", () => {
    const r = rankByRelevance(corpus, [{ text: "astronomi", weight: 1 }]);
    assert.equal(r.mode, "relevance");
    assert.equal(r.ranked.length, 0);
  });

  test("query kosong -> fallback terbaru, skor 0", () => {
    for (const q of ["", "   ", "yang dan di", "!!!"]) {
      const r = rankByRelevance(corpus, [{ text: q, weight: 1 }]);
      assert.equal(r.mode, "recent", `q=${JSON.stringify(q)}`);
      assert.deepEqual(r.ranked.map((x) => x.item.id), ["hack", "design", "debate"]);
      assert.ok(r.ranked.every((x) => x.score === 0));
    }
    assert.equal(rankByRelevance(corpus, []).mode, "recent");
  });

  test("korpus kosong tidak error", () => {
    assert.equal(rankByRelevance([], [{ text: "react", weight: 1 }]).ranked.length, 0);
    assert.equal(rankByRelevance([], []).ranked.length, 0);
  });

  test("tie-breaker: skor sama -> created_at terbaru dulu, lalu id", () => {
    const twins = [
      post({ id: "old", title: "Lomba robotik", created_at: "2026-01-01T00:00:00.000Z" }),
      post({ id: "new", title: "Lomba robotik", created_at: "2026-09-01T00:00:00.000Z" }),
      post({ id: "newb", title: "Lomba robotik", created_at: "2026-09-01T00:00:00.000Z" }),
    ];
    const { ranked } = rankByRelevance(twins, [{ text: "robotik", weight: 1 }]);
    assert.deepEqual(ranked.map((r) => r.item.id), ["newb", "new", "old"]);
    assert.equal(ranked[0].score, ranked[2].score);
  });

  test("kecocokan di judul mengalahkan kecocokan di deskripsi saja", () => {
    const docs = [
      post({ id: "desc", title: "Info lomba", description: "perlu analis data", created_at: "2026-10-20T00:00:00.000Z" }),
      post({ id: "title", title: "Analis data dibutuhkan", description: "info lomba", created_at: "2026-10-01T00:00:00.000Z" }),
    ];
    const { ranked } = rankByRelevance(docs, [{ text: "analis", weight: 1 }]);
    assert.equal(ranked[0].item.id, "title");
  });

  test("field yang hilang (null/[]) aman", () => {
    const docs = [post({ id: "x", title: "Robotik", event_name: null, required_skills: [] })];
    assert.equal(rankByRelevance(docs, [{ text: "robotik", weight: 1 }]).ranked.length, 1);
  });

  test("sinyal profil berbobot rendah tidak menenggelamkan query pengguna", () => {
    const parts = [
      { text: "figma", weight: 1 },
      { text: ["Node.js"], weight: PROFILE_WEIGHTS.skills },
    ];
    const { ranked } = rankByRelevance(corpus, parts);
    assert.equal(ranked[0].item.id, "design");
    assert.ok(ranked.some((r) => r.item.id === "hack"));
  });

  test("profil saja (tanpa q) dapat merekomendasikan", () => {
    const { mode, ranked } = rankByRelevance(corpus, [
      { text: "", weight: 1 },
      { text: ["MySQL", "Node.js"], weight: PROFILE_WEIGHTS.skills },
    ]);
    assert.equal(mode, "relevance");
    assert.equal(ranked[0].item.id, "hack");
  });

  test("bio penulis tidak ikut dokumen pencarian", () => {
    const withBio = post({ id: "b", title: "Lomba poster" });
    withBio.author = { bio: "ahli kriptografi" };
    assert.equal(rankByRelevance([withBio], [{ text: "kriptografi", weight: 1 }]).ranked.length, 0);
  });

  test("hasil deterministik untuk input sama", () => {
    const a = rankByRelevance(corpus, [{ text: "lomba tim", weight: 1 }]);
    const b = rankByRelevance([...corpus].reverse(), [{ text: "lomba tim", weight: 1 }]);
    assert.deepEqual(a.ranked.map((r) => r.item.id), b.ranked.map((r) => r.item.id));
  });
});

describe("parseSearchParams", () => {
  const parse = (qs) => parseSearchParams(new URLSearchParams(qs));

  test("default", () => {
    const r = parse("");
    assert.ok(r.ok);
    assert.deepEqual(r.params, {
      q: "",
      category: null,
      status: "active",
      skills: [],
      page: 1,
      limit: 20,
      candidateLimit: 300,
      useProfile: false,
    });
  });

  test("clamp limit, candidate_limit, page; alias search", () => {
    const r = parse("search=react&limit=9999&candidate_limit=99999&page=-3");
    assert.ok(r.ok);
    assert.equal(r.params.q, "react");
    assert.equal(r.params.limit, 50);
    assert.equal(r.params.candidateLimit, 500);
    assert.equal(r.params.page, 1);
    assert.equal(parse("limit=abc").params.limit, 20);
  });

  test("status tidak valid -> error; category 'All'/'Semua' diabaikan", () => {
    assert.equal(parse("status=hacked").ok, false);
    assert.equal(parse("status=ALL").params.status, "all");
    assert.equal(parse("category=All").params.category, null);
    assert.equal(parse("category=Hackathon").params.category, "Hackathon");
  });

  test("skills: csv + berulang, unik case-insensitive, maks 10", () => {
    const r = parse("skills=React, figma&skills=REACT,Node.js");
    assert.deepEqual(r.params.skills, ["React", "figma", "Node.js"]);
    const many = Array.from({ length: 30 }, (_, i) => `s${i}`).join(",");
    assert.equal(parse(`skills=${many}`).params.skills.length, 10);
  });

  test("q dipotong 200 karakter", () => {
    assert.equal(parse(`q=${"a".repeat(500)}`).params.q.length, 200);
  });
});

describe("buildCandidateWhere (parameterisasi SQL)", () => {
  test("tanpa filter (status=all)", () => {
    const w = buildCandidateWhere({ category: null, status: "all", skills: [] });
    assert.deepEqual(w, { whereSql: "", values: [] });
  });

  test("nilai pengguna tidak pernah masuk ke string SQL", () => {
    const evil = "x'; DROP TABLE posts; --";
    const w = buildCandidateWhere({ category: evil, status: "active", skills: [evil] });
    assert.ok(!w.whereSql.includes("DROP"));
    assert.ok(!w.whereSql.includes(evil));
    assert.equal((w.whereSql.match(/\?/g) ?? []).length, w.values.length);
    assert.equal(w.values[0], "active");
    assert.equal(w.values[1], evil);
  });

  test("skills: logika ANY, pola mencocokkan elemen JSON utuh", () => {
    const w = buildCandidateWhere({ category: null, status: "all", skills: ["React", "UI_UX"] });
    const cond = "LOWER(CAST(p.required_skills AS CHAR)) LIKE ?";
    assert.equal(w.whereSql, `WHERE (${cond} OR ${cond})`);
    assert.deepEqual(w.values, ['%"react"%', '%"ui\\_ux"%']);
  });

  test("escapeLike", () => {
    assert.equal(escapeLike("100%_a\\b"), "100\\%\\_a\\\\b");
  });
});

describe("searchPosts (fallback substring & recent)", () => {
  const docs = [
    post({ id: "a", title: "Desainer Figma dibutuhkan", created_at: "2026-10-01T00:00:00.000Z" }),
    post({ id: "b", title: "Mobile developer Flutter", created_at: "2026-10-09T00:00:00.000Z" }),
    post({ id: "c", title: "Poster ilmiah Figmatic", description: "gunakan figma", created_at: "2026-10-05T00:00:00.000Z" }),
  ];

  test("kata utuh -> mode relevance", () => {
    const r = searchPosts(docs, "flutter");
    assert.equal(r.mode, "relevance");
    assert.deepEqual(r.ranked.map((x) => x.item.id), ["b"]);
  });

  test("kata belum lengkap -> mode substring, urut terbaru, skor 0", () => {
    const r = searchPosts(docs, "figm");
    assert.equal(r.mode, "substring");
    assert.deepEqual(r.ranked.map((x) => x.item.id), ["c", "a"]);
    assert.ok(r.ranked.every((x) => x.score === 0));
  });

  test("substring tidak peka huruf besar/diakritik; tidak cocok -> kosong", () => {
    assert.equal(searchPosts(docs, "FLUT").ranked.length, 1);
    assert.equal(searchPosts(docs, "zzzz").ranked.length, 0);
    assert.equal(searchPosts(docs, "q").mode, "recent"); // 1 huruf = tanpa term bermakna
  });

  test("kata utuh tidak jatuh ke substring walau ada kecocokan parsial lain", () => {
    assert.equal(searchPosts(docs, "figma").mode, "relevance");
  });

  test("query kosong / stopword -> recent; sinyal tambahan tak cocok -> recent", () => {
    assert.equal(searchPosts(docs, "").mode, "recent");
    assert.equal(searchPosts(docs, "yang dan").mode, "recent");
    const extra = [{ text: ["astronomi"], weight: 0.5 }];
    const r = searchPosts(docs, "", extra);
    assert.equal(r.mode, "recent");
    assert.deepEqual(r.ranked.map((x) => x.item.id), ["b", "c", "a"]);
  });
});
