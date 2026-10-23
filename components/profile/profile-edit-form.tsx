
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";

type Profile = {
  id: string;
  full_name: string;
  nim: string | null;
  faculty: string | null;
  study_program: string | null;
  generation: number | null;
  bio: string | null;
  skills: string[] | null;
  competition_interests: string[] | null;
  whatsapp_number?: string | null;
  whatsapp_public?: boolean | number | null;
};

type ProfileEditFormProps = {
  profile: Profile;
};

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [nim, setNim] = useState(profile.nim ?? "");
  const [faculty, setFaculty] = useState(profile.faculty ?? "");
  const [studyProgram, setStudyProgram] = useState(
    profile.study_program ?? "",
  );
  const [generation, setGeneration] = useState(
    profile.generation?.toString() ?? "",
  );
  const [bio, setBio] = useState(profile.bio ?? "");
  const [skills, setSkills] = useState(
    profile.skills?.join(", ") ?? "",
  );
  const [competitionInterests, setCompetitionInterests] = useState(
    profile.competition_interests?.join(", ") ?? "",
  );

  const [whatsappNumber, setWhatsappNumber] = useState(
    profile.whatsapp_number ?? "",
  );
  const [whatsappPublic, setWhatsappPublic] = useState(
    Boolean(profile.whatsapp_public),
  );

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const skillsArray = skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const interestsArray = competitionInterests
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (whatsappPublic && !whatsappNumber.trim()) {
      setError(
        "Isi nomor WhatsApp terlebih dahulu sebelum mengizinkan kontak ditampilkan.",
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim(),
          nim: nim.trim() || null,
          faculty: faculty.trim() || null,
          study_program: studyProgram.trim() || null,
          generation: generation ? Number(generation) : null,
          bio: bio.trim() || null,
          skills: skillsArray,
          competition_interests: interestsArray,
          whatsapp_number: whatsappNumber.trim() || null,
          whatsapp_public: whatsappNumber.trim()
            ? whatsappPublic
            : false,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Gagal memperbarui profil.");
        return;
      }

      setMessage("Profil berhasil diperbarui.");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
          <Avatar name={fullName || "Mahasiswa Untirta"} size="lg" />

          <div>
            <p className="font-semibold text-gray-900">
              {fullName || "Mahasiswa Untirta"}
            </p>
            <p className="text-sm text-gray-500">
              Preview foto profil berupa inisial akun
            </p>
          </div>
        </div>

        <FormField label="Nama lengkap" htmlFor="full-name">
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </FormField>

        <FormField
          label="NIM"
          htmlFor="nim"
          hint="Nomor Induk Mahasiswa aktif Untirta."
        >
          <Input
            id="nim"
            value={nim}
            onChange={(event) => setNim(event.target.value)}
            placeholder="Contoh: 3332200001"
          />
        </FormField>

        <FormField label="Fakultas" htmlFor="faculty">
          <Input
            id="faculty"
            value={faculty}
            onChange={(event) => setFaculty(event.target.value)}
            placeholder="Contoh: Fakultas Teknik"
          />
        </FormField>

        <FormField label="Program Studi" htmlFor="study-program">
          <Input
            id="study-program"
            value={studyProgram}
            onChange={(event) => setStudyProgram(event.target.value)}
            placeholder="Contoh: Informatika"
          />
        </FormField>

        <FormField label="Angkatan" htmlFor="generation">
          <Input
            id="generation"
            type="number"
            value={generation}
            onChange={(event) => setGeneration(event.target.value)}
            placeholder="Contoh: 2024"
          />
        </FormField>

        <FormField label="Bio" htmlFor="bio">
          <textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Ceritakan sedikit tentang dirimu..."
            rows={4}
            className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-navy-700 focus:ring-2 focus:ring-navy-700/10"
          />
        </FormField>

        <FormField
          label="Skills"
          htmlFor="skills"
          hint="Pisahkan dengan koma. Contoh: UI/UX, Flutter, Public Speaking"
        >
          <Input
            id="skills"
            value={skills}
            onChange={(event) => setSkills(event.target.value)}
            placeholder="UI/UX, Flutter, Public Speaking"
          />
        </FormField>

        <FormField
          label="Minat kompetisi"
          htmlFor="competition-interests"
          hint="Pisahkan dengan koma."
        >
          <Input
            id="competition-interests"
            value={competitionInterests}
            onChange={(event) =>
              setCompetitionInterests(event.target.value)
            }
            placeholder="UI/UX, Bisnis, Teknologi"
          />
        </FormField>

        <div className="space-y-3 rounded-xl border border-green-200 bg-green-50/60 p-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              Kontak WhatsApp
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Tambahkan WhatsApp agar mahasiswa lain dapat menghubungimu
              untuk membahas kolaborasi lomba.
            </p>
          </div>

          <FormField
            label="Nomor WhatsApp"
            htmlFor="whatsapp-number"
            hint="Contoh: 081234567890 atau +6281234567890."
          >
            <Input
              id="whatsapp-number"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={whatsappNumber}
              onChange={(event) => {
                setWhatsappNumber(event.target.value);

                if (!event.target.value.trim()) {
                  setWhatsappPublic(false);
                }
              }}
              placeholder="Masukkan nomor WhatsApp"
            />
          </FormField>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={whatsappPublic}
              disabled={!whatsappNumber.trim() || loading}
              onChange={(event) =>
                setWhatsappPublic(event.target.checked)
              }
              className="mt-1 size-4 accent-green-600"
            />

            <span>
              <span className="block text-sm font-medium text-gray-900">
                Izinkan dihubungi melalui WhatsApp
              </span>
              <span className="mt-1 block text-xs leading-5 text-gray-600">
                Jika diaktifkan, nomor dan tombol WhatsApp dapat dilihat
                pengunjung profil publikmu. Kamu bisa menonaktifkannya
                kapan saja.
              </span>
            </span>
          </label>

          {!whatsappPublic && (
            <p className="text-xs text-gray-500">
              Kontak WhatsApp sedang disembunyikan dari pengunjung.
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Menyimpan..." : "Simpan Profil"}
        </Button>
      </form>
    </Card>
  );
}
