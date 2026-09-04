import { fmtDate } from "@/lib/format";
import { Info, TriangleAlert } from "lucide-react";

type TrailItem = { event?: string; detail?: string; level?: string; created_at?: number };

/** The per-step audit trail of a decision (shared by Submit and the record detail). */
export function EventTrail({ items }: { items: TrailItem[] }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">No events recorded.</p>;
  return (
    <ol className="relative space-y-3 border-l pl-5">
      {items.map((e, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[1.42rem] top-0.5 flex size-4 items-center justify-center rounded-full bg-background">
            {e.level === "warn" ? (
              <TriangleAlert className="size-4 text-amber-400" />
            ) : (
              <Info className="size-4 text-muted-foreground" />
            )}
          </span>
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-xs font-semibold">{e.event}</span>
            {e.created_at ? (
              <span className="text-[11px] text-muted-foreground">{fmtDate(e.created_at)}</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{e.detail}</p>
        </li>
      ))}
    </ol>
  );
}
