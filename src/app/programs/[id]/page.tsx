import { redirect } from "next/navigation";
import { Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/TopBar";
import { startProgram } from "@/lib/actions/startProgram";
import { CommentsSection } from "@/components/CommentsSection";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: template } = await supabase
    .from("program_templates")
    .select(
      `id, title, description, visibility,
       program_template_weeks ( week_number,
         program_template_sessions ( title,
           program_template_exercises ( target_sets, target_reps, target_weight, target_weight_unit,
             exercises ( name )
           )
         )
       )`
    )
    .eq("id", id)
    .single();

  if (!template) redirect("/programs");

  const isLibrary = template.visibility === "public_library";

  const { count: completionCount } = isLibrary
    ? await supabase
        .from("completions")
        .select("id", { count: "exact", head: true })
        .eq("template_id", id)
    : { count: null };

  const firstWeek = template.program_template_weeks?.[0];
  const previewSession = firstWeek?.program_template_sessions?.[0];

  async function handleStart() {
    "use server";
    await startProgram(id);
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Program" backHref="/programs" />
      <div className="flex-1 overflow-y-auto px-5">
        <div className="mb-3.5 flex h-[140px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#2B2D2C] to-ink">
          <Play size={30} className="fill-primary text-primary" />
        </div>
        <h2 className="m-0 mb-1 text-xl font-bold text-ink">{template.title}</h2>
        <p className="m-0 mb-1 text-[13px] text-slate">{template.description}</p>
        {isLibrary && (
          <p className="tabular m-0 mb-4.5 text-[13px] text-slate">
            {completionCount ?? 0} completions
          </p>
        )}

        <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate">
          Week 1 preview
        </p>
        {previewSession?.program_template_exercises?.map((ex, i: number) => (
          <div key={i} className="flex items-center justify-between border-b border-border py-3">
            <span className="text-sm font-bold text-ink">{ex.exercises?.name}</span>
            <span className="tabular text-xs text-slate">
              {ex.target_sets} × {ex.target_reps}
              {ex.target_weight ? ` @ ${ex.target_weight}${ex.target_weight_unit}` : ""}
            </span>
          </div>
        ))}

        {isLibrary && <CommentsSection templateId={id} currentUserId={user.id} />}
      </div>
      <div className="p-5">
        <form action={handleStart}>
          <button
            type="submit"
            className="w-full rounded-[10px] bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-white"
          >
            Start workout
          </button>
        </form>
      </div>
    </div>
  );
}
