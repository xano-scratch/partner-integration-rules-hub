import { query, input, s, ref, inp, c, expr, obj } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";

/**
 * Public login. Verifies the password against the internal hash and mints a native
 * auth token. Take the submitted password as input.text (NOT input.password) so it
 * is not double-hashed before check_password compares it.
 */
export const authLoginQuery = query({
  name: "auth/login",
  verb: "POST",
  apiGroup: hub,
  auth: false,
  input: {
    email: input.email({ required: true, methods: ["lower", "trim"] }),
    password: input.text({ required: true }),
  },
  stack: [
    s.db.get({
      table: users,
      fieldName: "email",
      fieldValue: inp("email"),
      // `password` must be named to read the access:"internal" hash column.
      output: ["id", "email", "name", "role", "password"],
      as: "u",
    }),
    s.precondition({
      expr: expr(ref("u", { safe: true }), "!=", c.null()),
      error: c.text("Invalid email or password."),
      error_type: "unauthorized",
    }),
    s.security.check_password({
      text_password: inp("password"),
      hash_password: ref("u.password"),
      as: "ok",
    }),
    s.precondition({
      expr: expr(ref("ok"), "=", c.bool(true)),
      error: c.text("Invalid email or password."),
      error_type: "unauthorized",
    }),
    s.security.create_auth_token({ table: users, id: ref("u.id"), as: "token" }),
  ],
  response: {
    token: ref("token"),
    // Build the user object WITHOUT the password column.
    user: obj({ id: ref("u.id"), email: ref("u.email"), name: ref("u.name"), role: ref("u.role") }),
  },
});
