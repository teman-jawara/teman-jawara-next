/**
 * Mesin relevansi TF-IDF + Cosine Similarity untuk postingan TemanJawara.
 *
 * File ini MURNI (tanpa import runtime, tanpa akses database) supaya mudah diuji
 * dan tidak bergantung pada Next.js. Formula lengkap ada di docs/SEARCH_TFIDF.md.
 *
 * Ringkasan:
 *   tf(t, d)    = 1 + ln(weightedCount(t, d))            (sublinear, count > 0)
 *   idf(t)      = ln((1 + N) / (1 + df(t))) + 1          (smoothed)
 *   w(t, d)     = tf(t, d) * idf(t)
 *   cosine(q,d) = (q . d) / (|q| * |d|)                  (0 jika salah satu vektor nol)
 *
 * Catatan: hanya sintaks TypeScript yang "erasable" yang dipakai (tanpa enum /
 * parameter property) agar file ini bisa dijalankan langsung oleh `node --test`.
 */

/* ------------------------------------------------------------------ */
/* Konfigurasi                                                         */
/* ------------------------------------------------------------------ */

/** Bobot per field dokumen postingan (hanya field yang benar-benar ada di tabel posts). */
export const POST_FIELD_WEIGHTS = {
  title: 3,
  event_name: 2,
  category: 2,
  required_skills: 2,
  description: 1,
} as const;

/** Bobot teks profil pengguna bila `profile=1` dipakai (opsional, lebih rendah dari query). */
export const PROFILE_WEIGHTS = {
  skills: 0.5,
  competition_interests: 0.5,
  bio: 0.25,
} as const;

const MIN_TOKEN_LENGTH = 2;
const MAX_TOKEN_LENGTH = 40;
/** Batas token query agar query sangat panjang tidak membebani CPU. */
const MAX_QUERY_TOKENS = 40;
/** Skor di bawah ini dianggap 0 (menghindari derau floating point). */
const SCORE_EPSILON = 1e-9;

/** Stopwords Indonesia (+ sedikit Inggris karena postingan sering bercampur). */
export const INDONESIAN_STOPWORDS: ReadonlySet<string> = new Set([
  // kata hubung & depan
  "yang", "dan", "atau", "dengan", "di", "ke", "dari", "untuk", "pada", "dalam",
  "oleh", "bagi", "kepada", "terhadap", "tentang", "antara", "hingga", "sampai",
  "sejak", "karena", "sebab", "sehingga", "agar", "supaya", "jika", "kalau",
  "bila", "apabila", "ketika", "saat", "sementara", "sedangkan", "tetapi",
  "namun", "melainkan", "serta", "lalu", "kemudian", "setelah", "sebelum",
  // penunjuk & kata ganti
  "ini", "itu", "tersebut", "sini", "situ", "sana", "ada", "adalah", "ialah",
  "yaitu", "yakni", "aku", "saya", "kami", "kita", "kamu", "anda", "dia", "ia",
  "mereka", "nya", "mu", "ku",
  // kata bantu & keterangan
  "akan", "sedang", "telah", "sudah", "belum", "masih", "pernah", "bisa",
  "dapat", "mampu", "harus", "perlu", "boleh", "mau", "ingin", "juga", "pun",
  "saja", "hanya", "lagi", "sangat", "sekali", "lebih", "paling", "cukup",
  "sering", "selalu", "tidak", "bukan", "jangan", "tanpa", "se", "para",
  "semua", "setiap", "beberapa", "banyak", "sedikit", "lain", "seperti",
  "bagai", "yg", "dgn", "utk", "dr", "pd", "dlm", "tdk", "sdh", "udah", "aja",
  "nih", "dong", "sih", "deh", "kok", "ya", "yuk", "ayo", "mari",
  // Inggris umum
  "the", "and", "or", "of", "for", "to", "in", "on", "at", "is", "are", "a",
  "an", "with", "by", "be", "as", "we", "you", "our", "your",
]);

