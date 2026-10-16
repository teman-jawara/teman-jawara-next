
"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, UserPlus, UserCheck, Loader2 } from "lucide-react";

type ConnectionStatus = "pending" | "accepted" | "rejected" | null;

interface ConnectionData {
  connectionCount: number;
  status: ConnectionStatus;
  isConnected: boolean;
  isRequester: boolean;
  isOwnProfile: boolean;
}

interface ProfileConnectProps {
  profileId: string;
}

export function ProfileConnect({ profileId }: ProfileConnectProps) {
  const [data, setData] = useState<ConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadConnection = useCallback(async () => {
    const response = await fetch(`/api/connections/${profileId}`, {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Gagal memuat koneksi.");
    }

    setData(result);
  }, [profileId]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        await loadConnection();
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat koneksi.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
  }, [loadConnection]);

  async function handleAction(
    action: "connect" | "accept" | "reject" | "remove",
  ) {
    if (busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/connections/${profileId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal memproses koneksi.");
      }

      await loadConnection();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal memproses koneksi.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        Memuat koneksi...
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-2 text-sm text-red-600">
        {error || "Data koneksi tidak tersedia."}
      </p>
    );
  }

  return (
    <div className="mt-5 border-t border-gray-200 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users size={19} />
          <span>
            <strong className="text-gray-900">
              {data.connectionCount}
            </strong>{" "}
            koneksi
          </span>
        </div>

        {!data.isOwnProfile && (
          <div className="flex flex-wrap gap-2">
            {data.status === "accepted" ? (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                  <UserCheck size={17} />
                  Terhubung
                </span>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm("Yakin ingin memutus koneksi ini?")
                    ) {
                      void handleAction("remove");
                    }
                  }}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Putus koneksi
                </button>
              </>
            ) : data.status === "pending" && data.isRequester ? (
              <button
                type="button"
                disabled
                className="cursor-not-allowed rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-600"
              >
                Permintaan terkirim
              </button>
            ) : data.status === "pending" ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAction("accept")}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {busy ? "Memproses..." : "Terima"}
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleAction("reject")}
                  className="rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Tolak
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleAction("connect")}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <UserPlus size={17} />
                {busy ? "Memproses..." : "Connect"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
