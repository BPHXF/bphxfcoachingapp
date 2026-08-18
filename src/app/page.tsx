import Link from "next/link";
import { Flame, ClipboardList, Play, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { StatTile } from "@/components/StatTile";
import { getNextDueSession } from "@/lib/data/schedule";
import { getCurrentStreak } from "@/lib/data/streak";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { count: activeCount } = await supabase
    .from("program_assignments")
    .select("id", { count: "exact", head: true })
    .eq("client_id", user.id)
    .eq("status", "active");

  const [nextSession, streak] = await Promise.all([
    getNextDueSession(supabase, user.id),
    getCurrentStreak(supabase, user.id),
  ]);

  // Supabase's typed join shape is nested; narrow it defensively here since
  // we're on hand-written types for Phase 1 (see lib/types.ts note).
  const assignment = nextSession?.assignment_weeks?.program_assignments;
  const programTitle = assignment?.program_templates?.title ?? "No workout scheduled";

  return (
    <>
      <div className="flex-1 px-5 pt-4.5">
        <p className="m-0 mb-0.5 text-[13px] text-slate">Welcome back</p>
        <h1 className="m-0 mb-4.5 text-2xl font-bold text-ink">Ready to train?</h1>

        <div className="mb-4.5 flex gap-2.5">
          <StatTile icon={<Flame size={16} className="text-primary" />} value={streak} label="Streak" />
          <StatTile icon={<ClipboardList size={16} />} value={activeCount ?? 0} label="Active programs" />
        </div>

        <div className="mb-3.5 rounded-2xl bg-ink p-4.5">
          <p className="m-0 mb-1.5 text-[11px] uppercase tracking-wide text-[#C9C7C0]">
            {nextSession ? "Today's workout" : "Nothing due"}
          </p>
          <h2 className="m-0 mb-1 text-[19px] font-bold text-chalk">{programTitle}</h2>
          <p className="m-0 mb-4 text-xs text-[#9C9A93]">
            {nextSession ? nextSession.title : "Check your programs to get started"}
          </p>
          {nextSession && (
            <Link
              href={`/workout/${nextSession.id}`}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary py-3 text-sm font-bold uppercase tracking-wide text-white"
            >
              <Play size={16} fill="currentColor" /> Start workout
            </Link>
          )}
        </div>

        <Link
          href="/programs?tab=library"
          className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-3.5 py-3.5"
        >
          <span className="text-sm font-bold text-ink">Browse home workout library</span>
          <ChevronRight size={16} className="text-slate" />
        </Link>
      </div>
      <TabBar />
    </>
  );
}
