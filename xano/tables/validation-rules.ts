import { table, f } from "@xanots/sdk";
import { partners } from "./partners.js";

/**
 * One versioned validation rule for a partner. `rule_config` holds the per-type
 * settings: { pattern } for regex, { min, max } for range, { allowed:[...] } for
 * enum, { max } for max_length. The hub runs the rules whose `version` matches the
 * partner's active_rule_version and whose `active` flag is set.
 */
export const validationRules = table({
  name: "validation_rules",
  schema: {
    partner_id: f.tableRef(partners, { required: true }),
    version: f.int({ required: true, default: 1 }),
    target_field: f.text({ required: true }),
    rule_type: f.enum(["required", "regex", "range", "enum", "max_length"], { required: true }),
    rule_config: f.json(),
    reject_message: f.text({ required: true }),
    active: f.bool({ required: true, default: true }),
  },
  index: [{ type: "btree", fields: [{ name: "partner_id" }] }],
});
