const OpenAI = require("openai");

function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

const INDUSTRY_KEYWORDS = [
  ["restaurant", ["restaurant", "pizza", "food", "bar", "cafe", "bakery", "coffee", "burger", "taco", "diner", "hospitality"]],
  ["chocolate / confectionery", ["chocolate", "candy", "candies", "sweet", "sweets", "confection", "factory"]],
  ["ranch / western lifestyle", ["ranch", "horse", "alpaca", "cattle", "farm", "western", "cowboy", "barn"]],
  ["AI / technology", ["ai", "software", "saas", "startup", "app", "automation", "platform", "tech"]],
  ["law firm", ["law", "legal", "attorney", "lawyer", "firm"]],
  ["real estate", ["real estate", "realtor", "property", "homes", "brokerage", "luxury homes"]],
  ["construction / trades", ["construction", "plaster", "plastering", "contractor", "roofing", "plumbing", "electric", "stucco"]],
  ["fitness / coaching", ["fitness", "gym", "training", "coach", "strength", "iron", "wellness"]],
  ["beauty / skincare", ["beauty", "skincare", "skin", "salon", "spa", "esthetic", "cosmetic"]],
  ["photography / creative studio", ["photo", "photography", "video", "wedding", "studio", "creative"]],
  ["automotive", ["auto", "car", "truck", "garage", "detailing", "mechanic", "motors"]],
  ["medical / health", ["medical", "clinic", "health", "dental", "doctor", "therapy", "care"]],
  ["kids / family", ["kids", "children", "party", "birthday", "family", "play"]],
  ["fashion / apparel", ["fashion", "apparel", "clothing", "streetwear", "boutique", "wear"]],
  ["finance", ["finance", "wealth", "capital", "invest", "accounting", "tax"]],
];

const rateLimitStore = global.brandthatBrandPlanRateLimit || new Map();
global.brandthatBrandPlanRateLimit = rateLimitStore;

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function getClientIp(event) {
  return event.headers?.["x-nf-client-connection-ip"] || event.headers?.["client-ip"] || event.headers?.["x-forwarded-for"]?.split(",")[0] || "unknown";
}

