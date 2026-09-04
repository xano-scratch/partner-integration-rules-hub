import type { PartnersData } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRight } from "lucide-react";

/**
 * The browsable overview: one card per partner with its canonical target, its
 * mapping and active-rule counts, and the mappings that reshape its raw fields into
 * the shared canonical shape. Two partners, two different raw shapes, one target.
 */
export function PartnersScreen({ data }: { data: PartnersData }) {
  const partners = data.partners ?? [];
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {partners.map((p) => {
        const mappings = (data.mappings ?? []).filter((m) => m.partner_id === p.id);
        const activeRules = (data.rules ?? []).filter((r) => r.partner_id === p.id && r.version === p.active_rule_version);
        return (
          <Card key={p.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {p.name}
                  <Badge variant="outline" className="font-mono text-xs">
                    {p.code}
                  </Badge>
                </CardTitle>
                <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  canonical target
                  <ArrowRight className="size-3.5" />
                  <span className="font-mono text-foreground">{p.canonical_target}</span>
                </span>
                <span>{mappings.length} mappings</span>
                <span>
                  {activeRules.length} active rules <span className="opacity-60">(v{p.active_rule_version})</span>
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source field</TableHead>
                    <TableHead>Canonical field</TableHead>
                    <TableHead>Transform</TableHead>
                    <TableHead className="text-right">Required</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.source_field}</TableCell>
                      <TableCell className="font-mono text-xs text-foreground">{m.target_field}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[11px]">
                          {m.transform}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{m.required ? "yes" : "no"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
