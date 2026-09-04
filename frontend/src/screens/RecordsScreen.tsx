import { useEffect, useState, useCallback } from "react";
import type { PartnersData, RecordRow, RecordDetail } from "@/lib/api";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { JsonBlock } from "@/components/JsonBlock";
import { EventTrail } from "@/components/EventTrail";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate } from "@/lib/format";
import { RefreshCw, Target } from "lucide-react";

export function RecordsScreen({
  token,
  isAdmin,
  data,
  onDataChanged,
}: {
  token: string;
  isAdmin: boolean;
  data: PartnersData;
  onDataChanged: () => void;
}) {
  const partners = data.partners ?? [];
  const [partnerCode, setPartnerCode] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<RecordDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // db.get binds row-or-null, so `record` is nullable in the inferred type.
  const rec = detail?.record ?? null;

  const load = useCallback(async () => {
    try {
      const list = await api.records(token, partnerCode === "all" ? "" : partnerCode, status === "all" ? "" : status);
      setRows(list ?? []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token, partnerCode, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(id: number) {
    setSelected(id);
    setError(null);
    setDetail(null);
    try {
      setDetail(await api.record(token, id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function reprocess() {
    if (!rec) return;
    const rid = rec.id;
    setBusy(true);
    setError(null);
    try {
      await api.reprocess(token, rid);
      await open(rid);
      await load();
      onDataChanged();
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const partnerName = (pid: number) => partners.find((p) => p.id === pid)?.code ?? pid;

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <CardTitle className="text-lg">Inbound records</CardTitle>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Partner</Label>
                <Select value={partnerCode} onValueChange={setPartnerCode}>
                  <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All partners</SelectItem>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.code}>{p.code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="accepted">accepted</SelectItem>
                    <SelectItem value="rejected">rejected</SelectItem>
                    <SelectItem value="pending">pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No records.</TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow
                    key={r.id}
                    onClick={() => open(r.id)}
                    data-selected={selected === r.id}
                    className="cursor-pointer data-[selected=true]:bg-muted/60"
                  >
                    <TableCell className="font-mono">{r.id}</TableCell>
                    <TableCell className="font-mono text-xs">{partnerName(r.partner_id)}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="max-w-[22rem] truncate text-sm text-muted-foreground">{r.reject_reason || "—"}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && detail && rec ? (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                Record #{rec.id}
                <span className="font-mono text-sm font-normal text-muted-foreground">{detail.partner?.name}</span>
                <StatusBadge status={rec.status} />
              </CardTitle>
              <Button variant="outline" size="sm" onClick={reprocess} disabled={busy} className="gap-2">
                <RefreshCw className={"size-4 " + (busy ? "animate-spin" : "")} /> Reprocess
              </Button>
            </div>
            {!isAdmin ? (
              <p className="text-xs text-muted-foreground">
                Reprocess is admin only. As a viewer, the API returns 403 (enforced server-side, not hidden in the UI).
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <JsonBlock label="Raw input" data={rec.raw_payload} tone="raw" />
              <JsonBlock label="Canonical" data={rec.normalized_payload} tone="canonical" />
            </div>

            {detail.fired_rule ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
                <Target className="mt-0.5 size-4 shrink-0 text-red-400" />
                <div>
                  <div className="font-medium text-red-400">
                    Rule that fired: {detail.fired_rule.rule_type} on{" "}
                    <span className="font-mono">{detail.fired_rule.target_field}</span>
                  </div>
                  <p className="text-muted-foreground">{rec.reject_reason}</p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Rules applied (v{rec.applied_version})
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Config</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(detail.applied_rules ?? []).map((r) => (
                      <TableRow key={r.id} data-fired={r.id === rec.rule_fired_id} className="data-[fired=true]:bg-red-500/10">
                        <TableCell className="font-mono text-xs">{r.target_field}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-[11px]">{r.rule_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-muted-foreground">{JSON.stringify(r.rule_config)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div>
                <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Audit trail</div>
                <EventTrail items={detail.trail ?? []} />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
