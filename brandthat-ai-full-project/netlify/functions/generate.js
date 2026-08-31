import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { getCaptionMemoryContext, isBrandMemoryActiveForUser } from "./lib/brand-memory.js";

const rateLimitStore = global.brandthatGenerateRateLimit || new Map();
global.brandthatGenerateRateLimit = rateLimitStore;

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function getRequestId() {
  return crypto?.randomUUID?.() || `generate_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function logGenerateFailure(fields = {}) {
  console.error("BrandThat generation failed", {
    functionName: "generate",
    requestId: fields.requestId,
    generatorType: fields.generatorType,
    status: fields.status,
    category: fields.category,
    code: fields.code,
    providerStatus: fields.providerStatus,
    providerCode: fields.providerCode,
    openaiRequestId: fields.openaiRequestId,
    authentication: fields.authentication,
    membership: fields.membership,
    timeout: Boolean(fields.timeout),
    durationMs: fields.durationMs,
    message: fields.message,
  });
}

function getPublicError(statusCode, code, message, requestId) {
  return json(statusCode, {
    ok: false,
    code,
    message,
    error: message,
    requestId,
  });
}

const PLANT_SPECIES_TERMS = [
  "pothos",
  "snake plant",
  "snake plants",
  "monstera",
  "peace lily",
  "peace lilies",
  "spider plant",
  "spider plants",
  "zz plant",
  "zz plants",
  "philodendron",
  "ficus",
  "succulent",
  "succulents",
  "fern",
  "ferns",
  "aloe",
  "calathea",
  "rubber plant",
  "rubber plants",
];

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasSupportedDetail(sourceText = "", detail = "") {
  if (!detail) return false;
  return new RegExp(`\\b${escapeRegExp(detail)}\\b`, "i").test(String(sourceText || ""));
}

function removeUnsupportedPlantSpecies(text = "", supportedSource = "") {
  let safeText = String(text || "");
  for (const species of PLANT_SPECIES_TERMS) {
    if (hasSupportedDetail(supportedSource, species)) continue;
    safeText = safeText.replace(new RegExp(`\\b${escapeRegExp(species)}\\b`, "gi"), "houseplant");
  }
  return safeText;
}

export function sanitizeUnsafeGeneratedClaims(text = "", supportedSource = "") {
  let safeText = String(text || "");
  const replacements = [
    {
      pattern: /\b(fragrant|scented|aromatic|perfumed)\s+(houseplants?|plants?|pothos|snake plants?|peace lilies?|spider plants?|succulents?|ferns?)\b/gi,
      replacement: "$2",
    },
    {
      pattern: /\b(houseplants?|plants?|pothos|snake plants?|peace lilies?|spider plants?|succulents?|ferns?)\s+(that|which)\s+(smell|smells|smell amazing|smells amazing|add fragrance|bring fragrance|fill[^.!?\n]*with fragrance)[^.!?\n]*/gi,
      replacement: "$1 chosen for easy apartment greenery",
    },
    {
      pattern: /\b(snake plants?|pothos|peace lilies?|spider plants?|houseplants?|plants?)\s+(can|may|will|are proven to)\s+(improve|purify|clean|boost)\s+(your\s+)?(indoor\s+)?air quality\b/gi,
      replacement: "$1 are popular low-maintenance choices for apartment greenery",
    },
    {
      pattern: /\b(improve|purify|clean|boost)\s+(your\s+)?(indoor\s+)?air quality\b/gi,
      replacement: "bring more greenery into the space",
    },
    {
      pattern: /\b(enjoy|breathe|bring in|welcome)\s+(the\s+)?fresh air\b/gi,
      replacement: "enjoy fresh greenery",
    },
    {
      pattern: /\b(fresh air)\b/gi,
      replacement: "fresh greenery",
    },
    {
      pattern: /\b(boost|improve|lift|support)\s+(your\s+)?mood\b/gi,
      replacement: "make the space feel calmer",
    },
    {
      pattern: /\b(our|these|the|your)?\s*(plants?|houseplants?)\s+are\s+designed\s+for\s+(effortless|stress[- ]free|foolproof|fail[- ]proof)\s+care\b/gi,
      replacement: "simple guidance is included",
    },
    {
      pattern: /\b(effortless|stress[- ]free|foolproof|fail[- ]proof)\s+(plant\s+)?care\b/gi,
      replacement: "simple care guidance",
    },
    {
      pattern: /\b(effortlessly)\b/gi,
      replacement: "with simple guidance",
    },
    {
      pattern: /\b(ensures?|guarantees?)\s+([^.!?\n]{0,100})\b/gi,
      replacement: "helps with $2",
    },
    {
      pattern: /\b(plants?|houseplants?)\s+that\s+(thrive|grow well|do well|flourish)\s+(even\s+)?in\s+(low|indirect|bright|limited)\s+light\b/gi,
      replacement: "$1 designed with apartment living in mind",
    },
    {
      pattern: /\b(many|most|all)\s+(plants?|houseplants?)\s+(thrive|grow well|do well|flourish)\s+(even\s+)?in\s+(low|indirect|bright|limited)\s+light\b/gi,
      replacement: "Each plant's light needs can be checked with its included care guidance",
    },
    {
      pattern: /\b(thrive|grow well|do well|flourish)\s+(even\s+)?in\s+(low|indirect|bright|limited)\s+light\b/gi,
      replacement: "come with simple care guidance",
    },
    {
      pattern: /\b(water|watering|light|lighting|soil|humidity)\s+(every|once|twice|daily|weekly|monthly|biweekly|each)\s+[^.!?\n]*/gi,
      replacement: "follow the included care guidance",
    },
    {
      pattern: /\b(this month'?s|monthly|current)\s+(plant\s+)?delivery\s+(features|includes|comes with|brings)\s+[^.!?\n]*/gi,
      replacement: "this month's plant direction is easy to explore",
    },
    {
      pattern: /\b(features|includes|comes with|brings)\s+(easy[- ]care|low[- ]maintenance|limited[- ]light|low[- ]light)\s+(options|plants?|houseplants?|varieties|inventory)\b/gi,
      replacement: "includes simple care guidance",
    },
    {
      pattern: /\b(pet[- ]safe|pet\s+safe|non[- ]toxic|non\s+toxic|safe for pets|safe for dogs|safe for cats)\b/gi,
      replacement: "chosen with clear care guidance",
    },
    {
      pattern: /\b(guaranteed growth|guaranteed|guarantees|will always|never fails|scientifically proven)\s+[^.!?\n]*(growth|results|outcomes|benefits|performance)[^.!?\n]*/gi,
      replacement: "designed to be easier to understand and care for",
    },
    {
      pattern: /\b(removes toxins|toxins from the air|air purification|purifies the air|cleaner air)\b/gi,
      replacement: "fresh visual greenery",
    },
    {
      pattern: /\b(order|buy|shop|reserve|book)\s+(your\s+)?([^.!?\n]{0,80}?)\s*today\b/gi,
      replacement: "learn more about $3",
    },
    {
      pattern: /\b(order today|buy today|shop today|reserve today|book today)\b/gi,
      replacement: "learn more",
    },
    {
      pattern: /\b(transform|turn)\s+(your\s+)?(apartment|home|space)\s+into\s+(a\s+)?green oasis\b/gi,
      replacement: "make $2$3 feel a little greener",
    },
  ];

  safeText = removeUnsupportedPlantSpecies(safeText, supportedSource);

  for (const { pattern, replacement } of replacements) {
    safeText = safeText.replace(pattern, replacement);
  }

  return safeText.replace(/\s+([,.!?])/g, "$1").replace(/[ \t]{2,}/g, " ").trim();
}

const GENERIC_COPY_PATTERNS = [
  /\bdeserves?\s+the\s+best\b/i,
  /\bgame[- ]changing\b/i,
  /\btake\s+(it|your|their|this)\s+to\s+the\s+next\s+level\b/i,
  /\bunleash\s+your\s+potential\b/i,
  /\bunlock\s+your\s+potential\b/i,
  /\bexperience\s+the\s+difference\b/i,
];

const PLACEHOLDER_PATTERNS = [
  /\b(insert|add|write|replace)\s+(brand|caption|hashtag|hook|bio|email|details?)\s+(here|name|copy)?\b/i,
  /\bplaceholder\b/i,
  /\bundefined\b/i,
  /\bnull\b/i,
  /\b\[.+?\]/,
  /\b\{.+?\}/,
];

const BROKEN_GRAMMAR_PATTERNS = [
  /\bhelps?\s+with\s+(they|them|he|she|we|you|it)\b/i,
  /\b(with|for|to|by)\s+(they|we|he|she|I)\b/i,
  /\b(they|we|you|he|she)\s+(feel|feels|look|looks|sound|sounds)\s+(great|good|better)\s+every\s+time\b/i,
  /\byour\s+pets?\s+deserves\b/i,
  /\bto\s+helps?\s+with\b/i,
  /\bhelps?\s+with\s+your\s+pets?\s+feels?\b/i,
  /\bhelps?\s+with\s+[^.!?\n]{0,80}\s+feels?\b/i,
  /\b(cleanliness|trust|comfort|care)\s+to\s+helps?\b/i,
  /\bdog\s+coming\s+home\b/i,
  /\bcoming\s+home\s+[^.!?\n]{0,80}without\s+you\s+leaving\s+the\s+house\b/i,
  /\b[a-z]+\s+with\s+they\s+[a-z]+/i,
  /\bhelps?\s+with\s+[^.!?\n]{0,28}\s+feel\b/i,
];

const UNSUPPORTED_GUARANTEE_PATTERNS = [
  /\b(ensures?|ensuring|guarantees?|guaranteed|will always|never fails|proven to|certified to)\b/i,
  /\b(greatly|significantly|dramatically)\s+reduces?\b/i,
  /\breduces?\s+[^.!?\n]{0,80}\s+(stress|anxiety|fear)\b/i,
  /\b(stress[- ]free|effortless|foolproof|fail[- ]proof)\b/i,
  /\b(order|buy|shop|book|reserve)\s+[^.!?\n]{0,80}\s+today\b/i,
  /\blink\s+in\s+(our|your|the)\s+bio\b/i,
  /\bclick\s+the\s+link\b/i,
  /\bserve\s+our\s+local\b/i,
  /\blocal\s+coastal\s+community\b/i,
  /\bproudly\s+serv(?:e|ing)\s+[^.!?\n]{0,60}\b/i,
  /\bjust\s+wrapped\s+up\b/i,
  /\bhappy\s+pup\b/i,
];

const PLANT_CONTEXT_PATTERN = /houseplant|plant delivery|apartment greenery|botanical|care card|care guidance|plant subscription|stone & stem/i;
const PET_CONTEXT_PATTERN = /dog grooming|mobile grooming|pet grooming|pet care|senior pet|harbor hound|coastal families/i;
const SOFTWARE_CONTEXT_PATTERN = /software|saas|sponsorship|invoice|creator workflow|signaldesk|platform/i;

const PLANT_LEAK_PATTERNS = [
  /\bhouseplants?\b/i,
  /\bplants?\b/i,
  /\bbotanical\b/i,
  /\bpothos\b/i,
  /\bsnake plants?\b/i,
  /\bcare cards?\b/i,
  /\bplant delivery\b/i,
  /\bapartment greenery\b/i,
];

const PET_LEAK_PATTERNS = [
  /\bdog\b/i,
  /\bdogs\b/i,
  /\bpet\b/i,
  /\bpets\b/i,
  /\bgrooming\b/i,
  /\bgroomer\b/i,
  /\bmobile grooming\b/i,
  /\bsenior pets?\b/i,
];

const SOFTWARE_LEAK_PATTERNS = [
  /\bsaas\b/i,
  /\bsoftware\b/i,
  /\bapp\b/i,
  /\bplatform\b/i,
  /\binvoices?\b/i,
  /\bsponsorships?\b/i,
];

function normalizeForComparison(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[#@]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|and|or|to|for|of|in|on|with|your|our|this|that|it|is|are|be|can)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getOpeningKey(value = "") {
  return normalizeForComparison(value).split(/\s+/).slice(0, 4).join(" ");
}

function getContextKind(supportedSource = "") {
  const source = String(supportedSource || "");
  if (PET_CONTEXT_PATTERN.test(source)) return "pet";
  if (PLANT_CONTEXT_PATTERN.test(source)) return "plant";
  if (SOFTWARE_CONTEXT_PATTERN.test(source)) return "software";
  return "general";
}

function hasAnyPattern(value = "", patterns = []) {
  return patterns.some((pattern) => pattern.test(String(value || "")));
}

function splitGeneratedItems(text = "") {
  const normalized = String(text || "").replace(/\r/g, "").trim();
  const matches = [...normalized.matchAll(/(?:^|\n)\s*(\d{1,2})[.)]\s+/g)];
  if (matches.length >= 2) {
    return matches.slice(0, 20).map((match, index) => {
      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? normalized.length;
      return sanitizeUnsafeGeneratedClaims(normalized.slice(start, end)).trim();
    }).filter(Boolean);
  }

  const lines = normalized
    .split("\n")
    .map((line) => sanitizeUnsafeGeneratedClaims(line.replace(/^[-•*\s]*(?:\d+[.)])?\s*/, "")).trim())
    .filter(Boolean);

  return lines.length >= 2 ? lines : [];
}

function formatGeneratedItems(items = []) {
  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

function repairBrokenGrammar(value = "", contextKind = "general") {
  let repaired = String(value || "");
  repaired = repaired
    .replace(/\byour\s+pet\s+deserves\b/gi, "your pet deserves")
    .replace(/\byour\s+pets\s+deserves\b/gi, "your pets deserve")
    .replace(/\bcleanliness\s+to\s+helps?\s+with\s+your\s+pet\s+feels?\s+safe\b/gi, "cleanliness helps your pet feel comfortable")
    .replace(/\bcleanliness\s+to\s+helps?\s+with\s+your\s+pets\s+feels?\s+safe\b/gi, "cleanliness helps your pets feel comfortable")
    .replace(/\bto\s+helps?\s+with\s+your\s+pet\s+feels?\b/gi, "to help your pet feel")
    .replace(/\bto\s+helps?\s+with\s+your\s+pets\s+feels?\b/gi, "to help your pets feel")
    .replace(/\bhelps?\s+with\s+every\s+grooming\s+session\s+feels?\s+like\s+a\s+treat\b/gi, "helps each grooming session feel calmer and more comfortable")
    .replace(/\bhelps?\s+with\s+they\s+feel\s+great\s+every\s+time\b/gi, "helps them feel comfortable throughout every appointment")
    .replace(/\bhelps?\s+with\s+they\s+feel\s+comfortable\b/gi, "helps them feel comfortable")
    .replace(/\bhelps?\s+with\s+they\s+feel\b/gi, "helps them feel")
    .replace(/\bhelps?\s+with\s+them\s+feel\b/gi, "helps them feel")
    .replace(/\bwith\s+they\b/gi, "with them")
    .replace(/\bfor\s+they\b/gi, "for them")
    .replace(/\bto\s+they\b/gi, "to them")
    .replace(/\bby\s+they\b/gi, "by them");

  if (contextKind === "pet") {
    repaired = repaired
      .replace(/\bdeserves?\s+the\s+best\b/gi, "deserves dependable, gentle care")
      .replace(/\bclick\s+the\s+link\s+in\s+(our|your|the)\s+bio\b/gi, "learn more about the appointment")
      .replace(/\blink\s+in\s+(our|your|the)\s+bio\b/gi, "appointment details")
      .replace(/\bcoming\s+home\s+([^.!?\n]{0,80})without\s+you\s+leaving\s+the\s+house\b/gi, "getting gentle care without an extra trip")
      .replace(/\bimagine\s+your\s+dog\s+coming\s+home\b/gi, "Imagine your dog getting gentle care at home")
      .replace(/\byour\s+dog\s+coming\s+home\b/gi, "your dog getting gentle care at home")
      .replace(/\bcoming\s+home\s+from\s+(the\s+)?groom(ing)?\b/gi, "getting gentle care at home")
      .replace(/\bserve\s+our\s+local\s+coastal\s+community\b/gi, "support busy coastal families and senior pet owners")
      .replace(/\blocal\s+coastal\s+community\b/gi, "busy coastal families and senior pet owners")
      .replace(/\bstress[- ]free\b/gi, "calmer")
      .replace(/\beffortless(ly)?\b/gi, "simple");
  } else if (contextKind === "plant") {
    repaired = repaired
      .replace(/\bdeserves?\s+the\s+best\b/gi, "deserves clear, simple care guidance")
      .replace(/\bclick\s+the\s+link\s+in\s+(our|your|the)\s+bio\b/gi, "learn more")
      .replace(/\blink\s+in\s+(our|your|the)\s+bio\b/gi, "details")
      .replace(/\bstress[- ]free\b/gi, "easier to understand")
      .replace(/\beffortless(ly)?\b/gi, "with simple guidance");
  } else {
    repaired = repaired
      .replace(/\bdeserves?\s+the\s+best\b/gi, "deserves a clearer next step")
      .replace(/\bclick\s+the\s+link\s+in\s+(our|your|the)\s+bio\b/gi, "learn more")
      .replace(/\blink\s+in\s+(our|your|the)\s+bio\b/gi, "details")
      .replace(/\bgame[- ]changing\b/gi, "useful")
      .replace(/\btake\s+(it|your|their|this)\s+to\s+the\s+next\s+level\b/gi, "make the next step clearer");
  }

  return repaired.replace(/\s+([,.!?])/g, "$1").replace(/[ \t]{2,}/g, " ").trim();
}

function parseEditorialJson(value = "") {
  const text = String(value || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function normalizeEditorialReviewPayload(payload, count) {
  const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
  return reviews
    .map((review) => {
      const index = Number.isInteger(review?.index) ? review.index : Number(review?.index);
      return {
        index,
        approved: review?.approved === true,
        grammatically_valid: Boolean(review?.grammatically_valid),
        factually_supported: Boolean(review?.factually_supported),
        consistent_with_request: Boolean(review?.consistent_with_request),
        distinct_from_other_results: Boolean(review?.distinct_from_other_results),
        problems: Array.isArray(review?.problems) ? review.problems.map((item) => String(item || "").slice(0, 80)).filter(Boolean) : [],
        repaired_caption: typeof review?.repaired_caption === "string" ? review.repaired_caption.trim() : null,
      };
    })
    .filter((review) => review.index >= 0 && review.index < count);
}

function getSectionValue(source = "", label = "") {
  const match = String(source || "").match(new RegExp(`${escapeRegExp(label)}:\\s*([^\\n]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function extractCurrentUserRequest(source = "") {
  const text = String(source || "");
  const match = text.match(/User (?:post\/topic description|topic\/post description|request):\s*([\s\S]*?)(?:\n\n[A-Z][A-Za-z /\-]+:|\nCurrent Brand Workspace:|\nBrand DNA:|$)/i);
  return match?.[1]?.trim() || "";
}

function buildApprovedFactsObject({ prompt = "", supportedSource = "", generatorType = "captions" } = {}) {
  const source = `${prompt}\n${supportedSource}`;
  return {
    generatorType,
    brandName: getSectionValue(source, "Brand name"),
    description: getSectionValue(source, "Description"),
    audience: getSectionValue(source, "Audience"),
    positioning: getSectionValue(source, "Positioning"),
    tone: getSectionValue(source, "Brand tone") || getSectionValue(source, "Tone"),
    platform: getSectionValue(source, "User platform"),
    goal: getSectionValue(source, "Caption goal"),
    currentRequest: extractCurrentUserRequest(source) || getSectionValue(source, "User post/topic description"),
  };
}

function normalizeCaptionFromReview(value = "", supportedSource = "") {
  return repairGeneratedItemQuality(
    String(value || "")
      .replace(/^\s*\d+[.)]\s*/, "")
      .replace(/^["']|["']$/g, "")
      .trim(),
    { supportedSource, generatorType: "captions" },
  );
}

function normalizeApprovedCaptionPayload(payload, supportedSource = "") {
  const captions = Array.isArray(payload?.approved_captions) ? payload.approved_captions : [];
  return captions
    .map((item) => {
      if (typeof item === "string") return normalizeCaptionFromReview(item, supportedSource);
      return normalizeCaptionFromReview(item?.caption || item?.copy || "", supportedSource);
    })
    .filter(Boolean)
    .slice(0, 5);
}

async function selectApprovedCaptionsEditorially({ openAiClient, systemPrompt, prompt, items, supportedSource, requestId, pass = 1 }) {
  if (!openAiClient || !Array.isArray(items) || !items.length) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  const approvedFacts = buildApprovedFactsObject({ prompt, supportedSource, generatorType: "captions" });
  try {
    const numberedItems = items.map((item, index) => `${index + 1}. ${item}`).join("\n");
    const review = await openAiClient.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${systemPrompt}

You are the mandatory final editorial reviewer for BrandThat captions. You are a separate review step from the generator.
Return only valid JSON with this schema:
{"approved_captions":["caption one","caption two","caption three","caption four","caption five"],"rejected":[{"index":1,"problems":["reason"]}]}

Select or rewrite the best 5 captions from the candidate set. Every approved caption must be grammatical, specific, natural, meaningfully distinct, and traceable to the approved_facts object.
Reject or rewrite any caption with professional status or credentials, guaranteed customer or pet reactions, guaranteed emotional/health/behavior outcomes, absolute phrases such as "no more", "always", "will love", "ensures", or "stress-free", past customers or completed appointments, locations, links, prices, service areas, or availability not present in approved_facts.
Reject awkward writing even when technically grammatical. Reject generic filler that could belong to any company.
Use five different strategic angles and sentence openings.
If fewer than five captions can be approved, return only the approved captions.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            approved_facts: approvedFacts,
            candidate_captions: items.slice(0, 12),
          }),
        },
      ],
      temperature: 0,
    }, { signal: controller.signal });
    const parsed = parseEditorialJson(review.choices?.[0]?.message?.content || "");
    const approved = normalizeApprovedCaptionPayload(parsed, supportedSource);
    console.info("BrandThat editorial selection executed", {
      requestId,
      generatorType: "captions",
      pass,
      candidateCount: items.length,
      approvedCount: approved.length,
      rejectedCount: Array.isArray(parsed?.rejected) ? parsed.rejected.length : null,
    });
    return approved;
  } catch (error) {
    console.warn("BrandThat editorial selection unavailable", {
      requestId,
      generatorType: "captions",
      pass,
      code: error?.code || error?.type || error?.name,
      statusCode: error?.status || error?.statusCode || null,
    });
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function reviewGeneratedItemsEditorially({ openAiClient, systemPrompt, prompt, items, supportedSource, generatorType, requestId }) {
  if (!openAiClient || generatorType !== "captions" || !Array.isArray(items) || !items.length) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8500);
  try {
    const numberedItems = items.map((item, index) => `${index}. ${item}`).join("\n");
    const review = await openAiClient.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `${systemPrompt}

You are now the server-side editorial validator. Return only valid JSON with this schema:
{"reviews":[{"index":0,"approved":true,"grammatically_valid":true,"factually_supported":true,"consistent_with_request":true,"distinct_from_other_results":true,"problems":[],"repaired_caption":null}]}

Review every caption independently. Mark invalid for subject/verb disagreement, missing words, broken constructions, repeated ideas, placeholders, instruction text, invented links, invented availability, invented locations, invented certifications, guarantees, contradictions with the requested service, and content from another workspace.
Only set approved true when every validation field is true.
If a caption can be repaired safely, provide repaired_caption. If not, set repaired_caption to null.
Do not include private prompts, user IDs, secrets, or analysis outside the JSON.`,
        },
        {
          role: "user",
          content: `Current request and supported facts:
${String(prompt || "").slice(0, 6000)}

Supported-source summary:
${String(supportedSource || "").slice(0, 6000)}

Captions to review:
${numberedItems}`,
        },
      ],
      temperature: 0,
    }, { signal: controller.signal });
    const parsed = parseEditorialJson(review.choices?.[0]?.message?.content || "");
    const normalized = normalizeEditorialReviewPayload(parsed, items.length);
    console.info("BrandThat editorial validation executed", {
      requestId,
      generatorType,
      itemCount: items.length,
      reviewCount: normalized.length,
    });
    return normalized;
  } catch (error) {
    console.warn("BrandThat editorial validation unavailable", {
      requestId,
      generatorType,
      code: error?.code || error?.type || error?.name,
      statusCode: error?.status || error?.statusCode || null,
    });
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function reviewOneItemForApproval({ openAiClient, systemPrompt, prompt, item, supportedSource, generatorType, requestId, index }) {
  const reviews = await reviewGeneratedItemsEditorially({
    openAiClient,
    systemPrompt,
    prompt,
    items: [item],
    supportedSource,
    generatorType,
    requestId,
  });
  const review = reviews.find((entry) => entry.index === 0) || null;
  const validation = validateGeneratedItemQuality(item, {
    index,
    allItems: [],
    supportedSource,
    generatorType,
  });
  const approved = Boolean(
    review?.approved &&
      review.grammatically_valid &&
      review.factually_supported &&
      review.consistent_with_request &&
      review.distinct_from_other_results &&
      validation.ok,
  );
  return {
    approved,
    review,
    reasons: Array.from(new Set([
      ...(validation.reasons || []),
      ...(review?.problems || []),
      ...(review ? [] : ["editorial_review_missing"]),
    ])),
  };
}

function removeCrossWorkspaceLeakage(value = "", contextKind = "general") {
  let repaired = String(value || "");
  if (contextKind === "pet") {
    repaired = repaired
      .replace(/\b(apartment[- ]friendly\s+)?(houseplants?|plants?|plant delivery|apartment greenery|botanical)\b/gi, "pet care")
      .replace(/\b(pothos|snake plants?)\b/gi, "pet")
      .replace(/\bcare cards?\b/gi, "appointment guidance");
  }
  if (contextKind === "plant") {
    repaired = repaired
      .replace(/\b(dog|dogs|pet|pets|grooming|groomer|mobile grooming|senior pets?)\b/gi, "plant")
      .replace(/\b(grooming vans?|appointment grooming|pet handling)\b/gi, "local delivery");
  }
  if (contextKind !== "software") {
    repaired = repaired
      .replace(/\b(SaaS|software platform|software|invoices?|sponsorships?|creator workflow)\b/gi, contextKind === "plant" ? "plant subscription" : contextKind === "pet" ? "mobile service" : "brand");
  }
  return repaired.replace(/[ \t]{2,}/g, " ").trim();
}

function sentenceLooksComplete(value = "") {
  const text = String(value || "").trim();
  if (text.length < 12) return false;
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) return false;
  if (!/[a-z0-9)]["']?[.!?]?$/i.test(text)) return false;
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 4) return false;
  return true;
}

