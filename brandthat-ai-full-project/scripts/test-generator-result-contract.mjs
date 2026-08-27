import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const generateFunctionSource = readFileSync(new URL("../netlify/functions/generate.js", import.meta.url), "utf8");

assert.ok(
  appSource.includes("setGenerationError(error?.message"),
  "client should store failed generator responses in generationError"
);

assert.ok(
  appSource.includes("setResult(\"\");"),
  "client should clear result after non-logo generation failures"
);

assert.ok(
  !appSource.includes("setResult(error.message || \"Something went wrong. Please try again.\")"),
  "client must not render a failed request as generated content"
);

assert.ok(
  appSource.includes("isSuccessfulGeneratorResult(activeTool.key, result)"),
  "result panels must be gated by successful-result validation"
);

assert.ok(
  appSource.includes("isGenerationFailureText(result)"),
  "save flow must reject known failure text"
);

assert.ok(
  generateFunctionSource.includes("ok: false") && generateFunctionSource.includes("requestId"),
  "generate function should return structured failure responses"
);

assert.ok(
  !/catch\s*\([^)]*\)\s*{[\s\S]{0,240}text:\s*error\.message/.test(generateFunctionSource),
  "generate function catch block must not return error.message as generated text"
);

console.log("Generator result contract tests passed.");
