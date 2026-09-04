import { query, input, s, ref, inp, c, auth, expr } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { fieldMappings } from "../tables/field-mappings.js";
import { requireAdmin } from "../functions/require-admin.js";

/**
 * Create or update a partner's field mapping. Admin only: the require_admin guard
 * runs first and throws 403 for a viewer, at the API layer.
 */
export const mappingsQuery = query({
  name: "mappings",
  verb: "POST",
  apiGroup: hub,
  auth: users,
  input: {
    partner_id: input.int({ required: true }),
    source_field: input.text({ required: true }),
    target_field: input.text({ required: true }),
    transform: input.enum(["none", "trim", "uppercase", "lowercase", "to_number", "date_iso"], { default: "none" }),
    required: input.bool({ default: false }),
    // > 0 updates an existing mapping; 0 creates a new one.
    mapping_id: input.int({ default: 0 }),
  },
  stack: [
    s.function.run({ fn: requireAdmin, input: { caller_id: auth("id") }, as: "admin" }),
    s.conditional({
      when: expr(inp("mapping_id"), ">", c.int(0)),
      then: [
        s.db.edit({
          table: fieldMappings,
          fieldName: "id",
          fieldValue: inp("mapping_id"),
          row: {
            partner_id: inp("partner_id"),
            source_field: inp("source_field"),
            target_field: inp("target_field"),
            transform: inp("transform"),
            required: inp("required"),
          },
          as: "mapping",
        }),
      ],
      else: [
        s.db.add({
          table: fieldMappings,
          row: {
            partner_id: inp("partner_id"),
            source_field: inp("source_field"),
            target_field: inp("target_field"),
            transform: inp("transform"),
            required: inp("required"),
          },
          as: "mapping",
        }),
      ],
    }),
  ],
  response: ref("mapping"),
});
