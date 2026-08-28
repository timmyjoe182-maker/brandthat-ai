import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const url = process.env.BRAND_MEMORY_TEST_SUPABASE_URL || "";
const serviceRoleKey = process.env.BRAND_MEMORY_TEST_SERVICE_ROLE_KEY || "";
const productionProjectRef = "vfnkmabnocbwawbdvxfo";

if (!url || !serviceRoleKey) {
  console.log("Semantic brand memory DB integration skipped: set BRAND_MEMORY_TEST_SUPABASE_URL and BRAND_MEMORY_TEST_SERVICE_ROLE_KEY for a safe Supabase test project.");
  process.exit(0);
}

if (url.includes(productionProjectRef) && process.env.BRAND_MEMORY_TEST_ALLOW_PRODUCTION !== "true") {
  throw new Error("Refusing to run destructive integration fixtures against the known production Supabase project.");
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function testEmail(label) {
  return `brand-memory-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function vector(seed) {
  return Array.from({ length: 1536 }, (_, index) => (index === seed ? 1 : 0));
}

async function assertNoError(result, label) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  return result.data;
}

async function createUser(label) {
  const email = testEmail(label);
  const password = `Memory-${label}-${Date.now()}!`;
  const created = await assertNoError(await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  }), `create user ${label}`);
  const client = createClient(url, process.env.BRAND_MEMORY_TEST_ANON_KEY || serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await assertNoError(await client.auth.signInWithPassword({ email, password }), `sign in ${label}`);
  return { id: created.user.id, email, password, client };
}

async function createWorkspace(userId, name) {
  return assertNoError(await admin
    .from("brand_workspaces")
    .insert({
      user_id: userId,
      name,
      description: `${name} integration fixture`,
      logo_direction: "Simple fixture mark",
      audience: "Integration test audience",
      tone: "Clear",
      style: "Minimal",
      launch_goal: "Test secure memory retrieval",
    })
    .select("id,user_id")
    .single(), `create workspace ${name}`);
}

async function insertMemory(client, workspaceId, userId, content, overrides = {}) {
  return client
    .from("brand_memories")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      memory_type: overrides.memory_type || "brand_fact",
      title: overrides.title || "Fixture memory",
      content,
      content_hash: overrides.content_hash || content.toLowerCase().replace(/\W+/g, "-"),
      embedding: overrides.embedding || vector(overrides.seed || 0),
      embedding_model: "test-vector",
      status: overrides.status || "active",
      metadata: { fixture: true },
      embedded_at: new Date().toISOString(),
    })
    .select("id,workspace_id,user_id,status,content_hash")
    .single();
}

const cleanupUserIds = [];
const cleanupWorkspaceIds = [];

try {
  const userA = await createUser("a");
  const userB = await createUser("b");
  cleanupUserIds.push(userA.id, userB.id);

  const workspaceA = await createWorkspace(userA.id, "User A Brand");
  const workspaceA2 = await createWorkspace(userA.id, "User A Second Brand");
  const workspaceB = await createWorkspace(userB.id, "User B Brand");
  cleanupWorkspaceIds.push(workspaceA.id, workspaceA2.id, workspaceB.id);

  const memoryA = await assertNoError(await insertMemory(userA.client, workspaceA.id, userA.id, "User A private positioning", { seed: 0 }), "insert user A memory");
  await assertNoError(await insertMemory(userA.client, workspaceA2.id, userA.id, "User A second brand memory", { seed: 1 }), "insert user A second workspace memory");
  await assertNoError(await insertMemory(userB.client, workspaceB.id, userB.id, "User B private positioning", { seed: 2 }), "insert user B memory");
  await assertNoError(await insertMemory(userA.client, workspaceA.id, userA.id, "Inactive memory", { status: "inactive", content_hash: "inactive-memory", seed: 3 }), "insert inactive memory");
  await assertNoError(await insertMemory(userA.client, workspaceA.id, userA.id, "Deleted memory", { status: "deleted", content_hash: "deleted-memory", seed: 4 }), "insert deleted memory");

  const duplicate = await insertMemory(userA.client, workspaceA.id, userA.id, "User A private positioning", { content_hash: memoryA.content_hash, seed: 0 });
  assert.ok(duplicate.error, "duplicate active content should be rejected by the unique index");

  const otherUserRead = await userA.client.from("brand_memories").select("id").eq("workspace_id", workspaceB.id);
  assertNoError(otherUserRead, "user A read user B memories");
  assert.equal(otherUserRead.data.length, 0, "User A must not read User B memories.");

  const scopedSearch = await userA.client.rpc("match_brand_memories", {
    requested_workspace_id: workspaceA.id,
    query_embedding: vector(0),
    requested_memory_types: null,
    requested_match_count: 10,
    requested_similarity_threshold: 0,
  });
  await assertNoError(scopedSearch, "client scoped memory search");
  assert.ok(scopedSearch.data.every((item) => item.id === memoryA.id), "Client search must stay inside the requested workspace and exclude inactive/deleted memories.");

  const crossWorkspaceSearch = await userA.client.rpc("match_brand_memories", {
    requested_workspace_id: workspaceB.id,
    query_embedding: vector(2),
    requested_memory_types: null,
    requested_match_count: 10,
    requested_similarity_threshold: 0,
  });
  await assertNoError(crossWorkspaceSearch, "cross workspace client search");
  assert.equal(crossWorkspaceSearch.data.length, 0, "Client RPC must not expose another user's workspace.");

  const serverScopedSearch = await admin.rpc("match_brand_memories_admin", {
    requested_user_id: userA.id,
    requested_workspace_id: workspaceA.id,
    query_embedding: vector(0),
    requested_memory_types: null,
    requested_match_count: 10,
    requested_similarity_threshold: 0,
  });
  await assertNoError(serverScopedSearch, "server scoped memory search");
  assert.ok(serverScopedSearch.data.every((item) => item.id === memoryA.id), "Server RPC must require exact user/workspace scope.");

  const updated = await assertNoError(await userA.client
    .from("brand_memories")
    .update({
      content: "Updated private positioning",
      content_hash: "updated-private-positioning",
      embedding: vector(5),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memoryA.id)
    .select("id,content_hash")
    .single(), "update memory");
  assert.equal(updated.content_hash, "updated-private-positioning", "Updating content should replace the hash.");

  process.env.BRAND_MEMORY_ENABLED = "false";
  const memoryModule = await import("../netlify/functions/lib/brand-memory.js");
  const disabledResult = await memoryModule.createBrandMemory({
    userId: userA.id,
    workspaceId: workspaceA.id,
    memoryType: "brand_fact",
    content: "Should not write while disabled",
  });
  assert.deepEqual(disabledResult, { ok: false, disabled: true }, "BRAND_MEMORY_ENABLED=false must preserve existing behavior.");

  console.log("Semantic brand memory DB integration passed.");
} finally {
  if (cleanupWorkspaceIds.length) {
    await admin.from("brand_workspaces").delete().in("id", cleanupWorkspaceIds);
  }
  for (const userId of cleanupUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}
