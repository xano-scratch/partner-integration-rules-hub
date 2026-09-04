import { query, input, s, ref, inp, c, expr, col } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { partners } from "../tables/partners.js";
import { fieldMappings } from "../tables/field-mappings.js";
import { validationRules } from "../tables/validation-rules.js";

/**
 * A partner's full configuration for the admin screen: its mappings and its rules
 * across ALL versions (so the version history is visible), newest version last.
 */
export const configQuery = query({
  name: "config/{partner_id}",
  verb: "GET",
  apiGroup: hub,
  auth: users,
  input: {
    partner_id: input.int({ required: true }),
  },
  stack: [
    s.db.get({ table: partners, fieldName: "id", fieldValue: inp("partner_id"), as: "partner" }),
    s.precondition({
      expr: expr(ref("partner", { safe: true }), "!=", c.null()),
      error: c.text("Partner not found."),
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
      where: expr(col("partner_id"), "=", inp("partner_id")),
      sort: [
        { sortBy: "version", dir: "asc" },
        { sortBy: "id", dir: "asc" },
      ],
      as: "rules",
    }),
  ],
  response: { partner: ref("partner"), mappings: ref("mappings"), rules: ref("rules") },
});
