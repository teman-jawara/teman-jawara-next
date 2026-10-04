"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string;
  nim: string;
  faculty: string | null;
  study_program: string | null;
  generation: number | null;
  bio: string | null;
  skills: string[] | null;
  competition_interests: string[] | null;
};

type ProfileEditFormProps = {
  profile: Profile;
};

export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const router = useRouter();
  const supabase = createClient();

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

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        nim: nim.trim(),
        faculty: faculty.trim() || null,
        study_program: studyProgram.trim() || null,
        generation: generation ? Number(generation) : null,
        bio: bio.trim() || null,
        skills: skillsArray,
        competition_interests: interestsArray,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Profil berhasil diperbarui.");
    setLoading(false);
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Nama lengkap" htmlFor="full-name">
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </FormField>

        <FormField label="NIM" htmlFor="nim">
          <Input
            id="nim"
            value={nim}
            onChange={(event) => setNim(event.target.value)}
            required
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

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
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