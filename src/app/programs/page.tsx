import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/TabBar";
import { ProgramsTabs } from "@/components/ProgramsTabs";

interface MyAssignmentRow {
  id: string;
  template_id: string;
  program_templates: { id: string; title: string } | null;
}

interface LibraryTemplateRow {
  id: string;
  title: string;
  description: string | null;
  program_template_tags: { tags: { id: string; name: string; slug: string } | null }[];
}

export default async function ProgramsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: myAssignments }, { data: libraryTemplates }, { data: tags }] = await Promise.all([
    supabase
      .from("program_assignments")
      .select("id, template_id, program_templates ( id, title )")
      .eq("client_id", user.id)
      .eq("status", "active"),
    supabase
      .from("program_templates")
      .select(
        "id, title, description, program_template_tags ( tags ( id, name, slug ) )"
      )
      .eq("visibility", "public_library"),
    supabase.from("tags").select("id, name, slug").order("name"),
  ]);

  const mine = ((myAssignments ?? []) as unknown as MyAssignmentRow[]).map((a) => ({
    id: a.program_templates?.id ?? a.template_id,
    title: a.program_templates?.title ?? "Untitled program",
    subtitle: "Your coach",
  }));

  const library = ((libraryTemplates ?? []) as unknown as LibraryTemplateRow[]).map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: "Home workout library",
    tags: (t.program_template_tags ?? [])
      .map((pt) => pt.tags?.name)
      .filter((name): name is string => Boolean(name)),
  }));

  return (
    <>
      <ProgramsTabs mine={mine} library={library} allTags={(tags ?? []).map((t) => t.name)} />
      <TabBar />
    </>
  );
}
