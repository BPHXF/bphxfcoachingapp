"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push("/sign-in");
        router.refresh();
      }}
      className="w-full rounded-xl border border-border bg-card py-3 text-sm font-bold text-ink"
    >
      Sign out
    </button>
  );
}
