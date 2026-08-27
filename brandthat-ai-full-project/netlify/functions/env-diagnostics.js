import {
  getEnvironmentDiagnostics,
  getRequestId,
  json,
} from "./lib/membership.js";

export const handler = async (event) => {
  const requestId = getRequestId("env_diag");

  if (event.httpMethod && event.httpMethod !== "GET") {
    return json(405, { error: "Use GET for environment diagnostics.", code: "METHOD_NOT_ALLOWED", requestId });
  }

  return json(200, {
    requestId,
    configured: getEnvironmentDiagnostics(),
  });
};

