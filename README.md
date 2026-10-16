

\# TemanJawara



TemanJawara adalah platform kolaborasi mahasiswa untuk menemukan partner lomba, berbagi informasi kompetisi, dan membangun koneksi dengan mahasiswa lainnya.



\## Fitur Utama



\- Registrasi, login, dan autentikasi pengguna.

\- Feed postingan kompetisi dan pencarian partner.

\- Membuat, mengedit, dan menghapus postingan.

\- Like, komentar, simpan, bagikan, dan penghitung tayangan postingan.

\- Halaman postingan tersimpan.

\- Profil mahasiswa dan daftar postingan pengguna.

\- Koneksi antarpengguna serta permintaan koneksi.

\- Notifikasi aktivitas pengguna.

\- Navigasi responsif untuk desktop dan mobile.



\## Teknologi



\- Next.js

\- React

\- TypeScript

\- Tailwind CSS

\- MySQL

\- mysql2

\- Lucide React



\## Persyaratan



\- Node.js dan npm.

\- MySQL Server.

\- MySQL Workbench atau aplikasi pengelola MySQL lainnya.

\- Git.



\## Instalasi



1\. Clone repository:



&#x20;  ```bash

&#x20;  git clone https://github.com/teman-jawara/teman-jawara-next.git

&#x20;  cd teman-jawara-next

&#x20;  ```



2\. Instal dependensi:



&#x20;  ```bash

&#x20;  npm install

&#x20;  ```



3\. Buat database MySQL bernama `teman\_jawara`.



4\. Impor struktur database dari `database/schema.sql` melalui MySQL Workbench.



5\. Salin konfigurasi lingkungan:



&#x20;  Windows CMD:



&#x20;  ```cmd

&#x20;  copy .env.example .env.local

&#x20;  ```



&#x20;  macOS/Linux:



&#x20;  ```bash

&#x20;  cp .env.example .env.local

&#x20;  ```



6\. Sesuaikan nilai konfigurasi database di `.env.local`.



7\. Jalankan aplikasi:



&#x20;  ```bash

&#x20;  npm run dev

&#x20;  ```



8\. Buka http://localhost:3000.



\## Pengujian



Jalankan build produksi untuk memeriksa kompilasi dan tipe TypeScript:



```bash

npm run build

```



\## Panduan Kontribusi



Baca \[Panduan Kolaborasi](docs/COLLABORATION.md) sebelum mulai mengerjakan fitur.



\## Catatan



\- Jangan mengunggah `.env.local`, password, token, atau informasi rahasia ke GitHub.

\- Data MySQL lokal tidak otomatis ikut tersimpan di repository.

\- File hasil upload pengguna yang berada di `public/uploads/` tidak ikut dibagikan melalui Git.



