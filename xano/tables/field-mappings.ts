import { table, f } from "@xanots/sdk";
import { partners } from "./partners.js";

/**
 * How one partner's raw field names and shapes map to the canonical target shape.
 * The rule engine reads these to build the normalized payload before it validates.
 */
export const fieldMappings = table({
  name: "field_mappings",
  schema: {
    partner_id: f.tableRef(partners, { required: true }),
    source_field: f.text({ required: true }),
    target_field: f.text({ required: true }),
    transform: f.enum(["none", "trim", "uppercase", "lowercase", "to_number", "date_iso"], {
      required: true,
      default: "none",
    }),
    required: f.bool({ required: true, default: false }),
  },
  index: [{ type: "btree", fields: [{ name: "partner_id" }] }],
});
