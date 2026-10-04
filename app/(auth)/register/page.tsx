"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";


export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleRegister(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/feed");
      router.refresh();
      return;
    }

    setSuccess(
      "Akun berhasil dibuat. Silakan cek email untuk verifikasi akun.",
    );
    setLoading(false);
  }

  return (
    <Card>
      <h1 className="text-2xl font-bold tracking-tight">Buat akun</h1>

      <p className="mt-1 text-sm text-muted">
        Khusus mahasiswa aktif Untirta.
      </p>

      <form onSubmit={handleRegister} className="mt-6 space-y-4">
        <FormField label="Nama lengkap" htmlFor="full-name">
          <Input
            id="full-name"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </FormField>

        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </FormField>

        <FormField
  label="Kata sandi"
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
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-navy-700"
      aria-label={
        showPassword
          ? "Sembunyikan kata sandi"
          : "Tampilkan kata sandi"
      }
    >
      {showPassword ? (
        <EyeOff size={18} />
      ) : (
        <Eye size={18} />
      )}
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
          {loading ? "Membuat akun..." : "Buat akun"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Sudah punya akun?{" "}
        <Link
          href="/login"
          className="font-semibold text-navy-700 underline underline-offset-4"
        >
          Masuk
        </Link>
      </p>
    </Card>
  );
}