import { query, input, s, ref, inp, c, auth, expr } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { inboundRecords } from "../tables/inbound-records.js";
import { processInbound } from "../functions/process-inbound.js";
import { requireAdmin } from "../functions/require-admin.js";

/**
 * Re-run an existing record through the current active rules for its partner. Admin
 * only. This is how a newly added rule is shown taking effect: the same raw payload,
 * re-decided against the partner's active rule set, in place.
 */
export const reprocessQuery = query({
  name: "reprocess/{record_id}",
  verb: "POST",
  apiGroup: hub,
  auth: users,
  input: {
    record_id: input.int({ required: true }),
  },
  stack: [
    s.function.run({ fn: requireAdmin, input: { caller_id: auth("id") }, as: "admin" }),
    s.db.get({ table: inboundRecords, fieldName: "id", fieldValue: inp("record_id"), as: "rec" }),
    s.precondition({
      expr: expr(ref("rec", { safe: true }), "!=", c.null()),
      error: c.text("Record not found."),
      error_type: "notfound",
    }),
    s.function.run({
      fn: processInbound,
      input: {
        partner_id: ref("rec.partner_id"),
        raw_payload: ref("rec.raw_payload"),
        existing_record_id: ref("rec.id"),
      },
      as: "result",
    }),
  ],
  response: ref("result"),
});
