"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Users, Video, Search } from "lucide-react";
import { ProgramCard } from "@/components/ProgramCard";
import { TopBar } from "@/components/TopBar";

interface Program {
  id: string;
  title: string;
  subtitle: string;
  tags?: string[];
}

export function ProgramsTabs({
  mine,
  library,
  allTags,
}: {
  mine: Program[];
  library: Program[];
  allTags: string[];
}) {
  const initialTab = useSearchParams().get("tab") === "library" ? "library" : "mine";
  const [tab, setTab] = useState<"mine" | "library">(initialTab);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filteredLibrary = useMemo(() => {
    return library.filter((p) => {
      const matchesQuery = query.trim().length === 0 || p.title.toLowerCase().includes(query.toLowerCase());
      const matchesTag = !activeTag || p.tags?.includes(activeTag);
      return matchesQuery && matchesTag;
    });
  }, [library, query, activeTag]);

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="Programs" />
      <div className="flex gap-2 px-5 pb-3.5">
        {(
          [
            ["mine", "My programs", Users],
            ["library", "Library", Video],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full border py-2.5 text-xs font-bold ${
              tab === id ? "border-ink bg-ink text-chalk" : "border-border text-slate"
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === "library" && (
        <div className="px-5 pb-3">
          <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <Search size={14} className="text-slate" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the library"
              className="w-full text-sm text-ink outline-none"
            />
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    activeTag === tag ? "border-primary bg-primary text-white" : "border-border text-slate"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5">
        {(tab === "mine" ? mine : filteredLibrary).map((p) => (
          <ProgramCard key={p.id} id={p.id} title={p.title} subtitle={p.subtitle} />
        ))}
        {tab === "mine" && mine.length === 0 && (
          <p className="mt-6 text-center text-sm text-slate">
            No active programs yet — ask your coach to assign one, or browse the library.
          </p>
        )}
      </div>
    </div>
  );
}
