import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { TabBar } from "@/components/TabBar";
import { getCurrentStreak } from "@/lib/data/streak";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const [{ count: workoutsCompleted }, streak, { data: activeAssignment }] = await Promise.all([
    supabase
      .from("assignment_sessions")
      .select("id, assignment_weeks!inner ( program_assignments!inner ( client_id ) )", {
        count: "exact",
        head: true,
      })
      .eq("assignment_weeks.program_assignments.client_id", user.id)
      .eq("status", "completed"),
    getCurrentStreak(supabase, user.id),
    supabase
      .from("program_assignments")
      .select("program_templates ( title )")
      .eq("client_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle(),
  ]);

  const initials = (profile?.display_name ?? "?")
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const rows: [string, string | number][] = [
    ["Workouts completed", workoutsCompleted ?? 0],
    ["Current streak", `${streak} days`],
    ["Active program", activeAssignment?.program_templates?.title ?? "None"],
  ];

  return (
    <>
      <div className="flex-1 px-5">
        <TopBar title="Profile" />
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-ink text-lg font-bold text-chalk">
            {initials}
          </div>
          <div>
            <p className="m-0 text-[15px] font-bold text-ink">{profile?.display_name}</p>
            <p className="m-0 text-xs text-slate">
              {profile?.trainer_id ? "Client of your coach" : "Public library member"}
            </p>
          </div>
        </div>
        {rows.map(([label, val]) => (
          <div key={label} className="flex justify-between border-b border-border py-3">
            <span className="text-[13px] text-slate">{label}</span>
            <span className="tabular text-[13px] font-bold text-ink">{val}</span>
          </div>
        ))}
        <div className="mt-6">
          <SignOutButton />
        </div>
      </div>
      <TabBar />
    </>
  );
}
