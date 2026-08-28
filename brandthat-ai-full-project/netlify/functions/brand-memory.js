import authModule from "./lib/auth.js";
import {
  createBrandMemory,
  deactivateBrandMemory,
  isBrandMemoryEnabled,
  searchBrandMemories,
  updateBrandMemory,
} from "./lib/brand-memory.js";

const { requireVerifiedUser } = authModule;

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
  if (!isBrandMemoryEnabled()) {
    return json(503, { ok: false, disabled: true, error: "Brand memory is not enabled." });
  }

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

    if (!common.workspaceId) return json(400, { ok: false, error: "Workspace is required." });

    switch (body.action) {
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
