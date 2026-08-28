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
assert.match(migration, /public\.brand_workspaces\(id\) on delete cascade/i);
assert.match(migration, /user_id uuid not null references auth\.users\(id\) on delete cascade/i);
assert.match(migration, /embedding extensions\.vector\(1536\)/i);
assert.match(migration, /using hnsw \(embedding vector_cosine_ops\)/i);
assert.doesNotMatch(migration, /as \$\s/i, "SQL functions must use valid dollar quoting such as AS $$, not AS $.");
assert.match(migration, /match_brand_memories_admin[\s\S]+as \$\$/i);
assert.match(migration, /workspace\.user_id = auth\.uid\(\)/);
assert.match(migration, /memory\.workspace_id = requested_workspace_id/);
assert.match(migration, /memory\.user_id = requested_user_id/);
assert.match(migration, /workspace\.user_id = requested_user_id/);
assert.match(migration, /grant execute[\s\S]+to service_role/i);
assert.match(migration, /revoke all[\s\S]+from authenticated/i);
assert.match(migration, /brand_memories_active_content_unique/);
assert.match(service, /BRAND_MEMORY_ENABLED/);
assert.match(service, /String\(process\.env\.BRAND_MEMORY_ENABLED \|\| "false"\)/);
assert.match(service, /contentHash/);
assert.match(service, /assertWorkspaceOwnership/);
assert.match(service, /embedding\.length !== 1536/);
assert.match(service, /\.eq\("workspace_id", workspaceId\)/);
assert.match(service, /\.eq\("user_id", userId\)/);
assert.match(service, /match_brand_memories_admin/);
assert.doesNotMatch(service, /console\.log\([^)]*content/);
assert.doesNotMatch(service, /console\.error\([^)]*content/);
assert.doesNotMatch(endpoint, /Authorization|access_token|service_role|OPENAI_API_KEY/);
assert.match(endpoint, /requireVerifiedUser/);
assert.match(endpoint, /Cache-Control": "no-store"/);
assert.match(endpoint, /Brand memory is not enabled/);

console.log("Semantic brand memory security contract passed.");
