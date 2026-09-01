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

const ALLOWED_SOURCE_TYPES = new Set([
  "confirmed_brand_dna",
  "user_edit",
  "saved_generation",
  "favorited_generation",
  "selected_primary_logo_metadata",
  "explicit_user_approval",
  "workspace_field",
]);

const SOURCE_RANK = {
  explicit_user_approval: 0,
  user_edit: 1,
  confirmed_brand_dna: 2,
  selected_primary_logo_metadata: 3,
  favorited_generation: 4,
  saved_generation: 5,
  workspace_field: 6,
};

export function isBrandMemoryEnabled() {
  return String(process.env.BRAND_MEMORY_ENABLED || "false").toLowerCase() === "true";
}

export function getBrandMemoryTestUserIds() {
  return String(process.env.BRAND_MEMORY_TEST_USER_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isBrandMemoryActiveForUser(userId) {
  if (!isBrandMemoryEnabled()) return false;
  const allowedIds = getBrandMemoryTestUserIds();
  return Boolean(userId && allowedIds.includes(String(userId)));
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

function getOperationalHashSecret() {
  return process.env.BRAND_MEMORY_OBSERVABILITY_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "brand-memory-local-observability";
}

export function hashOperationalIdentifier(value = "") {
  const normalized = normalizeContent(value);
  if (!normalized) return null;
  return crypto.createHmac("sha256", getOperationalHashSecret()).update(normalized, "utf8").digest("hex").slice(0, 24);
}

function sanitizeOperationalCode(value = "") {
  const normalized = String(value || "").toUpperCase().replace(/[^A-Z0-9_.-]/g, "_").slice(0, 80);
  return normalized || null;
}

function sanitizeEventName(value = "") {
  const normalized = String(value || "").toLowerCase().replace(/[^a-z0-9_.-]/g, "_").slice(0, 80);
  return normalized || "memory.event";
}

function sanitizeOperationalMetadata(metadata = {}) {
  const allowed = {};
  for (const key of [
    "action",
    "stage",
    "generatorType",
    "memoryType",
    "sourceType",
    "status",
    "workspaceOwned",
    "allowlisted",
    "disabled",
    "duplicate",
    "updated",
    "retrievalOk",
    "fallback",
    "violation",
  ]) {
    if (metadata[key] === undefined || metadata[key] === null) continue;
    const value = metadata[key];
    if (typeof value === "boolean" || typeof value === "number") {
      allowed[key] = value;
    } else {
      allowed[key] = normalizeContent(value).slice(0, 120);
    }
  }
  return allowed;
}

export async function recordBrandMemoryEvent({
  eventName,
  requestId = "",
  userId = "",
  workspaceId = "",
  durationMs = null,
  resultCount = null,
  code = null,
  model = null,
  metadata = {},
} = {}) {
  const safeEvent = {
    timestamp: new Date().toISOString(),
    eventName: sanitizeEventName(eventName),
    requestId: normalizeContent(requestId).slice(0, 120) || null,
    userHash: hashOperationalIdentifier(userId),
    workspaceHash: hashOperationalIdentifier(workspaceId),
    durationMs: Number.isFinite(Number(durationMs)) ? Math.max(0, Math.round(Number(durationMs))) : null,
    resultCount: Number.isFinite(Number(resultCount)) ? Math.max(0, Math.round(Number(resultCount))) : null,
    code: sanitizeOperationalCode(code),
    model: normalizeContent(model).slice(0, 80) || null,
    metadata: sanitizeOperationalMetadata(metadata),
  };

  console.info("Brand memory operational event", safeEvent);

  try {
    const supabase = getAdminClient();
    const { error } = await supabase
      .from("brand_memory_operational_events")
      .insert({
        timestamp: safeEvent.timestamp,
        event_name: safeEvent.eventName,
        request_id: safeEvent.requestId,
        user_hash: safeEvent.userHash,
        workspace_hash: safeEvent.workspaceHash,
        duration_ms: safeEvent.durationMs,
        result_count: safeEvent.resultCount,
        code: safeEvent.code,
        model: safeEvent.model,
        metadata: safeEvent.metadata,
      });
    const missingTable = error && (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /brand_memory_operational_events|schema cache|does not exist/i.test(`${error.message || ""} ${error.details || ""}`)
    );
    if (error && !missingTable) {
      console.warn("Brand memory operational event write failed", {
        eventName: safeEvent.eventName,
        requestId: safeEvent.requestId,
        code: error.code || "OPERATIONAL_EVENT_WRITE_FAILED",
        message: error.message || "Unknown operational event write error",
      });
    }
  } catch (error) {
    console.warn("Brand memory operational event skipped", {
      eventName: safeEvent.eventName,
      requestId: safeEvent.requestId,
      code: error?.code || "OPERATIONAL_EVENT_UNAVAILABLE",
      message: error?.message || "Unknown operational event error",
    });
  }

  return safeEvent;
}

function clampConfidence(value, fallback = 0.75) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(1, number));
}

function normalizeSourceType(sourceType = "confirmed_brand_dna") {
  const normalized = String(sourceType || "confirmed_brand_dna").trim().toLowerCase().replace(/\s+/g, "_");
  return ALLOWED_SOURCE_TYPES.has(normalized) ? normalized : "confirmed_brand_dna";
}

function buildSourceIdentity({ workspaceId, memoryType, sourceType, sourceId, sourceAssetId, sourceGenerator, sourceKey, version = 1 }) {
  return [
    workspaceId,
    memoryType,
    sourceType,
    sourceAssetId || sourceId || "workspace",
    sourceGenerator || "brand",
    sourceKey || "field",
    `v${version}`,
  ].filter(Boolean).join(":");
}

function memoryLog(event, fields = {}) {
  const safeEvent = {
    event,
    requestId: fields.requestId,
    userHash: hashOperationalIdentifier(fields.userId),
    workspaceHash: hashOperationalIdentifier(fields.workspaceId),
    memoryType: fields.memoryType,
    sourceType: fields.sourceType,
    status: fields.status,
    count: fields.count,
    code: fields.code,
    durationMs: fields.durationMs,
  };
  console.info("Brand memory metric", safeEvent);
  return recordBrandMemoryEvent({
    eventName: event,
    requestId: fields.requestId,
    userId: fields.userId,
    workspaceId: fields.workspaceId,
    durationMs: fields.durationMs,
    resultCount: fields.count,
    code: fields.code,
    model: fields.model,
    metadata: {
      action: fields.action,
      stage: fields.stage,
      generatorType: fields.generatorType,
      memoryType: fields.memoryType,
      sourceType: fields.sourceType,
      status: fields.status,
      duplicate: fields.duplicate,
      updated: fields.updated,
      fallback: fields.fallback,
    },
  });
}

function sanitizeMemoryForClient(memory = {}) {
  return {
    id: memory.id,
    memoryType: memory.memory_type,
    title: memory.title || memory.memory_type || "Memory",
    fact: normalizeContent(memory.content || "").slice(0, 420),
    sourceType: memory.source_type || "",
    sourceAssetId: memory.source_asset_id || memory.source_id || "",
    sourceGenerator: memory.source_generator || "",
    originalCreatedAt: memory.original_created_at || memory.created_at || "",
    lastConfirmedAt: memory.last_confirmed_at || memory.updated_at || "",
    embeddingModel: memory.embedding_model || "",
    contentVersion: memory.content_version || 1,
    status: memory.status || "active",
    confidence: Number(memory.confidence ?? 0),
    metadata: {
      label: memory.metadata?.label || memory.metadata?.source_key || "",
      source: memory.metadata?.source || "",
      conflict: memory.metadata?.conflict || null,
      disabled: Boolean(memory.metadata?.disabled),
    },
  };
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

async function getWorkspaceMemorySettings(supabase, userId, workspaceId) {
  const { data, error } = await supabase
    .from("brand_memory_workspace_settings")
    .select("memory_disabled,disabled_at,rebuilt_at,updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  const missingSettingsTable =
    error &&
    (error.code === "42P01" ||
      error.code === "PGRST205" ||
      /brand_memory_workspace_settings|schema cache|does not exist/i.test(`${error.message || ""} ${error.details || ""}`));
  if (error && !missingSettingsTable) throw new Error("Brand memory settings could not be loaded.");
  return data || { memory_disabled: false, disabled_at: null, rebuilt_at: null, updated_at: null };
}

async function assertWorkspaceMemoryEnabled(supabase, userId, workspaceId) {
  const settings = await getWorkspaceMemorySettings(supabase, userId, workspaceId);
  if (settings.memory_disabled) {
    const error = new Error("Brand memory is disabled for this workspace.");
    error.code = "BRAND_MEMORY_WORKSPACE_DISABLED";
    throw error;
  }
  return settings;
}

function getWorkspaceText(row = {}, keys = []) {
  for (const key of keys) {
    const value = row?.[key];
    if (Array.isArray(value) && value.length) return value.join(", ");
    if (value && typeof value === "object") {
      const json = JSON.stringify(value);
      if (json && json !== "{}") return json;
    }
    const text = normalizeContent(value);
    if (text) return text;
  }
  return "";
}

function inferCategoryFromWorkspace(row = {}) {
  const text = [
    row.name,
    row.description,
    row.industry,
    row.category,
    row.style,
    row.logo_direction,
    row.launch_goal,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/houseplant|plant delivery|botanical|greenery|apartment plant/.test(text)) return "Houseplants / local plant delivery";
  if (/dog grooming|pet grooming|pet care|dog walking|pet sitting/.test(text)) return "Pet care / local mobile service";
  if (/coffee|espresso|cafe|hiker|outdoor event/.test(text)) return "Coffee / mobile outdoor service";
  if (/software|saas|invoice|sponsorship|creator platform|dashboard|app/.test(text)) return "Software / creator operations";
  if (/interior|styling|homeowner|room|decor/.test(text)) return "Interior styling / local home service";
  return getWorkspaceText(row, ["industry", "category"]) || "Category needs confirmation";
}

function buildMemoryMetadata({ userId, workspaceId, sourceKey, sourceType = "confirmed_brand_dna", version = 1, extra = {} }) {
  return {
    ...extra,
    workspace_id: workspaceId,
    user_id: userId,
    source: sourceType,
    source_key: sourceKey,
    source_identity: buildSourceIdentity({
      workspaceId,
      memoryType: extra.memory_type || "memory",
      sourceType,
      sourceKey,
      version,
    }),
    version,
    updated_at: new Date().toISOString(),
  };
}

export function buildWorkspaceMemoryPayloads(row = {}, { userId, workspaceId } = {}) {
  const category = inferCategoryFromWorkspace(row);
  const brandName = getWorkspaceText(row, ["name", "brand_name"]);
  const description = getWorkspaceText(row, ["description", "business_description"]);
  const audience = getWorkspaceText(row, ["audience", "target_audience", "target_audiences"]);
  const thesis = getWorkspaceText(row, ["brand_thesis", "thesis", "offer"]);
  const positioning = getWorkspaceText(row, ["positioning", "differentiator", "core_positioning"]);
  const voice = getWorkspaceText(row, ["tone", "voice", "brand_voice", "voice_traits"]);
  const style = getWorkspaceText(row, ["style", "personality", "personality_style"]);
  const visualDirection = getWorkspaceText(row, ["visual_direction", "visual_identity_direction", "logo_direction", "moodboard_direction"]);
  const colors = getWorkspaceText(row, ["color_system", "colors", "palette", "logo_metadata"]);
  const products = getWorkspaceText(row, ["products", "services", "offer"]);
  const problems = getWorkspaceText(row, ["customer_problems", "audience_pain", "desired_outcomes", "launch_goal"]);
  const preferences = getWorkspaceText(row, ["exclusions", "avoid", "preferences"]);
  const primaryLogo = getWorkspaceText(row, ["primary_logo_asset_id", "logo_image_url", "logo_metadata"]);

  const items = [
    {
      key: "brand_basics",
      memoryType: "brand_fact",
      title: `${brandName || "Brand"} basics`,
      content: [
        brandName && `Brand name: ${brandName}`,
        description && `Business description: ${description}`,
        category && `Industry/category: ${category}`,
      ].filter(Boolean).join("\n"),
      importance: 5,
    },
    { key: "audience", memoryType: "audience", title: "Target audience", content: audience, importance: 5 },
    {
      key: "positioning",
      memoryType: "positioning",
      title: "Brand thesis and positioning",
      content: [thesis && `Thesis: ${thesis}`, positioning && `Positioning: ${positioning}`].filter(Boolean).join("\n"),
      importance: 5,
    },
    {
      key: "voice",
      memoryType: "voice",
      title: "Voice and personality",
      content: [voice && `Voice traits: ${voice}`, style && `Personality/style: ${style}`].filter(Boolean).join("\n"),
      importance: 4,
    },
    {
      key: "visual_identity",
      memoryType: "visual_direction",
      title: "Visual identity direction",
      content: [visualDirection && `Visual direction: ${visualDirection}`, colors && `Color system: ${colors}`].filter(Boolean).join("\n"),
      importance: 4,
    },
    { key: "products_services", memoryType: "product", title: "Products and services", content: products, importance: 4 },
    { key: "customer_outcomes", memoryType: "brand_fact", title: "Customer problems and outcomes", content: problems, importance: 4 },
    { key: "preferences_exclusions", memoryType: "user_preference", title: "User preferences and exclusions", content: preferences, importance: 3 },
    { key: "primary_logo", memoryType: "visual_direction", title: "Approved primary logo", content: primaryLogo ? `Approved primary logo information: ${primaryLogo}` : "", importance: 3 },
  ];

  return items
    .map((item) => ({
      memoryType: item.memoryType,
      title: item.title,
      content: normalizeContent(item.content),
      sourceType: "confirmed_brand_dna",
      sourceGenerator: "brand_workspace",
      sourceAssetId: null,
      sourceId: workspaceId,
      importance: item.importance,
      confidence: 0.95,
      metadata: buildMemoryMetadata({ userId, workspaceId, sourceKey: item.key, sourceType: "confirmed_brand_dna", extra: { memory_type: item.memoryType } }),
    }))
    .filter((item) => item.content);
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
  requestId = "",
  memoryType,
  title = "",
  content,
  sourceType = null,
  sourceId = null,
  sourceAssetId = null,
  sourceGenerator = null,
  importance = 1,
  confidence = 0.75,
  metadata = {},
}) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
  if (!userId || !workspaceId) throw new Error("User and workspace are required.");
  if (!ALLOWED_MEMORY_TYPES.has(memoryType)) throw new Error("Unsupported memory type.");

  const normalized = normalizeContent(content);
  if (!normalized) throw new Error("Memory content is required.");

  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  await assertWorkspaceMemoryEnabled(supabase, userId, workspaceId);

  const contentHash = hashContent(normalized);
  const { data: existing, error: existingError } = await supabase
    .from("brand_memories")
    .select("id,status,content_hash")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("memory_type", memoryType)
    .eq("content_hash", contentHash)
    .eq("status", "active")
    .maybeSingle();

  if (existingError) throw new Error("Existing memory could not be checked.");
  if (existing) {
    await memoryLog("memory_write_duplicate", { requestId, userId, workspaceId, memoryType, sourceType, count: 1, duplicate: true });
    return { ok: true, duplicate: true, memory: existing };
  }

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
      source_type: normalizeSourceType(sourceType),
      source_id: sourceId,
      source_asset_id: sourceAssetId,
      source_generator: normalizeContent(sourceGenerator).slice(0, 80) || null,
      importance: Math.max(1, Math.min(5, Number(importance) || 1)),
      confidence: clampConfidence(confidence),
      metadata: { ...metadata, embedding_model: model },
      embedded_at: now,
      original_created_at: now,
      last_confirmed_at: now,
      updated_at: now,
    })
    .select("id,memory_type,title,source_type,source_id,source_asset_id,source_generator,importance,status,confidence,content_version,created_at,last_confirmed_at")
    .single();

  if (error) throw new Error("Brand memory could not be saved.");
  await memoryLog("memory_write_success", {
    requestId,
    userId,
    workspaceId,
    memoryType,
    sourceType,
    count: 1,
    model,
  });
  return { ok: true, duplicate: false, memory: data };
}

