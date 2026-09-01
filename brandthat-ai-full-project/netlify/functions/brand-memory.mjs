import { createClient } from "@supabase/supabase-js";
import {
  createBrandMemory,
  deactivateBrandMemory,
  deleteWorkspaceMemories,
  forgetBrandMemory,
  isBrandMemoryEnabled,
  getBrandMemoryOperationalSummary,
  getBrandMemoryTestUserIds,
  hashOperationalIdentifier,
  isBrandMemoryActiveForUser,
  getWorkspaceMemoryStatus,
  listWorkspaceMemoryControls,
  recordBrandMemoryEvent,
  rebuildWorkspaceMemories,
  searchBrandMemories,
  setWorkspaceMemoryDisabled,
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
    userHash: hashOperationalIdentifier(fields.userId),
    workspaceHash: hashOperationalIdentifier(fields.workspaceId),
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
  let authenticatedUserId = "";

  try {
    logBrandMemory({ requestId, action, stage: "request_received", durationMs: Date.now() - startedAt });
    if (event.httpMethod !== "POST") return json(405, { ok: false, code: "METHOD_NOT_ALLOWED", error: "Method not allowed.", requestId });

    stage = "parse_body";
    body = parseBody(event);
    action = String(body.action || "unknown").slice(0, 80);
    logBrandMemory({ requestId, action, stage: "configuration_checked", durationMs: Date.now() - startedAt });

    stage = "authentication";
    logBrandMemory({ requestId, action, stage: "authentication_started", durationMs: Date.now() - startedAt });
    const authResult = await requireVerifiedUser(event);
    if (authResult.error) {
      logBrandMemory({ requestId, action, stage, code: "UNAUTHENTICATED", durationMs: Date.now() - startedAt });
      await recordBrandMemoryEvent({
        eventName: "auth.blocked",
        requestId,
        durationMs: Date.now() - startedAt,
        code: authResult.error.statusCode === 401 ? "UNAUTHENTICATED" : "EMAIL_VERIFICATION_REQUIRED",
        metadata: { action, stage },
      });
      return json(authResult.error.statusCode, { ok: false, code: authResult.error.statusCode === 401 ? "UNAUTHENTICATED" : "EMAIL_VERIFICATION_REQUIRED", error: authResult.error.message, requestId });
    }

    logBrandMemory({ requestId, action, userId: authResult.user.id, stage: "authentication_complete", durationMs: Date.now() - startedAt });
    authenticatedUserId = authResult.user.id;

    stage = "eligibility";
    const common = {
      userId: authResult.user.id,
      workspaceId: String(body.workspaceId || ""),
    };
    const memoryEnabled = isBrandMemoryEnabled();
    const allowlisted = getBrandMemoryTestUserIds().includes(String(authResult.user.id));
    const activeForUser = isBrandMemoryActiveForUser(authResult.user.id);
    logBrandMemory({
      requestId,
      action,
      userId: authResult.user.id,
      workspaceId: common.workspaceId || null,
      eligibility: memoryEnabled ? allowlisted ? "allowlisted" : "not_allowlisted" : "disabled",
      stage: "allowlist_checked",
      durationMs: Date.now() - startedAt,
    });

    if (body.action === "status") {
      let workspaceOwned = false;
      let workspaceCheckCode = common.workspaceId ? null : "WORKSPACE_REQUIRED";
      if (common.workspaceId && allowlisted) {
        logBrandMemory({ requestId, action, userId: authResult.user.id, workspaceId: common.workspaceId, stage: "workspace_lookup_started", durationMs: Date.now() - startedAt });
        try {
          const ownership = await getWorkspaceMemoryStatus(common);
          workspaceOwned = Boolean(ownership?.ok);
      workspaceCheckCode = ownership?.memoryDisabled ? "WORKSPACE_MEMORY_DISABLED" : ownership?.code || null;
          logBrandMemory({ requestId, action, userId: authResult.user.id, workspaceId: common.workspaceId, eligibility: workspaceOwned ? "owned" : workspaceCheckCode || "not_owned", stage: "workspace_lookup_complete", durationMs: Date.now() - startedAt });
        } catch (error) {
          workspaceOwned = false;
          workspaceCheckCode = error?.code || "WORKSPACE_OWNERSHIP_CHECK_FAILED";
          logBrandMemory({ requestId, action, userId: authResult.user.id, workspaceId: common.workspaceId, eligibility: workspaceCheckCode, stage: "workspace_lookup_complete", code: workspaceCheckCode, durationMs: Date.now() - startedAt });
        }
      }

      const statusPayload = {
        ok: true,
        endpointVersion: BRAND_MEMORY_ENDPOINT_VERSION,
        enabled: memoryEnabled,
        allowlisted,
        active: Boolean(memoryEnabled && allowlisted && workspaceOwned && !workspaceCheckCode),
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
        stage: "response_created",
        durationMs: Date.now() - startedAt,
      });
      await recordBrandMemoryEvent({
        eventName: statusPayload.active ? "status.eligible" : "status.ineligible",
        requestId,
        userId: authResult.user.id,
        workspaceId: common.workspaceId || "",
        durationMs: Date.now() - startedAt,
        resultCount: statusPayload.active ? 1 : 0,
        code: statusPayload.active ? null : statusPayload.workspaceCheckCode || (!memoryEnabled ? "BRAND_MEMORY_DISABLED" : !allowlisted ? "BRAND_MEMORY_NOT_ALLOWLISTED" : "BRAND_MEMORY_NOT_ACTIVE"),
        metadata: {
          action,
          stage: "response_created",
          workspaceOwned,
          allowlisted,
          disabled: !memoryEnabled || Boolean(statusPayload.workspaceCheckCode),
        },
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

    if (!common.workspaceId && body.action !== "metrics") return json(400, { ok: false, code: "WORKSPACE_REQUIRED", error: "Workspace is required.", requestId });

    switch (body.action) {
      case "refresh":
        return json(200, await rebuildWorkspaceMemories({ ...common, requestId }));
      case "list":
        return json(200, await listWorkspaceMemoryControls(common));
      case "create":
        return json(200, await createBrandMemory({
          ...common,
          requestId,
          memoryType: body.memoryType,
          title: body.title,
          content: body.content,
          sourceType: body.sourceType,
          sourceId: body.sourceId,
          sourceAssetId: body.sourceAssetId,
          sourceGenerator: body.sourceGenerator,
          importance: body.importance,
          confidence: body.confidence,
          metadata: body.metadata,
        }));
      case "update":
        return json(200, await updateBrandMemory({
          ...common,
          requestId,
          memoryId: body.memoryId,
          title: body.title,
          content: body.content,
          importance: body.importance,
          metadata: body.metadata,
        }));
      case "forget":
        return json(200, await forgetBrandMemory({
          ...common,
          requestId,
          memoryId: body.memoryId,
        }));
      case "delete_workspace":
        if (body.confirm !== "DELETE_WORKSPACE_MEMORY") {
          return json(400, { ok: false, code: "CONFIRMATION_REQUIRED", error: "Confirm workspace memory deletion.", requestId });
        }
        return json(200, await deleteWorkspaceMemories({ ...common, requestId }));
      case "disable_workspace":
        return json(200, await setWorkspaceMemoryDisabled({
          ...common,
          requestId,
          disabled: true,
        }));
      case "enable_workspace":
        return json(200, await setWorkspaceMemoryDisabled({
          ...common,
          requestId,
          disabled: false,
        }));
      case "search":
        return json(200, await searchBrandMemories({
          ...common,
          requestId,
          query: body.query,
          memoryTypes: Array.isArray(body.memoryTypes) ? body.memoryTypes.slice(0, 10) : null,
          matchCount: body.matchCount,
          similarityThreshold: body.similarityThreshold,
        }));
      case "deactivate":
        return json(200, await deactivateBrandMemory({
          ...common,
          requestId,
          memoryId: body.memoryId,
        }));
      case "metrics":
        return json(200, await getBrandMemoryOperationalSummary({
          ...common,
          hours: body.hours,
        }));
      default:
        await recordBrandMemoryEvent({
          eventName: "request.invalid",
          requestId,
          userId: authResult.user.id,
          workspaceId: common.workspaceId || "",
          durationMs: Date.now() - startedAt,
          code: "UNSUPPORTED_ACTION",
          metadata: { action, stage: "route" },
        });
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
    await recordBrandMemoryEvent({
      eventName: code === "WORKSPACE_NOT_FOUND" ? "request.blocked_cross_workspace" : "request.failed",
      requestId,
      userId: authenticatedUserId,
      workspaceId: body?.workspaceId || "",
      durationMs: Date.now() - startedAt,
      code,
      metadata: { action, stage },
    });
    return json(statusCode, {
      ok: false,
      code,
      error: statusCode === 403 ? "Workspace not found." : statusCode === 400 ? "Brand memory request is invalid." : "Brand memory is temporarily unavailable.",
      requestId,
    });
  }
}
