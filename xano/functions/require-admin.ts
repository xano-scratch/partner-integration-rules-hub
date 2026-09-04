import { defineFunction, input, s, ref, inp, c, expr } from "@xanots/sdk";
import { users } from "../tables/users.js";

/**
 * The API-layer RBAC guard. Admin-only endpoints call this first, passing the
 * caller's id (auth("id")). It re-reads the caller's role FROM THE DATABASE and
 * throws 403 unless the caller is an integration_admin. A viewer holds a valid
 * token, so the endpoint's `auth` gate lets them in; this is what stops them, at
 * the API layer, not in the UI and never at the row.
 */
export const requireAdmin = defineFunction({
  name: "require_admin",
  input: {
    caller_id: input.int({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "id",
      fieldValue: inp("caller_id"),
      output: ["id", "email", "name", "role"],
      as: "caller",
    }),
    s.precondition({
      expr: expr(ref("caller", { safe: true }), "!=", c.null()),
      error: c.text("Not authenticated."),
      error_type: "unauthorized",
    }),
    s.precondition({
      expr: expr(ref("caller.role"), "=", c.text("integration_admin")),
      error: c.text("This action requires the integration_admin role."),
      error_type: "accessdenied",
    }),
  ],
  response: ref("caller"),
});
