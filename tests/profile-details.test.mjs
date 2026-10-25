import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  validateHttpUrl,
  validateAchievementInput,
  validateProjectInput,
  validateExperienceInput,
  parseTechnologies,
} from "../lib/profile-details.ts";

describe("Validasi URL", () => {
  test("URL http dan https valid diterima", () => {
    assert.equal(
      validateHttpUrl("https://github.com/untirta/project").valid,
      true,
    );
    assert.equal(
      validateHttpUrl("http://example.com/demo").valid,
      true,
    );
  });

  test("URL kosong atau null diperbolehkan sebagai field opsional", () => {
    assert.equal(validateHttpUrl(null).valid, true);
    assert.equal(validateHttpUrl(null).normalized, null);
    assert.equal(validateHttpUrl("").valid, true);
    assert.equal(validateHttpUrl("   ").valid, true);
    assert.equal(validateHttpUrl(undefined).valid, true);
  });

  test("Protokol tidak aman (javascript:, data:, ftp:, file:) ditolak", () => {
    assert.equal(validateHttpUrl("javascript:alert(1)").valid, false);
    assert.equal(validateHttpUrl("data:text/html,<script>").valid, false);
    assert.equal(validateHttpUrl("ftp://files.example.com").valid, false);
    assert.equal(validateHttpUrl("file:///etc/passwd").valid, false);
  });

  test("URL lebih dari 500 karakter ditolak", () => {
    const longUrl = "https://example.com/" + "a".repeat(500);
    assert.equal(validateHttpUrl(longUrl).valid, false);
  });
});

describe("Validasi Data Prestasi (Achievements)", () => {
  const currentYear = new Date().getFullYear();

  test("Input valid diterima dengan benar", () => {
    const res = validateAchievementInput({
      competition_name: "Gemastik XVI 2023",
      achievement_title: "Juara 1",
      category: "UI/UX",
      year: 2023,
      description: "Merancang solusi aplikasi inklusif untuk penyandang disabilitas.",
      proof_url: "https://drive.google.com/cert/123",
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.data.competition_name, "Gemastik XVI 2023");
      assert.equal(res.data.achievement_title, "Juara 1");
      assert.equal(res.data.year, 2023);
      assert.equal(res.data.proof_url, "https://drive.google.com/cert/123");
    }
  });

  test("Nama kompetisi kosong atau tidak ada ditolak", () => {
    const res1 = validateAchievementInput({
      competition_name: "",
      achievement_title: "Juara 1",
      category: "UI/UX",
      year: 2023,
    });
    assert.equal(res1.ok, false);

    const res2 = validateAchievementInput({
      achievement_title: "Juara 1",
      category: "UI/UX",
      year: 2023,
    });
    assert.equal(res2.ok, false);
  });

  test("Nama kompetisi melebihi 255 karakter ditolak", () => {
    const res = validateAchievementInput({
      competition_name: "A".repeat(256),
      achievement_title: "Juara 1",
      category: "UI/UX",
      year: 2023,
    });
    assert.equal(res.ok, false);
  });

  test("Gelar capaian kosong atau melebihi 150 karakter ditolak", () => {
    const res1 = validateAchievementInput({
      competition_name: "Gemastik",
      achievement_title: "",
      category: "UI/UX",
      year: 2023,
    });
    assert.equal(res1.ok, false);

    const res2 = validateAchievementInput({
      competition_name: "Gemastik",
      achievement_title: "X".repeat(151),
      category: "UI/UX",
      year: 2023,
    });
    assert.equal(res2.ok, false);
  });

  test("Tahun tidak valid ditolak (< 1990 atau > currentYear + 2)", () => {
    assert.equal(
      validateAchievementInput({
        competition_name: "Gemastik",
        achievement_title: "Juara 1",
        category: "UI/UX",
        year: 1980,
      }).ok,
      false,
    );

    assert.equal(
      validateAchievementInput({
        competition_name: "Gemastik",
        achievement_title: "Juara 1",
        category: "UI/UX",
        year: currentYear + 5,
      }).ok,
      false,
    );

    assert.equal(
      validateAchievementInput({
        competition_name: "Gemastik",
        achievement_title: "Juara 1",
        category: "UI/UX",
        year: "bukan_angka",
      }).ok,
      false,
    );
  });

  test("Deskripsi opsional dan URL opsional ditangani dengan aman", () => {
    const res = validateAchievementInput({
      competition_name: "Lomba Poster Nasional",
      achievement_title: "Finalis",
      category: "Poster",
      year: 2024,
      description: null,
      proof_url: "",
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.data.description, null);
      assert.equal(res.data.proof_url, null);
    }
  });

  test("Tautan bukti yang tidak valid ditolak", () => {
    const res = validateAchievementInput({
      competition_name: "Lomba Poster Nasional",
      achievement_title: "Finalis",
      category: "Poster",
      year: 2024,
      proof_url: "bukan-url-valid",
    });
    assert.equal(res.ok, false);
  });
});

