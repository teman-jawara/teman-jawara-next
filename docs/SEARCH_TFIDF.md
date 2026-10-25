# Pencarian Relevan (TF-IDF + Cosine Similarity)

Mesin relevansi untuk memberi peringkat postingan berdasarkan kemiripan query. Tanpa layanan AI/ML eksternal, tanpa perubahan schema database.

| File | Peran |
| --- | --- |
| `lib/search/tfidf.ts` | Normalisasi, tokenisasi, stopword, TF, IDF, vektor, cosine, ranking (murni, tanpa DB) |
| `lib/search/query.ts` | Parsing parameter + pembuat klausa SQL berparameter (murni) |
| `app/api/posts/search/route.ts` | Endpoint `GET /api/posts/search` |
| `app/(app)/feed/page.tsx`, `components/posts/feed-search.tsx` | Feed memakai mesin yang sama (lihat "Integrasi Feed") |
| `scripts/seed.mjs`, `scripts/seed-data.mjs` | Seeder data uji (`npm run seed`) |
| `tests/search.test.mjs`, `tests/seed.test.mjs` | 57 unit test (`npm test`) |

## Hasil review sebelum coding

- **Database MySQL** (bukan Supabase seperti tertulis di PRD). Tabel `posts` memiliki: `title`, `description`, `category`, `required_skills` (JSON), `event_name`, `deadline`, `status`, `created_at`, `view_count`. Tabel `profiles` memiliki `bio`, `skills` (JSON), `competition_interests` (JSON).
- **Tidak ada** kolom pengalaman/pencapaian di schema mana pun, jadi tidak dipakai.
- `GET /api/posts` yang ada hanya memakai `LIKE` pada title/description/event_name, tidak menghitung `like_count`/`comment_count`, dan tidak diubah. Feed (`app/(app)/feed/page.tsx`) juga tidak disentuh.
- Bentuk `Post` dari `mapRowToPost` dipertahankan persis; `types/index.ts` tidak diubah.

## Dokumen pencarian

Hanya field yang benar-benar ada di tabel `posts`, dengan bobot:

| Field | Bobot |
| --- | --- |
| `title` | 3 |
| `event_name` | 2 |
| `category` | 2 |
| `required_skills` | 2 |
| `description` | 1 |

**Bio/skills penulis tidak dimasukkan ke dokumen postingan**: itu membuat query "kriptografi" menemukan postingan karena bio penulisnya, bukan isinya. Profil dipakai **hanya di sisi query** dan hanya jika `profile=1` (lihat bawah), dengan bobot skills 0,5, minat lomba 0,5, bio 0,25 (query pengguna = 1).

## Preprocessing

1. Normalisasi: Unicode NFKD, hapus diakritik, lowercase.
2. Alias teknis: `c++`→`cpp`, `c#`→`csharp`, `.net`→`dotnet`; `node.js`/`nodejs`/`node` → `node` (sama untuk next, vue, react).
3. Tokenisasi: pecah pada karakter selain huruf/angka (`UI/UX` → `ui`, `ux`).
4. Buang token 1 huruf, token > 40 karakter, dan stopword Indonesia (+ sedikit Inggris).
5. Tanpa stemming (sengaja, agar sederhana dan tidak salah potong); kata berimbuhan berbeda dianggap term berbeda.

## Formula

Untuk dokumen `d`, term `t`, `N` = jumlah kandidat, `df(t)` = jumlah kandidat yang memuat `t`:

```
count(t,d)   = Σ bobot field tempat t muncul          (tiap kemunculan bernilai bobot field)
tf(t,d)      = 1 + ln(count(t,d))                      (0 jika count = 0)
idf(t)       = ln((1 + N) / (1 + df(t))) + 1           (smoothed, selalu ≥ 1)
w(t,d)       = tf(t,d) · idf(t)
cosine(q,d)  = (q · d) / (‖q‖ · ‖d‖)                   (0 jika ‖q‖ = 0 atau ‖d‖ = 0)
```

- IDF dihitung dari **kandidat** hasil filter (bukan seluruh tabel), jadi relevan terhadap kategori/status yang sedang dilihat.
- Term query yang tidak ada di korpus kandidat dibuang dari vektor query (tidak mungkin cocok).
- Skor dibulatkan 6 desimal sebelum diurutkan agar tie-breaker tidak terganggu derau floating point.

Contoh hitung manual (ada di test): `N=4`, `df=1` → `idf = ln(2,5)+1 ≈ 1,9163`; `df=4` → `idf = 1`. Query `a b` vs dokumen `a` (bobot sama) → `1/√2 ≈ 0,7071`.

## Kasus tepi

