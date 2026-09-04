import { query, s, ref, auth } from "@xanots/sdk";
import { hub } from "./hub.js";
import { users } from "../tables/users.js";

/**
 * The current caller. `auth: users` refuses a request without a valid token before
 * the stack runs; auth("id") is then the caller's row id.
 */
export const authMeQuery = query({
  name: "auth/me",
  verb: "GET",
  apiGroup: hub,
  auth: users,
  stack: [
    s.db.get({
      table: users,
      fieldName: "id",
      fieldValue: auth("id"),
      output: ["id", "email", "name", "role"],
      as: "me",
    }),
  ],
  response: ref("me"),
});
