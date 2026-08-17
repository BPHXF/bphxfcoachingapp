import Link from "next/link";
import { Video } from "lucide-react";

export function ProgramCard({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={`/programs/${id}`}
      className="mb-3 block w-full overflow-hidden rounded-2xl border border-border bg-card text-left"
    >
      <div className="flex h-[90px] items-center justify-center bg-gradient-to-br from-[#2B2D2C] to-ink">
        <Video size={22} className="text-primary" />
      </div>
      <div className="px-3.5 py-3">
        <h3 className="m-0 mb-1 text-[15px] font-bold text-ink">{title}</h3>
        <p className="m-0 text-xs text-slate">{subtitle}</p>
      </div>
    </Link>
  );
}
