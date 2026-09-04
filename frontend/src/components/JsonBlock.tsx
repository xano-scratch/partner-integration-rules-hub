import { pretty } from "@/lib/format";

/** A labeled, scrollable JSON panel — used to show raw vs canonical payloads. */
export function JsonBlock({ label, data, tone }: { label: string; data: unknown; tone?: "raw" | "canonical" }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <span
          className={
            "size-2 rounded-full " + (tone === "canonical" ? "bg-primary" : "bg-muted-foreground/50")
          }
        />
        {label}
      </div>
      <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
        {pretty(data)}
      </pre>
    </div>
  );
}
