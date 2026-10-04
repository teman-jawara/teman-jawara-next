import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = { title: "Profil mahasiswa" };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Profil mahasiswa" description={`Profil: ${id}`} />
      <EmptyState
        icon="user"
        title="Profil belum tersedia"
        description="Fakultas, program studi, skill, dan minat lomba akan tampil di sini."
      />
    </>
  );
}
