import { table, f } from "@xanots/sdk";

/**
 * A trading partner. One partner owns many field mappings, validation rules, and
 * inbound records. `active_rule_version` selects which rule set the hub applies, so
 * a partner's rules can change without losing the old versions.
 */
export const partners = table({
  name: "partners",
  schema: {
    code: f.text({ required: true }),
    name: f.text({ required: true }),
    canonical_target: f.text({ required: true, default: "order" }),
    active_rule_version: f.int({ required: true, default: 1 }),
    status: f.enum(["active", "inactive"], { required: true, default: "active" }),
  },
  index: [{ type: "unique", fields: [{ name: "code" }] }],
});
