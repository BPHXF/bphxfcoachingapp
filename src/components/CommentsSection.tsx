"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Comment } from "@/lib/types";

// Decision: comments on public library programs only, owner-only delete
// (plus a user can remove their own), no reporting flow for v1. RLS in
// supabase/schema.sql is what actually enforces both of these — this
// component just calls insert/delete and lets Postgres reject anything it
// shouldn't allow.
export function CommentsSection({ templateId, currentUserId }: { templateId: string; currentUserId: string }) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("comments")
      .select("*")
      .eq("template_id", templateId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setComments(data ?? []);
        setLoading(false);
      });
  }, [templateId, supabase]);

  async function handlePost() {
    if (!body.trim()) return;
    const { data, error } = await supabase
      .from("comments")
      .insert({ template_id: templateId, client_id: currentUserId, body })
      .select()
      .single();
    if (!error && data) {
      setComments((prev) => [data, ...prev]);
      setBody("");
    }
  }

  async function handleDelete(commentId: string) {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate">Comments</p>
      <div className="mb-4 flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-ink"
        />
        <button
          onClick={handlePost}
          className="rounded-lg bg-ink px-3.5 py-2 text-xs font-bold uppercase text-chalk"
        >
          Post
        </button>
      </div>
      {!loading && comments.length === 0 && (
        <p className="text-sm text-slate">Be the first to comment.</p>
      )}
      {comments.map((c) => (
        <div key={c.id} className="mb-2.5 flex items-start justify-between gap-2">
          <p className="m-0 text-sm text-ink">{c.body}</p>
          <button onClick={() => handleDelete(c.id)} aria-label="Delete comment" className="text-slate">
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