/**
 * Alias istilah teknis yang akan rusak oleh pemecahan tanda baca.
 * Varian "x.js" / "xjs" / "x" disatukan ke "x" agar "Node.js" cocok dengan query "node".
 */
const TECH_ALIASES: ReadonlyArray<readonly [RegExp, string]> = [
  [/c\+\+/g, " cpp "],
  [/c#/g, " csharp "],
  [/\.net\b/g, " dotnet "],
  [/\bnode\.?js\b/g, " node "],
  [/\bnext\.?js\b/g, " next "],
  [/\bvue\.?js\b/g, " vue "],
  [/\breact\.?js\b/g, " react "],
];

/* ------------------------------------------------------------------ */
/* Normalisasi & tokenisasi                                            */
/* ------------------------------------------------------------------ */

/** Lowercase, hapus diakritik, ubah alias teknis. Selalu mengembalikan string. */
export function normalizeText(input: unknown): string {
  if (input === null || input === undefined) return "";
  let text = String(input).normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();
  for (const [pattern, replacement] of TECH_ALIASES) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

/** Normalisasi -> pecah per non-huruf/angka -> buang stopword & token terlalu pendek/panjang. */
export function tokenize(input: unknown): string[] {
  const text = normalizeText(input);
  if (!text) return [];
  return text
    .split(/[^\p{L}\p{N}]+/u)
    .filter(
      (token) =>
        token.length >= MIN_TOKEN_LENGTH &&
        token.length <= MAX_TOKEN_LENGTH &&
        !INDONESIAN_STOPWORDS.has(token),
    );
}

/* ------------------------------------------------------------------ */
/* TF, IDF, vektor                                                     */
/* ------------------------------------------------------------------ */

/** Teks satu field; array (mis. required_skills) diratakan menjadi satu teks. */
export type FieldText = string | readonly string[] | null | undefined;

export interface WeightedField {
  text: FieldText;
  weight: number;
}

export type TermCounts = Map<string, number>;

export interface TfIdfVector {
  weights: Map<string, number>;
  /** Norma Euclidean |v|. 0 berarti vektor nol. */
  norm: number;
}

function fieldToText(text: FieldText): string {
  if (text === null || text === undefined) return "";
  return Array.isArray(text) ? (text as readonly string[]).join(" ") : String(text);
}

/**
 * Hitung kemunculan term berbobot: setiap kemunculan di field bernilai `weight`.
 * Field dengan bobot <= 0 / bukan angka diabaikan.
 */
export function countTerms(fields: readonly WeightedField[]): TermCounts {
  const counts: TermCounts = new Map();
  for (const field of fields) {
    if (!Number.isFinite(field.weight) || field.weight <= 0) continue;
    for (const token of tokenize(fieldToText(field.text))) {
      counts.set(token, (counts.get(token) ?? 0) + field.weight);
    }
  }
  return counts;
}

/** TF sublinear: 1 + ln(count). Count <= 0 menghasilkan 0. */
export function termFrequency(weightedCount: number): number {
  return weightedCount > 0 ? 1 + Math.log(weightedCount) : 0;
}

/** IDF smoothed: ln((1 + N) / (1 + df)) + 1. Selalu >= 1, tidak pernah dibagi nol. */
export function inverseDocumentFrequency(
  totalDocs: number,
  docFrequency: number,
): number {
  return Math.log((1 + totalDocs) / (1 + docFrequency)) + 1;
}

/** Bangun tabel IDF dari kumpulan term-count tiap dokumen (korpus). */
export function buildIdfTable(docs: readonly TermCounts[]): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const term of doc.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [term, freq] of df) {
    idf.set(term, inverseDocumentFrequency(docs.length, freq));
  }
  return idf;
}

/**
 * Ubah term-count menjadi vektor TF-IDF. Hanya term yang ada di tabel IDF
 * (yaitu muncul di korpus) yang ikut; term asing tidak punya bobot yang bermakna
 * dan tidak mungkin cocok dengan dokumen mana pun.
 */
