# TemanJawara - Build 1 (Foundation)

Salin isi folder ini ke root proyek `teman-jawara-next` dan TIMPA file yang sama.

## Asumsi
- Proyek TIDAK memakai folder `src/` (sesuai struktur di PRD: `/app` di root).
  Jika proyekmu memakai `src/`, pindahkan semua folder ini ke dalam `src/`.
- Alias `@/*` mengarah ke root proyek (bawaan create-next-app tanpa `src/`).
- Tailwind CSS v4 (bawaan Next.js 16). Tidak ada library tambahan.

## File yang MENIMPA bawaan starter (wajib tertimpa)
- `app/page.tsx`    (landing page TemanJawara, menggantikan halaman starter)
- `app/layout.tsx`  (font Plus Jakarta Sans, lang="id", metadata)
- `app/globals.css` (token warna navy #0D2B6E dan emas #F5A623)

## Jika localhost:3000 masih menampilkan halaman starter Next.js
1. Pastikan `app/page.tsx` di proyekmu berisi "LandingPage" dan teks "Mulai sekarang".
2. Pastikan hanya ada SATU folder `app` (jangan ada `app` di root dan `src/app` sekaligus).
3. Hentikan dev server, hapus folder `.next`, lalu jalankan lagi `npm run dev`.
4. Hapus `app/favicon.ico` bawaan agar ikon tab memakai `app/icon.svg` milik TemanJawara.
   File `public/*.svg` bawaan starter (next.svg, vercel.svg, dll.) boleh dihapus.

## Tidak diubah
`package.json`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `.env*`.

## Belum dikerjakan (Build 2 dan seterusnya)
Supabase, autentikasi, database, RLS, proteksi rute, posts/like/komentar/simpan,
koneksi, notifikasi, rekomendasi TF-IDF. Halaman login/register hanya tampilan
(tombol nonaktif, memakai div, bukan form).
