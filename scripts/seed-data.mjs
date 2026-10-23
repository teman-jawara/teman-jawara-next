/**
 * Data seed untuk pengujian lokal (khususnya pencarian TF-IDF).
 * Semua akun memakai domain email khusus sehingga seeder bisa menghapus HANYA
 * data seed tanpa menyentuh data asli di database lokal Anda.
 */

export const SEED_EMAIL_DOMAIN = "seed.temanjawara.test";
export const SEED_PASSWORD = "Password123!";

/** key dipakai hanya untuk saling merujuk di file ini; id asli dibuat saat seeding. */
export const users = [
  {
    key: "rina",
    full_name: "Rina Aulia",
    nim: "SEED0001",
    faculty: "Fakultas Teknik",
    study_program: "Teknik Informatika",
    generation: 2022,
    bio: "Mahasiswa yang suka merancang antarmuka dan riset pengguna.",
    skills: ["Figma", "UI Design", "User Research"],
    competition_interests: ["UI/UX", "Poster", "Design"],
  },
  {
    key: "dimas",
    full_name: "Dimas Pratama",
    nim: "SEED0002",
    faculty: "Fakultas Teknik",
    study_program: "Teknik Informatika",
    generation: 2021,
    bio: "Backend developer yang senang membangun API dan mengikuti hackathon.",
    skills: ["Node.js", "MySQL", "React", "TypeScript"],
    competition_interests: ["Hackathon", "Programming"],
  },
  {
    key: "sari",
    full_name: "Sari Maharani",
    nim: "SEED0003",
    faculty: "Fakultas Ekonomi dan Bisnis",
    study_program: "Manajemen",
    generation: 2022,
    bio: "Tertarik pada bisnis rintisan, debat, dan public speaking.",
    skills: ["Public Speaking", "Financial Analysis", "Canva"],
    competition_interests: ["Business", "Debate/Public Speaking"],
  },
  {
    key: "bayu",
    full_name: "Bayu Nugraha",
    nim: "SEED0004",
    faculty: "Fakultas Teknik",
    study_program: "Teknik Informatika",
    generation: 2021,
    bio: "Menyukai analisis data dan machine learning.",
    skills: ["Python", "Machine Learning", "Pandas"],
    competition_interests: ["Data/AI", "PKM", "Scientific Writing"],
  },
  {
    key: "nadia",
    full_name: "Nadia Putri",
    nim: "SEED0005",
    faculty: "Fakultas Keguruan dan Ilmu Pendidikan",
    study_program: "Pendidikan Matematika",
    generation: 2023,
    bio: "",
    skills: [],
    competition_interests: [],
  },
];

/**
 * daysAgo: umur postingan (menentukan created_at). deadlineInDays: tenggat dari hari ini.
 * Kategori mengikuti constants/competition.ts.
 */
