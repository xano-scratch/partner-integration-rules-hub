import { table, f } from "@xanots/sdk";
import { partners } from "./partners.js";
import { validationRules } from "./validation-rules.js";

/**
 * One inbound record and the decision the hub reached on it. `normalized_payload`
 * is the canonical shape built from the partner's mappings; on a reject,
 * `rule_fired_id` points at the exact rule that failed (0 when none fired).
 */
export const inboundRecords = table({
  name: "inbound_records",
  schema: {
    partner_id: f.tableRef(partners, { required: true }),
    raw_payload: f.json(),
    normalized_payload: f.json(),
    status: f.enum(["pending", "accepted", "rejected"], { required: true, default: "pending" }),
    reject_reason: f.text({ required: true, default: "" }),
    // Optional FK to the rule that fired: 0 sentinel (never nullable) so a field-match
    // read binds null on "none" instead of 400ing (see llms/fields.md optional-FK note).
    rule_fired_id: f.tableRef(validationRules, { required: true, default: 0 }),
    applied_version: f.int({ required: true, default: 0 }),
  },
  index: [{ type: "btree", fields: [{ name: "partner_id" }] }],
});
