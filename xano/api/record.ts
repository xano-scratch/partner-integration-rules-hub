import { query, input, s, ref, inp, c, expr, col } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { partners } from "../tables/partners.js";
import { fieldMappings } from "../tables/field-mappings.js";
import { validationRules } from "../tables/validation-rules.js";
import { inboundRecords } from "../tables/inbound-records.js";
import { processingLog } from "../tables/processing-log.js";

/**
 * One record with everything that explains its decision: the raw and normalized
 * payloads, the partner, the mappings that applied, the rules at the version the
 * record was processed under, the exact rule that fired (null when none did), and
 * the per-step audit trail.
 */
export const recordQuery = query({
  name: "record/{id}",
  verb: "GET",
  apiGroup: hub,
  auth: users,
  input: {
    id: input.int({ required: true }),
  },
  stack: [
    s.db.get({ table: inboundRecords, fieldName: "id", fieldValue: inp("id"), as: "record" }),
    s.precondition({
      expr: expr(ref("record", { safe: true }), "!=", c.null()),
      error: c.text("Record not found."),
      error_type: "notfound",
    }),
    s.db.get({ table: partners, fieldName: "id", fieldValue: ref("record.partner_id"), as: "partner" }),
    s.db.query({
      table: fieldMappings,
      where: expr(col("partner_id"), "=", ref("record.partner_id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "mappings",
    }),
    s.db.query({
      table: validationRules,
      where: [
        expr(col("partner_id"), "=", ref("record.partner_id")),
        expr(col("version"), "=", ref("record.applied_version")),
      ],
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "applied_rules",
    }),
    // rule_fired_id is the 0 sentinel when nothing fired; a field-match get binds null
    // on 0 (never 400s) so `fired_rule` is null on an accepted record.
    s.db.get({ table: validationRules, fieldName: "id", fieldValue: ref("record.rule_fired_id"), as: "fired_rule" }),
    s.db.query({
      table: processingLog,
      where: expr(col("inbound_record_id"), "=", inp("id")),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "trail",
    }),
  ],
  response: {
    record: ref("record"),
    partner: ref("partner"),
    mappings: ref("mappings"),
    applied_rules: ref("applied_rules"),
    fired_rule: ref("fired_rule"),
    trail: ref("trail"),
  },
});
