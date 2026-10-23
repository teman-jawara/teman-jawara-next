import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  extractTargetTokens,
  calculatePostRelevanceScore,
  calculateProfileSkillMatchScore,
  getAchievementTierScore,
  extractPostAchievementClaims,
  calculateAchievementEvidenceScore,
  calculateProjectEvidenceScore,
  calculateExperienceEvidenceScore,
  calculatePartnerMatch,
  DEFAULT_COMPETENCY_WEIGHTS,
} from "../lib/recommender/competency.ts";

const dummyPost = (overrides = {}) => ({
  id: "p-test",
  title: "Mencari Frontend Developer untuk Hackathon",
  description: "Kami membutuhkan developer yang menguasai React dan TypeScript untuk hackathon kampus.",
  category: "Hackathon",
  event_name: "Untirta Hackathon 2026",
  required_skills: ["React", "TypeScript"],
  created_at: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

describe("Ekstraksi Target Token & Vocabulary", () => {
  test("Kategori spesifik tanpa query menghasilkan kosakata kategori", () => {
    const tokens = extractTargetTokens({ category: "UI/UX", query: "" });
    assert.ok(tokens.includes("figma"));
    assert.ok(tokens.includes("wireframe"));
    assert.ok(tokens.includes("interface"));
  });

  test("Semua Kategori dengan query menghasilkan token query", () => {
    const tokens = extractTargetTokens({ category: "All", query: "machine learning python" });
    assert.ok(tokens.includes("machine"));
    assert.ok(tokens.includes("learning"));
    assert.ok(tokens.includes("python"));
  });

  test("Kategori spesifik dengan query menggabungkan sinyal tanpa duplikasi", () => {
    const tokens = extractTargetTokens({ category: "UI/UX", query: "figma prototyping" });
    assert.ok(tokens.includes("figma"));
    assert.ok(tokens.includes("prototyping"));
    assert.ok(tokens.includes("wireframe"));
    // Tidak ada token duplikat
    const uniqueTokens = new Set(tokens);
    assert.equal(tokens.length, uniqueTokens.size);
  });
});

describe("Komponen 1: Skor Relevansi Postingan (25%)", () => {
  test("Relevansi tinggi bila judul/deskripsi memuat query", () => {
    const post = dummyPost({
      title: "Dicari UI/UX Designer mahir Figma",
      description: "Membuat prototype aplikasi mobile di Figma",
    });
    const score = calculatePostRelevanceScore(post, { query: "figma ui" });
    assert.ok(score > 40, `Skor diharapkan > 40, didapat ${score}`);
  });

  test("Kategori cocok saat query kosong memberikan skor relevansi kategori", () => {
    const post = dummyPost({ category: "Hackathon" });
    const score = calculatePostRelevanceScore(post, { category: "Hackathon", query: "" });
    assert.equal(score, 85);
  });
});

describe("Komponen 2: Kecocokan Skill Profil (25%)", () => {
  test("Keahlian profil yang cocok dengan target kategori/kueri mendapat skor tinggi", () => {
    const profile = {
      skills: ["Figma", "UI Design", "User Research"],
      bio: "UI/UX Enthusiast",
      competition_interests: ["UI/UX"],
    };
    const score = calculateProfileSkillMatchScore(profile, { category: "UI/UX" });
    assert.ok(score >= 50, `Skor diharapkan >= 50, didapat ${score}`);
  });

  test("Profil tanpa keahlian yang relevan menghasilkan skor 0", () => {
    const profile = {
      skills: ["Renang", "Memasak"],
      bio: "Suka olahraga",
      competition_interests: ["Lomba Masak"],
    };
    const score = calculateProfileSkillMatchScore(profile, { category: "Programming", query: "react" });
    assert.equal(score, 0);
  });

  test("Profil null/kosong menghasilkan skor 0", () => {
    assert.equal(calculateProfileSkillMatchScore(null, { category: "UI/UX" }), 0);
    assert.equal(calculateProfileSkillMatchScore({}, { category: "UI/UX" }), 0);
  });
});

describe("Komponen 3: Bukti Prestasi (20%)", () => {
  test("Tingkatan prestasi dikenali dengan benar (Juara 1 > Juara 2 > Finalis > Peserta)", () => {
    assert.equal(getAchievementTierScore("Juara 1 Nasional"), 100);
    assert.equal(getAchievementTierScore("Winner Hackathon"), 100);
    assert.equal(getAchievementTierScore("Juara 2"), 85);
    assert.equal(getAchievementTierScore("Juara 3"), 70);
    assert.equal(getAchievementTierScore("Finalis Gemastik"), 50);
    assert.equal(getAchievementTierScore("Top 10 Finalist"), 50);
    assert.equal(getAchievementTierScore("Peserta Lomba"), 25);
  });

  test("Deteksi Konteks Postingan: Mencari pemenang vs Mengklaim prestasi", () => {
    // 1. Seeking requirement: "Dicari anggota yang pernah juara hackathon"
    const seekingText = "Dicari anggota tim yang pernah juara hackathon untuk ikut lomba.";
    const seekingClaims = extractPostAchievementClaims(seekingText);
    assert.equal(seekingClaims.length, 0, "Kata 'dicari ... juara' tidak boleh dianggap sebagai prestasi penulis!");

    // 2. Seeking requirement lainnya
    const neededText = "Kriteria: butuh pemenang atau finalis UI/UX.";
    const neededClaims = extractPostAchievementClaims(neededText);
    assert.equal(neededClaims.length, 0, "Syarat/kriteria tidak boleh dihitung sebagai klaim prestasi penulis!");

    // 3. Author claim: "Saya pernah meraih juara 1 hackathon tahun lalu"
    const authorClaimText = "Saya pernah meraih juara 1 hackathon tahun lalu dan mencari anggota tim.";
    const authorClaims = extractPostAchievementClaims(authorClaimText);
    assert.ok(authorClaims.length > 0, "Klaim asli penulis harus terdeteksi.");
  });

  test("Deduplikasi: Prestasi yang ditulis ganda di profil dan postingan tidak dihitung dua kali", () => {
    const achievements = [
      {
        id: "a1",
        user_id: "u1",
        competition_name: "Gemastik UI/UX",
        achievement_title: "Juara 1",
        category: "UI/UX",
        year: 2023,
        description: null,
        proof_url: null,
        created_at: "",
        updated_at: "",
      },
    ];

    // Postingan mengulang kemenangan yang sama
    const postDesc = "Pernah meraih Gemastik UI/UX Juara 1.";

    const result = calculateAchievementEvidenceScore(achievements, postDesc, { category: "UI/UX" });
    assert.equal(result.count, 1, "Prestasi duplikat harus dihitung 1 kali");
  });

  test("Prestasi dari kategori berbeda memiliki bobot relevansi lebih rendah", () => {
    const achRelevant = [
      {
        id: "a1",
        user_id: "u1",
        competition_name: "Gemastik UI/UX",
        achievement_title: "Juara 1",
        category: "UI/UX",
        year: 2023,
        description: null,
        proof_url: null,
        created_at: "",
        updated_at: "",
      },
    ];

    const achIrrelevant = [
      {
        id: "a2",
        user_id: "u1",
        competition_name: "Lomba Renang Banten",
        achievement_title: "Juara 1",
        category: "Other",
        year: 2023,
        description: null,
        proof_url: null,
        created_at: "",
        updated_at: "",
      },
    ];

    const scoreRel = calculateAchievementEvidenceScore(achRelevant, "", { category: "UI/UX" }).score;
    const scoreIrrel = calculateAchievementEvidenceScore(achIrrelevant, "", { category: "UI/UX" }).score;

    assert.ok(scoreRel > scoreIrrel, `Juara kategori sesuai (${scoreRel}) harus lebih tinggi dari tidak sesuai (${scoreIrrel})`);
  });
});

describe("Komponen 4: Bukti Portofolio dan Proyek (20%)", () => {
  test("Proyek selesai bernilai lebih tinggi daripada proyek latihan/tutorial", () => {
    const completedProj = [
      {
        id: "p1",
        user_id: "u1",
        title: "Sistem Informasi Akademik",
        category: "Programming",
        description: "Aplikasi produksi yang digunakan oleh 500 mahasiswa aktif.",
        technologies: ["React", "Node.js"],
        project_url: "https://demo.untirta.ac.id",
        created_at: "",
        updated_at: "",
      },
    ];

    const practiceProj = [
      {
        id: "p2",
        user_id: "u1",
        title: "Latihan React Pemula",
        category: "Programming",
        description: "Hanya latihan tutorial YouTube iseng-iseng belum selesai.",
        technologies: ["React"],
        project_url: null,
        created_at: "",
        updated_at: "",
      },
    ];

    const scoreCompleted = calculateProjectEvidenceScore(completedProj, { category: "Programming" }).score;
    const scorePractice = calculateProjectEvidenceScore(practiceProj, { category: "Programming" }).score;

    assert.ok(scoreCompleted > scorePractice, `Proyek selesai (${scoreCompleted}) harus lebih tinggi dari latihan (${scorePractice})`);
  });

  test("Tautan proyek (URL) memberikan skor tambahan bukti implementasi", () => {
    const withUrl = [
      {
        id: "p1",
        user_id: "u1",
        title: "Platform E-Commerce",
        category: "Programming",
        description: "Platform belanja online.",
        technologies: ["Next.js"],
        project_url: "https://github.com/untirta/ecommerce",
        created_at: "",
        updated_at: "",
      },
    ];

    const withoutUrl = [
      {
        id: "p2",
        user_id: "u1",
        title: "Platform E-Commerce",
        category: "Programming",
        description: "Platform belanja online.",
        technologies: ["Next.js"],
        project_url: null,
        created_at: "",
        updated_at: "",
      },
    ];

    const s1 = calculateProjectEvidenceScore(withUrl, { category: "Programming" }).score;
    const s2 = calculateProjectEvidenceScore(withoutUrl, { category: "Programming" }).score;

    assert.ok(s1 > s2, `Proyek dengan URL valid (${s1}) harus lebih tinggi dari tanpa URL (${s2})`);
  });
});

describe("Komponen 5: Bukti Pengalaman (10%)", () => {
  test("Peran kepemimpinan/eksekusi bernilai lebih tinggi dari bahasa belajar pemula", () => {
    const leadershipExp = [
      {
        id: "e1",
        user_id: "u1",
        role: "Lead Developer & Koordinator",
        organization_or_project: "Tim Lomba Gemastik Untirta",
        category: "Programming",
        description: "Memimpin arsitektur sistem dan koordinasi tim pengembang.",
        technologies: ["React", "MySQL"],
        start_date: "2023-01-01",
        end_date: null,
        created_at: "",
        updated_at: "",
      },
    ];

    const beginnerExp = [
      {
        id: "e2",
        user_id: "u1",
        role: "Peserta Kursus",
        organization_or_project: "Webinar Dasar",
        category: "Programming",
        description: "Hanya belajar dan baru mencoba materi dasar pemrograman pemula.",
        technologies: ["HTML"],
        start_date: "2023-01-01",
        end_date: "2023-01-02",
        created_at: "",
        updated_at: "",
      },
    ];

    const scoreLead = calculateExperienceEvidenceScore(leadershipExp, { category: "Programming" }).score;
    const scoreBeg = calculateExperienceEvidenceScore(beginnerExp, { category: "Programming" }).score;

    assert.ok(scoreLead > scoreBeg, `Pengalaman kepemimpinan (${scoreLead}) harus lebih tinggi dari pemula (${scoreBeg})`);
  });
});

describe("Integritas Skor & Batas Bukti Minimum (Threshold)", () => {
  test("Profil kosong tanpa keahlian dan tanpa catatan menghasilkan 'Data belum cukup'", () => {
    const post = dummyPost();
    const authorData = {
      profile: { skills: [], bio: "", competition_interests: [] },
      achievements: [],
      projects: [],
      experiences: [],
    };

    const match = calculatePartnerMatch(post, authorData, { category: "Hackathon", query: "" });

    assert.equal(match.isEligible, true);
    assert.equal(match.hasSufficientData, false);
    assert.equal(match.score, null);
    assert.equal(match.displayLabel, "Data belum cukup");
  });

  test("Profil dengan bukti memadai menampilkan persentase 'Kecocokan Partner'", () => {
    const post = dummyPost({ category: "UI/UX" });
    const authorData = {
      profile: {
        skills: ["Figma", "UI Design", "User Research"],
        bio: "UI/UX enthusiast",
        competition_interests: ["UI/UX"],
      },
      achievements: [
        {
          id: "a1",
          user_id: "u1",
          competition_name: "Lomba Desain UI/UX Nasional",
          achievement_title: "Juara 1",
          category: "UI/UX",
          year: 2024,
          description: "Desain sistem transportasi ramah lansia",
          proof_url: "https://drive.google.com/cert",
          created_at: "",
          updated_at: "",
        },
      ],
      projects: [
        {
          id: "p1",
          user_id: "u1",
          title: "Redesign Mobile Banking Untirta",
          category: "UI/UX",
          description: "Studi kasus perancangan ulang UX mobile banking",
          technologies: ["Figma", "Design System"],
          project_url: "https://figma.com/demo",
          created_at: "",
          updated_at: "",
        },
      ],
      experiences: [
        {
          id: "e1",
          user_id: "u1",
          role: "UI/UX Designer",
          organization_or_project: "BEM FT Untirta",
          category: "UI/UX",
          description: "Mendesain interface aplikasi fakultas",
          technologies: ["Figma"],
          start_date: "2023-01-01",
          end_date: null,
          created_at: "",
          updated_at: "",
        },
      ],
    };

    const match = calculatePartnerMatch(post, authorData, { category: "UI/UX", query: "" });

    assert.equal(match.isEligible, true);
    assert.equal(match.hasSufficientData, true);
    assert.ok(typeof match.score === "number" && match.score > 0 && match.score <= 100);
    assert.ok(match.displayLabel.endsWith("Kecocokan Partner"));
    assert.ok(!match.displayLabel.includes("Verified"));
  });

  test("Kategori 'Other' tidak menampilkan persentase dan tidak digunakan untuk pemeringkatan", () => {
    const post = dummyPost({ category: "Other" });
    const authorData = {
      profile: { skills: ["Lainnya"], bio: "", competition_interests: [] },
      achievements: [],
      projects: [],
      experiences: [],
    };

    const match = calculatePartnerMatch(post, authorData, { category: "Other", query: "" });

    assert.equal(match.isEligible, false);
    assert.equal(match.hasSufficientData, false);
    assert.equal(match.score, null);
    assert.equal(match.displayLabel, "");
  });

  test("Bobot dapat dikonfigurasi dan diverifikasi", () => {
    const post = dummyPost({ category: "Programming" });
    const authorData = {
      profile: { skills: ["React", "Node.js"], bio: "", competition_interests: [] },
      achievements: [],
      projects: [
        {
          id: "p1",
          user_id: "u1",
          title: "Fullstack App",
          category: "Programming",
          description: "Aplikasi web",
          technologies: ["React"],
          project_url: "https://github.com",
          created_at: "",
          updated_at: "",
        },
      ],
      experiences: [],
    };

    const customWeights = {
      postRelevance: 0.1,
      profileSkillMatch: 0.1,
      achievementEvidence: 0.1,
      projectEvidence: 0.6, // Prioritaskan proyek sangat tinggi
      experienceEvidence: 0.1,
    };

    const matchDefault = calculatePartnerMatch(post, authorData, { category: "Programming" });
    const matchCustom = calculatePartnerMatch(post, authorData, { category: "Programming" }, customWeights);

    assert.ok(matchCustom.hasSufficientData);
    assert.ok(typeof matchCustom.score === "number");
    assert.notEqual(matchDefault.score, null);
  });
});