export function buildVector(
  counts: TermCounts,
  idf: ReadonlyMap<string, number>,
): TfIdfVector {
  const weights = new Map<string, number>();
  let sumSquares = 0;
  for (const [term, count] of counts) {
    const idfValue = idf.get(term);
    if (idfValue === undefined) continue;
    const w = termFrequency(count) * idfValue;
    if (w <= 0) continue;
    weights.set(term, w);
    sumSquares += w * w;
  }
  return { weights, norm: Math.sqrt(sumSquares) };
}

/* ------------------------------------------------------------------ */
/* Cosine similarity                                                   */
/* ------------------------------------------------------------------ */

/**
 * Cosine similarity dua vektor. Mengembalikan 0 (bukan NaN) bila salah satu
 * vektor kosong / bernorma nol, sehingga query kosong aman.
 */
export function cosineSimilarity(a: TfIdfVector, b: TfIdfVector): number {
  if (a.norm <= 0 || b.norm <= 0 || a.weights.size === 0 || b.weights.size === 0) {
    return 0;
  }
  const [small, large] = a.weights.size <= b.weights.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [term, w] of small.weights) {
    const other = large.weights.get(term);
    if (other !== undefined) dot += w * other;
  }
  const score = dot / (a.norm * b.norm);
  if (!Number.isFinite(score) || score < SCORE_EPSILON) return 0;
  return Math.min(1, score);
}

/* ------------------------------------------------------------------ */
/* Dokumen pencarian dari postingan                                    */
/* ------------------------------------------------------------------ */

/** Subset field Post yang dipakai. `Post` dari types/index.ts memenuhi bentuk ini. */
export interface SearchablePost {
  id: string;
  title: string;
  description: string;
  category: string;
  event_name: string | null;
  required_skills: readonly string[];
  created_at: string;
}

/**
 * Dokumen pencarian: HANYA judul, deskripsi, kategori, nama event, dan
 * required_skills. Bio/skills penulis sengaja tidak dimasukkan (lihat docs).
 */
export function buildPostFields(post: SearchablePost): WeightedField[] {
  return [
    { text: post.title, weight: POST_FIELD_WEIGHTS.title },
    { text: post.event_name, weight: POST_FIELD_WEIGHTS.event_name },
    { text: post.category, weight: POST_FIELD_WEIGHTS.category },
    { text: post.required_skills, weight: POST_FIELD_WEIGHTS.required_skills },
    { text: post.description, weight: POST_FIELD_WEIGHTS.description },
  ];
}

/* ------------------------------------------------------------------ */
/* Ranking                                                             */
/* ------------------------------------------------------------------ */

export interface RankedItem<T> {
  item: T;
  /** Cosine similarity 0..1, dibulatkan 6 desimal. */
  score: number;
  /** Term query yang cocok dengan dokumen, urut dari kontribusi terbesar (maks 5). */
  matchedTerms: string[];
}

export interface RankResult<T> {
  /**
   * "relevance": diurutkan berdasar cosine similarity (hanya skor > 0).
   * "recent"   : query kosong / tidak punya term bermakna -> fallback terbaru.
   */
  mode: "relevance" | "recent";
  ranked: RankedItem<T>[];
}

