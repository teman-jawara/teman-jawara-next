
import type { Metadata } from "next";
import type { RowDataPacket } from "mysql2";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import {
  ConnectionsList,
  type ConnectionPerson,
} from "@/components/connections/connections-list";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Koneksi" };
export const dynamic = "force-dynamic";

interface ConnectionRow extends RowDataPacket, ConnectionPerson {}

export default async function ConnectionsPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }
  await db.query(
  `UPDATE notifications
   SET is_read = 1
   WHERE user_id = ?
     AND type = 'connection_request'
     AND is_read = 0`,
  [user.id],
);

  let incoming: ConnectionPerson[] = [];
  let outgoing: ConnectionPerson[] = [];
  let connected: ConnectionPerson[] = [];

  try {
    const [incomingRows] = await db.query<ConnectionRow[]>(
      `SELECT
        c.id AS connection_id,
        c.requester_id AS user_id,
        p.full_name,
        p.nim,
        p.avatar_url,
        p.study_program
      FROM connections c
      LEFT JOIN profiles p ON p.user_id = c.requester_id
      WHERE c.receiver_id = ?
        AND c.status = 'pending'
      ORDER BY c.created_at DESC`,
      [user.id],
    );

    incoming = incomingRows;
  } catch (error) {
    console.error("Error loading incoming connections:", error);
  }

  try {
    const [outgoingRows] = await db.query<ConnectionRow[]>(
      `SELECT
        c.id AS connection_id,
        c.receiver_id AS user_id,
        p.full_name,
        p.nim,
        p.avatar_url,
        p.study_program
      FROM connections c
      LEFT JOIN profiles p ON p.user_id = c.receiver_id
      WHERE c.requester_id = ?
        AND c.status = 'pending'
      ORDER BY c.created_at DESC`,
      [user.id],
    );

    outgoing = outgoingRows;
  } catch (error) {
    console.error("Error loading outgoing connections:", error);
  }

  try {
    const [connectedRows] = await db.query<ConnectionRow[]>(
      `SELECT
        c.id AS connection_id,
        CASE
          WHEN c.requester_id = ? THEN c.receiver_id
          ELSE c.requester_id
        END AS user_id,
        p.full_name,
        p.nim,
        p.avatar_url,
        p.study_program
      FROM connections c
      LEFT JOIN profiles p ON p.user_id =
        CASE
          WHEN c.requester_id = ? THEN c.receiver_id
          ELSE c.requester_id
        END
      WHERE c.status = 'accepted'
        AND (c.requester_id = ? OR c.receiver_id = ?)
      ORDER BY c.updated_at DESC`,
      [user.id, user.id, user.id, user.id],
    );

    connected = connectedRows;
  } catch (error) {
    console.error("Error loading accepted connections:", error);
  }

  return (
    <main className="space-y-6">
      <PageHeader
        title="Koneksi"
        description="Kelola permintaan koneksi dan lihat teman satu tim."
      />

      <ConnectionsList
        incoming={incoming}
        outgoing={outgoing}
        connected={connected}
      />
    </main>
  );
}
