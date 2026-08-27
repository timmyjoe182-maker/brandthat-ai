import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const logoFunctionSource = readFileSync(new URL("../netlify/functions/logo-image.js", import.meta.url), "utf8");
const generateFunctionSource = readFileSync(new URL("../netlify/functions/generate.js", import.meta.url), "utf8");

[
  "getStructuredLogoContext",
  "Structured Brand Workspace context is the source of truth",
  "structuredLogo",
  "buildLogoContextValidationIssues",
  "Restore from Brand Strategy",
  "logoContextIsValid",
  "Recommended from your Brand Strategy",
].forEach((needle) => assert.ok(appSource.includes(needle), `Missing structured logo context contract: ${needle}`));

[
  "Houseplants / local plant delivery",
  "Leaf Green",
  "Stone Gray",
  "Warm Ivory",
  "Soft Terracotta",
  "Warm botanical serif",
  "Subtle stone-and-leaf symbol",
].forEach((needle) => assert.ok(appSource.includes(needle), `Missing Stone & Stem identity contract: ${needle}`));

[
  "Pet care / mobile local service",
  "Outdoor coffee / mobile hospitality",
  "A simple signal, workflow, or status mark that reads cleanly in product UI.",
].forEach((needle) => assert.ok(appSource.includes(needle), `Missing cross-brand logo context: ${needle}`));

assert.ok(
  appSource.includes("activeBrand ?") && appSource.includes("logoPromptSuggestionOptions"),
  "logo suggestions should become category-aware when an active workspace exists"
);

assert.ok(
  appSource.includes("promptAddsTechnology") && appSource.includes("workspaceSupportsTechnology"),
  "non-software workspaces must block accidental AI/SaaS category leakage"
);

assert.ok(
  !/AI startup"?\s*\|\|\s*["']clean modern/.test(appSource),
  "AI startup must not be a fallback category/style in the client logo context"
);

assert.ok(
  logoFunctionSource.includes('return "houseplants"') &&
  logoFunctionSource.includes("local plant delivery, apartment lifestyle") &&
  logoFunctionSource.includes("Botanical Wordmark"),
  "logo-image function should support houseplant logo concepts directly"
);

assert.ok(
  logoFunctionSource.includes("industryWords.length ? getSubject(industryWords) : getSubject(wordsResult.words)"),
  "logo-image function should prioritize explicit structured industry over prose prompt parsing"
);

[
  "air purification",
  "improved air quality",
  "mood improvement",
  "pet-safety",
  "non-toxic",
  "guaranteed-growth",
].forEach((needle) => {
  assert.ok(appSource.toLowerCase().includes(needle.toLowerCase()), `Missing client claim-safety term: ${needle}`);
  assert.ok(generateFunctionSource.toLowerCase().includes(needle.toLowerCase()), `Missing server claim-safety term: ${needle}`);
});

console.log("Logo context contract tests passed.");
