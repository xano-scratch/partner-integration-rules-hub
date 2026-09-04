import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

/** One consistent badge for a record's decision status across every screen. */
export function StatusBadge({ status }: { status?: string }) {
  if (status === "accepted") {
    return (
      <Badge className="gap-1 border-transparent bg-emerald-500/15 text-emerald-400">
        <CheckCircle2 className="size-3.5" /> accepted
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="gap-1 border-transparent bg-red-500/15 text-red-400">
        <XCircle className="size-3.5" /> rejected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="size-3.5" /> {status || "pending"}
    </Badge>
  );
}
