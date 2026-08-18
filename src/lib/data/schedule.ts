import type { SupabaseClient } from "@supabase/supabase-js";

export interface NextDueSession {
  id: string;
  title: string;
  assigned_date: string;
  rescheduled_date: string | null;
  status: string;
  assignment_weeks: {
    assignment_id: string;
    program_assignments: {
      id: string;
      client_id: string;
      status: string;
      template_id: string;
      program_templates: { title: string } | null;
    };
  };
}

// "Today's workout" scheduling — Decision: assigned days by default, client
// can reschedule. A session counts as due if:
//   - it was rescheduled to today or earlier, or
//   - it was never rescheduled and its default assigned_date is today or
//     earlier (covers a missed day rolling forward)
// and it hasn't been completed or skipped yet. Ties broken by whichever due
// date is earliest, so a missed session surfaces before today's.
export async function getNextDueSession(
  supabase: SupabaseClient,
  clientId: string
): Promise<NextDueSession | null> {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("assignment_sessions")
    .select(
      `
      id, title, assigned_date, rescheduled_date, status,
      assignment_weeks!inner (
        assignment_id,
        program_assignments!inner ( id, client_id, status, template_id,
          program_templates ( title )
        )
      )
    `
    )
    .eq("status", "pending")
    .eq("assignment_weeks.program_assignments.client_id", clientId)
    .eq("assignment_weeks.program_assignments.status", "active")
    .or(`rescheduled_date.lte.${today},and(rescheduled_date.is.null,assigned_date.lte.${today})`)
    .order("assigned_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getNextDueSession failed", error);
    return null;
  }

  return data as NextDueSession | null;
}
