"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Assigns a program_template to the signed-in client, copying its
// weeks/sessions/exercises into a new program_assignments run — per the
// decision that assignments are an independent copy, not a live reference,
// so later template edits never change a program already in progress.
// Works for both 1:1 programs and public library follow-alongs; the only
// difference is who trainer_id ends up being (the template's owner either
// way, per the "single trainer, dual entry path" decision).
export async function startProgram(templateId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: template, error: templateError } = await supabase
    .from("program_templates")
    .select("id, trainer_id, program_template_weeks ( id, week_number, program_template_sessions ( id, title, day_of_week, program_template_exercises ( * ) ) )")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    throw new Error(`Could not load program template: ${templateError?.message}`);
  }

  // Support restarting a library program — Decision: total completions
  // including repeats, so a repeat run is a new cycle, not an error.
  const { count: priorCycles } = await supabase
    .from("program_assignments")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId)
    .eq("client_id", user.id);

  const { data: assignment, error: assignmentError } = await supabase
    .from("program_assignments")
    .insert({
      template_id: templateId,
      client_id: user.id,
      trainer_id: template.trainer_id,
      cycle_number: (priorCycles ?? 0) + 1,
      start_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();

  if (assignmentError || !assignment) {
    throw new Error(`Could not create assignment: ${assignmentError?.message}`);
  }

  const startDate = new Date(assignment.start_date);
  let firstSessionId: string | null = null;

  for (const week of template.program_template_weeks ?? []) {
    const { data: assignmentWeek } = await supabase
      .from("assignment_weeks")
      .insert({
        assignment_id: assignment.id,
        template_week_id: week.id,
        week_number: week.week_number,
      })
      .select()
      .single();
    if (!assignmentWeek) continue;

    for (const session of week.program_template_sessions ?? []) {
      const assignedDate = computeAssignedDate(startDate, week.week_number, session.day_of_week);

      const { data: assignmentSession } = await supabase
        .from("assignment_sessions")
        .insert({
          assignment_week_id: assignmentWeek.id,
          template_session_id: session.id,
          title: session.title,
          assigned_date: assignedDate.toISOString().slice(0, 10),
        })
        .select()
        .single();
      if (!assignmentSession) continue;

      firstSessionId ??= assignmentSession.id;

      const exerciseRows = (session.program_template_exercises ?? []).map((ex: any) => ({
        assignment_session_id: assignmentSession.id,
        exercise_id: ex.exercise_id,
        order_index: ex.order_index,
        target_sets: ex.target_sets,
        target_reps: ex.target_reps,
        target_weight: ex.target_weight,
        target_weight_unit: ex.target_weight_unit,
        // Band intensity (L/M/H) only applies when target_weight_unit is
        // "band" (see the band-exercise migration); equipment and notes are
        // free-standing prescription metadata copied straight from the
        // template, same "copy at assignment time" rule as everything else.
        band_intensity: ex.band_intensity,
        equipment: ex.equipment,
        notes: ex.notes,
        video_provider: ex.video_provider,
        video_ref: ex.video_ref,
      }));
      if (exerciseRows.length > 0) {
        await supabase.from("assignment_exercises").insert(exerciseRows);
      }
    }
  }

  if (firstSessionId) redirect(`/workout/${firstSessionId}`);
  redirect("/programs");
}

// week_number is 1-indexed; day_of_week is 0 (Sun) - 6 (Sat), matching the
// template's default schedule. Decision: assigned by default, client can
// reschedule an individual session afterward.
function computeAssignedDate(startDate: Date, weekNumber: number, dayOfWeek: number | null): Date {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (weekNumber - 1) * 7);
  if (dayOfWeek !== null && dayOfWeek !== undefined) {
    const diff = (dayOfWeek - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + diff);
  }
  return date;
}
