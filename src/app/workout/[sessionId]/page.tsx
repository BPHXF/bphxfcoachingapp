import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkoutRunner } from "@/components/WorkoutRunner";
import type { WeightUnit, BandIntensity, Equipment } from "@/lib/types";

interface WorkoutSessionData {
  id: string;
  title: string;
  assignment_exercises: {
    id: string;
    order_index: number;
    target_sets: number;
    target_reps: number;
    target_weight: number | null;
    target_weight_unit: WeightUnit;
    band_intensity: BandIntensity | null;
    equipment: Equipment | null;
    notes: string | null;
    video_provider: string | null;
    video_ref: string | null;
    exercises: { name: string } | null;
  }[];
}

export default async function WorkoutPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: sessionRow } = await supabase
    .from("assignment_sessions")
    .select(
      `id, title,
       assignment_exercises (
         id, order_index, target_sets, target_reps, target_weight, target_weight_unit, band_intensity,
         equipment, notes,
         video_provider, video_ref,
         exercises ( name )
       )`
    )
    .eq("id", sessionId)
    .order("order_index", { referencedTable: "assignment_exercises", ascending: true })
    .single();

  const session = sessionRow as WorkoutSessionData | null;
  if (!session) redirect("/");

  const { data: existingLogs } = await supabase
    .from("set_logs")
    .select("assignment_exercise_id, set_number, actual_reps, actual_weight, actual_band_intensity")
    .in(
      "assignment_exercise_id",
      (session.assignment_exercises ?? []).map((e) => e.id)
    );

  return (
    <WorkoutRunner
      sessionId={session.id}
      sessionTitle={session.title}
      clientId={user.id}
      weightUnit="lb"
      exercises={(session.assignment_exercises ?? []).map((e) => ({
        id: e.id,
        name: e.exercises?.name ?? "Exercise",
        sets: e.target_sets,
        reps: e.target_reps,
        weight: e.target_weight ?? 0,
        weightUnit: e.target_weight_unit,
        bandIntensity: e.band_intensity ?? null,
        equipment: e.equipment ?? null,
        notes: e.notes ?? null,
      }))}
      existingLogs={existingLogs ?? []}
    />
  );
}
