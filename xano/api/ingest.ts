import { query, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { partners } from "../tables/partners.js";
import { processInbound } from "../functions/process-inbound.js";

/**
 * The one governed job: accept a raw payload for a partner, normalize it, validate
 * it, and record the decision. Any authenticated user may submit (a viewer can too);
 * all the logic lives in process_inbound, the single write path.
 */
export const ingestQuery = query({
  name: "ingest",
  verb: "POST",
  apiGroup: hub,
  auth: users,
  input: {
    partner_code: input.text({ required: true }),
    payload: input.json({ required: true }),
  },
  stack: [
    s.db.get({ table: partners, fieldName: "code", fieldValue: inp("partner_code"), as: "partner" }),
    s.precondition({
      expr: expr(ref("partner", { safe: true }), "!=", c.null()),
      error: c.text("Unknown partner code."),
      error_type: "notfound",
    }),
    s.function.run({
      fn: processInbound,
      input: { partner_id: ref("partner.id"), raw_payload: inp("payload") },
      as: "result",
    }),
  ],
  response: ref("result"),
});