export function validateGeneratedItemQuality(item = "", { index = 0, allItems = [], supportedSource = "", generatorType = "unknown" } = {}) {
  const text = String(item || "").trim();
  const normalized = normalizeForComparison(text);
  const contextKind = getContextKind(supportedSource);
  const previousItems = allItems.slice(0, index);
  const previousNormalized = previousItems.map(normalizeForComparison).filter(Boolean);
  const previousOpenings = previousItems.map(getOpeningKey).filter(Boolean);
  const reasons = [];

  if (!sentenceLooksComplete(text) && generatorType !== "hashtags") reasons.push("incomplete_sentence");
  if (hasAnyPattern(text, BROKEN_GRAMMAR_PATTERNS)) reasons.push("broken_grammar");
  if (hasAnyPattern(text, PLACEHOLDER_PATTERNS)) reasons.push("placeholder_text");
  if (hasAnyPattern(text, GENERIC_COPY_PATTERNS)) reasons.push("generic_phrase");
  if (hasAnyPattern(text, UNSUPPORTED_GUARANTEE_PATTERNS)) reasons.push("unsupported_guarantee");
  if (previousNormalized.includes(normalized)) reasons.push("duplicate_sentence");
  if (previousOpenings.includes(getOpeningKey(text)) && getOpeningKey(text).split(" ").length >= 3) reasons.push("repeated_opening");

  if (contextKind === "pet" && hasAnyPattern(text, PLANT_LEAK_PATTERNS)) reasons.push("cross_workspace_plant_leak");
  if (contextKind === "plant" && hasAnyPattern(text, PET_LEAK_PATTERNS)) reasons.push("cross_workspace_pet_leak");
  if (contextKind !== "software" && hasAnyPattern(text, SOFTWARE_LEAK_PATTERNS)) reasons.push("cross_workspace_software_leak");

  return {
    ok: reasons.length === 0,
    reasons,
    contextKind,
  };
}

