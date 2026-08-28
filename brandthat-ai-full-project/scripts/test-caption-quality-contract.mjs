import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const generateSource = readFileSync(new URL("../netlify/functions/generate.js", import.meta.url), "utf8");

const requiredStyleLabels = [
  "Punchy",
  "Story",
  "Benefit",
  "Conversational",
  "Educational",
  "Product",
  "Community",
  "Direct CTA",
  "Brand-building",
  "Platform-native",
];

for (const label of requiredStyleLabels) {
  assert.ok(appSource.includes(`"${label}"`), `Caption style label missing: ${label}`);
}

for (const goal of ["Awareness", "Engagement", "Launch", "Conversion", "Education", "Community"]) {
  assert.ok(appSource.includes(`"${goal}"`), `Caption goal option missing: ${goal}`);
}

assert.ok(
  appSource.includes("If the goal is Conversion, at least 6 of 10 captions must include a concrete conversion action"),
  "Conversion goal must materially change caption output."
);

assert.ok(
  appSource.includes("If the goal is Awareness, prioritize distinct brand memory"),
  "Awareness goal must have a distinct strategy."
);

assert.ok(
  appSource.includes("If the goal is Education, make each teaching point safe"),
  "Education goal must have a distinct safe-teaching strategy."
);

assert.ok(
  appSource.includes("If the goal is Engagement, use specific prompts tied to the scene"),
  "Engagement goal must avoid generic questions."
);

assert.ok(
  appSource.includes("Do not use phrases like \"houseplant buddy\", \"plant journey\", \"green friend\", or \"no green thumb required\""),
  "Caption prompt must reject the verified generic plant phrases."
);

assert.ok(
  appSource.includes("captionStyleLabels[index]"),
  "Caption rows must visibly label each result style."
);

assert.ok(
  appSource.includes("Use the exact post description as the scene"),
  "Caption prompt must ground outputs in the submitted post context."
);

assert.ok(
  appSource.includes("Current Brand Workspace:") &&
  appSource.includes("Brand DNA:") &&
  appSource.includes("Customer emotions:"),
  "Caption generation must receive the active workspace and Brand DNA context."
);

assert.ok(
  generateSource.includes("sanitizeUnsafeGeneratedClaims") &&
  generateSource.includes("Safe plant phrasing example"),
  "Shared generation backend must retain the claim-safety pass."
);

assert.doesNotMatch(
  `${appSource}\n${generateSource}`,
  /Northline Goods[\s\S]{0,140}(Caption goal|Current Brand Workspace|captionStyleLabels)/i,
  "Caption generation contracts must not depend on Northline demo context."
);

console.log("Caption quality contract passed.");
