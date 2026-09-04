import { defineFunction, input, s, ref, inp, c, expr, col } from "@xanots/sdk";
import { partners } from "../tables/partners.js";
import { fieldMappings } from "../tables/field-mappings.js";
import { validationRules } from "../tables/validation-rules.js";
import { inboundRecords } from "../tables/inbound-records.js";
import { processingLog } from "../tables/processing-log.js";

/**
 * The one governed job, and the ONE write path.
 *
 * Given a partner and a raw payload, it loads that partner's field mappings and its
 * active validation rules, normalizes the raw payload to the canonical shape, then
 * validates it in rule order. It persists the decision on inbound_records and writes
 * one processing_log row per step. Ingest, reprocess, and the seed all funnel through
 * here, so a decision can never differ by caller.
 *
 * The normalize + validate logic is a JavaScript lambda: the work loops over a
 * VARIABLE, table-stored set of mappings and rules, which the typed statement surface
 * cannot express. Everything else (the reads, the writes, the log) stays typed.
 */
export const processInbound = defineFunction({
  name: "process_inbound",
  input: {
    partner_id: input.int({ required: true }),
    raw_payload: input.json({ required: true }),
    // > 0 re-runs an existing record (reprocess); 0 adds a new one (ingest / seed).
    existing_record_id: input.int({ default: 0 }),
  },
  stack: [
    s.db.get({ table: partners, fieldName: "id", fieldValue: inp("partner_id"), as: "partner" }),
    s.precondition({
      expr: expr(ref("partner", { safe: true }), "!=", c.null()),
      error: c.text("Unknown partner."),
      error_type: "notfound",
    }),
    s.db.query({
      table: fieldMappings,
      where: expr(col("partner_id"), "=", inp("partner_id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "mappings",
    }),
    s.db.query({
      table: validationRules,
      where: [
        expr(col("partner_id"), "=", inp("partner_id")),
        expr(col("version"), "=", ref("partner.active_rule_version")),
        expr(col("active"), "=", c.bool(true)),
      ],
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "rules",
    }),

    // The rule engine: normalize against the mappings, then validate against the rules.
    s.lambda({
      as: "engine",
      code: ({ $input, $var }) => {
        const raw: Record<string, any> =
          $input.raw_payload && typeof $input.raw_payload === "object" ? $input.raw_payload : {};
        const mappings: any[] = Array.isArray($var.mappings) ? $var.mappings : [];
        const rules: any[] = Array.isArray($var.rules) ? $var.rules : [];
        const partner: any = $var.partner || {};

        const parseCfg = (cfg: any): Record<string, any> => {
          if (cfg == null) return {};
          if (typeof cfg === "object") return cfg;
          try {
            return JSON.parse(cfg);
          } catch (e) {
            return {};
          }
        };
        const present = (v: any) => v !== undefined && v !== null && v !== "";

        const events = [];
        events.push({
          event: "received",
          level: "info",
          detail: "Received raw payload with " + Object.keys(raw).length + " field(s).",
        });

        // 1) Normalize to the canonical shape via this partner's mappings.
        const normalized: Record<string, any> = {};
        const missingRequired: string[] = [];
        for (const m of mappings) {
          let v = raw[m.source_field];
          if (present(v)) {
            const t = m.transform || "none";
            if (t === "trim") v = String(v).trim();
            else if (t === "uppercase") v = String(v).trim().toUpperCase();
            else if (t === "lowercase") v = String(v).trim().toLowerCase();
            else if (t === "to_number") {
              const n = Number(v);
              if (Number.isFinite(n)) v = n;
            } else if (t === "date_iso") {
              const d = new Date(v);
              if (!isNaN(d.getTime())) v = d.toISOString().slice(0, 10);
            }
            normalized[m.target_field] = v;
          } else if (m.required) {
            missingRequired.push(m.target_field);
          }
        }
        events.push({
          event: "normalized",
          level: "info",
          detail:
            "Mapped " +
            Object.keys(normalized).length +
            " field(s) to the canonical shape (" +
            (partner.canonical_target || "record") +
            ").",
        });

        // 2) Validate the canonical shape against the active rules, in order.
        let status = "accepted";
        let reject_reason = "";
        let rule_fired_id = 0;

        if (missingRequired.length) {
          status = "rejected";
          reject_reason = "Missing required field(s): " + missingRequired.join(", ") + ".";
          events.push({ event: "rule_failed", level: "warn", detail: reject_reason });
        } else {
          for (const r of rules) {
            const val = normalized[r.target_field];
            const cfg = parseCfg(r.rule_config);
            const has = present(val);
            let ok = true;
            try {
              if (r.rule_type === "required") ok = has;
              else if (r.rule_type === "regex") ok = has ? new RegExp(String(cfg.pattern)).test(String(val)) : false;
              else if (r.rule_type === "range") {
                const n = Number(val);
                ok =
                  has &&
                  Number.isFinite(n) &&
                  (cfg.min == null || n >= Number(cfg.min)) &&
                  (cfg.max == null || n <= Number(cfg.max));
              } else if (r.rule_type === "enum")
                ok = has && Array.isArray(cfg.allowed) && cfg.allowed.map(String).indexOf(String(val)) !== -1;
              else if (r.rule_type === "max_length") ok = !has || String(val).length <= Number(cfg.max);
            } catch (e) {
              ok = false;
            }

            if (ok) {
              events.push({
                event: "rule_passed",
                level: "info",
                detail: "Passed " + r.rule_type + " on " + r.target_field + ".",
              });
            } else {
              status = "rejected";
              reject_reason = r.reject_message || "Failed " + r.rule_type + " on " + r.target_field + ".";
              rule_fired_id = r.id || 0;
              events.push({
                event: "rule_failed",
                level: "warn",
                detail: "Failed " + r.rule_type + " on " + r.target_field + ": " + reject_reason,
              });
              break;
            }
          }
        }

        events.push({
          event: status,
          level: status === "accepted" ? "info" : "warn",
          detail: status === "accepted" ? "Accepted and normalized." : "Rejected: " + reject_reason,
        });

        return {
          normalized,
          status,
          reject_reason,
          rule_fired_id,
          applied_version: Number(partner.active_rule_version || 0),
          events,
        };
      },
    }),

    // Persist the decision: edit the existing record on reprocess, else add a new one.
    s.conditional({
      when: expr(inp("existing_record_id"), ">", c.int(0)),
      then: [
        // Reprocess: clear the old trail so the record shows only the current decision.
        s.db.bulk.delete({
          table: processingLog,
          where: expr(col("inbound_record_id"), "=", inp("existing_record_id")),
        }),
        s.db.edit({
          table: inboundRecords,
          fieldName: "id",
          fieldValue: inp("existing_record_id"),
          row: {
            partner_id: inp("partner_id"),
            raw_payload: inp("raw_payload"),
            normalized_payload: ref("engine.normalized"),
            status: ref("engine.status"),
            reject_reason: ref("engine.reject_reason"),
            rule_fired_id: ref("engine.rule_fired_id"),
            applied_version: ref("engine.applied_version"),
          },
          as: "rec",
        }),
      ],
      else: [
        s.db.add({
          table: inboundRecords,
          row: {
            partner_id: inp("partner_id"),
            raw_payload: inp("raw_payload"),
            normalized_payload: ref("engine.normalized"),
            status: ref("engine.status"),
            reject_reason: ref("engine.reject_reason"),
            rule_fired_id: ref("engine.rule_fired_id"),
            applied_version: ref("engine.applied_version"),
          },
          as: "rec",
        }),
      ],
    }),

    // Write the per-step audit trail (one processing_log row per event).
    s.lambda({
      as: "log_rows",
      code: ({ $input, $var }) => {
        const events: any[] = $var.engine && Array.isArray($var.engine.events) ? $var.engine.events : [];
        const rid = $var.rec ? $var.rec.id : 0;
        const pid = $input.partner_id;
        return events.map((e: any) => ({
          partner_id: pid,
          inbound_record_id: rid,
          event: e.event,
          detail: e.detail,
          level: e.level,
        }));
      },
    }),
    s.db.bulk.add({ table: processingLog, items: ref("log_rows") }),
  ],
  response: {
    record_id: ref("rec.id"),
    partner_id: inp("partner_id"),
    partner_code: ref("partner.code"),
    partner_name: ref("partner.name"),
    canonical_target: ref("partner.canonical_target"),
    status: ref("engine.status"),
    reject_reason: ref("engine.reject_reason"),
    rule_fired_id: ref("engine.rule_fired_id"),
    applied_version: ref("engine.applied_version"),
    raw_payload: inp("raw_payload"),
    normalized_payload: ref("engine.normalized"),
    events: ref("engine.events"),
  },
});
