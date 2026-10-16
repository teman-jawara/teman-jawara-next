

\# Panduan Kolaborasi TemanJawara



Panduan ini digunakan oleh anggota tim untuk menyiapkan lingkungan pengembangan dan berkontribusi pada repository TemanJawara.



\## 1. Akses Repository



Pastikan akun GitHub sudah memiliki akses ke repository:



https://github.com/teman-jawara/teman-jawara-next



Jika belum memiliki akses, minta pemilik repository menambahkan akun GitHub melalui pengaturan akses repository.



\## 2. Menyiapkan Project



Clone repository:



```bash

git clone https://github.com/teman-jawara/teman-jawara-next.git

cd teman-jawara-next

```



Instal dependensi:



```bash

npm install

```



\## 3. Konfigurasi MySQL



Jalankan MySQL Server dan buat database `teman\_jawara`.



Impor `database/schema.sql` menggunakan MySQL Workbench.



Buat file `.env.local` berdasarkan `.env.example`, lalu isi konfigurasi sesuai MySQL lokal masing-masing.



Jangan menggunakan password MySQL milik anggota tim lain.



Setiap anggota menggunakan database lokal masing-masing untuk pengembangan.



\## 4. Menjalankan Aplikasi



```bash

npm run dev

```



Buka http://localhost:3000.



Sebelum mengirim perubahan, jalankan:



```bash

npm run build

```



Pastikan proses build berhasil.



\## 5. Alur Kerja Git



Sinkronkan branch utama:



```bash

git switch main

git pull origin main

```



Buat branch baru untuk setiap fitur atau perbaikan:



```bash

git switch -c feat/nama-fitur

```



Untuk perbaikan bug, nama branch bisa menggunakan prefix `fix/`.



Setelah melakukan perubahan, periksa:



```bash

git status

git diff

```



Stage dan commit perubahan:



```bash

git add .

git commit -m "feat: deskripsi perubahan"

```



Push branch:



```bash

git push -u origin feat/nama-fitur

```



Setelah push, buat Pull Request dari branch fitur menuju `main`.



\## 6. Konvensi Commit



Gunakan pesan commit yang singkat dan jelas.



Contoh:



\- `feat: add connection requests`

\- `fix: correct saved post count`

\- `docs: update installation guide`

\- `style: improve mobile navigation`

\- `refactor: simplify post interaction logic`



\## 7. Aturan Kolaborasi



\- Jangan langsung mengubah branch `main` untuk pekerjaan fitur sehari-hari.

\- Gunakan branch terpisah untuk setiap fitur atau perbaikan.

\- Periksa perubahan sebelum melakukan commit.

\- Jalankan build sebelum membuat Pull Request.

\- Jangan commit `.env.local`, password, token, atau data rahasia.

\- Jangan mengunggah gambar pribadi hasil upload pengguna.

\- Jika mengubah struktur database, sertakan pembaruan skema atau migration yang relevan.

\- Diskusikan perubahan besar dengan anggota tim sebelum menggabungkannya.



\## 8. Database dan File Upload



Repository menyimpan kode aplikasi dan file skema database, bukan otomatis seluruh isi database lokal.



File upload yang tersimpan di `public/uploads/` hanya tersedia di lingkungan tempat file tersebut disimpan. Untuk deployment, gunakan penyimpanan file yang sesuai dengan lingkungan hosting.



Setiap perubahan struktur database harus didokumentasikan agar anggota tim dapat menyiapkan database yang kompatibel dengan kode terbaru.



