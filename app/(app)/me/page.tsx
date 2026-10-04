import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
export const metadata: Metadata = {
  title: "Profil saya",
};

export default async function MyProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

 if (error || !profile) {
  return (
    <>
      <PageHeader
        title="Profil saya"
        description="Lihat dan ubah profilmu."
      />

      <Card>
        <p className="text-sm text-red-600">
          {error?.message ?? "Data profil belum ditemukan."}
        </p>
      </Card>

    </>
  );
}

  return (
    <>
      <PageHeader
        title="Profil saya"
        description="Lihat dan ubah profilmu."
      />

      <Card>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted">Nama lengkap</p>
            <p className="font-semibold text-navy-800">
              {profile.full_name || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">NIM</p>
            <p className="font-semibold text-navy-800">
              {profile.nim || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Fakultas</p>
            <p className="font-semibold text-navy-800">
              {profile.faculty || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Program Studi</p>
            <p className="font-semibold text-navy-800">
              {profile.study_program || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Angkatan</p>
            <p className="font-semibold text-navy-800">
              {profile.generation || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Bio</p>
            <p className="text-sm text-navy-800">
              {profile.bio || "Belum ada bio."}
            </p>
          </div>
        </div>
      </Card>

      <ProfileEditForm profile={profile} />
    </>
  );
}