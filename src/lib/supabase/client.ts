"use client";

import { createBrowserClient } from "@supabase/ssr";

// Used in Client Components (anything with "use client"). Reads the public
// anon key — safe to expose, access is enforced by the RLS policies in
// supabase/schema.sql, not by keeping this key secret.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
