import { useEffect, useState, useCallback } from "react";
import type { PartnersData, LogRow } from "@/lib/api";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fmtDate } from "@/lib/format";

export function LogScreen({ token, data }: { token: string; data: PartnersData }) {
  const partners = data.partners ?? [];
  const [partnerCode, setPartnerCode] = useState("all");
  const [rows, setRows] = useState<LogRow[]>([]);

  const load = useCallback(async () => {
    const list = await api.log(token, partnerCode === "all" ? "" : partnerCode);
    setRows(list ?? []);
  }, [token, partnerCode]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="text-lg">Processing log</CardTitle>
            <p className="pt-1 text-sm text-muted-foreground">
              The governance trail: one row per step of every decision, newest steps last.
            </p>
          </div>
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
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Record</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Detail</TableHead>
              <TableHead className="w-20">Level</TableHead>
              <TableHead className="text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No log entries.</TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{r.inbound_record_id}</TableCell>
                  <TableCell className="font-mono text-xs font-medium">{r.event}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.detail}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={
                        "text-[11px] " + (r.level === "warn" ? "bg-amber-500/15 text-amber-400" : "")
                      }
                    >
                      {r.level}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{fmtDate(r.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
