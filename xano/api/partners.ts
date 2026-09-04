import { query, s, ref, c, expr, col } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { partners } from "../tables/partners.js";
import { fieldMappings } from "../tables/field-mappings.js";
import { validationRules } from "../tables/validation-rules.js";

/**
 * The browsable overview: every partner plus the mappings and active rules the UI
 * needs to show each partner's mapping and active-rule counts and canonical target.
 * Returned as typed arrays so the client derives the counts from the one contract.
 */
export const partnersQuery = query({
  name: "partners",
  verb: "GET",
  apiGroup: hub,
  auth: users,
  stack: [
    s.db.query({ table: partners, sort: [{ sortBy: "id", dir: "asc" }], as: "partners" }),
    s.db.query({ table: fieldMappings, sort: [{ sortBy: "id", dir: "asc" }], as: "mappings" }),
    s.db.query({
      table: validationRules,
      where: expr(col("active"), "=", c.bool(true)),
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "rules",
    }),
  ],
  response: { partners: ref("partners"), mappings: ref("mappings"), rules: ref("rules") },
});
