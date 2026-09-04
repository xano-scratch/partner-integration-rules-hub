import { query, input, s, ref, inp, cmp, expr, col } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { partners } from "../tables/partners.js";
import { processingLog } from "../tables/processing-log.js";

/**
 * The processing log (the governance trail), filtered by partner_code and optionally
 * one record_id. Both filters are optional and drop out via `ignoreEmpty` when blank.
 */
export const logQuery = query({
  name: "log",
  verb: "GET",
  apiGroup: hub,
  auth: users,
  input: {
    partner_code: input.text({ default: "" }),
    // absent → null → the record filter drops out (all rows for the partner).
    record_id: input.int(),
  },
  stack: [
    // Filter by partner_code via a join, and optionally by record_id — both drop out
    // via ignoreEmpty on the inp operand when blank/absent.
    s.db.query({
      table: processingLog,
      bind: [{ table: partners, as: "pt", where: expr(col("partner_id"), "=", col("pt.id")) }],
      where: [
        cmp(col("pt.code"), "=", inp("partner_code"), { ignoreEmpty: true }),
        cmp(col("inbound_record_id"), "=", inp("record_id"), { ignoreEmpty: true }),
      ],
      sort: [{ sortBy: "id", dir: "asc" }],
      as: "rows",
    }),
  ],
  response: ref("rows"),
});
