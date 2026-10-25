
"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  
async function handleReset(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  setLoading(true);
  setMessage("");
  setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "Link reset password sudah dikirim. Cek inbox email kamu.",
    );
    setLoading(false);
  }


  return (
    <Card>
      <h1 className="text-2xl font-bold tracking-tight">
        Lupa kata sandi?
      </h1>

      <p className="mt-1 text-sm text-muted">
        Masukkan email yang kamu gunakan untuk membuat akun.
      </p>

      <form onSubmit={handleReset} className="mt-6 space-y-4">
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

        <Button type="submit" disabled={loading} fullWidth>
          {loading ? "Mengirim..." : "Kirim link reset"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Ingat kata sandi?{" "}
        <Link
          href="/login"
          className="font-semibold text-navy-700 underline underline-offset-4"
        >
          Kembali ke login
        </Link>
      </p>
    </Card>
  );
}