| Kasus | Perilaku |
| --- | --- |
| `q` kosong / spasi / hanya stopword / hanya simbol | `mode: "recent"`: postingan terbaru, `relevance_score: 0` (fallback PRD 14) |
| `q` bermakna tapi tidak ada yang cocok | `mode: "relevance"`, `posts: []` |
| Vektor nol | cosine = 0, tidak pernah `NaN` |
| `profile=1` tanpa `q`, profil cocok | ranking berdasarkan profil (rekomendasi) |
| Kata belum lengkap (mis. `figm`) | Tidak ada kata utuh yang cocok -> dicoba kecocokan potongan teks: `mode: "substring"`, skor 0, urut terbaru. Menjaga perilaku `LIKE` lama di Feed saat mengetik |
| `profile=1` tapi belum login / profil kosong / tak cocok | diabaikan; fallback terbaru; `profile_used: false` |
| Field `null` / `[]` | aman |

## Endpoint

`GET /api/posts/search` (publik, seperti `GET /api/posts`)

| Parameter | Default | Keterangan |
| --- | --- | --- |
| `q` (alias `search`) | kosong | Maks 200 karakter, maks 40 term |
| `category` | – | Kecocokan persis; `All`/`Semua` diabaikan |
| `status` | `active` | `active` \| `closed` \| `all`; nilai lain → **400** |
| `skills` | – | `react,figma` atau berulang; cocok jika **salah satu** ada di `required_skills`; case-insensitive; elemen JSON utuh (`react` ≠ `reactive`); maks 10 |
| `limit` / `page` | 20 / 1 | `limit` maks 50 |
| `candidate_limit` | 300 | Maks 500: jumlah postingan terbaru yang diberi peringkat |
| `profile` | – | `1` = tambahkan sinyal profil user yang login |

Response (kompatibel dengan `Post`/`PostCard`: tiap item adalah objek `Post` + 2 field tambahan opsional):

```json
{
  "success": true,
  "mode": "relevance",
  "query": "figma desain",
  "count": 2,
  "total": 2,
  "page": 1,
  "limit": 20,
  "candidate_limit": 300,
  "candidates_scanned": 5,
  "profile_used": false,
  "posts": [{ "...field Post...": "", "relevance_score": 0.3892, "matched_terms": ["desain", "figma"] }]
}
```

`mode` bernilai `relevance` (urut skor), `substring` (kecocokan potongan teks), atau `recent` (tanpa query bermakna).

**Urutan:** `relevance_score` ↓ → `created_at` ↓ (terbaru) → `id` ↓ (deterministik).