function extractBrandNameFromSource(supportedSource = "") {
  const match = String(supportedSource || "").match(/Brand name:\s*([^\n]+)/i);
  return match?.[1]?.trim() || "";
}

function buildSafeReplacementItem({ index = 0, supportedSource = "", generatorType = "captions" } = {}) {
  const contextKind = getContextKind(supportedSource);
  const brandName = extractBrandNameFromSource(supportedSource);
  const prefix = brandName ? `${brandName} ` : "";

  if (generatorType === "hashtags") {
    if (contextKind === "pet") return "#MobileDogGrooming #PetCare #CoastalFamilies #SeniorPets #GentleGrooming";
    if (contextKind === "plant") return "#ApartmentPlants #HouseplantDelivery #BeginnerPlantCare #SmallSpaceLiving #LocalDelivery";
    return "#BrandStrategy #SmallBusiness #LaunchContent #CustomerClarity #BrandVoice";
  }

  const plantCaptions = [
    `${prefix}keeps apartment greenery approachable with local delivery and simple guidance.`,
    "A little more green at home, without turning plant care into a guessing game.",
    "For renters who want a calmer corner, start with guidance that is easy to follow.",
    "Simple care guidance helps beginners feel more confident bringing greenery into small spaces.",
    "This delivery moment is built for apartment living, practical care notes, and a friendlier first step.",
    "Make the next shelf, windowsill, or entryway feel more alive with guidance included.",
    "Local plant delivery, clear care notes, and a gentler way to start.",
    "Explore a plant direction that fits small spaces and beginner confidence.",
    `${prefix}turns the first plant decision into something clear, calm, and doable.`,
    "Ready for greener apartment living? Learn more about the next local delivery.",
  ];

  const petCaptions = [
    `${prefix}brings gentle mobile grooming closer to home for busy coastal families.`,
    "A calmer appointment starts with familiar surroundings, dependable care, and a softer pace.",
    "For senior pets and busy households, convenience should still feel personal.",
    "Clean coats, calmer routines, and a grooming visit designed around comfort.",
    "Skip the extra trip and keep care close to the neighborhood.",
    "A mobile grooming visit can feel simpler when trust and cleanliness lead the experience.",
    "For families juggling full days, dependable pet care at home makes the routine easier.",
    "Book a grooming conversation that starts with your pet's comfort and your schedule.",
    `${prefix}is built around gentle handling, clean details, and local reliability.`,
    "Give your dog a calmer grooming option close to home.",
  ];

  const softwareCaptions = [
    `${prefix}helps teams turn scattered work into a clearer workflow.`,
    "Less chasing details, more visibility into what needs to move next.",
    "For creators managing sponsors, clarity is the feature that keeps momentum moving.",
    "Keep the workflow organized before the next deadline becomes urgent.",
    "Turn approvals, invoices, and campaign steps into one cleaner operating rhythm.",
    "A better system starts when every moving piece has a place.",
    "For busy operators, the right workflow makes follow-through easier to see.",
    "Review the process, tighten the handoff, and keep the next action visible.",
    `${prefix}supports cleaner decisions across sponsorship work.`,
    "Make the next campaign easier to manage from the first step.",
  ];

  const generalCaptions = [
    `${prefix}makes the next step clearer for the people it serves.`,
    "Show the moment, name the value, and make the action easy to understand.",
    "A stronger brand message starts with one specific customer problem.",
    "Use the scene to make the offer feel practical, human, and easy to remember.",
    "Turn the brand promise into a simple next step.",
    "Make the customer feel seen before asking them to act.",
    "Specific context beats generic hype every time.",
    "Invite people into the brand with a clear reason to care.",
    `${prefix}keeps the message focused on what the audience actually needs.`,
    "Start with clarity, then make the next action simple.",
  ];

  const bank = contextKind === "plant" ? plantCaptions : contextKind === "pet" ? petCaptions : contextKind === "software" ? softwareCaptions : generalCaptions;
  return bank[index % bank.length];
}

