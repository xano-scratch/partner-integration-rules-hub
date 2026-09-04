// The one contract: paths and request/response TYPES are derived from the xanots
// query defs, never hand-typed. Change a def and everything here follows.
//
// Types are imported type-only (InferInput/InferResponse erase to nothing). The def
// VALUES are imported for their getPath()/verb — this is a small governed app, so the
// modest runtime floor that costs is the right trade for a single honest contract.

import type { InferInput, InferResponse } from "@xanots/sdk";

import { authLoginQuery } from "../../../xano/api/auth-login.js";
import { authMeQuery } from "../../../xano/api/auth-me.js";
import { partnersQuery } from "../../../xano/api/partners.js";
import { ingestQuery } from "../../../xano/api/ingest.js";
import { recordsQuery } from "../../../xano/api/records.js";
import { recordQuery } from "../../../xano/api/record.js";
import { logQuery } from "../../../xano/api/log.js";
import { configQuery } from "../../../xano/api/config.js";
import { mappingsQuery } from "../../../xano/api/mappings.js";
import { rulesQuery } from "../../../xano/api/rules.js";
import { reprocessQuery } from "../../../xano/api/reprocess.js";
import { seedQuery } from "../../../xano/api/seed.js";

/**
 * The deployed Xano backend's base URL. Injected as `window.XANO_HOST` by
 * `xanots deploy --static`, or read from `VITE_XANO_HOST` in dev.
 */
export const XANO_HOST: string =
  (typeof window !== "undefined" && (window as { XANO_HOST?: string }).XANO_HOST) ||
  import.meta.env.VITE_XANO_HOST ||
  "";

// ── Types derived from the defs (the contract) ──────────────────────────────────
export type LoginBody = InferInput<typeof authLoginQuery>;
export type LoginResponse = InferResponse<typeof authLoginQuery>;
export type Me = InferResponse<typeof authMeQuery>;

export type PartnersData = InferResponse<typeof partnersQuery>;
export type Partner = PartnersData["partners"][number];
export type Mapping = PartnersData["mappings"][number];
export type Rule = PartnersData["rules"][number];

export type RecordRow = InferResponse<typeof recordsQuery>[number];
export type RecordDetail = InferResponse<typeof recordQuery>;
export type LogRow = InferResponse<typeof logQuery>[number];
export type ConfigData = InferResponse<typeof configQuery>;

export type IngestBody = InferInput<typeof ingestQuery>;
export type MappingBody = InferInput<typeof mappingsQuery>;
export type RuleBody = InferInput<typeof rulesQuery>;

// The decision returned by ingest/reprocess comes from process_inbound, whose shape
// is produced by a JavaScript lambda + a conditional write, so it is not statically
// inferrable. This is the ONE hand-written view type (see the build self-grade).
export interface DecisionEvent {
  event: string;
  detail: string;
  level: "info" | "warn";
}
export interface Decision {
  record_id: number;
  partner_id: number;
  partner_code: string;
  partner_name: string;
  canonical_target: string;
  status: "accepted" | "rejected";
  reject_reason: string;
  rule_fired_id: number;
  applied_version: number;
  raw_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown>;
  events: DecisionEvent[];
}

// ── Transport ───────────────────────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// getPath()'s options differ per def (path-param defs vs not), so accept it loosely
// here; the typed wrappers below pass the right shape.
type Def = { getPath: (opts?: any) => string; verb: string };
type CallOpts = {
  params?: Record<string, string | number>;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  token?: string;
};

async function call<T>(def: Def, opts: CallOpts = {}): Promise<T> {
  const path = def.getPath(opts.params ? { params: opts.params } : undefined);
  // CONCATENATE — XANO_HOST includes the tenant path (/tenant/<name>) and getPath()
  // returns an absolute "/api:.../..." path. `new URL(path, base)` would drop the
  // base's path for an absolute path, losing the /tenant segment; string-join instead.
  const base = XANO_HOST || (typeof window !== "undefined" ? window.location.origin : "");
  let full = base.replace(/\/$/, "") + path;
  if (opts.query) {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
    }
    const qs = sp.toString();
    if (qs) full += "?" + qs;
  }
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["content-type"] = "application/json";
  if (opts.token) headers["authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(full, {
    method: def.verb,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) {
    let message = text;
    try {
      const parsed = JSON.parse(text);
      message = parsed?.message || parsed?.error || text;
    } catch {
      // keep the raw text
    }
    throw new ApiError(res.status, message || res.statusText);
  }
  return (text ? JSON.parse(text) : null) as T;
}

// ── The typed API surface the screens call ───────────────────────────────────────
export const api = {
  seed: (force = false) => call<{ ok: boolean; partners: number; records: number }>(seedQuery, { query: { force: force ? "true" : undefined } }),
  login: (body: LoginBody) => call<LoginResponse>(authLoginQuery, { body }),
  me: (token: string) => call<Me>(authMeQuery, { token }),
  partners: (token: string) => call<PartnersData>(partnersQuery, { token }),
  ingest: (token: string, body: IngestBody) => call<Decision>(ingestQuery, { token, body }),
  records: (token: string, partner_code?: string, status?: string) =>
    call<RecordRow[]>(recordsQuery, { token, query: { partner_code, status } }),
  record: (token: string, id: number) => call<RecordDetail>(recordQuery, { token, params: { id } }),
  log: (token: string, partner_code?: string, record_id?: number) =>
    call<LogRow[]>(logQuery, { token, query: { partner_code, record_id } }),
  config: (token: string, partner_id: number) => call<ConfigData>(configQuery, { token, params: { partner_id } }),
  addMapping: (token: string, body: MappingBody) => call<Mapping>(mappingsQuery, { token, body }),
  addRule: (token: string, body: RuleBody) => call<Rule>(rulesQuery, { token, body }),
  reprocess: (token: string, record_id: number) => call<Decision>(reprocessQuery, { token, params: { record_id } }),
};
