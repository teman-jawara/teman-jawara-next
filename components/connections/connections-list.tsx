
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Check, X, Users, Loader2 } from "lucide-react";

export interface ConnectionPerson {
  connection_id: string;
  user_id: string;
  full_name: string | null;
  nim: string | null;
  avatar_url: string | null;
  study_program: string | null;
}

interface ConnectionsListProps {
  incoming: ConnectionPerson[];
  outgoing: ConnectionPerson[];
  connected: ConnectionPerson[];
}

export function ConnectionsList({
  incoming,
  outgoing,
  connected,
}: ConnectionsListProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleRequest(
    person: ConnectionPerson,
    action: "accept" | "reject",
  ) {
    if (busyId) return;

    setBusyId(person.connection_id);
    setError("");

    try {
      const response = await fetch(
        `/api/connections/${person.user_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memproses permintaan.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function renderPerson(person: ConnectionPerson) {
    const name = person.full_name || "Mahasiswa Untirta";

    return (
      <div
        key={person.connection_id}
        className="flex items-center gap-3 p-4"
      >
        <Link
          href={`/profile/${person.user_id}`}
          className="shrink-0"
          aria-label={`Lihat profil ${name}`}
        >
          <Avatar name={name} size="md" />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/profile/${person.user_id}`}
            className="block truncate font-semibold text-gray-900 hover:underline"
          >
            {name}
          </Link>

          <p className="truncate text-sm text-gray-500">
            {person.nim ? `@${person.nim}` : "NIM belum diisi"}
          </p>

          {person.study_program && (
            <p className="truncate text-xs text-gray-500">
              {person.study_program}
            </p>
          )}
        </div>

        {incoming.includes(person) && (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void handleRequest(person, "accept")}
              aria-label={`Terima permintaan dari ${name}`}
              className="rounded-full bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {busyId === person.connection_id ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Check size={17} />
              )}
            </button>

            <button
              type="button"
              disabled={busyId !== null}
              onClick={() => void handleRequest(person, "reject")}
              aria-label={`Tolak permintaan dari ${name}`}
              className="rounded-full border border-gray-300 p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>
    );
  }

  function renderSection(
    title: string,
    people: ConnectionPerson[],
    emptyMessage: string,
  ) {
    return (
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="font-semibold text-gray-900">
            {title}
            <span className="ml-2 text-sm font-normal text-gray-500">
              {people.length}
            </span>
          </h2>
        </div>

        {people.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            {emptyMessage}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {people.map(renderPerson)}
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {renderSection(
        "Permintaan masuk",
        incoming,
        "Belum ada permintaan koneksi.",
      )}

      {renderSection(
        "Koneksi saya",
        connected,
        "Belum ada koneksi yang diterima.",
      )}

      {renderSection(
        "Permintaan terkirim",
        outgoing,
        "Belum ada permintaan yang menunggu.",
      )}
    </div>
  );
}
