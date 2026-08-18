"use server";

import { createClient } from "@/lib/supabase/server";

interface SessionWithAssignmentWeek {
  id: string;
  assignment_weeks: { assignment_id: string } | null;
}

// Marks one day's session complete. If it was the last pending session in
// the whole assignment, also closes out the assignment and logs a
// `completions` row — Decision: total completions including repeats, so
// this is what the library program's completion count actually counts.
export async function completeSession(sessionId: string) {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("assignment_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("id, assignment_weeks ( assignment_id )")
    .single();

  const assignmentId = (session as SessionWithAssignmentWeek | null)?.assignment_weeks?.assignment_id;
  if (!assignmentId) return;

  const { count: remaining } = await supabase
    .from("assignment_sessions")
    .select("id, assignment_weeks!inner ( assignment_id )", { count: "exact", head: true })
    .eq("assignment_weeks.assignment_id", assignmentId)
    .eq("status", "pending");

  if ((remaining ?? 0) === 0) {
    const { data: assignment } = await supabase
      .from("program_assignments")
      .update({ status: "completed" })
      .eq("id", assignmentId)
      .select("id, template_id, client_id")
      .single();

    if (assignment) {
      await supabase.from("completions").insert({
        template_id: assignment.template_id,
        assignment_id: assignment.id,
        client_id: assignment.client_id,
      });
    }
  }
}
