"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Decision: dual entry paths — self-serve sign-up needs no invite (library
// browsing), while a 1:1 client arrives via a trainer-sent invite link
// (?invite=<token>), which links trainer_id on their profile automatically.
export default function SignUpPage() {
  const supabase = createClient();
  const router = useRouter();
  const inviteToken = useSearchParams().get("invite");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? "Sign up failed");
      return;
    }

    let trainerId: string | null = null;
    if (inviteToken) {
      const { data: invite } = await supabase
        .from("invites")
        .select("id, trainer_id, status")
        .eq("token", inviteToken)
        .eq("status", "pending")
        .maybeSingle();
      if (invite) {
        trainerId = invite.trainer_id;
        await supabase.from("invites").update({ status: "accepted", accepted_by: data.user.id }).eq("id", invite.id);
      }
    }

    await supabase.from("profiles").insert({
      id: data.user.id,
      display_name: name,
      role: "client",
      trainer_id: trainerId,
    });

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-bold uppercase tracking-wide text-ink">Sign up</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          required
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-ink"
        />
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
          Create account
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate">
        Already have an account? <Link href="/sign-in" className="font-bold text-ink">Sign in</Link>
      </p>
    </div>
  );
}
