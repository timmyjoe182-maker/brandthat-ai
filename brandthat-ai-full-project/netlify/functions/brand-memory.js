import authModule from "./lib/auth.js";
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

const { requireVerifiedUser } = authModule;
const BRAND_MEMORY_ENDPOINT_VERSION = "private-pilot-status-v1";

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
  if (!event.body || event.body.length > 50000) throw new Error("Invalid request body.");
  return JSON.parse(event.body);
}

export async function handler(event) {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "Method not allowed." });

  const authResult = await requireVerifiedUser(event);
  if (authResult.error) {
    return json(authResult.error.statusCode, { ok: false, error: authResult.error.message });
  }

  try {
    const body = parseBody(event);
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

      return json(200, {
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
      });
    }

    const memoryActive = activeForUser;

    if (!isBrandMemoryEnabled() || !memoryActive) {
      return json(200, { ok: false, disabled: true, error: "Brand memory is not enabled for this account." });
    }

    if (!common.workspaceId) return json(400, { ok: false, error: "Workspace is required." });

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
    console.error("Brand memory request failed", {
      code: error?.code || "BRAND_MEMORY_FAILED",
      message: error?.message || "Unknown error",
    });
    const statusCode = error?.code === "WORKSPACE_NOT_FOUND" ? 404 : 400;
    return json(statusCode, {
      ok: false,
      error: statusCode === 404 ? "Workspace not found." : "Brand memory request could not be completed.",
    });
  }
}
