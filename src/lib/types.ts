// Shared types mirroring supabase/schema.sql. These are hand-written for
// Phase 1; once the project is deployed, regenerate with
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
// and switch call sites over to the generated types for full accuracy.

export type UserRole = "trainer" | "client";
export type ProgramVisibility = "private_1on1" | "public_library";
export type VideoProvider = "cloudflare_stream" | "youtube";
// "band" = resistance band exercises, logged as Light/Moderate/Heavy instead
// of a numeric weight (see BandIntensity below).
export type WeightUnit = "lb" | "kg" | "band";
export type BandIntensity = "L" | "M" | "H";
// What tool/equipment a prescription uses, independent of the movement
// itself -- lets the same exercise (e.g. "Row") be prescribed with
// different equipment across different programs.
export type Equipment = "trx" | "cable" | "bodyweight" | "dumbbell" | "barbell" | "machine" | "band" | "kettlebell" | "other";
export type AssignmentStatus = "active" | "completed" | "paused";
export type SessionStatus = "pending" | "completed" | "skipped";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  avatar_url: string | null;
  trainer_id: string | null;
  weight_unit_preference: WeightUnit;
  created_at: string;
}

export interface Exercise {
  id: string;
  created_by: string;
  name: string;
  default_video_provider: VideoProvider | null;
  default_video_ref: string | null;
}

export interface ProgramTemplate {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  visibility: ProgramVisibility;
  video_provider: VideoProvider | null;
  video_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentExercise {
  id: string;
  assignment_session_id: string;
  exercise_id: string;
  exercise?: Exercise;
  order_index: number;
  target_sets: number;
  target_reps: number;
  target_weight: number;
  target_weight_unit: WeightUnit;
  // Set only when target_weight_unit is "band" (see supabase/rls_fix... /
  // band migration's check constraint, which enforces this pairing).
  band_intensity: BandIntensity | null;
  equipment: Equipment | null;
  // Trainer's exact prescription text, preserved verbatim from source
  // programs (e.g. a paper/PDF program) alongside the numeric defaults.
  notes: string | null;
  video_provider: VideoProvider | null;
  video_ref: string | null;
}

export interface AssignmentSession {
  id: string;
  assignment_week_id: string;
  title: string;
  assigned_date: string;
  rescheduled_date: string | null;
  status: SessionStatus;
  completed_at: string | null;
  exercises?: AssignmentExercise[];
}

export interface ProgramAssignment {
  id: string;
  template_id: string;
  template?: ProgramTemplate;
  client_id: string;
  trainer_id: string;
  cycle_number: number;
  start_date: string;
  status: AssignmentStatus;
}

export interface SetLog {
  id: string;
  assignment_exercise_id: string;
  client_id: string;
  set_number: number;
  actual_reps: number;
  actual_weight: number;
  actual_weight_unit: WeightUnit;
  // Set only when actual_weight_unit is "band".
  actual_band_intensity: BandIntensity | null;
  client_logged_at: string;
}

export interface Comment {
  id: string;
  template_id: string;
  client_id: string;
  body: string;
  created_at: string;
}
