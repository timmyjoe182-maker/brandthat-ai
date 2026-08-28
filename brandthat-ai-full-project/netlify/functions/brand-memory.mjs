import { createClient } from "@supabase/supabase-js";
import {
  createBrandMemory,
  deactivateBrandMemory,
  isBrandMemoryEnabled,
  getBrandMemoryTestUserIds,
  isBrandMemoryActiveForUser,
  rebuildWorkspaceMemories,
  searchBrandMemories,
  updateBrandMemory,
} from "./lib/brand-memory.js";

const BRAND_MEMORY_ENDPOINT_VERSION = "private-pilot-status-v1";

const authSupabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co";
const authSupabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

const supabaseAuth = createClient(authSupabaseUrl, authSupabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function getBearer(event) {
  const header = event.headers?.authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

async function requireVerifiedUser(event) {
  const bearer = getBearer(event);
  if (!bearer) {
    return { error: { statusCode: 401, message: "Create your BrandThat account to try the full product." } };
  }

  const { data, error } = await supabaseAuth.auth.getUser(bearer);
  const user = data?.user || null;
  if (error || !user) {
    return { error: { statusCode: 401, message: "Please log in again to continue." } };
  }
  if (!isEmailVerified(user)) {
    return { error: { statusCode: 403, message: "Check your email to verify your account before continuing." } };
  }
  return { user };
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

function parseBody(event) {
  if (!event.body || event.body.length > 50000) {
    const error = new Error("Invalid request body.");
    error.code = "INVALID_REQUEST";
    throw error;
  }
  try {
    return JSON.parse(event.body);
  } catch {
    const error = new Error("Invalid JSON request body.");
    error.code = "INVALID_JSON";
    throw error;
  }
}

function logBrandMemory(fields = {}) {
  console.info("Brand memory request", {
    requestId: fields.requestId,
    action: fields.action,
    authenticatedUserId: fields.userId,
    workspaceId: fields.workspaceId,
    eligibility: fields.eligibility,
    stage: fields.stage,
    code: fields.code,
    durationMs: fields.durationMs,
  });
}

export async function handler(event, _context = {}, meta = {}) {
  const requestId = meta.requestId || event?.headers?.["x-nf-request-id"] || event?.headers?.["X-Nf-Request-Id"] || `brand_memory_${Date.now()}`;
  const startedAt = meta.startedAt || Date.now();
  let stage = "method";
  let body = {};
  let action = "unknown";

  try {
    if (event.httpMethod !== "POST") return json(405, { ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed.", requestId });

    stage = "parse_body";
    body = parseBody(event);
    action = String(body.action || "unknown").slice(0, 80);

    stage = "authentication";
    const authResult = await requireVerifiedUser(event);
    if (authResult.error) {
      logBrandMemory({ requestId, action, stage, code: "UNAUTHENTICATED", durationMs: Date.now() - startedAt });
      return json(authResult.error.statusCode, { ok: false, code: authResult.error.statusCode === 401 ? "UNAUTHENTICATED" : "EMAIL_VERIFICATION_REQUIRED", error: authResult.error.message, requestId });
    }

    stage = "eligibility";
    const common = {
      userId: authResult.user.id,
      workspaceId: String(body.workspaceId || ""),
    };
    const memoryEnabled = isBrandMemoryEnabled();
    const allowlisted = getBrandMemoryTestUserIds().includes(String(authResult.user.id));
    const activeForUser = isBrandMemoryActiveForUser(authResult.user.id);

    if (body.action === "status") {
      let workspaceOwned = false;
      let workspaceCheckCode = common.workspaceId ? null : "WORKSPACE_REQUIRED";
      if (common.workspaceId && allowlisted) {
        try {
          const ownership = await rebuildWorkspaceMemories({
            ...common,
            dryRun: true,
          });
          workspaceOwned = Boolean(ownership?.ok);
          workspaceCheckCode = ownership?.code || null;
        } catch (error) {
          workspaceOwned = false;
          workspaceCheckCode = error?.code || "WORKSPACE_OWNERSHIP_CHECK_FAILED";
        }
      }

      const statusPayload = {
        ok: true,
        endpointVersion: BRAND_MEMORY_ENDPOINT_VERSION,
        enabled: memoryEnabled,
        allowlisted,
        active: Boolean(memoryEnabled && allowlisted && workspaceOwned),
        authenticatedUserId: authResult.user.id,
        authenticatedUserIdMatchesAllowlist: allowlisted,
        selectedWorkspaceId: common.workspaceId || null,
        workspaceOwned,
        workspaceCheckCode,
        requestId,
      };
      logBrandMemory({
        requestId,
        action,
        userId: authResult.user.id,
        workspaceId: common.workspaceId || null,
        eligibility: statusPayload.active ? "eligible" : !memoryEnabled ? "disabled" : !allowlisted ? "not_allowlisted" : workspaceCheckCode || "not_active",
        stage: "status",
        durationMs: Date.now() - startedAt,
      });
      return json(200, statusPayload);
    }

    const memoryActive = activeForUser;

    if (!isBrandMemoryEnabled()) {
      return json(200, { ok: false, disabled: true, code: "BRAND_MEMORY_DISABLED", error: "Brand memory is not enabled.", requestId });
    }
    if (!memoryActive) {
      return json(200, { ok: false, disabled: true, code: "BRAND_MEMORY_NOT_ALLOWLISTED", error: "Brand memory is not enabled for this account.", requestId });
    }

    if (!common.workspaceId) return json(400, { ok: false, code: "WORKSPACE_REQUIRED", error: "Workspace is required.", requestId });

    switch (body.action) {
      case "refresh":
        return json(200, await rebuildWorkspaceMemories(common));
      case "create":
        return json(200, await createBrandMemory({
          ...common,
          memoryType: body.memoryType,
          title: body.title,
          content: body.content,
          sourceType: body.sourceType,
          sourceId: body.sourceId,
          importance: body.importance,
          metadata: body.metadata,
        }));
      case "update":
        return json(200, await updateBrandMemory({
          ...common,
          memoryId: body.memoryId,
          title: body.title,
          content: body.content,
          importance: body.importance,
          metadata: body.metadata,
        }));
      case "search":
        return json(200, await searchBrandMemories({
          ...common,
          query: body.query,
          memoryTypes: Array.isArray(body.memoryTypes) ? body.memoryTypes.slice(0, 10) : null,
          matchCount: body.matchCount,
          similarityThreshold: body.similarityThreshold,
        }));
      case "deactivate":
        return json(200, await deactivateBrandMemory({
          ...common,
          memoryId: body.memoryId,
        }));
      default:
        return json(400, { ok: false, error: "Unsupported brand-memory action." });
    }
  } catch (error) {
    const code = error?.code || "BRAND_MEMORY_FAILED";
    const statusCode = code === "WORKSPACE_NOT_FOUND" ? 403 : code === "INVALID_JSON" || code === "INVALID_REQUEST" ? 400 : 500;
    console.error("Brand memory request failed", {
      requestId,
      action,
      stage,
      code,
      message: error?.message || "Unknown error",
      durationMs: Date.now() - startedAt,
    });
    return json(statusCode, {
      ok: false,
      code,
      error: statusCode === 403 ? "Workspace not found." : statusCode === 400 ? "Brand memory request is invalid." : "Brand memory is temporarily unavailable.",
      requestId,
    });
  }
}
