import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../supabase/migrations/20260828050000_add_semantic_brand_memories.sql", import.meta.url),
  "utf8",
);
const service = fs.readFileSync(
  new URL("../netlify/functions/lib/brand-memory.js", import.meta.url),
  "utf8",
);
const endpoint = fs.readFileSync(
  new URL("../netlify/functions/brand-memory.js", import.meta.url),
  "utf8",
);

assert.match(migration, /enable row level security/i);
assert.match(migration, /workspace\.user_id = auth\.uid\(\)/);
assert.match(migration, /memory\.workspace_id = requested_workspace_id/);
assert.match(migration, /memory\.user_id = requested_user_id/);
assert.match(migration, /grant execute[\s\S]+to service_role/i);
assert.match(migration, /revoke all[\s\S]+from authenticated/i);
assert.match(migration, /brand_memories_active_content_unique/);
assert.match(service, /BRAND_MEMORY_ENABLED/);
assert.match(service, /contentHash/);
assert.match(service, /assertWorkspaceOwnership/);
assert.match(service, /embedding\.length !== 1536/);
assert.doesNotMatch(service, /console\.log\([^)]*content/);
assert.match(endpoint, /requireVerifiedUser/);
assert.match(endpoint, /Cache-Control": "no-store"/);
assert.match(endpoint, /Brand memory is not enabled/);

console.log("Semantic brand memory security contract passed.");
