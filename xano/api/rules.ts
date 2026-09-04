import { query, input, s, ref, inp, auth } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { validationRules } from "../tables/validation-rules.js";
import { requireAdmin } from "../functions/require-admin.js";

/**
 * Add a validation rule to a partner's rule set. Admin only. Add a rule at the
 * partner's active version, then reprocess a record to watch the new rule take
 * effect (the demo's "governed logic changes in one place" moment).
 *
 * `rule_config` shape by type: { pattern } regex · { min, max } range ·
 * { allowed:[...] } enum · { max } max_length.
 */
export const rulesQuery = query({
  name: "rules",
  verb: "POST",
  apiGroup: hub,
  auth: users,
  input: {
    partner_id: input.int({ required: true }),
    version: input.int({ default: 1 }),
    target_field: input.text({ required: true }),
    rule_type: input.enum(["required", "regex", "range", "enum", "max_length"], { required: true }),
    rule_config: input.json(),
    reject_message: input.text({ required: true }),
    active: input.bool({ default: true }),
  },
  stack: [
    s.function.run({ fn: requireAdmin, input: { caller_id: auth("id") }, as: "admin" }),
    s.db.add({
      table: validationRules,
      row: {
        partner_id: inp("partner_id"),
        version: inp("version"),
        target_field: inp("target_field"),
        rule_type: inp("rule_type"),
        rule_config: inp("rule_config"),
        reject_message: inp("reject_message"),
        active: inp("active"),
      },
      as: "rule",
    }),
  ],
  response: ref("rule"),
});
