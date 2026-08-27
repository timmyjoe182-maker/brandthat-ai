import { readFileSync, writeFileSync } from "node:fs";

const generatePath = new URL("../netlify/functions/generate.js", import.meta.url);
let source = readFileSync(generatePath, "utf8");
let changed = false;

function normalize(value) {
  return String(value).replaceAll("\\n", "\n");
}

function replaceOnce(needle, replacement, label) {
  needle = normalize(needle);
  replacement = normalize(replacement);
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Missing expected block for ${label}`);
  source = source.replace(needle, replacement);
  changed = true;
}

replaceOnce(
  `function getPublicError(statusCode, code, message, requestId) {\n  return json(statusCode, {\n    ok: false,\n    code,\n    message,\n    error: message,\n    requestId,\n  });\n}\n`,
  `function getPublicError(statusCode, code, message, requestId) {\n  return json(statusCode, {\n    ok: false,\n    code,\n    message,\n    error: message,\n    requestId,\n  });\n}\n\nfunction sanitizeUnsafeGeneratedClaims(text = "") {\n  let safe = String(text || "");\n  const replacements = [\n    [/snake plants? can (?:help )?(?:improve|purify|cleanse|clean) (?:your |the |indoor )?air quality/gi, "Snake plants are a popular low-maintenance option for apartment greenery"],\n    [/snake plants? (?:improve|purify|cleanse|clean) (?:your |the |indoor )?air/gi, "Snake plants are a popular low-maintenance option for apartment greenery"],\n    [/(?:houseplants|plants) can (?:help )?(?:improve|purify|cleanse|clean) (?:your |the |indoor )?air quality/gi, "houseplants can make an apartment feel greener and more intentional"],\n    [/(?:houseplants|plants) (?:improve|purify|cleanse|clean) (?:your |the |indoor )?air/gi, "houseplants can make an apartment feel greener and more intentional"],\n    [/air[- ]purifying/gi, "low-maintenance"],\n    [/purif(?:y|ies|ying) (?:your |the |indoor )?air/gi, "add greenery to your space"],\n    [/boost(?:s|ing)? your mood/gi, "bring a calmer feeling to your space"],\n    [/improve(?:s|d|ing)? your mood/gi, "bring a calmer feeling to your space"],\n    [/guaranteed growth/gi, "guided plant care"],\n    [/pet[- ]safe/gi, "pet-aware care information"],\n    [/non[- ]toxic/gi, "care-card details"],\n  ];\n\n  for (const [pattern, replacement] of replacements) {\n    safe = safe.replace(pattern, replacement);\n  }\n\n  return safe.replace(/\\s+([.,!?;:])/g, "$1");\n}\n`,
  "claim safety helper"
);

replaceOnce(
  `    return json(200, { ok: true, text, requestId });`,
  `    const safeText = sanitizeUnsafeGeneratedClaims(text);\n    return json(200, { ok: true, text: safeText, requestId });`,
  "post-generation claim safety return"
);

if (changed) {
  writeFileSync(generatePath, source);
  console.log("Applied post-generation claim safety fixes.");
} else {
  console.log("Post-generation claim safety fixes already applied.");
}
