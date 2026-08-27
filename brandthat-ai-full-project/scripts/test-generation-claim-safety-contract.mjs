import { readFileSync } from "node:fs";

const generateFunction = readFileSync(new URL("../netlify/functions/generate.js", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`Claim safety contract failed: ${message}`);
    process.exit(1);
  }
}

assert(generateFunction.includes("function sanitizeUnsafeGeneratedClaims"), "shared generation function must sanitize unsupported claims after provider output");
assert(generateFunction.includes("text: safeText"), "successful generation response must return sanitized text");
assert(generateFunction.includes("indoor )?air quality") || generateFunction.includes("air quality"), "air-quality claims must be covered");
assert(generateFunction.includes("pet[- ]safe") && generateFunction.includes("non[- ]toxic"), "pet-safety and toxicity claims must be covered");
assert(generateFunction.includes("guaranteed growth"), "guaranteed growth claims must be covered");

console.log("Generation claim safety contract passed.");
