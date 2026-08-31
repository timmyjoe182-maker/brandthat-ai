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

function buildMemoryMetadata({ userId, workspaceId, sourceKey, version = 1, extra = {} }) {
  return {
    ...extra,
    workspace_id: workspaceId,
    user_id: userId,
    source: "brand_workspace",
    source_key: sourceKey,
    source_identity: `${workspaceId}:${sourceKey}:v${version}`,
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
      sourceType: "workspace_field",
      sourceId: workspaceId,
      importance: item.importance,
      metadata: buildMemoryMetadata({ userId, workspaceId, sourceKey: item.key }),
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
  memoryType,
  title = "",
  content,
  sourceType = null,
  sourceId = null,
  importance = 1,
  metadata = {},
}) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
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
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
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
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true, memories: [] };
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
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true };
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

export async function rebuildWorkspaceMemories({ userId, workspaceId, memories = [], dryRun = false }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true, results: [] };
  const supabase = getAdminClient();
  await assertWorkspaceOwnership(supabase, userId, workspaceId);
  if (dryRun) return { ok: true, workspaceId, results: [] };
  const payloads = memories.length ? memories : await getWorkspaceMemoryPayloads({ supabase, userId, workspaceId });
  const results = [];
  for (const memory of payloads.slice(0, 100)) {
    results.push(await upsertWorkspaceMemory({ supabase, userId, workspaceId, ...memory }));
  }
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
  memoryType,
  title = "",
  content,
  sourceType = "workspace_field",
  sourceId = null,
  importance = 1,
  metadata = {},
}) {
  if (!ALLOWED_MEMORY_TYPES.has(memoryType)) throw new Error("Unsupported memory type.");
  const normalized = normalizeContent(content);
  if (!normalized) throw new Error("Memory content is required.");
  const contentHash = hashContent(normalized);
  const sourceIdentity = metadata?.source_identity || `${workspaceId}:${memoryType}:v1`;
  const now = new Date().toISOString();

  const { data: existingRows, error: existingError } = await supabase
    .from("brand_memories")
    .select("id,content_hash,status")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .eq("memory_type", memoryType)
    .eq("source_type", sourceType)
    .eq("source_id", sourceId || workspaceId)
    .contains("metadata", { source_identity: sourceIdentity })
    .limit(1);

  if (existingError) throw new Error("Existing memory could not be checked.");
  const existing = existingRows?.[0] || null;
  if (existing?.content_hash === contentHash && existing.status === "active") {
    return { ok: true, duplicate: true, memory: existing };
  }

  const { embedding, model } = await createEmbedding(normalized);
  const row = {
    user_id: userId,
    workspace_id: workspaceId,
    memory_type: memoryType,
    title: normalizeContent(title).slice(0, 240) || null,
    content: normalized,
    content_hash: contentHash,
    embedding,
    embedding_model: model,
    source_type: sourceType,
    source_id: sourceId || workspaceId,
    importance: Math.max(1, Math.min(5, Number(importance) || 1)),
    metadata: { ...metadata, embedding_model: model, updated_at: now },
    status: "active",
    embedded_at: now,
    updated_at: now,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("brand_memories")
      .update(row)
      .eq("id", existing.id)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .select("id,memory_type,title,source_type,source_id,importance,status,updated_at")
      .single();
    if (error) throw new Error("Brand memory could not be updated.");
    return { ok: true, updated: true, memory: data };
  }

  const { data, error } = await supabase
    .from("brand_memories")
    .insert(row)
    .select("id,memory_type,title,source_type,source_id,importance,status,created_at")
    .single();

  if (error) throw new Error("Brand memory could not be saved.");
  return { ok: true, duplicate: false, memory: data };
}

export async function getCaptionMemoryContext({ userId, workspaceId, query }) {
  if (!isBrandMemoryActiveForUser(userId)) return { ok: false, disabled: true, memories: [], context: "" };
  if (!workspaceId) {
    return { ok: false, code: "BRAND_MEMORY_WORKSPACE_REQUIRED", memories: [], context: "" };
  }

  try {
    const result = await searchBrandMemories({
      userId,
      workspaceId,
      query,
      memoryTypes: ["brand_fact", "audience", "positioning", "voice", "visual_direction", "product", "user_preference"],
      matchCount: 8,
      similarityThreshold: 0.2,
    });
    const memories = (result.memories || [])
      .filter((memory) => normalizeContent(memory.content || ""))
      .sort((a, b) => {
        const sourceRank = (memory) => memory.source_type === "workspace_field" ? 0 : 1;
        const importanceRank = (memory) => Number(b.importance || 0) - Number(a.importance || 0);
        return sourceRank(a) - sourceRank(b) || importanceRank;
      })
      .slice(0, 8);
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
    return { ok: true, memories, context };
  } catch (error) {
    console.warn("Brand memory caption retrieval failed", {
      userId,
      workspaceId,
      code: error?.code || "BRAND_MEMORY_RETRIEVAL_FAILED",
      message: error?.message || "Unknown memory retrieval error",
    });
    return { ok: false, code: "BRAND_MEMORY_RETRIEVAL_FAILED", memories: [], context: "" };
  }
}
