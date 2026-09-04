import { useEffect, useState, useCallback } from "react";
import type { PartnersData, ConfigData, MappingBody, RuleBody } from "@/lib/api";
import { api, ApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Plus } from "lucide-react";

const TRANSFORMS = ["none", "trim", "uppercase", "lowercase", "to_number", "date_iso"] as const;
const RULE_TYPES = ["required", "regex", "range", "enum", "max_length"] as const;
const CONFIG_TEMPLATE: Record<string, string> = {
  required: "{}",
  regex: '{ "pattern": "^[A-Z]{3}-[0-9]{4}$" }',
  range: '{ "min": 1, "max": 100 }',
  enum: '{ "allowed": ["low", "medium", "high"] }',
  max_length: '{ "max": 20 }',
};

type Note = { kind: "ok" | "err"; text: string } | null;

export function RulesAdminScreen({
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
  const [partnerId, setPartnerId] = useState<number>(partners[0]?.id ?? 0);
  const [config, setConfig] = useState<ConfigData | null>(null);

  // add-mapping form
  const [mSource, setMSource] = useState("");
  const [mTarget, setMTarget] = useState("");
  const [mTransform, setMTransform] = useState<string>("none");
  const [mRequired, setMRequired] = useState("no");
  const [mNote, setMNote] = useState<Note>(null);

  // add-rule form
  const [rField, setRField] = useState("");
  const [rType, setRType] = useState<string>("regex");
  const [rConfig, setRConfig] = useState<string>(CONFIG_TEMPLATE.regex);
  const [rMessage, setRMessage] = useState("");
  const [rNote, setRNote] = useState<Note>(null);

  const activePartner = partners.find((p) => p.id === partnerId);

  const load = useCallback(async () => {
    if (!partnerId) return;
    setConfig(await api.config(token, partnerId));
  }, [token, partnerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setRConfig(CONFIG_TEMPLATE[rType] ?? "{}");
  }, [rType]);

  async function addMapping() {
    setMNote(null);
    try {
      const body: MappingBody = {
        partner_id: partnerId,
        source_field: mSource,
        target_field: mTarget,
        transform: mTransform as MappingBody["transform"],
        required: mRequired === "yes",
      };
      await api.addMapping(token, body);
      setMNote({ kind: "ok", text: `Mapping ${mSource} → ${mTarget} saved.` });
      setMSource("");
      setMTarget("");
      await load();
      onDataChanged();
    } catch (e) {
      setMNote({ kind: "err", text: e instanceof ApiError ? `${e.status}: ${e.message}` : (e as Error).message });
    }
  }

  async function addRule() {
    setRNote(null);
    try {
      let cfg: unknown = {};
      try {
        cfg = JSON.parse(rConfig || "{}");
      } catch {
        throw new Error("Rule config is not valid JSON.");
      }
      const body: RuleBody = {
        partner_id: partnerId,
        version: activePartner?.active_rule_version ?? 1,
        target_field: rField,
        rule_type: rType as RuleBody["rule_type"],
        rule_config: cfg,
        reject_message: rMessage,
        active: true,
      };
      await api.addRule(token, body);
      setRNote({ kind: "ok", text: `Rule added at version ${body.version}. Reprocess a record to see it take effect.` });
      setRField("");
      setRMessage("");
      await load();
      onDataChanged();
    } catch (e) {
      setRNote({ kind: "err", text: e instanceof ApiError ? `${e.status}: ${e.message}` : (e as Error).message });
    }
  }

  const noteClass = (n: Note) => (n?.kind === "ok" ? "text-emerald-400" : "text-red-400");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Partner</Label>
          <Select value={String(partnerId)} onValueChange={(v) => setPartnerId(Number(v))}>
            <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              {partners.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!isAdmin ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
            <ShieldAlert className="size-4" />
            You are a viewer. Writes are enforced at the API layer, so a save returns 403.
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Mappings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Field mappings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Canonical</TableHead>
                  <TableHead>Transform</TableHead>
                  <TableHead className="text-right">Req</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(config?.mappings ?? []).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.source_field}</TableCell>
                    <TableCell className="font-mono text-xs">{m.target_field}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-[11px]">{m.transform}</Badge></TableCell>
                    <TableCell className="text-right text-muted-foreground">{m.required ? "yes" : "no"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Source field</Label>
                <Input value={mSource} onChange={(e) => setMSource(e.target.value)} placeholder="e.g. cust_ref" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Canonical field</Label>
                <Input value={mTarget} onChange={(e) => setMTarget(e.target.value)} placeholder="e.g. order_ref" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transform</Label>
                <Select value={mTransform} onValueChange={setMTransform}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRANSFORMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Required</Label>
                <Select value={mRequired} onValueChange={setMRequired}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">no</SelectItem>
                    <SelectItem value="yes">yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={addMapping} disabled={!mSource || !mTarget} className="gap-2" size="sm">
              <Plus className="size-4" /> Add mapping
            </Button>
            {mNote ? <p className={"text-sm " + noteClass(mNote)}>{mNote.text}</p> : null}
          </CardContent>
        </Card>

        {/* Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Validation rules</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">v</TableHead>
                  <TableHead>Field</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Config</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(config?.rules ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{r.version}</TableCell>
                    <TableCell className="font-mono text-xs">{r.target_field}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-[11px]">{r.rule_type}</Badge></TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{JSON.stringify(r.rule_config)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Canonical field</Label>
                <Input value={rField} onChange={(e) => setRField(e.target.value)} placeholder="e.g. quantity" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Rule type</Label>
                <Select value={rType} onValueChange={setRType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rule config (JSON)</Label>
              <Textarea value={rConfig} onChange={(e) => setRConfig(e.target.value)} rows={2} className="font-mono text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reject message</Label>
              <Input value={rMessage} onChange={(e) => setRMessage(e.target.value)} placeholder="Shown when this rule fails" />
            </div>
            <Button onClick={addRule} disabled={!rField || !rMessage} className="gap-2" size="sm">
              <Plus className="size-4" /> Add rule (v{activePartner?.active_rule_version ?? 1})
            </Button>
            {rNote ? <p className={"text-sm " + noteClass(rNote)}>{rNote.text}</p> : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