export function repairGeneratedItemQuality(item = "", options = {}) {
  const contextKind = getContextKind(options.supportedSource);
  let repaired = sanitizeUnsafeGeneratedClaims(item, options.supportedSource);
  repaired = repairBrokenGrammar(repaired, contextKind);
  repaired = removeCrossWorkspaceLeakage(repaired, contextKind);
  repaired = sanitizeUnsafeGeneratedClaims(repaired, options.supportedSource);
  repaired = repaired.replace(/\s+([,.!?])/g, "$1").replace(/[ \t]{2,}/g, " ").trim();
  return repaired;
}

async function regenerateOneItem({ openAiClient, systemPrompt, prompt, index, generatorType, supportedSource, requestId }) {
  if (!openAiClient || generatorType !== "captions") return "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const contextKind = getContextKind(supportedSource);
    const replacement = await openAiClient.chat.completions.create({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `${prompt}

Repair caption ${index + 1} only.
Return one complete caption sentence only.
It must be grammatical, specific to the selected ${contextKind} workspace, and free of unsupported guarantees, invented facts, placeholder text, and cross-brand details.`,
        },
      ],
      temperature: 0.55,
    }, { signal: controller.signal });
    return sanitizeUnsafeGeneratedClaims(replacement.choices?.[0]?.message?.content || "", supportedSource);
  } catch (error) {
    console.warn("BrandThat output repair regeneration failed", {
      requestId,
      generatorType,
      itemIndex: index,
      code: error?.code || error?.type || error?.name,
      statusCode: error?.status || error?.statusCode || null,
    });
    return "";
  } finally {
    clearTimeout(timer);
  }
}

