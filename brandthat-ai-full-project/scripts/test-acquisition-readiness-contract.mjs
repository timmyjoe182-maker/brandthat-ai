import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const generate = readFileSync(new URL("../netlify/functions/generate.js", import.meta.url), "utf8");
const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const generatorSignatureStart = app.indexOf("function GeneratorCard({");
const generatorSignatureEnd = app.indexOf("}) {", generatorSignatureStart);
const generatorSignature = app.slice(generatorSignatureStart, generatorSignatureEnd);

[
  "captionTone",
  "captionLength",
  "captionEmojiPreference",
  "captionCtaPreference",
  "captionHashtagPreference",
  "More like this",
  "Rewrite",
  "Original results preserved",
].forEach((needle) => assert.ok(app.includes(needle), `Missing caption control/action: ${needle}`));

[
  "captionTone = \"Brand voice\"",
  "setCaptionTone = () => {}",
  "captionLength = \"Mixed\"",
  "setCaptionLength = () => {}",
  "captionEmojiPreference = \"Restrained\"",
  "setCaptionEmojiPreference = () => {}",
  "captionCtaPreference = \"Soft CTA\"",
  "setCaptionCtaPreference = () => {}",
  "captionHashtagPreference = \"No hashtags\"",
  "setCaptionHashtagPreference = () => {}",
].forEach((needle) => assert.ok(generatorSignature.includes(needle), `GeneratorCard must declare rendered caption control prop: ${needle}`));

[
  "Clearly labeled demo case studies",
  "Stone & Stem",
  "Harbor Hound",
  "not paying-customer testimonials",
  "Complete workspace is $9.99/month",
].forEach((needle) => assert.ok(app.includes(needle), `Missing conversion proof/copy: ${needle}`));

[
  "Confirm imported preview",
  "Edit anything quickly",
  "Generate the complete Brand Plan",
  "Create the first asset",
  "Save the winner",
  "Skip and resume later",
].forEach((needle) => assert.ok(app.includes(needle), `Missing first-session onboarding step: ${needle}`));

[
  "Follow the selected controls",
  "Make captions feel platform-native",
  "natural line breaks",
  "strong first line",
  "If hashtags are not requested, do not add hashtags",
].forEach((needle) => assert.ok(app.includes(needle), `Missing platform-native caption prompt rule: ${needle}`));

[
  "Watch the shift:",
  "Before: unsure at the start.",
  "Senior pets often need",
  "Ever wish grooming day",
  "A good before-and-after",
].forEach((needle) => assert.ok(generate.includes(needle), `Missing publishable Harbor Hound acceptance fallback: ${needle}`));

[
  "sanitizeAnalyticsProperties",
  "blockedKeyPattern",
  "stableStringHash(String(value))",
].forEach((needle) => assert.ok(app.includes(needle), `Missing privacy-safe analytics guard: ${needle}`));

assert.match(index, /rel="canonical"/, "Canonical URL must exist.");
assert.match(index, /property="og:image"/, "Open Graph image must exist.");
assert.match(index, /application\/ld\+json/, "Structured data must exist.");

console.log("Acquisition readiness contract passed.");
