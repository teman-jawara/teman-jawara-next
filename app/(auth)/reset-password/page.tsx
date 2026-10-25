"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

async function handleReset(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setError("");
  setSuccess("");

  if (password.length < 8) {
    setError("Kata sandi minimal 8 karakter.");
    return;
  }

  if (password !== confirmPassword) {
    setError("Konfirmasi kata sandi tidak cocok.");
    return;
  }

  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    setError("Token reset tidak ditemukan. Silakan minta tautan reset baru.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || data.message || "Gagal mengubah kata sandi.");
      return;
    }

    setSuccess("Kata sandi berhasil diubah. Mengalihkan ke halaman login...");

    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 1500);
  } catch {
    setError("Terjadi kesalahan koneksi. Silakan coba lagi.");
  } finally {
    setLoading(false);
  }
}

  return (
    <Card>
      <h1 className="text-2xl font-bold tracking-tight">
        Buat kata sandi baru
      </h1>

      <p className="mt-1 text-sm text-muted">
        Masukkan kata sandi baru untuk akun TemanJawara kamu.
      </p>

      <form onSubmit={handleReset} className="mt-6 space-y-4">
        <FormField
          label="Kata sandi baru"
          htmlFor="password"
          hint="Minimal 8 karakter."
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="pr-10"
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy-700"
              aria-label={
                showPassword
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"
              }
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FormField>

        <FormField
          label="Konfirmasi kata sandi"
          htmlFor="confirm-password"
        >
          <div className="relative">
            <Input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              className="pr-10"
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-navy-700"
              aria-label={
                showConfirmPassword
                  ? "Sembunyikan kata sandi"
                  : "Tampilkan kata sandi"
              }
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </FormField>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}

        <Button type="submit" disabled={loading} fullWidth>
          {loading ? "Menyimpan..." : "Simpan kata sandi baru"}
        </Button>
      </form>
    </Card>
  );
}