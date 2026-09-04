export function fmtDate(ms?: number | null): string {
  if (!ms) return "—";
  try {
    return new Date(Number(ms)).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(ms);
  }
}

export function pretty(v: unknown): string {
  try {
    return JSON.stringify(v ?? {}, null, 2);
  } catch {
    return String(v);
  }
}
