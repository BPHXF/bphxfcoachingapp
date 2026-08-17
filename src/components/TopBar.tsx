import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function TopBar({ title, backHref }: { title: string; backHref?: string }) {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-4 pb-3">
      {backHref && (
        <Link
          href={backHref}
          aria-label="Back"
          className="p-1 text-ink"
        >
          <ChevronLeft size={22} />
        </Link>
      )}
      <h1 className="text-xl font-bold uppercase tracking-wide text-ink m-0">
        {title}
      </h1>
    </div>
  );
}