export async function updateBrandMemory({ userId, workspaceId, requestId = "", memoryId, content, title, importance, metadata }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  await assertWorkspaceMemoryEnabled(supabase, userId, workspaceId);

  const normalized = normalizeContent(content);
  if (!normalized) throw new Error("Memory content is required.");
  const { embedding, model } = await createEmbedding(normalized);

  const { data: existing } = await supabase
    .from("brand_memories")
    .select("content_version,metadata")
    .eq("id", memoryId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  const nextVersion = Math.max(1, Number(existing?.content_version || 1) + 1);
  const { data, error } = await supabase
    .from("brand_memories")
    .update({
      content: normalized,
      content_hash: hashContent(normalized),
      title: normalizeContent(title).slice(0, 240) || null,
      importance: Math.max(1, Math.min(5, Number(importance) || 1)),
      content_version: nextVersion,
      metadata: { ...(existing?.metadata || {}), ...(metadata || {}), embedding_model: model, content_version: nextVersion },
      embedding,
      embedding_model: model,
      embedded_at: new Date().toISOString(),
      last_confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", memoryId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("id,memory_type,title,importance,status,updated_at")
    .single();

  if (error) throw new Error("Brand memory could not be updated.");
  await memoryLog("memory_edit_supersede", { requestId, userId, workspaceId, memoryType: data?.memory_type, count: 1, model });
  return { ok: true, memory: data };
}

export async function searchBrandMemories({
  userId,
  workspaceId,
  requestId = "",
  query,
  memoryTypes = null,
  matchCount = 8,
  similarityThreshold = 0.35,
}) {
  if (!isBrandMemoryActiveForUser(userId)) {
    await memoryLog("retrieval_fallback", { requestId, userId, workspaceId, generatorType: "search", code: "BRAND_MEMORY_DISABLED", fallback: true, count: 0 });
    return { ok: false, disabled: true, memories: [] };
  }
  const normalized = normalizeContent(query);
  if (!normalized) {
    await memoryLog("retrieval_empty", { requestId, userId, workspaceId, generatorType: "search", code: "EMPTY_QUERY", count: 0 });
    return { ok: true, memories: [] };
  }

  const supabase = getAdminClient();
  const startedAt = Date.now();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  await assertWorkspaceMemoryEnabled(supabase, userId, workspaceId);
  let embedding;
  let model;
  try {
    const embeddingResult = await createEmbedding(normalized);
    embedding = embeddingResult.embedding;
    model = embeddingResult.model;
  } catch (error) {
    await memoryLog("embedding_provider_failure", {
      requestId,
      userId,
      workspaceId,
      code: error?.code || "EMBEDDING_PROVIDER_FAILED",
      durationMs: Date.now() - startedAt,
      count: 0,
    });
    throw error;
  }

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

  if (error) {
    await memoryLog("retrieval_fallback", {
      requestId,
      userId,
      workspaceId,
      code: error.code || "BRAND_MEMORY_SEARCH_FAILED",
      durationMs: Date.now() - startedAt,
      count: 0,
      fallback: true,
      model,
    });
    throw new Error("Brand memory search failed.");
  }
  await memoryLog((data || []).length ? "retrieval_success" : "retrieval_empty", {
    requestId,
    userId,
    workspaceId,
    count: (data || []).length,
    durationMs: Date.now() - startedAt,
    model,
  });
  return { ok: true, memories: data || [] };
}

export async function deactivateBrandMemory({ userId, workspaceId, requestId = "", memoryId }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  await assertWorkspaceMemoryEnabled(supabase, userId, workspaceId);
  const { data, error } = await supabase
    .from("brand_memories")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .eq("id", memoryId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("id,status,updated_at")
    .single();
  if (error) throw new Error("Brand memory could not be deactivated.");
  await memoryLog("memory_deactivated", { requestId, userId, workspaceId, count: 1, status: "inactive" });
  return { ok: true, memory: data };
}

export async function listWorkspaceMemoryControls({ userId, workspaceId }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true, memories: [], categories: {} };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  const settings = await getWorkspaceMemorySettings(supabase, userId, workspaceId);
  const { data, error } = await supabase
    .from("brand_memories")
    .select("id,memory_type,title,content,source_type,source_id,source_asset_id,source_generator,embedding_model,content_version,status,confidence,metadata,created_at,original_created_at,last_confirmed_at,updated_at")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .in("status", ["active", "superseded"])
    .order("status", { ascending: true })
    .order("memory_type", { ascending: true })
    .order("last_confirmed_at", { ascending: false });
  if (error) throw new Error("Brand memory list could not be loaded.");
  const memories = (data || []).map(sanitizeMemoryForClient);
  const activeMemories = memories.filter((memory) => memory.status === "active");
  const categories = activeMemories.reduce((acc, memory) => {
    acc[memory.memoryType] = (acc[memory.memoryType] || 0) + 1;
    return acc;
  }, {});
  return {
    ok: true,
    workspaceId,
    disabled: Boolean(settings.memory_disabled),
    lastRefreshedAt: settings.rebuilt_at || activeMemories.map((memory) => memory.lastConfirmedAt).filter(Boolean).sort().at(-1) || null,
    activeCount: activeMemories.length,
    categories,
    memories,
  };
}

export async function getWorkspaceMemoryStatus({ userId, workspaceId }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true, workspaceOwned: false, memoryDisabled: false };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  const settings = await getWorkspaceMemorySettings(supabase, userId, workspaceId);
  return {
    ok: true,
    workspaceId,
    workspaceOwned: true,
    memoryDisabled: Boolean(settings.memory_disabled),
    lastRefreshedAt: settings.rebuilt_at || null,
  };
}

export async function forgetBrandMemory({ userId, workspaceId, requestId = "", memoryId }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  await assertWorkspaceMemoryEnabled(supabase, userId, workspaceId);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("brand_memories")
    .update({
      status: "deleted",
      content: "[forgotten by user]",
      content_hash: hashContent(`[forgotten:${memoryId}:${now}]`),
      embedding: null,
      deleted_at: now,
      updated_at: now,
      metadata: { deletion_event: true, deleted_at: now },
    })
    .eq("id", memoryId)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("id,status,deleted_at")
    .single();
  if (error) throw new Error("Brand memory could not be forgotten.");
  await memoryLog("memory_forget_delete", { requestId, userId, workspaceId, count: 1, status: "deleted" });
  return { ok: true, memory: data };
}

export async function setWorkspaceMemoryDisabled({ userId, workspaceId, requestId = "", disabled = true }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("brand_memory_workspace_settings")
    .upsert({
      user_id: userId,
      workspace_id: workspaceId,
      memory_disabled: Boolean(disabled),
      disabled_at: disabled ? now : null,
      updated_at: now,
      metadata: { source: "settings_control" },
    }, { onConflict: "user_id,workspace_id" })
    .select("memory_disabled,disabled_at,rebuilt_at,updated_at")
    .single();
  if (error) throw new Error("Brand memory workspace setting could not be updated.");
  await memoryLog(disabled ? "workspace_memory_disabled" : "workspace_memory_enabled", { requestId, userId, workspaceId, durationMs: 0 });
  return { ok: true, workspaceId, disabled: Boolean(data.memory_disabled), settings: data };
}

export async function deleteWorkspaceMemories({ userId, workspaceId, requestId = "" }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("brand_memories")
    .update({
      status: "deleted",
      content: "[workspace memory deleted by user]",
      content_hash: hashContent(`[workspace-forgotten:${workspaceId}:${now}]`),
      embedding: null,
      deleted_at: now,
      updated_at: now,
      metadata: { deletion_event: true, workspace_memory_deleted_at: now },
    })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .neq("status", "deleted")
    .select("id,status");
  if (error) throw new Error("Workspace memories could not be deleted.");
  await memoryLog("workspace_memories_deleted", { requestId, userId, workspaceId, count: data?.length || 0, durationMs: 0 });
  return { ok: true, workspaceId, deletedCount: data?.length || 0 };
}

export async function rebuildWorkspaceMemories({ userId, workspaceId, requestId = "", memories = [], dryRun = false }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true, results: [] };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  const settings = await getWorkspaceMemorySettings(supabase, userId, workspaceId);
  if (settings.memory_disabled && !dryRun) {
    await memoryLog("retrieval_fallback", { requestId, userId, workspaceId, code: "BRAND_MEMORY_WORKSPACE_DISABLED", fallback: true, count: 0 });
    return { ok: false, disabled: true, code: "BRAND_MEMORY_WORKSPACE_DISABLED", results: [] };
  }
  if (dryRun) return { ok: true, workspaceId, results: [] };
  const payloads = memories.length ? memories : await getWorkspaceMemoryPayloads({ supabase, userId, workspaceId });
  const results = [];
  const startedAt = Date.now();
  for (const memory of payloads.slice(0, 100)) {
    results.push(await upsertWorkspaceMemory({ supabase, userId, workspaceId, requestId, ...memory }));
  }
  await supabase
    .from("brand_memory_workspace_settings")
    .upsert({
      user_id: userId,
      workspace_id: workspaceId,
      memory_disabled: false,
      rebuilt_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,workspace_id" });
  await memoryLog("refresh_complete", {
    requestId,
    userId,
    workspaceId,
    count: results.length,
    durationMs: Date.now() - startedAt,
  });
  return { ok: true, results };
}

async function getWorkspaceMemoryPayloads({ supabase, userId, workspaceId }) {
  const { data: workspace, error } = await supabase
    .from("brand_workspaces")
    .select("*")
    .eq("id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("Workspace memories could not be loaded.");
  if (!workspace) {
    const denied = new Error("Workspace not found.");
    denied.code = "WORKSPACE_NOT_FOUND";
    throw denied;
  }

  let logoAsset = null;
  const primaryLogoAssetId = workspace.primary_logo_asset_id || "";
  if (primaryLogoAssetId) {
    const { data } = await supabase
      .from("saved_generations")
      .select("id,title,tool,content,image_url,created_at")
      .eq("id", primaryLogoAssetId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .maybeSingle();
    logoAsset = data || null;
  }

  return buildWorkspaceMemoryPayloads({
    ...workspace,
    primary_logo_asset_id: primaryLogoAssetId,
    logo_metadata: workspace.logo_metadata || logoAsset?.title || "",
  }, { userId, workspaceId });
}

async function upsertWorkspaceMemory({
  supabase,
  userId,
  workspaceId,
  requestId = "",
  memoryType,
  title = "",
  content,
  sourceType = "workspace_field",
  sourceId = null,
  sourceAssetId = null,
  sourceGenerator = null,
  importance = 1,
  confidence = 0.75,
  metadata = {},
}) {
  if (!ALLOWED_MEMORY_TYPES.has(memoryType)) throw new Error("Unsupported memory type.");
  const normalized = normalizeContent(content);
  if (!normalized) throw new Error("Memory content is required.");
  const contentHash = hashContent(normalized);
  const normalizedSourceType = normalizeSourceType(sourceType);
  const sourceIdentity = metadata?.source_identity || buildSourceIdentity({
    workspaceId,
    memoryType,
    sourceType: normalizedSourceType,
    sourceId: sourceId || workspaceId,
    sourceAssetId,
    sourceGenerator,
    sourceKey: metadata?.source_key || memoryType,
    version: metadata?.version || 1,
  });
  const now = new Date().toISOString();

  let existingQuery = supabase
    .from("brand_memories")
    .select("id,content_hash,status,content_version,original_created_at,metadata")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("memory_type", memoryType)
    .eq("source_type", normalizedSourceType)
    .eq("source_id", sourceId || workspaceId)
    .contains("metadata", { source_identity: sourceIdentity })
    .limit(1);
  existingQuery = sourceAssetId ? existingQuery.eq("source_asset_id", sourceAssetId) : existingQuery.is("source_asset_id", null);
  const { data: existingRows, error: existingError } = await existingQuery;

  if (existingError) throw new Error("Existing memory could not be checked.");
  let existing = existingRows?.[0] || null;
  if (!existing) {
    const { data: legacyRows, error: legacyError } = await supabase
      .from("brand_memories")
      .select("id,content_hash,status,content_version,original_created_at,metadata")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("memory_type", memoryType)
      .eq("content_hash", contentHash)
      .eq("status", "active")
      .limit(1);
    if (legacyError) {
      console.warn("Brand memory legacy lookup failed", {
        userHash: hashOperationalIdentifier(userId),
        workspaceHash: hashOperationalIdentifier(workspaceId),
        memoryType,
        code: legacyError.code,
        message: legacyError.message,
      });
      throw new Error("Existing memory could not be checked.");
    }
    existing = legacyRows?.[0] || null;
  }
  if (existing?.content_hash === contentHash && existing.status === "active") {
    const { data, error } = await supabase
      .from("brand_memories")
      .update({
        source_type: normalizedSourceType,
        source_id: sourceId || workspaceId,
        source_asset_id: sourceAssetId || null,
        source_generator: normalizeContent(sourceGenerator).slice(0, 80) || null,
        confidence: clampConfidence(confidence),
        metadata: { ...(existing.metadata || {}), ...metadata, source_identity: sourceIdentity, updated_at: now },
        last_confirmed_at: now,
        updated_at: now,
      })
      .eq("id", existing.id)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .select("id,memory_type,title,source_type,source_id,source_asset_id,source_generator,importance,status,confidence,content_version,updated_at,last_confirmed_at")
      .single();
    if (error) throw new Error("Brand memory confirmation could not be saved.");
    await memoryLog("memory_refresh_upsert", {
      requestId,
      userId,
      workspaceId,
      memoryType,
      sourceType: normalizedSourceType,
      count: 1,
      duplicate: true,
      model: data?.embedding_model,
    });
    return { ok: true, duplicate: true, memory: data };
  }

  const { embedding, model } = await createEmbedding(normalized);
  const nextVersion = Math.max(1, Number(existing?.content_version || 0) + 1);
  const row = {
    user_id: userId,
    workspace_id: workspaceId,
    memory_type: memoryType,
    title: normalizeContent(title).slice(0, 240) || null,
    content: normalized,
    content_hash: contentHash,
    embedding,
    embedding_model: model,
    source_type: normalizedSourceType,
    source_id: sourceId || workspaceId,
    source_asset_id: sourceAssetId || null,
    source_generator: normalizeContent(sourceGenerator).slice(0, 80) || null,
    importance: Math.max(1, Math.min(5, Number(importance) || 1)),
    confidence: clampConfidence(confidence),
    content_version: nextVersion,
    original_created_at: existing?.original_created_at || now,
    last_confirmed_at: now,
    supersedes_memory_id: existing?.id || null,
    metadata: { ...metadata, source_identity: sourceIdentity, embedding_model: model, content_version: nextVersion, updated_at: now },
    status: "active",
    embedded_at: now,
    updated_at: now,
  };

  if (existing?.id) {
    const { error: supersedeError } = await supabase
      .from("brand_memories")
      .update({ status: "superseded", updated_at: now, last_confirmed_at: now })
      .eq("id", existing.id)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    if (supersedeError) throw new Error("Prior memory version could not be superseded.");
  }

  const { data, error } = await supabase
    .from("brand_memories")
    .insert(row)
    .select("id,memory_type,title,source_type,source_id,source_asset_id,source_generator,importance,status,confidence,content_version,created_at,last_confirmed_at")
    .single();

  if (error) {
    console.warn("Brand memory upsert insert failed", {
      userHash: hashOperationalIdentifier(userId),
      workspaceHash: hashOperationalIdentifier(workspaceId),
      memoryType,
      sourceType: normalizedSourceType,
      sourceAssetPresent: Boolean(sourceAssetId),
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Brand memory could not be saved.");
  }
  await memoryLog("memory_refresh_upsert", {
    requestId,
    userId,
    workspaceId,
    memoryType,
    sourceType: normalizedSourceType,
    count: 1,
    duplicate: false,
    updated: Boolean(existing?.id),
    model,
  });
  return { ok: true, duplicate: false, updated: Boolean(existing?.id), memory: data };
}

export async function getGeneratorMemoryContext({ userId, workspaceId, requestId = "", query, generatorType = "captions" }) {
  if (!isBrandMemoryActiveForUser(userId)) {
    await memoryLog("retrieval_fallback", { requestId, userId, workspaceId, generatorType, code: "BRAND_MEMORY_DISABLED", fallback: true, count: 0 });
    return { ok: false, disabled: true, memories: [], context: "" };
  }
  if (!workspaceId) {
    await memoryLog("retrieval_fallback", { requestId, userId, workspaceId, generatorType, code: "BRAND_MEMORY_WORKSPACE_REQUIRED", fallback: true, count: 0 });
    return { ok: false, code: "BRAND_MEMORY_WORKSPACE_REQUIRED", memories: [], context: "" };
  }

  try {
    const startedAt = Date.now();
    const typeGroups = {
      captions: ["brand_fact", "audience", "positioning", "voice", "visual_direction", "product", "user_preference"],
      hashtags: ["brand_fact", "audience", "positioning", "voice", "product", "user_preference"],
      hooks: ["brand_fact", "audience", "positioning", "voice", "product", "user_preference"],
      bios: ["brand_fact", "audience", "positioning", "voice", "product", "user_preference"],
      email: ["brand_fact", "audience", "positioning", "voice", "product", "user_preference"],
      strategy: ["brand_fact", "audience", "positioning", "voice", "visual_direction", "product", "user_preference"],
      audit: ["brand_fact", "audience", "positioning", "voice", "visual_direction", "product", "user_preference"],
      campaign: ["brand_fact", "audience", "positioning", "voice", "visual_direction", "product", "user_preference"],
      growth: ["brand_fact", "audience", "positioning", "voice", "product", "user_preference"],
    };
    const result = await searchBrandMemories({
      userId,
      workspaceId,
      requestId,
      query,
      memoryTypes: typeGroups[generatorType] || typeGroups.captions,
      matchCount: 8,
      similarityThreshold: 0.2,
    });
    const memories = (result.memories || [])
      .filter((memory) => normalizeContent(memory.content || ""))
      .filter((memory) => memory.status !== "superseded" && memory.status !== "deleted")
      .filter((memory) => !memory.metadata?.conflict && !memory.metadata?.disabled)
      .sort((a, b) => {
        const sourceRank = (memory) => SOURCE_RANK[memory.source_type] ?? 9;
        const importanceRank = (memory) => Number(b.importance || 0) - Number(a.importance || 0);
        const confirmedRank = new Date(b.last_confirmed_at || b.updated_at || 0).getTime() - new Date(a.last_confirmed_at || a.updated_at || 0).getTime();
        return sourceRank(a) - sourceRank(b) || importanceRank || confirmedRank;
      })
      .slice(0, 6);
    const context = memories
      .map((memory, index) => {
        const type = normalizeContent(memory.memory_type || "memory");
        const title = normalizeContent(memory.title || type);
        const content = normalizeContent(memory.content || "")
          .replace(/\b(fragrant|scented|aromatic|perfumed)\s+(houseplants?|plants?|pothos|snake plants?|peace lilies?|spider plants?|succulents?|ferns?)\b/gi, "$2")
          .replace(/\b(air purification|purifies the air|improves? indoor air quality|cleaner air|guaranteed growth|pet[- ]safe|non[- ]toxic)\b/gi, "");
        return content ? `${index + 1}. ${title} (${type}): ${content}` : "";
      })
      .filter(Boolean)
      .join("\n");
    await memoryLog(context ? "retrieval_success" : "retrieval_empty", {
      requestId,
      userId,
      workspaceId,
      generatorType,
      count: memories.length,
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, memories, context };
  } catch (error) {
    console.warn("Brand memory retrieval failed", {
      userHash: hashOperationalIdentifier(userId),
      workspaceHash: hashOperationalIdentifier(workspaceId),
      generatorType,
      code: error?.code || "BRAND_MEMORY_RETRIEVAL_FAILED",
      message: error?.message || "Unknown memory retrieval error",
    });
    await memoryLog("retrieval_fallback", {
      requestId,
      userId,
      workspaceId,
      generatorType,
      code: error?.code || "BRAND_MEMORY_RETRIEVAL_FAILED",
      fallback: true,
      count: 0,
    });
    return { ok: false, code: "BRAND_MEMORY_RETRIEVAL_FAILED", memories: [], context: "" };
  }
}

export async function getCaptionMemoryContext(options) {
  return getGeneratorMemoryContext({ ...options, generatorType: "captions" });
}

function percentile(values = [], percentileRank = 0.5) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * percentileRank) - 1));
  return sorted[index];
}

export async function getBrandMemoryOperationalSummary({ userId, workspaceId = "", hours = 24 } = {}) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
  const supabase = getAdminClient();
  const since = new Date(Date.now() - Math.max(1, Math.min(168, Number(hours) || 24)) * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("brand_memory_operational_events")
    .select("timestamp,event_name,request_id,user_hash,workspace_hash,duration_ms,result_count,code,model,metadata")
    .eq("user_hash", hashOperationalIdentifier(userId))
    .gte("timestamp", since)
    .order("timestamp", { ascending: false })
    .limit(2000);

  if (workspaceId) query = query.eq("workspace_hash", hashOperationalIdentifier(workspaceId));

  const { data, error } = await query;
  const missingTable = error && (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /brand_memory_operational_events|schema cache|does not exist/i.test(`${error.message || ""} ${error.details || ""}`)
  );
  if (missingTable) return { ok: false, code: "BRAND_MEMORY_OBSERVABILITY_NOT_INSTALLED", events: [] };
  if (error) throw new Error("Brand memory operational summary could not be loaded.");

  const rows = data || [];
  const byEvent = {};
  const byCode = {};
  const growthByWorkspace = {};
  const durations = [];
  let retrievalSuccess = 0;
  let retrievalFallback = 0;
  let retrievalEmpty = 0;
  let violationCount = 0;

  for (const row of rows) {
    byEvent[row.event_name] = (byEvent[row.event_name] || 0) + 1;
    if (row.code) byCode[row.code] = (byCode[row.code] || 0) + 1;
    if (Number.isFinite(Number(row.duration_ms))) durations.push(Number(row.duration_ms));
    if (row.event_name === "retrieval_success") retrievalSuccess += 1;
    if (row.event_name === "retrieval_fallback") retrievalFallback += 1;
    if (row.event_name === "retrieval_empty") retrievalEmpty += 1;
    if (/violation|blocked|unauthorized|cross_workspace/i.test(row.event_name) || row.metadata?.violation) violationCount += 1;
    if (/memory_(write|refresh_upsert|forget_delete)|workspace_memories_deleted/.test(row.event_name)) {
      const key = row.workspace_hash || "unknown";
      growthByWorkspace[key] = (growthByWorkspace[key] || 0) + Number(row.result_count || 0);
    }
  }

  return {
    ok: true,
    since,
    eventCount: rows.length,
    retrieval: {
      success: retrievalSuccess,
      empty: retrievalEmpty,
      fallback: retrievalFallback,
      successRate: retrievalSuccess + retrievalFallback + retrievalEmpty
        ? retrievalSuccess / (retrievalSuccess + retrievalFallback + retrievalEmpty)
        : null,
    },
    errorsByCode: byCode,
    eventsByName: byEvent,
    latencyMs: {
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
    },
    memoryGrowthByHashedWorkspace: growthByWorkspace,
    duplicateSupersededDeletedRetrievalViolations: violationCount,
    recentEvents: rows.slice(0, 25).map((row) => ({
      timestamp: row.timestamp,
      eventName: row.event_name,
      requestId: row.request_id,
      userHash: row.user_hash,
      workspaceHash: row.workspace_hash,
      durationMs: row.duration_ms,
      resultCount: row.result_count,
      code: row.code,
      model: row.model,
    })),
  };
}

export function getBrandMemoryDiagnostics() {
  return {
    enabled: isBrandMemoryEnabled(),
    allowlistCount: getBrandMemoryTestUserIds().length,
    embeddingModel: process.env.BRAND_MEMORY_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
    allowedSourceTypes: Array.from(ALLOWED_SOURCE_TYPES),
  };
}
