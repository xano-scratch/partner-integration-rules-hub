import { table, f } from "@xanots/sdk";

/**
 * The auth table. Backs native token auth (create_auth_token + check_password).
 * `role` is what every admin-only endpoint re-reads from the database before it
 * runs, so access control lives at the API layer, never in the row.
 */
export const users = table({
  name: "users",
  auth: true,
  // `id` (int PK) + `created_at` (epochms) are auto-injected.
  schema: {
    email: f.email({ required: true }),
    name: f.text({ required: true }),
    // Take the password as input.text on signup/login (see llms.txt double-hash gotcha);
    // the column itself hashes on write and stays access:"internal".
    password: f.password({ required: true }),
    role: f.enum(["integration_admin", "viewer"], { required: true, default: "viewer" }),
  },
  index: [{ type: "unique", fields: [{ name: "email" }] }],
});