export const posts = [
  {
    key: "p01", user: "rina", daysAgo: 2, deadlineInDays: 20, teammates: 2,
    title: "Cari partner UI/UX untuk lomba desain aplikasi",
    description: "Tim butuh anggota yang menguasai Figma, riset pengguna, dan prototyping untuk kompetisi UI/UX tingkat nasional.",
    category: "UI/UX", skills: ["Figma", "UI Design", "User Research"], event: "Gemastik 2026",
  },
  {
    key: "p02", user: "dimas", daysAgo: 1, deadlineInDays: 14, teammates: 2,
    title: "Hackathon nasional mencari backend developer",
    description: "Kami butuh programmer Node.js dan database MySQL untuk membangun API layanan sosial.",
    category: "Hackathon", skills: ["Node.js", "MySQL", "REST API"], event: "Hack4Good 2026",
  },
  {
    key: "p03", user: "sari", daysAgo: 6, deadlineInDays: 25, teammates: 2,
    title: "Tim debat mencari pembicara",
    description: "Lomba debat tingkat nasional, dibutuhkan kemampuan public speaking dan argumentasi yang kuat.",
    category: "Debate/Public Speaking", skills: [], event: "Debat Nasional Hukum",
  },
  {
    key: "p04", user: "bayu", daysAgo: 4, deadlineInDays: 30, teammates: 1,
    title: "Mencari data scientist untuk lomba data mining",
    description: "Analisis data menggunakan Python dan machine learning untuk memprediksi tren penjualan.",
    category: "Data/AI", skills: ["Python", "Machine Learning", "Pandas"], event: "Satria Data 2026",
  },
  {
    key: "p05", user: "rina", daysAgo: 0, deadlineInDays: 10, teammates: 1,
    title: "Butuh desainer poster ilmiah",
    description: "Lomba poster ilmiah, desain bisa memakai Figma atau Canva dengan tata letak yang rapi.",
    category: "Poster", skills: ["Canva", "Figma"], event: null,
  },
  {
    key: "p06", user: "dimas", daysAgo: 3, deadlineInDays: 35, teammates: 2,
    title: "Frontend developer React untuk kompetisi web",
    description: "Membangun aplikasi web responsif menggunakan React dan Tailwind CSS.",
    category: "Programming", skills: ["React", "Tailwind CSS", "TypeScript"], event: "Compfest 2026",
  },
  {
    key: "p07", user: "sari", daysAgo: 5, deadlineInDays: 18, teammates: 1,
    title: "Business plan competition butuh analis keuangan",
    description: "Menyusun proyeksi keuangan dan analisis pasar untuk bisnis rintisan di bidang makanan.",
    category: "Business", skills: ["Financial Analysis", "Excel"], event: "Business Plan Competition Untirta",
  },
  {
    key: "p08", user: "bayu", daysAgo: 8, deadlineInDays: 40, teammates: 2,
    title: "PKM-RE pengolahan sampah plastik mencari penulis",
    description: "Mencari rekan menulis proposal dan riset laboratorium untuk program kreativitas mahasiswa bidang lingkungan.",
    category: "PKM", skills: ["Scientific Writing", "Research"], event: "PKM 2026",
  },
  {
    key: "p09", user: "rina", daysAgo: 7, deadlineInDays: 22, teammates: 1,
    title: "Desain branding dan logo untuk lomba kewirausahaan",
    description: "Membuat identitas visual produk, logo, dan kemasan untuk tim wirausaha muda.",
    category: "Design", skills: ["Adobe Illustrator", "Figma", "Branding"], event: "Wirausaha Muda",
  },
  {
    key: "p10", user: "dimas", daysAgo: 9, deadlineInDays: 28, teammates: 2,
    title: "Mobile developer Flutter untuk aplikasi kampus",
    description: "Mengembangkan aplikasi layanan kampus lintas platform dengan Flutter dan Firebase.",
    category: "Programming", skills: ["Flutter", "Dart", "Firebase"], event: "Gemastik 2026",
  },
  {
    key: "p11", user: "bayu", daysAgo: 10, deadlineInDays: 32, teammates: 1,
    title: "Machine learning engineer untuk klasifikasi citra",
    description: "Melatih model computer vision dengan TensorFlow untuk mengenali penyakit daun.",
    category: "Data/AI", skills: ["Python", "TensorFlow", "Computer Vision"], event: "Kaggle Campus Challenge",
  },
  {
    key: "p12", user: "sari", daysAgo: 12, deadlineInDays: 15, teammates: 1,
    title: "Video presentasi dan storytelling untuk pitch deck",
    description: "Butuh anggota yang piawai menyusun cerita, mengedit video, dan tampil percaya diri saat pitching.",
    category: "Business", skills: ["Public Speaking", "Video Editing", "Canva"], event: "Pitch Competition",
  },
  {
    key: "p13", user: "rina", daysAgo: 15, deadlineInDays: -3, teammates: 1, status: "closed",
    title: "UI/UX designer untuk hackathon kesehatan",
    description: "Merancang antarmuka aplikasi pemantauan kesehatan. Pendaftaran tim sudah ditutup.",
    category: "Hackathon", skills: ["Figma", "UI Design"], event: "HealthTech Hackathon",
  },
  {
    key: "p14", user: "dimas", daysAgo: 11, deadlineInDays: 26, teammates: 2,
    title: "Tim PKM teknologi tepat guna mencari programmer IoT",
    description: "Membuat prototipe alat pemantau kualitas air berbasis sensor dan mikrokontroler.",
    category: "PKM", skills: ["Arduino", "IoT", "C++"], event: "PKM 2026",
  },
  // Dua postingan identik berbeda umur: menguji tie-breaker "terbaru dulu".
  {
    key: "p15", user: "sari", daysAgo: 20, deadlineInDays: 12, teammates: 2,
    title: "Lomba robotik: mencari anggota mekanik",
    description: "Tim robot line follower butuh anggota untuk perancangan mekanik dan perakitan.",
    category: "Other", skills: ["Mechanical Design", "Arduino"], event: "Kontes Robot Kampus",
  },
  {
    key: "p16", user: "bayu", daysAgo: 3, deadlineInDays: 12, teammates: 2,
    title: "Lomba robotik: mencari anggota mekanik",
    description: "Tim robot line follower butuh anggota untuk perancangan mekanik dan perakitan.",
    category: "Other", skills: ["Mechanical Design", "Arduino"], event: "Kontes Robot Kampus",
  },
  // Penulisan "NodeJS" berbeda dari "Node.js": menguji alias token.
  {
    key: "p17", user: "dimas", daysAgo: 13, deadlineInDays: 21, teammates: 1,
    title: "Butuh anggota backend NodeJS dan PostgreSQL",
    description: "Membangun platform konsultasi startup untuk ajang inkubasi bisnis mahasiswa.",
    category: "Programming", skills: ["NodeJS", "PostgreSQL"], event: "Startup Weekend",
  },
];

export const likes = [
  ["dimas", "p01"], ["sari", "p01"], ["bayu", "p01"],
  ["rina", "p02"], ["bayu", "p02"],
  ["rina", "p04"], ["dimas", "p05"], ["sari", "p06"], ["rina", "p06"],
  ["nadia", "p03"], ["nadia", "p07"],
];

export const comments = [
  ["dimas", "p01", "Menarik! Apakah tim sudah punya anggota developer?"],
  ["sari", "p02", "Semoga dapat partner yang cocok, sukses!"],
  ["rina", "p06", "Saya bisa bantu desain UI-nya kalau dibutuhkan."],
  ["nadia", "p03", "Tenggat pendaftarannya kapan ya?"],
];
