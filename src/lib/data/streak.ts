import type { SupabaseClient } from "@supabase/supabase-js";

// Simplified v1 streak: consecutive calendar days (ending today or
// yesterday) that have at least one completed assignment_session. The
// decisions log flags streak-vs-rescheduling semantics as worth revisiting
// once real usage exists — this is a reasonable starting definition, not a
// final one.
export async function getCurrentStreak(supabase: SupabaseClient, clientId: string): Promise<number> {
  const { data, error } = await supabase
    .from("assignment_sessions")
    .select(
      `completed_at,
       assignment_weeks!inner ( program_assignments!inner ( client_id ) )`
    )
    .eq("assignment_weeks.program_assignments.client_id", clientId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false });

  if (error || !data) {
    console.error("getCurrentStreak failed", error);
    return 0;
  }

  const completedDays = new Set(
    data
      .filter((row) => row.completed_at)
      .map((row) => new Date(row.completed_at as string).toISOString().slice(0, 10))
  );

  let streak = 0;
  const cursor = new Date();
  // Allow today to be "not yet trained" without breaking the streak.
  if (!completedDays.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