describe("Validasi Data Proyek (Projects)", () => {
  test("Input proyek valid diterima", () => {
    const res = validateProjectInput({
      title: "TemanJawara Collaboration Platform",
      category: "Hackathon",
      description: "Platform pencarian partner lomba untuk mahasiswa berbasis Next.js dan MySQL.",
      technologies: ["Next.js", "React", "MySQL", "Tailwind CSS"],
      project_url: "https://github.com/untirta/temanjawara",
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.data.title, "TemanJawara Collaboration Platform");
      assert.equal(res.data.technologies.length, 4);
      assert.equal(res.data.project_url, "https://github.com/untirta/temanjawara");
    }
  });

  test("Judul kosong atau melebihi 200 karakter ditolak", () => {
    assert.equal(
      validateProjectInput({
        title: "",
        category: "Hackathon",
        description: "Deskripsi",
      }).ok,
      false,
    );

    assert.equal(
      validateProjectInput({
        title: "P".repeat(201),
        category: "Hackathon",
        description: "Deskripsi",
      }).ok,
      false,
    );
  });

  test("Deskripsi proyek wajib dan maksimal 3000 karakter", () => {
    assert.equal(
      validateProjectInput({
        title: "Proyek",
        category: "Hackathon",
        description: "",
      }).ok,
      false,
    );

    assert.equal(
      validateProjectInput({
        title: "Proyek",
        category: "Hackathon",
        description: "D".repeat(3001),
      }).ok,
      false,
    );
  });

  test("Teknologi diparsing dengan aman dari array maupun string comma-separated", () => {
    const parsedFromArray = parseTechnologies(["React", "Node.js", "   ", "TypeScript"]);
    assert.deepEqual(parsedFromArray, ["React", "Node.js", "TypeScript"]);

    const parsedFromString = parseTechnologies("React, Node.js, , TypeScript");
    assert.deepEqual(parsedFromString, ["React", "Node.js", "TypeScript"]);

    const parsedFromJson = parseTechnologies(JSON.stringify(["Python", "Pandas"]));
    assert.deepEqual(parsedFromJson, ["Python", "Pandas"]);
  });
});

describe("Validasi Data Pengalaman (Experiences)", () => {
  test("Pengalaman valid dengan tanggal selesai diterima", () => {
    const res = validateExperienceInput({
      role: "Lead Frontend Developer",
      organization_or_project: "BEM Fakultas Teknik Untirta",
      category: "Programming",
      description: "Mengembangkan website portal informasi mahasiswa teknik.",
      technologies: ["React", "Tailwind CSS"],
      start_date: "2023-01-15",
      end_date: "2023-12-20",
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.data.role, "Lead Frontend Developer");
      assert.equal(res.data.start_date, "2023-01-15");
      assert.equal(res.data.end_date, "2023-12-20");
    }
  });

  test("Pengalaman yang masih berlangsung (end_date null/kosong) diterima", () => {
    const res = validateExperienceInput({
      role: "Ketua Tim Riset",
      organization_or_project: "Laboratorium Komputasi Cerdas",
      category: "Data/AI",
      description: "Riset model machine learning untuk klasifikasi citra medis.",
      technologies: ["Python", "PyTorch"],
      start_date: "2024-02",
      end_date: null,
    });
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.data.start_date, "2024-02-01");
      assert.equal(res.data.end_date, null);
    }
  });

  test("Tanggal selesai lebih awal dari tanggal mulai ditolak", () => {
    const res = validateExperienceInput({
      role: "Developer",
      organization_or_project: "Proyek Tim",
      category: "Programming",
      description: "Deskripsi",
      start_date: "2024-05-01",
      end_date: "2024-02-01",
    });
    assert.equal(res.ok, false);
  });

  test("Tanggal mulai tidak valid ditolak", () => {
    const res = validateExperienceInput({
      role: "Developer",
      organization_or_project: "Proyek Tim",
      category: "Programming",
      description: "Deskripsi",
      start_date: "bukan-tanggal",
    });
    assert.equal(res.ok, false);
  });

  test("Peran atau organisasi kosong ditolak", () => {
    assert.equal(
      validateExperienceInput({
        role: "",
        organization_or_project: "BEM",
        category: "Hackathon",
        description: "Deskripsi",
        start_date: "2024-01-01",
      }).ok,
      false,
    );

    assert.equal(
      validateExperienceInput({
        role: "Anggota",
        organization_or_project: "",
        category: "Hackathon",
        description: "Deskripsi",
        start_date: "2024-01-01",
      }).ok,
      false,
    );
  });
});