export async function applyOutputQualityStage({
  text = "",
  generatorType = "unknown",
  supportedSource = "",
  openAiClient = null,
  systemPrompt = "",
  prompt = "",
  requestId = "",
} = {}) {
  const initialText = sanitizeUnsafeGeneratedClaims(text, supportedSource);
  const items = splitGeneratedItems(initialText);
  if (!items.length) {
    const repaired = repairGeneratedItemQuality(initialText, { supportedSource, generatorType, index: 0 });
    const validation = validateGeneratedItemQuality(repaired, { supportedSource, generatorType, index: 0, allItems: [] });
    return {
      text: validation.ok ? repaired : buildSafeReplacementItem({ index: 0, supportedSource, generatorType }),
      repairedCount: validation.ok && repaired === initialText ? 0 : 1,
      validationEvents: validation.ok ? [] : [{ index: 0, reasons: validation.reasons, rewritten: true }],
    };
  }

  const repairedItems = [];
  const validationEvents = [];
  let repairedCount = 0;
  let regenerationAttempts = 0;

  console.info("BrandThat output validation started", {
    requestId,
    generatorType,
    itemCount: items.length,
  });

  for (let index = 0; index < items.length; index += 1) {
    const original = items[index];
    let candidate = repairGeneratedItemQuality(original, { supportedSource, generatorType, index });
    let validation = validateGeneratedItemQuality(candidate, {
      index,
      allItems: repairedItems,
      supportedSource,
      generatorType,
    });

    if (!validation.ok && regenerationAttempts < 3) {
      regenerationAttempts += 1;
      console.info("BrandThat output repair attempted", {
        requestId,
        generatorType,
        itemIndex: index,
        reasons: validation.reasons,
      });
      const regenerated = await regenerateOneItem({ openAiClient, systemPrompt, prompt, index, generatorType, supportedSource, requestId });
      if (regenerated) {
        candidate = repairGeneratedItemQuality(regenerated, { supportedSource, generatorType, index });
        validation = validateGeneratedItemQuality(candidate, {
          index,
          allItems: repairedItems,
          supportedSource,
          generatorType,
        });
        console.info("BrandThat output repair result", {
          requestId,
          generatorType,
          itemIndex: index,
          success: validation.ok,
          reasons: validation.reasons,
        });
      }
    }

    if (!validation.ok) {
      candidate = buildSafeReplacementItem({ index, supportedSource, generatorType });
      validationEvents.push({ index, reasons: validation.reasons, rewritten: true });
      repairedCount += 1;
    } else if (candidate !== original) {
      validationEvents.push({ index, reasons: ["deterministic_repair"], rewritten: true });
      repairedCount += 1;
    }

    repairedItems.push(candidate);
  }

  if (generatorType !== "captions") {
    console.info("BrandThat output validation completed", {
      requestId,
      generatorType,
      itemCount: repairedItems.length,
      repairedCount,
      failedIndexes: validationEvents.map((event) => event.index),
    });

    return {
      text: formatGeneratedItems(repairedItems),
      repairedCount,
      rejectedCount: 0,
      validationEvents,
    };
  }

  const firstPassApproved = await selectApprovedCaptionsEditorially({
    openAiClient,
    systemPrompt,
    prompt,
    items: repairedItems.slice(0, 8),
    supportedSource,
    requestId,
    pass: 1,
  });
  const approvedItems = [];
  const finalValidationEvents = [];

  for (let index = 0; index < firstPassApproved.length; index += 1) {
    const candidate = firstPassApproved[index];
    const validation = validateGeneratedItemQuality(candidate, {
      index,
      allItems: approvedItems,
      supportedSource,
      generatorType,
    });
    if (validation.ok) {
      approvedItems.push(candidate);
    } else {
      finalValidationEvents.push({ index, reasons: validation.reasons, approved: false });
    }
  }

  if (approvedItems.length < 5) {
    const refillCandidates = [...approvedItems];
    for (let index = 0; index < repairedItems.length && refillCandidates.length < 8; index += 1) {
      const candidate = repairedItems[index];
      const duplicate = refillCandidates.some((item) => normalizeForComparison(item) === normalizeForComparison(candidate));
      if (!duplicate) refillCandidates.push(candidate);
    }
    for (let index = refillCandidates.length; index < 8; index += 1) {
      const regenerated = await regenerateOneItem({ openAiClient, systemPrompt, prompt, index, generatorType, supportedSource, requestId });
      const candidate = repairGeneratedItemQuality(regenerated || buildSafeReplacementItem({ index, supportedSource, generatorType }), { supportedSource, generatorType, index });
      refillCandidates.push(candidate);
    }

    const secondPassApproved = await selectApprovedCaptionsEditorially({
      openAiClient,
      systemPrompt,
      prompt,
      items: refillCandidates.slice(0, 8),
      supportedSource,
      requestId,
      pass: 2,
    });

    for (let index = 0; index < secondPassApproved.length && approvedItems.length < 5; index += 1) {
      const candidate = secondPassApproved[index];
      const validation = validateGeneratedItemQuality(candidate, {
        index,
        allItems: approvedItems,
        supportedSource,
        generatorType,
      });
      const duplicate = approvedItems.some((item) => normalizeForComparison(item) === normalizeForComparison(candidate));
      if (validation.ok && !duplicate) {
        approvedItems.push(candidate);
      } else {
        finalValidationEvents.push({ index, reasons: duplicate ? ["duplicate_sentence"] : validation.reasons, approved: false });
      }
    }
  }

  console.info("BrandThat final validation gate", {
    requestId,
    generatorType,
    generatedCount: repairedItems.length,
    approvedCount: approvedItems.length,
    rejectedCount: finalValidationEvents.length,
    rejectedIndexes: finalValidationEvents.map((event) => event.index),
  });

  console.info("BrandThat output validation completed", {
    requestId,
    generatorType,
    itemCount: approvedItems.length,
    repairedCount,
    failedIndexes: [...validationEvents, ...finalValidationEvents].map((event) => event.index),
  });

  return {
    text: formatGeneratedItems(approvedItems),
    repairedCount,
    approvedCount: approvedItems.length,
    rejectedCount: finalValidationEvents.length,
    validationEvents: [...validationEvents, ...finalValidationEvents],
  };
}

const supabaseAuthUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co";
const supabaseAuthKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

const supabaseAuth = createClient(supabaseAuthUrl, supabaseAuthKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

async function requireVerifiedUser(event) {
  const token = getBearerToken(event);

  if (!token) {
    return {
      error: {
        statusCode: 401,
        code: "AUTH_REQUIRED",
        message: "Create your BrandThat account to try the full product.",
      },
    };
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  const user = data?.user || null;

  if (error || !user) {
    return {
      error: {
        statusCode: 401,
        code: "AUTH_REQUIRED",
        message: "Please log in again to continue.",
      },
    };
  }

  if (!isEmailVerified(user)) {
    return {
      error: {
        statusCode: 403,
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Check your email to verify your account before continuing.",
      },
    };
  }

  return { user };
}

function isTransientOpenAiError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500 || error?.name === "AbortError";
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getMembershipResult(userId) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      statusCode: 500,
      code: "SUPABASE_ADMIN_MISSING",
      message: "Generation is not configured right now. Please contact BrandThat support.",
      membership: "config_missing",
    };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan,stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      statusCode: 500,
      code: "MEMBERSHIP_LOOKUP_FAILED",
      message: "We could not confirm your membership. Please try again.",
      membership: "lookup_failed",
      internalMessage: error.message,
    };
  }

  const plan = String(data?.plan || "").toLowerCase();
  const isMember = plan === "member" || plan === "pro" || plan === "starter";
  if (!isMember) {
    return {
      ok: false,
      statusCode: 403,
      code: "MEMBERSHIP_INACTIVE",
      message: "Your membership is required to use this generator.",
      membership: data ? "inactive" : "profile_missing",
    };
  }

  return {
    ok: true,
    membership: data?.stripe_subscription_id ? "active_subscription" : "active_plan",
  };
}

