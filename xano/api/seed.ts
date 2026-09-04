import { query, input, s, ref, inp, c, or, expr, col } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";
import { partners } from "../tables/partners.js";
import { fieldMappings } from "../tables/field-mappings.js";
import { validationRules } from "../tables/validation-rules.js";
import { inboundRecords } from "../tables/inbound-records.js";
import { processingLog } from "../tables/processing-log.js";
import { processInbound } from "../functions/process-inbound.js";

/**
 * Deterministic demo seed. Public so a fresh ephemeral is browsable immediately.
 *
 * Idempotent by default: it only writes when the database is empty, so a reviewer's
 * later edits survive a reload. Call with ?force=true to wipe and reload a clean set.
 *
 * It loads two partners with DISTINCT mappings and rule sets, then runs four sample
 * payloads through process_inbound (the one write path) so the records AND their
 * audit trails are real decisions, not fixtures.
 */
export const seedQuery = query({
  name: "seed",
  verb: "GET",
  apiGroup: hub,
  auth: false,
  input: {
    force: input.bool({ default: false }),
  },
  stack: [
    s.db.query({ table: partners, returnType: "count", as: "partner_count" }),
    s.conditional({
      when: or(expr(inp("force"), "=", c.bool(true)), expr(ref("partner_count"), "=", c.int(0))),
      then: [
        // Wipe (child tables first is not required for truncate, but reads cleanest).
        s.db.truncate({ table: processingLog, reset: true }),
        s.db.truncate({ table: inboundRecords, reset: true }),
        s.db.truncate({ table: validationRules, reset: true }),
        s.db.truncate({ table: fieldMappings, reset: true }),
        s.db.truncate({ table: partners, reset: true }),
        s.db.truncate({ table: users, reset: true }),

        // Demo users (the password column hashes the plaintext on write).
        s.db.add({
          table: users,
          row: { email: "admin@demo.test", name: "Ada Admin", password: "demo1234", role: "integration_admin" },
        }),
        s.db.add({
          table: users,
          row: { email: "viewer@demo.test", name: "Vic Viewer", password: "demo1234", role: "viewer" },
        }),

        // Partner A — Acme Freight.
        s.db.add({
          table: partners,
          row: { code: "acme", name: "Acme Freight", canonical_target: "order", active_rule_version: 1, status: "active" },
          as: "pa",
        }),
        s.db.add({
          table: fieldMappings,
          row: { partner_id: ref("pa.id"), source_field: "ref", target_field: "order_ref", transform: "uppercase", required: true },
        }),
        s.db.add({
          table: fieldMappings,
          row: { partner_id: ref("pa.id"), source_field: "qty", target_field: "quantity", transform: "to_number", required: true },
        }),
        s.db.add({
          table: fieldMappings,
          row: { partner_id: ref("pa.id"), source_field: "email", target_field: "contact_email", transform: "lowercase", required: false },
        }),
        s.db.add({
          table: fieldMappings,
          row: { partner_id: ref("pa.id"), source_field: "ship", target_field: "ship_date", transform: "date_iso", required: false },
        }),
        s.db.add({
          table: validationRules,
          row: {
            partner_id: ref("pa.id"), version: 1, target_field: "order_ref", rule_type: "regex",
            rule_config: c.obj({ pattern: "^[A-Z]{3}-[0-9]{4}$" }),
            reject_message: "Order reference must look like ABC-1234.", active: true,
          },
        }),
        s.db.add({
          table: validationRules,
          row: {
            partner_id: ref("pa.id"), version: 1, target_field: "quantity", rule_type: "range",
            rule_config: c.obj({ min: 1, max: 1000 }),
            reject_message: "Quantity must be between 1 and 1000.", active: true,
          },
        }),
        s.db.add({
          table: validationRules,
          row: {
            partner_id: ref("pa.id"), version: 1, target_field: "contact_email", rule_type: "regex",
            rule_config: c.obj({ pattern: "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$" }),
            reject_message: "Contact email is not a valid address.", active: true,
          },
        }),

        // Partner B — Globex Retail (different source fields → same canonical shape).
        s.db.add({
          table: partners,
          row: { code: "globex", name: "Globex Retail", canonical_target: "order", active_rule_version: 1, status: "active" },
          as: "pb",
        }),
        s.db.add({
          table: fieldMappings,
          row: { partner_id: ref("pb.id"), source_field: "orderId", target_field: "order_ref", transform: "trim", required: true },
        }),
        s.db.add({
          table: fieldMappings,
          row: { partner_id: ref("pb.id"), source_field: "count", target_field: "quantity", transform: "to_number", required: true },
        }),
        s.db.add({
          table: fieldMappings,
          row: { partner_id: ref("pb.id"), source_field: "priority", target_field: "priority", transform: "lowercase", required: true },
        }),
        s.db.add({
          table: validationRules,
          row: {
            partner_id: ref("pb.id"), version: 1, target_field: "order_ref", rule_type: "max_length",
            rule_config: c.obj({ max: 12 }),
            reject_message: "Order reference must be 12 characters or fewer.", active: true,
          },
        }),
        s.db.add({
          table: validationRules,
          row: {
            partner_id: ref("pb.id"), version: 1, target_field: "quantity", rule_type: "range",
            rule_config: c.obj({ min: 1, max: 50 }),
            reject_message: "Quantity must be between 1 and 50.", active: true,
          },
        }),
        s.db.add({
          table: validationRules,
          row: {
            partner_id: ref("pb.id"), version: 1, target_field: "priority", rule_type: "enum",
            rule_config: c.obj({ allowed: ["low", "medium", "high"] }),
            reject_message: "Priority must be low, medium, or high.", active: true,
          },
        }),

        // Four sample decisions through the one write path (two accepted, two rejected).
        s.function.run({
          fn: processInbound,
          input: { partner_id: ref("pa.id"), raw_payload: c.obj({ ref: "abc-1234", qty: "5", email: "OPS@ACME.IO", ship: "2026-03-01" }) },
        }),
        s.function.run({
          fn: processInbound,
          input: { partner_id: ref("pa.id"), raw_payload: c.obj({ ref: "def-5678", qty: "5000", email: "ops@acme.io" }) },
        }),
        s.function.run({
          fn: processInbound,
          input: { partner_id: ref("pb.id"), raw_payload: c.obj({ orderId: "GX-0001", count: "3", priority: "High" }) },
        }),
        s.function.run({
          fn: processInbound,
          input: { partner_id: ref("pb.id"), raw_payload: c.obj({ orderId: "GLOBEX-ORDER-99999", count: "3", priority: "high" }) },
        }),
      ],
    }),
    s.db.query({ table: partners, returnType: "count", as: "pc" }),
    s.db.query({ table: inboundRecords, returnType: "count", as: "rc" }),
  ],
  response: { ok: c.bool(true), partners: ref("pc"), records: ref("rc") },
});
