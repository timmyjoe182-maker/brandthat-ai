import crypto from "node:crypto";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const MAX_MEMORY_LENGTH = 12000;
const ALLOWED_MEMORY_TYPES = new Set([
  "brand_fact",
  "audience",
  "positioning",
  "voice",
  "visual_direction",
  "product",
  "campaign",
  "saved_output",
  "user_preference",
  "rejected_direction",
]);

export function isBrandMemoryEnabled() {
  return String(process.env.BRAND_MEMORY_ENABLED || "false").toLowerCase() === "true";
}

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Brand memory database configuration is missing.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeContent(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, MAX_MEMORY_LENGTH);
}

function hashContent(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function assertWorkspaceOwnership(supabase, userId, workspaceId) {
  const { data, error } = await supabase
    .from("brand_workspaces")
    .select("id,user_id")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Workspace ownership could not be verified.");
  if (!data) {
    const denied = new Error("Workspace not found.");
    denied.code = "WORKSPACE_NOT_FOUND";
    throw denied;
  }
}

async function createEmbedding(content) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) throw new Error("Embedding provider is not configured.");

  const model = process.env.BRAND_MEMORY_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL;
  const client = new OpenAI({ apiKey, timeout: 15000, maxRetries: 2 });
  const response = await client.embeddings.create({
    model,
    input: content,
    encoding_format: "float",
  });
  const embedding = response?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length !== 1536) {
    throw new Error("Embedding provider returned an unexpected vector dimension.");
  }
  return { embedding, model };
}

export async function createBrandMemory({
  userId,
  workspaceId,
  memoryType,
  title = "",
  content,
  sourceType = null,
  sourceId = null,
  importance = 1,
  metadata = {},
}) {
  if (!isBrandMemoryEnabled()) return { ok: false, disabled: true };
  if (!userId || !workspaceId) throw new Error("User and workspace are required.");
  if (!ALLOWED_MEMORY_TYPES.has(memoryType)) throw new Error("Unsupported memory type.");

  const normalized = normalizeContent(content);
  if (!normalized) throw new Error("Memory content is required.");

  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);

  const contentHash = hashContent(normalized);
  const { data: existing, error: existingError } = await supabase
    .from("brand_memories")
    .select("id,status,content_hash")
    .eq("workspace_id", workspaceId)
    .eq("memory_type", memoryType)
    .eq("content_hash", contentHash)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) throw new Error("Existing memory could not be checked.");
  if (existing) return { ok: true, duplicate: true, memory: existing };

  const { embedding, model } = await createEmbedding(normalized);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("brand_memories")
    .insert({
      user_id: userId,
      workspace_id: workspaceId,
      memory_type: memoryType,
      title: normalizeContent(title).slice(0, 240) || null,
      content: normalized,
      content_hash: contentHash,
      embedding,
      embedding_model: model,
      source_type: sourceType,
      source_id: sourceId,
      importance: Math.max(1, Math.min(5, Number(importance) || 1)),
      metadata: { ...metadata, embedding_model: model },
      embedded_at: now,
      updated_at: now,
    })
    .select("id,memory_type,title,source_type,source_id,importance,status,created_at")
    .single();

  if (error) throw new Error("Brand memory could not be saved.");
  return { ok: true, duplicate: false, memory: data };
}

export async function updateBrandMemory({ userId, workspaceId, memoryId, content, title, importance, metadata }) {
  if (!isBrandMemoryEnabled()) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);

  const normalized = normalizeContent(content);
  if (!normalized) throw new Error("Memory content is required.");
  const { embedding, model } = await createEmbedding(normalized);

  const { data, error } = await supabase
    .from("brand_memories")
    .update({
      content: normalized,
      content_hash: hashContent(normalized),
      title: normalizeContent(title).slice(0, 240) || null,
      importance: Math.max(1, Math.min(5, Number(importance) || 1)),
      metadata: { ...(metadata || {}), embedding_model: model },
      embedding,
      embedding_model: model,
      embedded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memoryId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("id,memory_type,title,importance,status,updated_at")
    .single();

  if (error) throw new Error("Brand memory could not be updated.");
  return { ok: true, memory: data };
}

export async function searchBrandMemories({
  userId,
  workspaceId,
  query,
  memoryTypes = null,
  matchCount = 8,
  similarityThreshold = 0.35,
}) {
  if (!isBrandMemoryEnabled()) return { ok: false, disabled: true, memories: [] };
  const normalized = normalizeContent(query);
  if (!normalized) return { ok: true, memories: [] };

  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  const { embedding } = await createEmbedding(normalized);

  // The RPC also checks auth.uid() for direct authenticated calls. Because this
  // server module uses the service role, ownership is verified immediately above
  // and every returned row remains constrained to this workspace.
  const { data, error } = await supabase.rpc("match_brand_memories_admin", {
    requested_user_id: userId,
    requested_workspace_id: workspaceId,
    query_embedding: embedding,
    requested_memory_types: memoryTypes,
    requested_match_count: Math.max(1, Math.min(20, Number(matchCount) || 8)),
    requested_similarity_threshold: Math.max(0, Math.min(1, Number(similarityThreshold) || 0.35)),
  });

  if (error) throw new Error("Brand memory search failed.");
  return { ok: true, memories: data || [] };
}

export async function deactivateBrandMemory({ userId, workspaceId, memoryId }) {
  if (!isBrandMemoryEnabled()) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  const { data, error } = await supabase
    .from("brand_memories")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", memoryId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("id,status,updated_at")
    .single();
  if (error) throw new Error("Brand memory could not be deactivated.");
  return { ok: true, memory: data };
}

export async function rebuildWorkspaceMemories({ userId, workspaceId, memories = [] }) {
  if (!isBrandMemoryEnabled()) return { ok: false, disabled: true, results: [] };
  const results = [];
  for (const memory of memories.slice(0, 100)) {
    results.push(await createBrandMemory({ userId, workspaceId, ...memory }));
  }
  return { ok: true, results };
}
