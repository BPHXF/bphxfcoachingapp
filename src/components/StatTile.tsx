import type { ReactNode } from "react";

export function StatTile({ icon, value, label }: { icon?: ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-card px-3.5 py-3">
      <div className="flex items-start justify-between">
        {icon}
        <div className="tabular text-xl font-bold text-ink">{value}</div>
      </div>
      <div className="mt-1 text-[11px] text-slate">{label}</div>
    </div>
  );
}
