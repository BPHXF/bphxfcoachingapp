"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-bold uppercase tracking-wide text-ink">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-ink"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-ink"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="rounded-lg bg-primary py-3 text-sm font-bold uppercase text-white">
          Sign in
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate">
        No account? <Link href="/sign-up" className="font-bold text-ink">Sign up</Link>
      </p>
    </div>
  );
}
