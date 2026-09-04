import { apiGroup } from "@xanots/sdk";

/**
 * The one governed API surface. `canonical` is PINNED so public paths are stable
 * (/api:hub/...) and getPath() resolves in the browser bundle without a lock.
 */
export const hub = apiGroup({
  name: "hub",
  canonical: "hub",
  description: "Partner Integration Rules Hub — one governed API for per-partner normalization and validation.",
});