function normalizeOpenAiError(error) {
  const providerStatus = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || "");
  const rawCode = String(error?.code || error?.type || "").toUpperCase();
  const openaiRequestId = error?.request_id || error?.headers?.["x-request-id"];

  if (error?.name === "AbortError") {
    return {
      httpStatus: 504,
      code: "OPENAI_TIMEOUT",
      message: "Generation took too long. Please try again with a shorter request.",
      providerStatus,
      providerCode: rawCode || "ABORT_ERROR",
      openaiRequestId,
      timeout: true,
    };
  }

  if (providerStatus === 401) {
    return {
      httpStatus: 502,
      code: "OPENAI_INVALID_API_KEY",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "UNAUTHORIZED",
      openaiRequestId,
    };
  }

  if (providerStatus === 403) {
    return {
      httpStatus: 502,
      code: "OPENAI_ACCESS_DENIED",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "ACCESS_DENIED",
      openaiRequestId,
    };
  }

  if (providerStatus === 404) {
    return {
      httpStatus: 502,
      code: "OPENAI_MODEL_NOT_FOUND",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "MODEL_NOT_FOUND",
      openaiRequestId,
    };
  }

  if (providerStatus === 429 && /quota|billing|credits/i.test(message)) {
    return {
      httpStatus: 503,
      code: "OPENAI_INSUFFICIENT_QUOTA",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "INSUFFICIENT_QUOTA",
      openaiRequestId,
    };
  }

  if (providerStatus === 429) {
    return {
      httpStatus: 429,
      code: "OPENAI_RATE_LIMITED",
      message: "Generation is busy right now. Please wait a moment and try again.",
      providerStatus,
      providerCode: rawCode || "RATE_LIMITED",
      openaiRequestId,
    };
  }

  if (providerStatus === 400) {
    return {
      httpStatus: 400,
      code: "OPENAI_INVALID_REQUEST",
      message: "That request could not be generated. Please simplify it and try again.",
      providerStatus,
      providerCode: rawCode || "INVALID_REQUEST",
      openaiRequestId,
    };
  }

  return {
    httpStatus: providerStatus >= 400 && providerStatus < 600 ? providerStatus : 502,
    code: providerStatus >= 500 ? "OPENAI_PROVIDER_ERROR" : "OPENAI_REQUEST_FAILED",
    message: "We couldn't generate that right now. Please try again.",
    providerStatus,
    providerCode: rawCode || "UNKNOWN_PROVIDER_ERROR",
    openaiRequestId,
  };
}

function getClientIp(event) {
  return event.headers?.["x-nf-client-connection-ip"] || event.headers?.["client-ip"] || event.headers?.["x-forwarded-for"]?.split(",")[0] || "unknown";
}

