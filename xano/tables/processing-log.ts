import { table, f } from "@xanots/sdk";
import { partners } from "./partners.js";
import { inboundRecords } from "./inbound-records.js";

/**
 * The governance trail: one row per step of a decision (received, normalized,
 * rule_passed, rule_failed, accepted, rejected). Written by the single write path
 * so the audit trail is identical no matter which caller triggered the decision.
 */
export const processingLog = table({
  name: "processing_log",
  schema: {
    partner_id: f.tableRef(partners, { required: true }),
    inbound_record_id: f.tableRef(inboundRecords, { required: true }),
    event: f.enum(["received", "normalized", "rule_passed", "rule_failed", "accepted", "rejected"], {
      required: true,
    }),
    detail: f.text({ required: true }),
    level: f.enum(["info", "warn"], { required: true, default: "info" }),
  },
  index: [{ type: "btree", fields: [{ name: "inbound_record_id" }] }],
});
