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
assert.equal(fs.existsSync(new URL("../netlify/functions/brand-memory.js", import.meta.url)), false, "brand-memory must not use a CommonJS wrapper that can miss the ESM handler in production.");
const endpoint = fs.readFileSync(
  new URL("../netlify/functions/brand-memory.mjs", import.meta.url),
  "utf8",
);
const provenanceMigration = fs.readFileSync(
  new URL("../supabase/migrations/20260830090000_extend_semantic_brand_memory_provenance.sql", import.meta.url),
  "utf8",
);
const generate = fs.readFileSync(
  new URL("../netlify/functions/generate.js", import.meta.url),
  "utf8",
);
const app = fs.readFileSync(
  new URL("../src/App.jsx", import.meta.url),
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
assert.match(provenanceMigration, /source_asset_id uuid/i);
assert.match(provenanceMigration, /source_generator text/i);
assert.match(provenanceMigration, /original_created_at timestamptz/i);
assert.match(provenanceMigration, /last_confirmed_at timestamptz/i);
assert.match(provenanceMigration, /content_version integer not null default 1/i);
assert.match(provenanceMigration, /confidence numeric\(4,3\) not null default 0\.750/i);
assert.match(provenanceMigration, /status in \('active','inactive','deleted','superseded'\)/i);
assert.match(provenanceMigration, /brand_memory_workspace_settings/i);
assert.match(provenanceMigration, /memory_disabled boolean not null default false/i);
assert.match(provenanceMigration, /brand_memories_active_source_identity_unique/i);
assert.match(provenanceMigration, /coalesce\(settings\.memory_disabled, false\) = false/i);
assert.match(provenanceMigration, /notify pgrst, 'reload schema'/i);
assert.match(service, /BRAND_MEMORY_ENABLED/);
assert.match(service, /String\(process\.env\.BRAND_MEMORY_ENABLED \|\| "false"\)/);
assert.match(service, /BRAND_MEMORY_TEST_USER_IDS/);
assert.match(service, /isBrandMemoryActiveForUser/);
assert.match(service, /contentHash/);
assert.match(service, /assertWorkspaceOwnership/);
assert.match(service, /embedding\.length !== 1536/);
assert.match(service, /\.eq\("workspace_id", workspaceId\)/);
assert.match(service, /\.eq\("user_id", userId\)/);
assert.match(service, /match_brand_memories_admin/);
assert.match(service, /buildWorkspaceMemoryPayloads/);
assert.match(service, /rebuildWorkspaceMemories/);
assert.match(service, /getCaptionMemoryContext/);
assert.match(service, /source_identity/);
assert.match(service, /ALLOWED_SOURCE_TYPES/);
assert.match(service, /confirmed_brand_dna/);
assert.match(service, /favorited_generation/);
assert.match(service, /selected_primary_logo_metadata/);
assert.match(service, /content_version/);
assert.match(service, /last_confirmed_at/);
assert.match(service, /superseded/);
assert.match(service, /setWorkspaceMemoryDisabled/);
assert.match(service, /listWorkspaceMemoryControls/);
assert.match(service, /forgetBrandMemory/);
assert.match(service, /SOURCE_RANK/);
assert.match(service, /Brand memory legacy lookup failed/);
assert.match(service, /\.eq\("content_hash", contentHash\)/);
assert.match(service, /source_identity: sourceIdentity/);
assert.match(service, /fragrant\|scented\|aromatic\|perfumed/);
assert.match(service, /air purification\|purifies the air\|improves\? indoor air quality/);
assert.doesNotMatch(service, /console\.log\([^)]*content/);
assert.doesNotMatch(service, /console\.error\([^)]*content/);
assert.doesNotMatch(endpoint, /from "openai"|require\("openai"\)/, "Status entrypoint must not initialize OpenAI directly.");
assert.doesNotMatch(endpoint, /brand-memory-handler\.mjs/, "Brand memory function must be self-contained for Netlify bundling.");
assert.doesNotMatch(endpoint, /Authorization|access_token|service_role|OPENAI_API_KEY/);
assert.match(endpoint, /requireVerifiedUser/);
assert.match(endpoint, /Cache-Control": "no-store"/);
assert.match(endpoint, /action === "status"/);
assert.match(endpoint, /BRAND_MEMORY_ENDPOINT_VERSION/);
assert.match(endpoint, /getBrandMemoryTestUserIds/);
assert.match(endpoint, /authenticatedUserIdMatchesAllowlist/);
assert.match(endpoint, /selectedWorkspaceId/);
assert.match(endpoint, /workspaceOwned/);
assert.match(endpoint, /getWorkspaceMemoryStatus/);
assert.match(endpoint, /case "refresh"/);
assert.match(endpoint, /case "list"/);
assert.match(endpoint, /case "forget"/);
assert.match(endpoint, /case "disable_workspace"/);
assert.match(endpoint, /case "enable_workspace"/);
assert.match(endpoint, /case "delete_workspace"/);
assert.match(endpoint, /BRAND_MEMORY_NOT_ALLOWLISTED/);
assert.match(generate, /getGeneratorMemoryContext/);
assert.match(generate, /MEMORY_ENABLED_GENERATORS/);
assert.match(generate, /"hashtags"/);
assert.match(generate, /"bios"/);
assert.match(generate, /"strategy"/);
assert.match(generate, /"growth"/);
assert.doesNotMatch(generate, /BRAND_MEMORY_TEST_USER_IDS/);
assert.doesNotMatch(app, /BRAND_MEMORY_TEST_USER_IDS|BRAND_MEMORY_ENABLED|brandthattesting@gmail\.com/);
assert.match(app, /Brand memory active ·/);
assert.match(app, /Refresh brand memory/);
assert.match(app, /Brand memory unavailable/);
assert.match(app, /Retry memory status/);
assert.match(app, /function BrandMemorySettings/);
assert.match(app, /Forget all workspace memory/);
assert.match(app, /Edit or correct/);
assert.match(app, /Disable memory for this workspace/);

const memoryModule = await import("../netlify/functions/lib/brand-memory.js");
process.env.BRAND_MEMORY_ENABLED = "false";
process.env.BRAND_MEMORY_TEST_USER_IDS = "11111111-1111-1111-1111-111111111111";
assert.equal(memoryModule.isBrandMemoryActiveForUser("11111111-1111-1111-1111-111111111111"), false, "global flag must be required.");
process.env.BRAND_MEMORY_ENABLED = "true";
assert.equal(memoryModule.isBrandMemoryActiveForUser("22222222-2222-2222-2222-222222222222"), false, "allowlist must be required.");
assert.equal(memoryModule.isBrandMemoryActiveForUser("11111111-1111-1111-1111-111111111111"), true, "allowlisted UUID should activate only when the flag is enabled.");
const payloads = memoryModule.buildWorkspaceMemoryPayloads({
  id: "33333333-3333-3333-3333-333333333333",
  user_id: "11111111-1111-1111-1111-111111111111",
  name: "Stone & Stem",
  description: "A local subscription service delivering low-maintenance houseplants to apartment renters.",
  audience: "Apartment renters and first-time plant owners",
  tone: "Friendly",
  style: "Minimal botanical",
  logo_direction: "Stone and leaf symbol",
  launch_goal: "Reach local subscribers",
}, {
  userId: "11111111-1111-1111-1111-111111111111",
  workspaceId: "33333333-3333-3333-3333-333333333333",
});
assert.ok(payloads.length >= 5, "workspace refresh should produce structured memory payloads.");
assert.ok(payloads.every((item) => item.metadata.workspace_id && item.metadata.user_id && item.metadata.source_identity), "memory metadata must include user/workspace/source identity.");
assert.ok(payloads.every((item) => item.sourceType === "confirmed_brand_dna"), "structured workspace memories must use confirmed Brand DNA provenance.");
assert.ok(payloads.every((item) => item.confidence >= 0.9), "structured workspace memories should carry high confidence.");

console.log("Semantic brand memory security contract passed.");
