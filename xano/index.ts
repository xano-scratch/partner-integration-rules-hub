import { workspace } from "@xanots/sdk";

// Tables
import { users } from "./tables/users.js";
import { partners } from "./tables/partners.js";
import { fieldMappings } from "./tables/field-mappings.js";
import { validationRules } from "./tables/validation-rules.js";
import { inboundRecords } from "./tables/inbound-records.js";
import { processingLog } from "./tables/processing-log.js";

// API group
import { hub } from "./api/hub.js";

// Functions (the one write path + the RBAC guard)
import { processInbound } from "./functions/process-inbound.js";
import { requireAdmin } from "./functions/require-admin.js";

// Endpoints
import { authLoginQuery } from "./api/auth-login.js";
import { authMeQuery } from "./api/auth-me.js";
import { partnersQuery } from "./api/partners.js";
import { ingestQuery } from "./api/ingest.js";
import { recordsQuery } from "./api/records.js";
import { recordQuery } from "./api/record.js";
import { logQuery } from "./api/log.js";
import { configQuery } from "./api/config.js";
import { mappingsQuery } from "./api/mappings.js";
import { rulesQuery } from "./api/rules.js";
import { reprocessQuery } from "./api/reprocess.js";
import { seedQuery } from "./api/seed.js";

/**
 * Partner Integration Rules Hub — one governed API layer that normalizes and
 * validates each partner's inbound records against that partner's own mappings and
 * versioned rules, with a full audit trail. Play 1: Business Logic Centralization.
 */
export default workspace("partner-integration-rules-hub")
  .registerTables([users, partners, fieldMappings, validationRules, inboundRecords, processingLog])
  .registerApiGroups([hub])
  .registerFunctions([processInbound, requireAdmin])
  .registerQueries([
    authLoginQuery,
    authMeQuery,
    partnersQuery,
    ingestQuery,
    recordsQuery,
    recordQuery,
    logQuery,
    configQuery,
    mappingsQuery,
    rulesQuery,
    reprocessQuery,
    seedQuery,
  ]);
