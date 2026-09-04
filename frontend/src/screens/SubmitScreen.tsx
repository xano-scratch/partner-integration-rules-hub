import { useEffect, useMemo, useState } from "react";
import type { Decision, PartnersData, Partner } from "@/lib/api";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { JsonBlock } from "@/components/JsonBlock";
import { EventTrail } from "@/components/EventTrail";
import { StatusBadge } from "@/components/StatusBadge";
import { Send } from "lucide-react";

// Good example payloads for the seeded partners; a different partner gets a template
// built from its own source fields.
const EXAMPLES: Record<string, Record<string, unknown>> = {
  acme: { ref: "abc-1234", qty: "5", email: "OPS@ACME.IO", ship: "2026-03-01" },
  globex: { orderId: "GX-0001", count: "3", priority: "High" },
};

function exampleFor(partner: Partner | undefined, data: PartnersData): Record<string, unknown> {
  if (!partner) return {};
  if (EXAMPLES[partner.code]) return EXAMPLES[partner.code];
  const fields = (data.mappings ?? []).filter((m) => m.partner_id === partner.id);
  const obj: Record<string, unknown> = {};
  for (const m of fields) obj[m.source_field] = "";
  return obj;
}

export function SubmitScreen({ token, data }: { token: string; data: PartnersData }) {
  const partners = data.partners ?? [];
  const [code, setCode] = useState<string>(partners[0]?.code ?? "");
  const [text, setText] = useState<string>("");
  const [result, setResult] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const partner = useMemo(() => partners.find((p) => p.code === code), [partners, code]);

  useEffect(() => {
    setText(JSON.stringify(exampleFor(partner, data), null, 2));
    setResult(null);
    setError(null);
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error("The payload is not valid JSON.");
      }
      const decision = await api.ingest(token, { partner_code: code, payload });
      setResult(decision);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.status}: ${e.message}` : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Submit a raw payload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Partner</Label>
            <Select value={code} onValueChange={setCode}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pick a partner" />
              </SelectTrigger>
              <SelectContent>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.code}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Raw payload (this partner's field names)</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} className="font-mono text-xs" />
          </div>
          <Button onClick={submit} disabled={busy || !code} className="gap-2">
            <Send className="size-4" /> {busy ? "Processing…" : "Normalize and validate"}
          </Button>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-lg">
            Decision
            {result ? <StatusBadge status={result.status} /> : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Submit a payload to see it normalized to the canonical shape and decided against this partner's rules.
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <JsonBlock label="Raw input" data={result.raw_payload} tone="raw" />
                <JsonBlock label={`Canonical (${result.canonical_target})`} data={result.normalized_payload} tone="canonical" />
              </div>
              {result.status === "rejected" ? (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm">
                  <div className="font-medium text-red-400">Rejected</div>
                  <p className="text-muted-foreground">{result.reject_reason}</p>
                  {result.rule_fired_id ? (
                    <p className="mt-1 text-xs text-muted-foreground">Rule that fired: #{result.rule_fired_id}</p>
                  ) : null}
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                  Accepted. Passed every rule in version {result.applied_version}.
                </div>
              )}
              <Separator />
              <div>
                <div className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Processing trail
                </div>
                <EventTrail items={result.events ?? []} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