function checkRateLimit(event, { limit = 24, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = getClientIp(event);
  const bucket = (rateLimitStore.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  bucket.push(now);
  rateLimitStore.set(key, bucket);
  return bucket.length <= limit;
}

function clean(value = "") {
  return String(value || "")
    .replace(/\*\*/g, "")
    .replace(/__+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value = "") {
  const original = clean(value);
  if (/[a-z][A-Z]/.test(original) || /\.[a-z]/i.test(original)) return normalizeBrandName(original);

  return normalizeBrandName(original
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
    .replace(/\bAi\b/g, "AI")
    .replace(/\bSaas\b/g, "SaaS"));
}

function normalizeBrandName(value = "") {
  return clean(value)
    .replace(/\bCandys\b/gi, "Candies")
    .replace(/\bChocolates\b/gi, "Chocolates")
    .replace(/\bIkes Candies\b/i, "Ike's Candies")
    .replace(/\bIke Candies\b/i, "Ike's Candies")
    .replace(/\bIke'S Candies\b/i, "Ike's Candies")
    .replace(/\bBrandthat\.ai\b/i, "BrandThat.ai")
    .replace(/\bNexusforge\b/i, "NexusForge");
}

function inferIndustry(text = "") {
  const lower = String(text || "").toLowerCase();
  const match = INDUSTRY_KEYWORDS.find(([, keywords]) => keywords.some((keyword) => lower.includes(keyword)));
  return match?.[0] || "new business / brand";
}

function inferBrandName({ brandName = "", idea = "" } = {}) {
  const explicit = clean(brandName);
  if (explicit) return titleCase(explicit);

  const text = clean(idea);
  const domainName = text.match(/\b([a-z][a-z0-9-]*\.ai)\b/i);
  if (domainName?.[1]) return normalizeBrandName(domainName[1]);

  const patterns = [
    /\bcalled\s+([a-z0-9&'.\-\s]{2,50})/i,
    /\bnamed\s+([a-z0-9&'.\-\s]{2,50})/i,
    /\bna?e?d\s+([a-z0-9&'.\-\s]{2,50})/i,
    /\bnamd\s+([a-z0-9&'.\-\s]{2,50})/i,
    /\bname\s+is\s+([a-z0-9&'.\-\s]{2,50})/i,
    /\bbrand\s+called\s+([a-z0-9&'.\-\s]{2,50})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return titleCase(match[1].replace(/\b(for|that|with|and|in|to|a|an)\b.*$/i, ""));
    }
  }

  const words = text.split(/\s+/).filter(Boolean);
  return titleCase(words.slice(0, 3).join(" ")) || "New Brand";
}

function extractColors(text = "") {
  const lower = String(text || "").toLowerCase();
  const known = ["black", "white", "cream", "gold", "green", "blue", "silver", "red", "pink", "purple", "orange", "brown", "navy", "gray", "grey", "beige"];
  const colors = known.filter((color) => lower.includes(color));
  return colors.length ? colors.join(", ") : "";
}

function toArray(value, fallback = []) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/\n|;/)
      .map((item) => item.replace(/^\d+[.)]\s*/, ""))
      .map(clean)
      .filter(Boolean);
  }
  return fallback;
}

function getIndustryVisualDefaults(industry) {
  const defaults = {
    "restaurant": {
      moodboard: "Editorial food photography, warm service details, refined menu typography, and a mark that can live on packaging, signage, and social avatars.",
      typography: "A confident display wordmark paired with a clean sans serif for menus, captions, and website copy.",
      colors: "Warm neutral base with one appetite-friendly accent such as red, olive, terracotta, or deep brown.",
      symbols: "Tasteful ingredient, plate, flame, utensil, or abstract hospitality mark only when it feels ownable.",
    },
    "chocolate / confectionery": {
      moodboard: "Premium packaging, rich chocolate textures, soft highlights, close-up product details, and boutique shelf presence.",
      typography: "Elegant serif or crafted display wordmark with generous spacing and a simple supporting sans serif.",
      colors: "Cocoa brown, cream, warm gold, deep red, or soft blush with strong contrast for packaging.",
      symbols: "Wrapper, cacao pod, ribbon, drop, seal, or custom letterform inspired by confectionery packaging.",
    },
    "AI / technology": {
      moodboard: "Clean interface systems, precise grids, subtle depth, product screenshots, and intelligent technical calm.",
      typography: "Modern geometric sans serif with tight hierarchy, strong lowercase/uppercase decisions, and crisp spacing.",
      colors: "Charcoal, white, electric blue, silver, cyan, or restrained monochrome with one technical accent.",
      symbols: "Abstract system mark, signal, node, monogram, interface tile, or intelligent geometry.",
    },
    "law firm": {
      moodboard: "Quiet authority, editorial documents, marble or paper textures, confident spacing, and institutional trust.",
      typography: "Refined serif or legal editorial wordmark paired with a restrained sans serif.",
      colors: "Charcoal, ivory, navy, deep green, brass, or black and white.",
      symbols: "Initials, column abstraction, seal, balance implied through symmetry, or no icon.",
    },
    "real estate": {
      moodboard: "Architectural lines, premium interiors, clean property photography, and elevated editorial spacing.",
      typography: "Elegant serif or high-end sans serif wordmark with wide spacing and clear hierarchy.",
      colors: "Stone, black, ivory, slate, forest, or champagne accents.",
      symbols: "Abstract roofline, stone shape, architectural monogram, or minimal landmark geometry.",
    },
    "construction / trades": {
      moodboard: "Clean jobsite credibility, bold workwear, trucks, signage, and confident local-service trust.",
      typography: "Sturdy sans serif or industrial wordmark with readable weight and simple spacing.",
      colors: "Black, white, steel gray, navy, safety orange, or deep green depending on positioning.",
      symbols: "Tool-adjacent geometry, surface texture, shield, hard edge, or initials instead of cheap clipart.",
    },
  };

  return defaults[industry] || {
    moodboard: "Premium brand photography, clean product or service moments, editorial spacing, and a simple identity system that can scale.",
    typography: "Readable primary wordmark paired with a clean supporting type style and deliberate spacing.",
    colors: "Restrained palette with one memorable accent and enough contrast for web, social, and packaging.",
    symbols: "Simple monogram, abstract symbol, or restrained industry cue that feels ownable rather than generic.",
  };
}

function buildFallbackBrandPlan(input = {}) {
  const idea = clean(input.idea || input.rawPrompt || input.description);
  const brandName = inferBrandName({ brandName: input.brandName, idea });
  const industry = inferIndustry(`${brandName} ${idea} ${input.positioning || ""}`);
  const colors = clean(input.colors || extractColors(idea));
  const visualDefaults = getIndustryVisualDefaults(industry);
  const personality = clean(input.personality) || (idea.toLowerCase().includes("luxury") ? "Premium, calm, polished, and detail-driven." : "Clear, useful, confident, and approachable.");
  const targetAudience = clean(input.audience) || `People looking for a trustworthy ${industry} brand with a clear offer and polished experience.`;
  const positioning = clean(input.positioning) || `${brandName} should feel specific, credible, and easy to understand in the ${industry} category.`;
  const coreOffer = clean(input.offer) || `A focused ${industry} offer that makes the customer's next step feel simple and worthwhile.`;
  const colorSystem = colors ? `${colors}. Use restrained contrast, one clear accent, and enough flexibility for light, dark, and social uses.` : visualDefaults.colors;

  return {
    brandName,
    brandSummary: `${brandName} is a ${industry} concept built around ${idea || "a clear business idea"} with a practical path from launch to first customer traction.`,
    targetAudience,
    positioning,
    brandPersonality: personality,
    competitorCategory: `${industry} brands, local competitors, and simple template-based alternatives.`,
    pricePositioning: idea.toLowerCase().match(/luxury|premium|high-end|private|boutique/) ? "Premium, quality-led pricing." : "Accessible but professional pricing with room to move upmarket.",
    coreMessage: `${brandName} helps customers understand the offer quickly, trust the brand faster, and take the next step with confidence.`,
    coreOffer,
    visualIdentityDirection: clean(input.visualDirection) || `Build a clean identity around ${visualDefaults.symbols}. Keep the system readable, scalable, and commercially useful.`,
    moodboardDirection: clean(input.moodboard) || visualDefaults.moodboard,
    typographySystem: clean(input.typography) || visualDefaults.typography,
    colorSystem,
    brandVoice: "Direct, specific, polished, and useful. Avoid vague hype. Make every line explain what the brand does, who it helps, and why it matters.",
    taglineIdeas: [
      `${brandName}, made clear.`,
      `A better way to build ${industry}.`,
      `Designed for what comes next.`,
      `Clear direction. Better momentum.`,
    ],
    launchRoadmap30Days: [
      { week: "Week 1", focus: "Clarify the offer", actions: ["Finalize the brand promise", "Write the homepage headline", "Choose the first three proof points", "Create the first social bio"] },
      { week: "Week 2", focus: "Build the visual system", actions: ["Choose logo direction", "Lock color and typography rules", "Create profile image and cover assets", "Prepare simple website or landing page sections"] },
      { week: "Week 3", focus: "Publish launch content", actions: ["Post the brand story", "Share offer examples", "Publish three trust-building posts", "Ask early customers or followers for feedback"] },
      { week: "Week 4", focus: "Turn attention into action", actions: ["Refine the CTA", "Create a simple email or DM outreach sequence", "Measure saves, replies, clicks, and leads", "Plan the next 30 days from what worked"] },
    ],
    nextStepActionPlan: [
      "Save this brand plan into a Brand Workspace.",
      "Generate logo concepts using the visual, color, and typography direction.",
      "Create captions, hashtags, and a launch roadmap from the saved workspace context.",
      "Export the brand kit once the direction feels right.",
    ],
    workspaceContext: {
      industry,
      offer: coreOffer,
      differentiator: positioning,
      audience: targetAudience,
      personality,
      visualDirection: clean(input.visualDirection) || `Clean ${industry} identity with a restrained, scalable symbol system.`,
      moodboard: clean(input.moodboard) || visualDefaults.moodboard,
      typography: clean(input.typography) || visualDefaults.typography,
      colors: colorSystem,
      roadmapGoal: clean(input.roadmapGoal) || "Launch with a clear offer, brand identity direction, and first 30 days of content.",
    },
    logoContext: {
      brandName,
      industry,
      style: personality,
      symbolIdeas: visualDefaults.symbols,
      colors: colorSystem,
      typography: clean(input.typography) || visualDefaults.typography,
      avoid: "Wrong brand name, unrelated industry cues, tiny marks, clipart, clutter, unreadable text, and generic template layouts.",
    },
  };
}

function validateBrandPlan(plan = {}, input = {}) {
  const fallback = buildFallbackBrandPlan(input);
  const output = { ...fallback, ...(plan || {}) };
  const requiredStrings = [
    "brandName",
    "brandSummary",
    "targetAudience",
    "positioning",
    "brandPersonality",
    "competitorCategory",
    "pricePositioning",
    "coreMessage",
    "coreOffer",
    "visualIdentityDirection",
    "moodboardDirection",
    "typographySystem",
    "colorSystem",
    "brandVoice",
  ];

  requiredStrings.forEach((key) => {
    const value = clean(output[key]);
    output[key] = value.length >= 10 || key === "brandName" ? value || fallback[key] : fallback[key];
  });

  output.brandName = inferBrandName({ brandName: output.brandName, idea: input.idea || input.rawPrompt });
  output.taglineIdeas = toArray(output.taglineIdeas, fallback.taglineIdeas).slice(0, 6);
  if (output.taglineIdeas.length < 3) output.taglineIdeas = fallback.taglineIdeas;

  output.launchRoadmap30Days = Array.isArray(output.launchRoadmap30Days) ? output.launchRoadmap30Days : fallback.launchRoadmap30Days;
  output.launchRoadmap30Days = output.launchRoadmap30Days.slice(0, 4).map((item, index) => ({
    week: clean(item.week) || `Week ${index + 1}`,
    focus: clean(item.focus) || fallback.launchRoadmap30Days[index]?.focus || "Build momentum",
    actions: toArray(item.actions, fallback.launchRoadmap30Days[index]?.actions || []).slice(0, 5),
  }));

  if (output.launchRoadmap30Days.length < 4) output.launchRoadmap30Days = fallback.launchRoadmap30Days;
  output.nextStepActionPlan = toArray(output.nextStepActionPlan, fallback.nextStepActionPlan).slice(0, 6);
  if (output.nextStepActionPlan.length < 3) output.nextStepActionPlan = fallback.nextStepActionPlan;

  output.workspaceContext = { ...fallback.workspaceContext, ...(output.workspaceContext || {}) };
  output.logoContext = { ...fallback.logoContext, ...(output.logoContext || {}) };
  output.logoContext.brandName = output.brandName;
  output.logoContext.industry = clean(output.logoContext.industry) || output.workspaceContext.industry || fallback.logoContext.industry;
  output.workspaceContext.industry = clean(output.workspaceContext.industry) || output.logoContext.industry;

  return output;
}

function formatBrandPlanText(plan) {
  const roadmap = plan.launchRoadmap30Days
    .map((item) => `${item.week}: ${item.focus}\n${item.actions.map((action) => `- ${action}`).join("\n")}`)
    .join("\n\n");

  return `1. Brand name and summary
${plan.brandName}
${plan.brandSummary}

2. Positioning
${plan.positioning}

3. Target customer
${plan.targetAudience}

4. Core offer
${plan.coreOffer}

5. Brand personality
${plan.brandPersonality}

6. Visual identity direction
${plan.visualIdentityDirection}

7. Moodboard direction
${plan.moodboardDirection}

8. Typography system
${plan.typographySystem}

9. Color system
${plan.colorSystem}

10. Brand voice and taglines
${plan.brandVoice}
Taglines: ${plan.taglineIdeas.join(" / ")}

11. Practical 30-day launch roadmap
${roadmap}

12. Next-step action plan
${plan.nextStepActionPlan.map((step) => `- ${step}`).join("\n")}`;
}

function extractJsonObject(text = "") {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1));
    }
  }
  return null;
}

exports.handler = async (event) => {
  try {
    if (!checkRateLimit(event)) {
      return json(429, { error: "Too many brand plans requested. Please wait a minute and try again." });
    }

    const input = JSON.parse(event.body || "{}");
    const idea = clean(input.idea || input.rawPrompt || input.description);

    if (!idea) {
      return json(400, { error: "Add a business or brand idea first." });
    }

    if (!process.env.OPENAI_API_KEY) {
      const plan = validateBrandPlan(null, input);
      return json(200, { plan, text: formatBrandPlanText(plan), source: "fallback" });
    }

    const fallback = buildFallbackBrandPlan(input);
    const systemPrompt = `
You are BrandThat's Brand Strategist system.

Return only valid JSON. Do not use markdown.

Create a practical, specific, workspace-ready brand plan from a rough idea.
The plan must be useful enough to guide logo generation, content, roadmap, and a saved Brand Workspace.

Required JSON keys:
brandName, brandSummary, targetAudience, positioning, brandPersonality, competitorCategory, pricePositioning, coreMessage, coreOffer, visualIdentityDirection, moodboardDirection, typographySystem, colorSystem, brandVoice, taglineIdeas, launchRoadmap30Days, nextStepActionPlan, workspaceContext, logoContext.

Rules:
- Correct obvious typos but preserve the intended brand name.
- If no brand name exists, suggest one concise name.
- Avoid vague filler like "stand out" unless you explain how.
- Make visual direction useful for logo generation.
- Make roadmap actions concrete and realistic.
- No asterisks, emoji, or decorative formatting.
- launchRoadmap30Days must be four week objects with week, focus, actions.
- logoContext must include brandName, industry, style, symbolIdeas, colors, typography, avoid.
`;

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: process.env.BRAND_PLAN_MODEL || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: JSON.stringify({
            idea,
            providedBrandName: input.brandName || "",
            audience: input.audience || "",
            positioning: input.positioning || "",
            personality: input.personality || "",
            visualDirection: input.visualDirection || "",
            roadmapGoal: input.roadmapGoal || "",
            fallbackContext: fallback,
          }),
        },
      ],
      temperature: 0.65,
    });

    const parsed = extractJsonObject(completion.choices?.[0]?.message?.content || "");
    const plan = validateBrandPlan(parsed, input);

    return json(200, {
      plan,
      text: formatBrandPlanText(plan),
      source: parsed ? "openai" : "validated-fallback",
    });
  } catch (error) {
    const input = (() => {
      try {
        return JSON.parse(event.body || "{}");
      } catch {
        return {};
      }
    })();
    const plan = validateBrandPlan(null, input);

    return json(200, {
      plan,
      text: formatBrandPlanText(plan),
      source: "error-fallback",
      warning: error.message || "Brand plan generation fell back to a local plan.",
    });
  }
};