function checkRateLimit(event, { limit = 35, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = getClientIp(event);
  const bucket = (rateLimitStore.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  bucket.push(now);
  rateLimitStore.set(key, bucket);
  return bucket.length <= limit;
}

export const handler = async (event) => {
  const requestId = getRequestId();
  const startedAt = Date.now();
  if (event.httpMethod && event.httpMethod !== "POST") {
    return getPublicError(405, "METHOD_NOT_ALLOWED", "Use POST to generate content.", requestId);
  }

  const auth = await requireVerifiedUser(event).catch(() => ({
    error: {
      statusCode: 401,
      message: "Please log in again to continue.",
      code: "AUTH_REQUIRED",
    },
  }));
  if (auth.error) {
    return getPublicError(auth.error.statusCode, auth.error.code || "AUTH_REQUIRED", auth.error.message, requestId);
  }

  let generatorType = "unknown";
  try {
    if (!checkRateLimit(event)) {
      return getPublicError(429, "RATE_LIMITED", "Too many requests. Please wait a minute and try again.", requestId);
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return getPublicError(400, "INVALID_JSON", "The request could not be read. Please try again.", requestId);
    }

    const { prompt } = body;
    generatorType = String(body.tool || body.generatorType || "unknown").slice(0, 80);
    const workspaceId = String(body.brandId || body.workspaceId || "");

    const membership = await getMembershipResult(auth.user.id);
    if (!membership.ok) {
      logGenerateFailure({
        requestId,
        generatorType,
        status: membership.statusCode,
        category: membership.statusCode === 403 ? "authorization" : "configuration",
        code: membership.code,
        authentication: "present",
        membership: membership.membership,
        durationMs: Date.now() - startedAt,
        message: membership.internalMessage || membership.code,
      });
      return getPublicError(membership.statusCode, membership.code, membership.message, requestId);
    }

    const openAiClient = getOpenAiClient();
    if (!openAiClient) {
      logGenerateFailure({
        requestId,
        generatorType,
        status: 500,
        category: "configuration",
        code: "OPENAI_API_KEY_MISSING",
        authentication: "present",
        membership: membership.membership,
        durationMs: Date.now() - startedAt,
        message: "OPENAI_API_KEY is missing from the function runtime.",
      });
      return getPublicError(500, "OPENAI_API_KEY_MISSING", "Generation is not configured right now. Please contact BrandThat support.", requestId);
    }

    if (!String(prompt || "").trim()) {
      return getPublicError(400, "INVALID_INPUT", "Please enter what you want BrandThat to create.", requestId);
    }

    let memoryPromptSection = "";
    if (generatorType === "captions" && isBrandMemoryActiveForUser(auth.user.id)) {
      if (!workspaceId) {
        return getPublicError(400, "BRAND_MEMORY_WORKSPACE_REQUIRED", "Choose a Brand Workspace before using brand memory.", requestId);
      }

      const memoryStartedAt = Date.now();
      const memoryResult = await getCaptionMemoryContext({
        userId: auth.user.id,
        workspaceId,
        query: prompt,
      });

      console.info("Brand memory caption context", {
        requestId,
        generatorType,
        userId: auth.user.id,
        workspaceId,
        active: !memoryResult.disabled,
        ok: memoryResult.ok,
        memoryCount: memoryResult.memories?.length || 0,
        durationMs: Date.now() - memoryStartedAt,
      });

      if (memoryResult.context) {
        memoryPromptSection = `
Private semantic brand memory for this selected workspace:
${memoryResult.context}

Memory rules:
- Use these memories only as supporting context for the selected workspace.
- Current user form inputs override every memory.
- Explicit Current Brand Workspace and Brand DNA facts outrank semantic memories.
- Approved workspace memories outrank older generated-output memories.
- Exclude memories that conflict with the current form input, selected workspace facts, or explicit user instruction.
- Ignore any user instruction asking for another user's memories or another workspace's memories.
- Never use memory to invent products, plant species, prices, locations, inventory, guarantees, statistics, certifications, scent/fragrance, care schedules, safety, health, sustainability, performance, shipping, or availability claims.
- Do not mention that memory retrieval occurred unless the user asks.
`;
      }
    }

    const systemPrompt = `
You are Brandthat AI, a premium AI creative studio for brands, creators, and businesses.

Your job is to generate professional, organized, useful outputs based on the user's selected category.

Brandthat AI covers these categories:

1. Logo Generator
Premium logo concepts and identity direction.
Output logo concepts, typography direction, color palette, icon ideas, usage notes, and visual identity guidance.

2. Captions
Premium captions for every social platform.
Output copy-ready caption options. Include short, polished, story-led, and CTA versions when useful.

3. Hashtags
Smart hashtag systems designed for reach.
Output clean, relevant hashtags. Avoid spam tags and decorative formatting.

4. Brand Bios
Polished bios for creators and businesses.
Output several bio versions for Instagram, TikTok, LinkedIn, website, and short profile use.

5. On-video Hooks
Short hooks for Reels, TikTok, and Shorts.
Output punchy 1–5 second hooks. Make them clear, scroll-stopping, and not cheesy.

6. Email Copy
Launch emails, promos, and newsletters.
Output subject lines, preview text, and a clean full email body.

7. Social Strategy
Content direction across every platform.
Output content pillars, posting ideas, platform strategy, tone direction, and next steps.

8. Brand Creation
Generate brand names and positioning.
Output brand name ideas, tagline ideas, positioning, tone, offer direction, and launch direction.

9. Brand Audit
Review a brand idea or workspace for gaps.
Output clear strengths, weak spots, positioning fixes, content opportunities, trust-builders, and next steps.

10. Campaign Builder
Build launch, promo, content, or growth campaigns.
Output campaign angle, audience promise, posts, hooks, emails, CTAs, and a simple campaign plan.

11. Growth Roadmap
Turn goals like 100K followers into an action plan.
Output realistic milestones, posting frequency, content mix, weekly schedule, content testing plan, collaboration ideas, and measurable next steps.

Rules:
- Always match the selected category.
- Never give random generic luxury copy unless the user asks for luxury.
- Make responses clean, organized, and practical.
- Make strategic recommendations like a premium branding agency: decisive, specific, and tied to the actual business context.
- Replace vague advice with concrete actions, channels, cadence, proof points, examples, KPIs, and completion criteria.
- If the prompt includes Brand DNA, treat it as the source of truth. Do not contradict user-edited audience, positioning, tone, visual direction, colors, typography, or business goals.
- Add a concise "Why this works" line for major strategic, visual, roadmap, campaign, or audit recommendations.
- Reject filler phrases such as "post consistently", "build trust", "use premium typography", "use professional colors", or "increase awareness" unless they are followed by specific actions and measurable outcomes.
- Use clean headings and spacing when they help readability.
- Do not use Markdown bold markers like **text**.
- Do not use decorative symbols, asterisks, emoji, or spammy formatting.
- Do not wrap section labels in asterisks.
- Give multiple useful options.
- Sound premium, modern, and brand-aware.
- Do not invent health, scientific, environmental, legal, financial, performance, discount, guarantee, scarcity, shipping, availability, exact-care, or safety claims unless the user supplied that verified information.
- Use only products, species, features, prices, locations, inventory, guarantees, statistics, certifications, and claims supported by the current user request, selected Brand Workspace, or retrieved memory for this exact workspace.
- If a product detail is unknown, stay general or use editable language instead of making the detail vivid.
- Every generated item must be a complete grammatical sentence or clean finished item for its format.
- Do not return broken phrases, missing words, duplicated sentences, placeholder text, instruction text, or copy that belongs to another workspace.
- Avoid generic phrases such as "deserves the best", "game-changing", "take it to the next level", "unlock your potential", and "experience the difference" unless the user's exact context makes them true and specific.
- Vary sentence structure, opening words, length, angle, and call to action across results.
- Do not force the brand name into every item.
- Current form input outranks workspace context; workspace facts outrank semantic memories; approved workspace memories outrank older generated outputs.
- If retrieved memory conflicts with current form input or workspace facts, ignore the memory.
- For plant care, do not provide exact watering frequencies, air purification claims, improved air quality claims, mood improvement claims, pet-safety claims, non-toxic claims, guaranteed-growth claims, or purification claims unless verified product information was supplied by the user.
- Do not invent plant species, fragrance, monthly inventory, exact plant varieties, or care-card contents unless supplied by the user, workspace, or retrieved memory.
- Safe plant phrasing example: "Snake plants are a popular low-maintenance choice for apartment greenery."
- Avoid fluff.
- Avoid saying “as an AI.”
${memoryPromptSection}
`;

    const createCompletion = () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      return openAiClient.chat.completions.create({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }, { signal: controller.signal })
        .finally(() => clearTimeout(timer));
    };

    let completion;
    try {
      completion = await createCompletion();
    } catch (error) {
      if (!isTransientOpenAiError(error)) throw error;
      completion = await createCompletion();
    }

    console.info("BrandThat generation completed", {
      requestId,
      generatorType,
      openaiRequestId: completion?._request_id || completion?.response?.headers?.get?.("x-request-id") || null,
      durationMs: Date.now() - startedAt,
    });

    const supportedSource = `${prompt}\n${memoryPromptSection}`;
    const qualityResult = await applyOutputQualityStage({
      text: completion.choices?.[0]?.message?.content || "",
      generatorType,
      supportedSource,
      openAiClient,
      systemPrompt,
      prompt,
      requestId,
    });
    const safeText = qualityResult.text;

    if (qualityResult.validationEvents.length) {
      console.info("BrandThat output quality stage", {
        requestId,
        generatorType,
        repairedCount: qualityResult.repairedCount,
        events: qualityResult.validationEvents.map((event) => ({
          index: event.index,
          reasons: event.reasons,
          rewritten: event.rewritten,
        })),
      });
    }

    if (!safeText.trim()) {
      logGenerateFailure({
        requestId,
        generatorType,
        status: 502,
        category: "provider",
        code: "OPENAI_EMPTY_RESPONSE",
        openaiRequestId: completion?._request_id || completion?.response?.headers?.get?.("x-request-id"),
        authentication: "present",
        membership: membership.membership,
        durationMs: Date.now() - startedAt,
        message: "OpenAI returned an empty response.",
      });
      return getPublicError(502, "OPENAI_EMPTY_RESPONSE", "We couldn't generate that right now. Please try again.", requestId);
    }

    return json(200, {
      ok: true,
      text: safeText,
      requestId,
      notice: generatorType === "captions" && qualityResult.approvedCount < 5
        ? `BrandThat returned ${qualityResult.approvedCount} caption${qualityResult.approvedCount === 1 ? "" : "s"} that passed review.`
        : undefined,
      approvedCount: qualityResult.approvedCount,
      rejectedCount: qualityResult.rejectedCount,
    });
  } catch (error) {
    const providerError = normalizeOpenAiError(error);
    logGenerateFailure({
      requestId,
      generatorType,
      status: providerError.httpStatus,
      category: "provider",
      code: providerError.code,
      providerStatus: providerError.providerStatus,
      providerCode: providerError.providerCode,
      openaiRequestId: providerError.openaiRequestId,
      authentication: "present",
      membership: "checked",
      timeout: providerError.timeout,
      durationMs: Date.now() - startedAt,
      message: error?.message,
    });
    return getPublicError(providerError.httpStatus, providerError.code, providerError.message, requestId);
  }
};