function timeOf(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

/** Urutan deterministik: terbaru dulu, lalu id (menurun) sebagai tie-breaker terakhir. */
function compareRecent(
  a: { id: string; created_at: string },
  b: { id: string; created_at: string },
): number {
  const dt = timeOf(b.created_at) - timeOf(a.created_at);
  if (dt !== 0) return dt;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * Beri peringkat `items` terhadap `queryParts`.
 *
 * - IDF dihitung dari `items` (kandidat) itu sendiri.
 * - Query kosong, hanya stopword, atau tanpa term yang ada di korpus
 *   menghasilkan vektor nol. Bila query memang tidak punya term bermakna
 *   -> mode "recent". Bila punya term tetapi tidak ada yang cocok -> hasil kosong.
 * - Sorting: skor menurun, lalu created_at terbaru, lalu id.
 */
export function rankByRelevance<T extends SearchablePost>(
  items: readonly T[],
  queryParts: readonly WeightedField[],
): RankResult<T> {
  const queryCounts = limitTerms(countTerms(queryParts), MAX_QUERY_TOKENS);

  if (queryCounts.size === 0) {
    const ranked = [...items]
      .sort(compareRecent)
      .map((item) => ({ item, score: 0, matchedTerms: [] as string[] }));
    return { mode: "recent", ranked };
  }

  const docCounts = items.map((item) => countTerms(buildPostFields(item)));
  const idf = buildIdfTable(docCounts);
  const queryVector = buildVector(queryCounts, idf);

  const scored: RankedItem<T>[] = [];
  items.forEach((item, index) => {
    const docVector = buildVector(docCounts[index], idf);
    const raw = cosineSimilarity(queryVector, docVector);
    if (raw <= 0) return;
    const score = Math.round(raw * 1e6) / 1e6;
    if (score <= 0) return;
    scored.push({
      item,
      score,
      matchedTerms: topMatchedTerms(queryVector, docVector),
    });
  });

  scored.sort((a, b) => b.score - a.score || compareRecent(a.item, b.item));
  return { mode: "relevance", ranked: scored };
}

function limitTerms(counts: TermCounts, max: number): TermCounts {
  if (counts.size <= max) return counts;
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max);
  return new Map(top);
}

function topMatchedTerms(q: TfIdfVector, d: TfIdfVector, limit = 5): string[] {
  const hits: Array<[string, number]> = [];
  for (const [term, qw] of q.weights) {
    const dw = d.weights.get(term);
    if (dw !== undefined) hits.push([term, qw * dw]);
  }
  hits.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return hits.slice(0, limit).map(([term]) => term);
}

/* ------------------------------------------------------------------ */
/* Pencarian lengkap dengan fallback                                   */
/* ------------------------------------------------------------------ */

export interface SearchResult<T> {
  /**
   * "relevance": urut cosine similarity (hanya skor > 0).
   * "substring": query tidak cocok sebagai kata utuh, tetapi cocok sebagai potongan
   *              teks (mis. "figm" -> "Figma"); skor 0, urut terbaru.
   * "recent"   : tidak ada query bermakna -> postingan terbaru.
   */
  mode: "relevance" | "substring" | "recent";
  ranked: RankedItem<T>[];
}

function haystackOf(post: SearchablePost): string {
  return normalizeText(
    [
      post.title,
      post.event_name,
      post.category,
      post.required_skills.join(" "),
      post.description,
    ].join(" "),
  );
}

/**
 * Titik masuk pencarian untuk endpoint dan Feed.
 *
 * 1. TF-IDF + cosine pada `query` (+ `extraParts` seperti sinyal profil).
 * 2. Bila tidak ada yang cocok sebagai kata utuh, coba kecocokan potongan teks
 *    ("figm" menemukan "Figma"), supaya pencarian sambil mengetik tetap berfungsi
 *    seperti LIKE lama di Feed.
 * 3. Bila `query` tidak punya term bermakna dan sinyal tambahan tidak cocok
 *    apa pun -> fallback postingan terbaru.
 */
export function searchPosts<T extends SearchablePost>(
  items: readonly T[],
  query: string,
  extraParts: readonly WeightedField[] = [],
): SearchResult<T> {
  const base = rankByRelevance(items, [{ text: query, weight: 1 }, ...extraParts]);
  if (base.ranked.length > 0) return base;

  if (tokenize(query).length === 0) {
    return rankByRelevance(items, []);
  }

  const needle = normalizeText(query).trim().replace(/\s+/g, " ");
  if (needle.length < MIN_TOKEN_LENGTH) return base;

  const matches = items
    .filter((item) => haystackOf(item).includes(needle))
    .sort(compareRecent)
    .map((item) => ({ item, score: 0, matchedTerms: [] as string[] }));
  return matches.length > 0 ? { mode: "substring", ranked: matches } : base;
}
