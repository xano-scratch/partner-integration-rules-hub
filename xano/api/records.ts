import { query, input, s, ref, inp, cmp, expr, col } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { partners } from "../tables/partners.js";
import { inboundRecords } from "../tables/inbound-records.js";

/**
 * List inbound records, optionally filtered by partner_code and status. Both filters
 * are optional: an empty partner_code resolves to a null id and an empty status both
 * drop out via `ignoreEmpty`, so the bare call returns every record.
 */
export const recordsQuery = query({
  name: "records",
  verb: "GET",
  apiGroup: hub,
  auth: users,
  input: {
    partner_code: input.text({ default: "" }),
    status: input.text({ default: "" }),
  },
  stack: [
    // Filter by partner_code via a join (a bind adds no columns, so the rows stay the
    // inbound_records shape). An empty code/status drops out via ignoreEmpty on the
    // inp operand — the pattern that reliably drops, unlike a safe-ref operand.
    s.db.query({
      table: inboundRecords,
      bind: [{ table: partners, as: "pt", where: expr(col("partner_id"), "=", col("pt.id")) }],
      where: [
        cmp(col("pt.code"), "=", inp("partner_code"), { ignoreEmpty: true }),
        cmp(col("status"), "=", inp("status"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "created_at", dir: "desc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