**Keamanan SQL:** semua nilai pengguna (`status`, `category`, `skills`, `candidate_limit`, `user_id`) lewat placeholder `?`; string SQL hanya disusun dari fragmen tetap. Pola `LIKE` untuk skills di-escape (`\`, `%`, `_`). Ini diverifikasi oleh test.

## Integrasi Feed

Feed (`app/(app)/feed/page.tsx`) memanggil `searchPosts` dari `lib/search/tfidf.ts` secara langsung di server (tanpa HTTP), jadi hasilnya sama dengan endpoint.

- Parameter URL: `?search=` (kata kunci), `?category=`, `?sort=`.
- SQL mengambil maksimal 300 postingan terbaru (sesuai kategori); peringkat dihitung di memori; Feed menampilkan 50 teratas.
- Dropdown urutan:

| `sort` | Perilaku |
| --- | --- |
| `relevan` | Urut kemiripan. Default saat ada kata kunci; pilihan hanya muncul saat mencari |
| `terbaru` | Hasil yang cocok, terbaru dulu. Default tanpa kata kunci |
| `terlama` | Hasil yang cocok, terlama dulu |

- `feed-search.tsx`: sinkronisasi kolom cari dengan URL dipindah dari `useEffect` ke penyesuaian state saat render, sehingga error lint `react-hooks/set-state-in-effect` hilang. Perilaku debounce 400 ms tidak berubah.

## Seeder data uji

```bash
npm run seed         # hapus data seed lama, isi ulang (aman diulang)
npm run seed:clean   # hanya hapus data seed
```

- Membuat 5 akun (`rina|dimas|sari|bayu|nadia@seed.temanjawara.test`, kata sandi `Password123!`), 17 postingan di berbagai kategori (1 `closed`), 11 like, 4 komentar.
- Hanya baris dengan domain email `@seed.temanjawara.test` yang dihapus/dibuat; akun asli Anda aman. Data lain ikut terhapus lewat `ON DELETE CASCADE`.
- Pengaman: menolak `NODE_ENV=production` dan `DB_HOST` non-lokal (kecuali `--force`). Seluruh proses dalam satu transaksi (rollback bila gagal).
- Membaca `.env.local` lewat `node --env-file` (Node ≥ 20.6).
- Data sengaja memuat kasus uji: dua postingan identik berbeda umur (`p15`, `p16`, tie-breaker), penulisan `Node.js` vs `NodeJS` (alias), satu postingan `closed`, dan satu akun berprofil kosong (`nadia`).

### Skenario uji manual (setelah `npm run seed`)

| URL | Hasil yang diharapkan |
| --- | --- |
| `/api/posts/search?q=figma` | 3 postingan: Poster (p05), UI/UX (p01), Branding (p09); p13 `closed` tidak ikut |
| `/api/posts/search?q=figma&status=all` | p13 (closed) ikut muncul |
| `/api/posts/search?q=figm` | `mode: "substring"`, postingan Figma urut terbaru |
| `/api/posts/search?q=node` | p02 (`Node.js`) dan p17 (`NodeJS`) |
| `/api/posts/search?q=robotik` | p16 di atas p15 (judul sama, p16 lebih baru) |
| `/api/posts/search?q=mysql node` | p02 peringkat 1 |
| `/api/posts/search?q=debat` | p03 saja |
| `/api/posts/search?q=desain&category=Poster` | filter kategori + query |
| `/api/posts/search?skills=figma` | postingan dengan `Figma` di required skills |
| `/api/posts/search?q=astronomi` | `posts: []` (mode `relevance`) |
| `/api/posts/search` | `mode: "recent"`, urut terbaru (p05 pertama) |
| `/api/posts/search?profile=1` (login sebagai `rina@...`) | p01 teratas; `dimas` → p02, `sari` → p03, `bayu` → p04 |
| `/api/posts/search?profile=1` (login `nadia@...`) | profil kosong → `mode: "recent"` |
| `/feed?search=figma` lalu ubah dropdown | Relevan / Terbaru / Terlama mengubah urutan |

Skenario ini diverifikasi otomatis oleh `tests/seed.test.mjs` (data seed yang sama diperingkat dengan mesin yang sama).

## Pengujian

`npm test` memakai `node:test` bawaan Node (tanpa dependensi baru; Node ≥ 22.6).

```
tests 57 | suites 11 | pass 57 | fail 0
```

Selain itu `tsc --noEmit` seluruh proyek dan ESLint pada file pencarian/Feed bersih. Cakupan: normalisasi & stopword, alias teknis, TF/IDF dengan nilai hitung manual, cosine (identik = 1, ortogonal = 0, vektor nol = 0, simetri), ranking, fallback query kosong, korpus kosong, tie-breaker tanggal/id, bobot judul > deskripsi, profil berbobot rendah, bio penulis tidak ikut, determinisme, parsing/clamp parameter, parameterisasi SQL (termasuk payload injeksi), fallback substring/recent, serta seeder (urutan foreign key, transaksi, rollback, jumlah placeholder) dengan koneksi tiruan.

Contoh ranking nyata dari 5 postingan contoh (`score [matched_terms]`):

| Query | Hasil (urut) |
| --- | --- |
| `figma desain` | A 0,3892 [desain, figma] → E 0,2078 [figma] |
| `lomba data python` | D 0,6126 → A 0,0632 → E 0,0408 → C 0,0389 |
| `mysql node` | B 0,5014 [mysql, node] |
| `debat` | C 0,4455 |
| `""` / `yang dan` | mode `recent`, urut terbaru, skor 0 |
| `astronomi` | kosong |

## Batasan yang diketahui

- **Belum dijalankan terhadap MySQL sungguhan** (tidak ada MySQL di lingkungan pengerjaan). Logika murni, seeder (koneksi tiruan), dan tipe sudah diverifikasi. Langkah verifikasi akhir: `npm run seed`, lalu buka skenario di tabel di atas.
- Peringkat dihitung di memori atas ≤ `candidate_limit` postingan terbaru. Cukup untuk MVP; postingan lama di luar batas tidak ikut diperingkat. Jika data tumbuh besar, pra-filter `LIKE` per token atau FULLTEXT bisa ditambahkan.
- Skills diekstrak dari teks JSON dengan `LIKE` (tanpa mengubah schema). `JSON_OVERLAPS` tidak dipakai karena case-sensitive.
- Tanpa stemming/sinonim: "desain" ≠ "mendesain" (kata berimbuhan hanya ditemukan lewat fallback substring bila query-nya potongan dari kata itu).
- Feed tidak memfilter status (seperti sebelumnya), sedangkan endpoint `/api/posts/search` default `status=active`.
