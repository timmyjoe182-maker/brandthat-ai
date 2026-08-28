const crypto = require("node:crypto");

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

exports.handler = async (event, context) => {
  const requestId = event?.headers?.["x-nf-request-id"] || event?.headers?.["X-Nf-Request-Id"] || crypto.randomUUID?.() || `brand_memory_${Date.now()}`;
  const startedAt = Date.now();
  let action = "unknown";

  try {
    if (event?.body) {
      const body = JSON.parse(event.body);
      action = String(body?.action || "unknown").slice(0, 80);
    }
  } catch {
    action = "invalid_json";
  }

  try {
    const module = await import("./brand-memory-handler.mjs");
    return await module.handler(event, context, { requestId, startedAt });
  } catch (error) {
    console.error("Brand memory function failed to load or execute", {
      requestId,
      action,
      stage: "entrypoint",
      code: error?.code || "BRAND_MEMORY_RUNTIME_ERROR",
      name: error?.name || "Error",
      message: error?.message || "Unknown brand memory runtime error",
      durationMs: Date.now() - startedAt,
    });
    return json(500, {
      ok: false,
      code: "BRAND_MEMORY_RUNTIME_ERROR",
      error: "Brand memory is temporarily unavailable.",
      requestId,
    });
  }
};
