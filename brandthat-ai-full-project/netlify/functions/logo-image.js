const OpenAI = require("openai");

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function buildLogoPrompt({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory }) {
  const director = buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory });
  const primaryConcept = director.concepts?.[0] || {};
  const conceptLines = director.concepts
    .map((concept, index) => `${index + 1}. ${concept.name}: ${concept.symbol}. Typography: ${concept.typography}. Palette: ${concept.palette}. Layout: ${concept.layout}. Why: ${concept.whyFits}`)
    .join("\n");

  return `
Create one finished, usable premium logo image.

Current request fidelity rules:
- The CURRENT brand name below is mandatory and overrides all memory, examples, saved workspaces, and prior prompts.
- The CURRENT industry below is mandatory and must be visible in the symbol, typography tone, palette, and overall identity.
- Never reuse a previous company name, ranch theme, luxury editorial default, or abstract premium mark unless the current request explicitly asks for it.
- The Creative Director may refine spacing, hierarchy, and quality, but may not change the requested brand name, industry, object, mascot, color, or core category.

Brand name or required words:
${brandName || "Use the brand name, initials, or keywords from the request."}

Industry or niche:
${logoIndustry || "Infer the business, sport, creator niche, product category, or community from the request."}

Logo style:
${logoStyle || "Choose the best style for the request."}

Symbol, mascot, or icon:
${logoSymbol || "Infer the most relevant symbol, mascot, animal, object, lettermark, or icon from the request."}

Color direction:
${logoColors || "Choose a strong professional palette unless the user requested colors."}

Avoid:
${logoAvoid || "Avoid anything that conflicts with the user's request."}

Extra user notes:
${userPrompt || "No extra notes."}

Full request:
${logoPrompt}

Creative Director interpretation:
- Primary category: ${director.category}
- Brand personality: ${director.personality}
- Personality matrix: ${Object.entries(director.personalityMatrix || {}).map(([axis, item]) => `${axis} ${item.low}/${item.high}: ${item.score}`).join("; ")}
- Design directives: ${director.personalityDirectives?.scoringBias || "balanced professional logo strategy"}
- Interpreted user language: ${director.personalityDirectives?.interpretedSummary || "no special vague/emotional language detected"}
- Typography translation: ${director.personalityDirectives?.interpretedTypography || "use the typography system selected by the Creative Director"}
- Spacing/composition translation: ${[director.personalityDirectives?.interpretedSpacing, director.personalityDirectives?.interpretedComposition].filter(Boolean).join("; ") || "use premium spacing and composition for the selected category"}
- Palette/icon restraint translation: ${[director.personalityDirectives?.interpretedPalette, director.personalityDirectives?.interpretedIcon].filter(Boolean).join("; ") || "use category-appropriate palette and icon restraint"}
- Human-design realism: ${director.humanDesign?.summary || "intentional composition, premium spacing, and non-template balance"}
- Design trend intelligence: ${director.trendIntelligence?.summary || "contemporary, scalable, non-generic brand system"}
- Generation memory: ${director.generationMemory?.summary || "no prior logo memory"}
- Previous successful direction to preserve/evolve: ${director.generationMemory?.anchor ? `Style: ${director.generationMemory.anchor.style || "keep current style"}; Symbol: ${director.generationMemory.anchor.symbol || "keep current icon logic"}; Typography: ${director.generationMemory.anchor.typography || "keep current typography quality"}; Palette: ${director.generationMemory.anchor.palette || "keep current palette"}; Layout: ${director.generationMemory.anchor.layout || "keep current layout logic"}` : "none"}
- Refinement instruction: ${director.generationMemory?.refinementInstruction || director.generationMemory?.continuityIntent || "none"}
- Areas to improve this iteration: ${director.generationMemory?.changedAreas?.length ? director.generationMemory.changedAreas.join(", ") : "best overall first direction"}
- Areas to preserve: ${director.generationMemory?.preserveAreas?.length ? director.generationMemory.preserveAreas.join(", ") : "brand name, industry, strongest typography, palette logic, spacing, and brand personality"}
- Internal Creative Director review: ${director.creativeDirectorReview?.summary || "concepts reviewed for brand fit, spacing, hierarchy, uniqueness, and premium feel"}
- Regeneration behavior: ${director.generationMemory?.anchor ? "preserve the successful brand identity, typography, palette, and layout logic from the previous result; evolve only the requested weak area so this feels like another concept from the same creative direction" : "create the strongest first direction from the brief"}
- Target audience: ${director.targetAudience}
- Visual territory: ${director.visualTerritory}
- Avoid generic mismatch: ${director.avoid}
${director.personalityDirectives?.interpretedAvoid ? `- User-language avoid cues: ${director.personalityDirectives.interpretedAvoid}` : ""}

Primary direction to generate:
- Name: ${primaryConcept.name || "Meaning-first logo direction"}
- Symbol/icon: ${primaryConcept.symbol || "A custom symbol based on the strongest category cue in the request"}
- Typography: ${primaryConcept.typography || "Readable professional wordmark"}
- Palette: ${primaryConcept.palette || "High-contrast brand palette"}
- Layout: ${primaryConcept.layout || "Large logo mark with readable wordmark"}
- Why it fits: ${primaryConcept.whyFits || "It directly reflects the user's brand words and category."}

Distinct logo directions to honor:
${conceptLines}

First-result quality standard:
- The first logo must feel like a real brand identity direction, not a logo-generator template.
- Prefer restraint over decoration: one clear idea, one primary mark or wordmark, one accent at most.
- Prioritize typography quality, spacing, hierarchy, and brand fit over adding more symbols.
- Bias toward typography-first, monogram, or restrained abstract marks when the category does not require a literal symbol.
- If the requested concept can work as a wordmark or monogram, use that before adding a generic icon.
- If using an icon, make it a simplified ownable symbol with negative space or custom geometry, not a literal clipart drawing.
- Use flat vector-style design with crisp edges, confident whitespace, and no mockup scene.
- Use premium color restraint: mostly monochrome or two-color with one meaningful accent unless the user explicitly asked for more.
- Do not include fake taglines, tiny descriptors, presentation cards, frames, shadows, gradients, texture, stationery, or decorative filler.
- Do not over-design. The logo should be believable, scalable, and usable on white, black, and transparent backgrounds.
- Reject any direction that looks generic, cluttered, clipart-like, repetitive, over-designed, visually weak, or decorated without strategic purpose.
- If a weak direction appears, internally refine it before output by removing extra symbols, improving wordmark hierarchy, increasing whitespace, and simplifying the icon into one memorable silhouette.

Design requirements:
- Make the image itself the final logo concept, not an explanation.
- Use the Primary direction as the final art direction. The other directions are context only; do not merge them into one cluttered mark.
- Make it feel human-designed, not auto-generated: use intentional negative space, slightly asymmetrical balance, premium spacing, and one memorable visual tension point.
- Avoid perfectly centered stock-template composition unless the brand clearly needs an institutional seal or formal badge.
- Follow every user field exactly when they describe a brand name, industry, mascot, object, color, letter, style, or mood.
- Visually match the meaning of the words. If the brand says ranch, show refined ranch cues. If it says AI, show intelligence/brand-system cues. If it says surf shop, show surf/ocean/shop cues. If it says law firm, show legal trust cues.
- If the prompt contains a specific object, animal, product, trade, food, location, or industry, that idea must be visible in the logo mark.
- Use a large, clean composition on a simple background with confident spacing.
- Create a strong logo mark, emblem, mascot, wordmark, tool mark, trade mark, lettermark, or icon depending on the request.
- Avoid defaulting to a generic hexagon, shield, or initials unless the user specifically asks for that.
- Make the icon feel designed, not clipart: reduce literal objects into one ownable silhouette, use negative space, hidden symbolism, geometric tension, and custom category cues.
- Prefer one strong brandable idea over multiple decorative objects. No stock-style icon mashups.
- Vary composition from common logo-generator templates. Use custom placement, purposeful imbalance, and confident whitespace.
- Keep it current: precision minimalism with personality, type-forward details, simplified icons, monochrome-first palette, restrained accents, and flexible digital use.
- Avoid dated logo tropes: glossy gradients, busy 3D effects, stock swooshes, generic sans stacking, random AI sparkles, overused badges, and decoration that does not improve recognition.
- Avoid repeating previous outputs: do not reuse rejected or recently generated styles, icon directions, palettes, typography, or compositions from the generation memory.
- For conversational refinements, do not reroll the entire logo. Keep the same brand system and change only the requested area unless the user explicitly asks for a completely different direction.
- If the user says “make it more luxury,” “more premium,” “more editorial,” or “more timeless,” improve restraint, spacing, type quality, and palette maturity while preserving the core mark.
- If the user says “remove the icon,” “typography focus,” “wordmark,” or “monogram,” change the symbol logic while keeping the existing brand tone and palette coherent.
- If the user asks for softer colors, bolder type, simpler layout, or less corporate feeling, adjust that single dimension and keep the rest consistent.
- Apply the internal Creative Director review: fix weak spacing, weak type hierarchy, generic icon logic, low uniqueness, and poor brand fit before final image generation.
- If the request is for a real-world trade or service business, use relevant visual language from that trade: tools, materials, textures, motion, craft, before/after surfaces, or local-service trust signals.
- Make the primary logo mark fill most of the canvas. Do not make the logo tiny.
- Make it suitable for a website header, social profile image, favicon, business card, and brand kit.
- Avoid mockup scenes, stationery, wall signs, paper sheets, hands, devices, photo backgrounds, framed cards, frames around the logo, tiny thumbnails, clutter, tiny decorative details, and messy text.
- Do not crop, hide, or misspell brand text. If text is risky, prioritize a clean symbol plus short readable brand name.
- If text appears, keep it short and highly legible.
- If the user asks for color, use color. Otherwise choose a clean professional palette.
`;
}

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeLogoIdentity(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|logo|brand|company|business|llc|inc|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDifferentLogoIdentity(next = "", previous = "") {
  const nextId = normalizeLogoIdentity(next);
  const previousId = normalizeLogoIdentity(previous);
  if (!nextId || !previousId) return false;
  return nextId !== previousId;
}

function sanitizeGenerationMemoryForRequest(memory = {}, { brandName = "", logoIndustry = "" } = {}) {
  const memoryBrand = memory?.lastSuccessfulDirection?.brandName || memory?.brandName || "";
  const memoryIndustry = memory?.lastSuccessfulDirection?.industry || memory?.industry || "";
  if (memoryBrand && brandName && isDifferentLogoIdentity(brandName, memoryBrand)) return {};
  if (memoryIndustry && logoIndustry && String(memoryIndustry).toLowerCase() !== String(logoIndustry).toLowerCase()) {
    const isRefinement = String(memory?.refinementMode || "").includes("designer-iteration");
    if (!isRefinement) return {};
  }
  return memory || {};
}

function hashString(value = "") {
  return String(value).split("").reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function getLogoWords({ brandName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const authoritativeSource = `${brandName || ""} ${logoIndustry || ""} ${logoStyle || ""} ${logoSymbol || ""} ${logoColors || ""} ${userPrompt || ""}`.trim();
  const source = authoritativeSource || String(logoPrompt || "").slice(0, 500) || "Brand";
  const cleaned = source
    .replace(/\b(logo|brand|create|make|for|with|and|the|a|an|style|direction|required|text|keywords|request|user|professional|quality|image|concept|identity|premium|modern|clean|high|avoid|business|company|service|services|theme|colors|color|black|white)\b/gi, " ")
    .replace(/[^a-zA-Z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  const brandWords = String(brandName || "")
    .replace(/[^a-zA-Z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const displayName = (brandWords.length ? brandWords.slice(0, 5) : words.slice(0, 4)).join(" ") || "Brand";
  const initialWords = brandWords.length ? brandWords : displayName.split(/\s+/).filter(Boolean);
  const initials = initialWords.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "B";

  return { displayName, initials, words, source };
}

function hasWord(words, options) {
  const exactOnly = new Set(["ai", "auto", "car", "law", "real", "app", "co"]);
  const normalized = words
    .map((word) => word.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);

  return options.some((option) => {
    const cleanOption = String(option).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!cleanOption) return false;

    return normalized.some((word) => {
      if (word === cleanOption || word === `${cleanOption}s`) return true;
      if (exactOnly.has(cleanOption)) return false;
      if (cleanOption.length >= 5 && word.startsWith(cleanOption)) return true;
      if (cleanOption.length >= 6 && word.includes(cleanOption)) return true;
      return false;
    });
  });
}

function getSubject(words) {
  const hasHippo = hasWord(words, ["hippo", "hippos"]);
  const hasFootball = hasWord(words, ["football", "fantasy"]);
  if (hasHippo && hasFootball) return "hippo-football";
  if (hasHippo) return "hippo";
  if (hasFootball) return "football";
  if (hasWord(words, ["stucco", "plaster", "plastering", "drywall", "rendering", "skim", "venetian"])) return "plastering";
  if (hasWord(words, ["wedding", "photo", "photography", "video", "film", "cinema", "rose"])) return "wedding-photo";
  if (hasWord(words, ["insurance", "insured", "coverage", "policy", "risk"])) return "insurance";
  if (hasWord(words, ["security", "secure", "guard", "protection", "cybersecurity", "surveillance"])) return "security";
  if (hasWord(words, ["cannabis", "dispensary", "hemp", "cbd"])) return "cannabis";
  if (hasWord(words, ["barber", "salon", "hair"])) return "barber";
  if (hasWord(words, ["tattoo", "ink", "flash"])) return "tattoo";
  if (hasWord(words, ["roof", "roofing", "shingle"])) return "roofing";
  if (hasWord(words, ["fashion", "clothing", "apparel", "boutique", "jewelry", "watch", "shoe", "streetwear", "couture", "runway", "label"]) || (hasWord(words, ["luxury", "premium", "high-end"]) && hasWord(words, ["house", "maison", "atelier"]))) return "fashion";
  if (hasWord(words, ["real", "estate", "realtor", "realty", "brokerage", "home", "house", "property"])) return "realestate";
  if (hasWord(words, ["law", "legal", "attorney", "lawyer", "firm"])) return "law";
  if (hasWord(words, ["beauty", "wellness", "spa", "skincare", "cosmetic", "cosmetics", "aesthetic", "aesthetics", "flower", "flowers", "floral", "florals"])) return "wellness";
  if (hasWord(words, ["pet", "dog", "cat", "veterinary", "vet", "grooming", "animal", "paw", "paws"])) return "pet";
  if (hasWord(words, ["kids", "kid", "toy", "toys", "daycare", "childcare", "children", "academy", "tutor", "learning", "school", "education"])) return "education";
  if (hasWord(words, ["lawn", "landscape", "landscaping", "garden", "tree"])) return "landscaping";
  if (hasWord(words, ["fitness", "gym", "training", "trainer", "strength"])) return "fitness";
  if (hasWord(words, ["chocolate", "chocolatier", "cocoa", "cacao", "truffle", "candy", "confectionery", "sweets"])) return "chocolate";
  if (hasWord(words, ["pizza", "pizzeria", "slice", "pepperoni"])) return "pizza";
  if (hasWord(words, ["restaurant", "food", "kitchen", "chef", "diner", "grill", "bakery", "taco", "burger", "sushi", "catering"])) return "restaurant";
  if (hasWord(words, ["surf", "surfing", "wave", "beach", "coastal", "ocean"])) return "surf";
  if (hasWord(words, ["travel", "hotel", "resort", "vacation", "tour", "airbnb", "hospitality", "rental", "rentals", "stay"])) return "travel";
  if (hasWord(words, ["car", "auto", "automotive", "mechanic", "garage", "detailing", "tire", "truck"])) return "automotive";
  if (hasWord(words, ["doctor", "medical", "clinic", "health", "healthcare", "therapy", "chiropractic", "dental", "dentist", "orthodontic"])) return "healthcare";
  if (hasWord(words, ["bank", "finance", "financial", "wealth", "advisor", "accounting", "tax", "capital", "fund"])) return "finance";
  if (hasWord(words, ["music", "band", "audio", "sound", "record", "recording", "podcast", "dj"])) return "music";
  if (hasWord(words, ["electrical", "electrician", "power", "solar", "energy", "lighting"])) return "electrical";
  if (hasWord(words, ["ai", "tech", "software", "saas", "app", "platform"])) return "tech";
  if (hasWord(words, ["electric"])) return "electrical";
  if (hasWord(words, ["marketing", "agency", "advertising", "creative", "media", "branding"])) return "agency";
  if (hasWord(words, ["logistics", "shipping", "freight", "delivery", "courier", "moving", "transport"])) return "logistics";
  if (hasWord(words, ["gaming", "esports", "game", "streamer", "streaming", "twitch"])) return "gaming";
  if (hasWord(words, ["architect", "architecture", "interior", "interiors", "spatial", "spaces"])) return "architecture";
  if (hasWord(words, ["cleaning", "maid", "janitorial", "wash", "pressure", "laundry"])) return "cleaning";
  if (hasWord(words, ["plumbing", "plumber", "pipe", "water", "drain"])) return "plumbing";
  if (hasWord(words, ["construction", "builder", "contractor", "remodel", "renovation", "concrete", "masonry"])) return "construction";
  if (hasWord(words, ["nonprofit", "charity", "foundation", "community", "church", "ministry"])) return "nonprofit";
  if (hasWord(words, ["cow", "cattle", "ranch", "alpaca", "horse", "horses", "private", "pasture", "equestrian"])) return "ranch";
  if (hasWord(words, ["coffee", "cafe"])) return "coffee";
  return "abstract";
}

function titleCase(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const DEFAULT_STYLE_TAXONOMY = [
  { key: "luxury", keywords: ["luxury", "premium", "high-end", "elegant", "exclusive", "private", "boutique"], typography: "refined serif or elegant high-contrast sans", palette: "black, ivory, muted gold", traits: ["restrained", "spacious", "premium"] },
  { key: "minimal", keywords: ["minimal", "simple", "clean", "quiet", "modern"], typography: "clean geometric sans", palette: "black, white, one subtle accent", traits: ["simple", "scalable", "clear"] },
  { key: "corporate", keywords: ["corporate", "professional", "trust", "consulting", "enterprise"], typography: "stable professional sans or serif", palette: "navy, white, neutral accent", traits: ["credible", "balanced", "formal"] },
  { key: "futuristic", keywords: ["futuristic", "future", "cyber", "ai", "tech", "saas", "software"], typography: "sharp geometric sans", palette: "deep navy, white, electric blue", traits: ["technical", "intelligent", "precise"] },
  { key: "playful", keywords: ["playful", "fun", "kid", "cute", "friendly", "bright"], typography: "rounded friendly sans", palette: "warm bright colors with soft contrast", traits: ["warm", "memorable", "approachable"] },
  { key: "streetwear", keywords: ["streetwear", "street", "urban", "label", "drop", "merch"], typography: "bold display or condensed label type", palette: "black, white, sharp accent", traits: ["bold", "cultural", "wearable"] },
  { key: "western", keywords: ["ranch", "western", "horse", "cattle", "alpaca", "farm", "heritage"], typography: "heritage serif or refined western display", palette: "deep green, cream, brass", traits: ["heritage", "land-based", "crafted"] },
  { key: "construction", keywords: ["construction", "contractor", "builder", "roof", "plaster", "stucco", "trade", "service"], typography: "bold local-service sans", palette: "charcoal, white, trade accent", traits: ["durable", "practical", "trustworthy"] },
  { key: "feminine", keywords: ["feminine", "beauty", "rose", "bridal", "wedding", "floral", "spa"], typography: "soft serif or elegant script-adjacent serif", palette: "ivory, charcoal, blush or rose gold", traits: ["soft", "elevated", "editorial"] },
  { key: "masculine", keywords: ["masculine", "barber", "garage", "fitness", "strong", "rugged"], typography: "heavy sans or slab serif", palette: "black, steel, bold accent", traits: ["strong", "direct", "confident"] },
  { key: "vintage", keywords: ["vintage", "retro", "classic", "old school", "badge", "heritage"], typography: "vintage display or classic serif", palette: "cream, ink, muted warm accent", traits: ["nostalgic", "crafted", "badge-ready"] },
  { key: "brutalist", keywords: ["brutalist", "raw", "bold", "experimental"], typography: "heavy grotesk display", palette: "black, white, stark accent", traits: ["unusual", "strong", "editorial"] },
  { key: "fitness", keywords: ["fitness", "gym", "training", "athletic", "sport"], typography: "condensed athletic sans", palette: "black, white, energetic accent", traits: ["kinetic", "powerful", "motivating"] },
  { key: "fashion", keywords: ["fashion", "clothing", "apparel", "jewelry", "boutique"], typography: "editorial serif or luxury sans", palette: "black, ivory, champagne", traits: ["stylish", "refined", "wearable"] },
  { key: "finance", keywords: ["finance", "wealth", "capital", "advisor", "tax", "accounting"], typography: "precise serif or serious sans", palette: "navy, white, muted gold", traits: ["stable", "credible", "measured"] },
  { key: "law", keywords: ["law", "legal", "attorney", "lawyer"], typography: "authoritative serif", palette: "navy, ivory, brass", traits: ["trustworthy", "formal", "balanced"] },
  { key: "food", keywords: ["pizza", "restaurant", "food", "chef", "bakery", "taco", "burger", "coffee", "cafe", "chocolate", "cocoa", "candy", "confectionery"], typography: "warm hospitality type", palette: "food-specific warm palette", traits: ["appetizing", "human", "clear"] },
];

let STYLE_SCHEMA = {};
try {
  STYLE_SCHEMA = require("./logo-style-schemas.json");
} catch {
  STYLE_SCHEMA = {};
}

const STYLE_TAXONOMY = Array.isArray(STYLE_SCHEMA.styles) && STYLE_SCHEMA.styles.length
  ? STYLE_SCHEMA.styles
  : DEFAULT_STYLE_TAXONOMY;

const DEFAULT_SUBJECT_STYLE_OVERRIDES = {
  pizza: ["food", "playful", "vintage"],
  chocolate: ["food", "luxury", "vintage"],
  restaurant: ["food", "luxury", "vintage"],
  law: ["law", "corporate", "luxury"],
  finance: ["finance", "corporate", "luxury"],
  tech: ["futuristic", "minimal", "corporate"],
  ranch: ["western", "luxury", "vintage"],
  plastering: ["construction", "minimal", "corporate"],
  construction: ["construction", "masculine", "corporate"],
  automotive: ["masculine", "vintage", "minimal"],
  fashion: ["fashion", "luxury", "minimal"],
  "wedding-photo": ["feminine", "luxury", "minimal"],
  fitness: ["fitness", "masculine", "futuristic"],
  healthcare: ["corporate", "minimal", "feminine"],
  education: ["playful", "corporate", "minimal"],
  music: ["streetwear", "futuristic", "vintage"],
  pet: ["playful", "minimal", "feminine"],
  cleaning: ["minimal", "corporate", "playful"],
  plumbing: ["construction", "minimal", "corporate"],
  electrical: ["construction", "futuristic", "masculine"],
  travel: ["luxury", "minimal", "playful"],
  nonprofit: ["corporate", "playful", "minimal"],
  realestate: ["corporate", "luxury", "minimal"],
  wellness: ["feminine", "luxury", "minimal"],
  roofing: ["construction", "masculine", "corporate"],
  landscaping: ["minimal", "playful", "corporate"],
  barber: ["masculine", "vintage", "streetwear"],
  football: ["fitness", "masculine", "playful"],
  hippo: ["playful", "masculine", "minimal"],
  "hippo-football": ["fitness", "playful", "masculine"],
  insurance: ["corporate", "finance", "minimal"],
  agency: ["futuristic", "minimal", "corporate"],
  security: ["corporate", "futuristic", "masculine"],
  logistics: ["corporate", "minimal", "construction"],
  gaming: ["streetwear", "futuristic", "brutalist"],
  architecture: ["minimal", "luxury", "corporate"],
  cannabis: ["minimal", "feminine", "vintage"],
  tattoo: ["tattoo", "vintage", "brutalist"],
};

const SUBJECT_STYLE_OVERRIDES = {
  ...DEFAULT_SUBJECT_STYLE_OVERRIDES,
  ...(STYLE_SCHEMA.subjectStyleOverrides || {}),
};

const SCORING_WEIGHTS = {
  conceptLibraryBoost: 14,
  subjectMatch: 12,
  requestedSymbolMatch: 10,
  styleMatch: 8,
  readabilityAndScalability: 7,
  genericPenalty: -28,
  avoidWordPenalty: -12,
  ...(STYLE_SCHEMA.scoringWeights || {}),
};

const ELITE_QUALITY_TERMS = /(premium|restrained|editorial|wordmark|custom|ownable|negative space|monochrome|generous|whitespace|scalable|reduced|simplified|adaptive|optical|kerning|letter|silhouette|brandable|minimal|timeless|refined)/;
const WEAK_LOGO_TERMS = /(generic|random|stock|template|clip.?art|default|hexagon|initials only|category-specific|distinct [a-z-]+ visual cue|subtle embedded symbol|simple emblem built from|glossy|3d|orb|sparkle|swoosh|gradient blob|busy detail|template badge|overly centered|centered mark over readable wordmark|symbol above or beside wordmark|decorative|filler|multiple icons)/;

function detectLogoStyles({ subject, logoStyle = "", logoIndustry = "", logoSymbol = "", userPrompt = "", logoPrompt = "" }) {
  const rawText = `${subject} ${logoStyle} ${logoIndustry} ${logoSymbol} ${userPrompt} ${logoPrompt}`.toLowerCase();
  const matches = STYLE_TAXONOMY
    .map((style) => {
      const keywordScore = style.keywords.reduce((score, keyword) => score + (rawText.includes(keyword) ? 3 : 0), 0);
      const overrideScore = (SUBJECT_STYLE_OVERRIDES[subject] || []).includes(style.key) ? 4 : 0;
      return { ...style, score: keywordScore + overrideScore };
    })
    .filter((style) => style.score > 0)
    .sort((a, b) => b.score - a.score);

  return matches.slice(0, 3).length ? matches.slice(0, 3) : STYLE_TAXONOMY.filter((style) => ["minimal", "corporate"].includes(style.key));
}

function inferPositioning({ subject, styles, source = "", personality = null }) {
  const text = source.toLowerCase();
  if (personality) {
    if (personality.matrix.market.score >= 66 || personality.matrix.price.score >= 68) return "premium";
    if (personality.matrix.price.score <= 34 || personality.matrix.market.score <= 34) return "accessible";
    if (personality.matrix.scale.score >= 66 || personality.matrix.tone.score <= 34) return "professional";
    if (personality.matrix.reach.score <= 32) return "neighborhood";
  }
  if (styles.some((style) => style.key === "luxury")) return "premium";
  if (/(cheap|affordable|budget|discount|fast|quick)/.test(text)) return "accessible";
  if (/(pro|professional|expert|trusted|certified)/.test(text)) return "professional";
  if (["law", "finance", "healthcare"].includes(subject)) return "trust";
  if (["pizza", "restaurant", "coffee", "chocolate"].includes(subject)) return "neighborhood";
  return "modern";
}

const PERSONALITY_AXES = {
  price: ["affordable", "luxury"],
  era: ["modern", "timeless"],
  gender: ["masculine", "feminine"],
  tone: ["corporate", "playful"],
  scale: ["startup", "enterprise"],
  reach: ["local", "global"],
  craft: ["handcrafted", "tech-driven"],
  market: ["mass-market", "premium"],
  energy: ["calm", "aggressive"],
  expression: ["minimal", "expressive"],
};

const SUBJECT_PERSONALITY_SIGNALS = {
  law: { price: 15, era: 28, tone: -34, scale: 24, market: 20, energy: -22, expression: -22 },
  finance: { price: 12, era: 20, tone: -30, scale: 28, market: 18, energy: -18, expression: -18 },
  insurance: { era: 12, tone: -28, scale: 20, market: 10, energy: -24, expression: -16 },
  healthcare: { era: 8, gender: 8, tone: -18, scale: 8, market: 10, energy: -30, expression: -18 },
  tech: { era: -28, tone: -12, scale: -26, reach: 22, craft: 36, market: 10, expression: -10 },
  agency: { era: -22, tone: 10, scale: -20, reach: 10, craft: 30, expression: 14 },
  security: { gender: -18, tone: -30, scale: 18, craft: 26, market: 12, energy: 18, expression: -14 },
  logistics: { era: -10, gender: -10, tone: -24, scale: 18, reach: 20, craft: 18, energy: 12, expression: -12 },
  architecture: { price: 20, era: 8, tone: -18, scale: 8, market: 24, energy: -18, expression: -26 },
  ranch: { price: 24, era: 18, gender: -8, reach: -18, craft: -30, market: 24, energy: -18, expression: -12 },
  construction: { gender: -28, tone: -24, reach: -18, craft: -22, energy: 14, expression: -10 },
  plastering: { gender: -22, tone: -24, reach: -22, craft: -28, energy: 4, expression: -14 },
  roofing: { gender: -24, tone: -24, reach: -24, craft: -24, energy: 12, expression: -12 },
  plumbing: { price: -8, gender: -18, tone: -22, reach: -28, craft: -18, market: -8, expression: -10 },
  electrical: { era: -8, gender: -18, tone: -22, reach: -20, craft: -8, energy: 10, expression: -10 },
  automotive: { gender: -26, tone: -12, craft: -12, energy: 26, expression: 8 },
  fitness: { gender: -20, tone: 4, scale: -8, craft: 4, energy: 34, expression: 12 },
  fashion: { price: 30, era: 20, gender: 18, scale: 10, reach: 22, market: 32, energy: -12, expression: -18 },
  "wedding-photo": { price: 26, era: 18, gender: 22, reach: -4, craft: -12, market: 30, energy: -26, expression: -16 },
  wellness: { price: 16, era: 12, gender: 26, tone: 2, craft: -18, market: 20, energy: -34, expression: -18 },
  beauty: { price: 22, era: 12, gender: 30, market: 24, energy: -22, expression: -10 },
  pizza: { price: -6, era: -8, tone: 24, reach: -30, craft: -18, market: -8, expression: 18 },
  chocolate: { price: 14, era: 8, tone: 18, reach: -24, craft: -28, market: 12, expression: 10 },
  restaurant: { era: 4, tone: 12, reach: -24, craft: -20, market: 4, energy: -4, expression: 12 },
  coffee: { era: 10, tone: 8, reach: -22, craft: -28, market: 10, energy: -10, expression: 8 },
  education: { price: -8, era: -6, gender: 10, tone: 30, reach: -16, market: -6, energy: -10, expression: 24 },
  pet: { price: -6, gender: 12, tone: 34, reach: -16, market: -6, energy: -8, expression: 28 },
  nonprofit: { price: -10, gender: 10, tone: 16, reach: -12, craft: -12, market: -18, energy: -22, expression: 12 },
  gaming: { price: -4, era: -30, gender: -12, tone: 28, scale: -22, craft: 26, energy: 32, expression: 30 },
  tattoo: { gender: -12, tone: 18, craft: -30, energy: 18, expression: 34 },
  cannabis: { era: 6, gender: 10, tone: 10, craft: -20, energy: -18, expression: 18 },
};

function clampPersonalityScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function addPersonalitySignal(state, axis, amount, reason) {
  if (!state.matrix[axis]) return;
  state.matrix[axis].score = clampPersonalityScore(state.matrix[axis].score + amount);
  if (reason) state.matrix[axis].signals.push(reason);
}

function addPersonalitySignals(state, signals, reasonPrefix = "") {
  Object.entries(signals || {}).forEach(([axis, amount]) => {
    addPersonalitySignal(state, axis, amount, reasonPrefix ? `${reasonPrefix}: ${axis}` : axis);
  });
}

function interpretDesignLanguage(text = "") {
  const normalized = String(text || "").toLowerCase();
  const has = (pattern) => pattern.test(normalized);
  const directives = [];
  const interpretation = {
    personalitySignals: {},
    typography: "",
    spacing: "",
    composition: "",
    palette: "",
    icon: "",
    avoid: "",
    directives,
  };

  const add = (copy) => {
    if (copy && !directives.includes(copy)) directives.push(copy);
  };
  const mergeSignals = (signals) => {
    Object.entries(signals || {}).forEach(([axis, amount]) => {
      interpretation.personalitySignals[axis] = (interpretation.personalitySignals[axis] || 0) + amount;
    });
  };

  if (has(/\b(expensive|luxury hotel|luxurious|more luxury|more premium|premium|high.?end|elevated)\b/)) {
    mergeSignals({ price: 34, market: 34, era: 16, energy: -16, expression: -22 });
    interpretation.typography = "premium serif or restrained custom wordmark with generous tracking and mature hierarchy";
    interpretation.spacing = "generous whitespace, fewer elements, calmer hierarchy";
    interpretation.palette = "monochrome or warm ivory base with one restrained metallic or deep-neutral accent";
    interpretation.icon = "reduced symbolic mark, monogram, or negative-space detail; avoid decorative literal icons";
    add("Make expensive/luxury wording visible through restraint, mature type, premium spacing, and color discipline.");
  }

  if (has(/\b(editorial|fashion house|magazine|gallery|atelier|maison)\b/)) {
    mergeSignals({ price: 20, market: 24, era: 20, expression: -26, energy: -12 });
    interpretation.typography = "editorial serif or elegant wordmark with deliberate letter spacing";
    interpretation.composition = "type-forward, quiet asymmetry, no icon overload";
    add("Treat editorial wording as a typography-led identity with calm composition.");
  }

  if (has(/\b(timeless|classic|heritage|legacy|established|enduring)\b/)) {
    mergeSignals({ era: 34, tone: -12, market: 14, expression: -18, energy: -12 });
    interpretation.typography = interpretation.typography || "classic serif or restrained sans with balanced proportions";
    interpretation.palette = interpretation.palette || "black, cream, charcoal, or muted heritage accent";
    add("Favor long-term readability, classic proportions, and no trend-heavy gimmicks.");
  }

  if (has(/\b(yc startup|yc|startup|saas|modern tech|ai startup|product-led|software)\b/)) {
    mergeSignals({ era: -32, scale: -28, craft: 34, reach: 14, expression: -12 });
    interpretation.typography = interpretation.typography || "precise geometric sans with subtle custom letter detail";
    interpretation.spacing = interpretation.spacing || "clean product-grade spacing and crisp hierarchy";
    interpretation.palette = interpretation.palette || "monochrome-first with one confident digital accent";
    interpretation.icon = interpretation.icon || "adaptive abstract mark that works as app icon, favicon, and avatar";
    add("Translate startup language into product-grade clarity, not fake futuristic decoration.");
  }

  if (has(/\b(less tech bro|not tech bro|less startupy|less corporate)\b/)) {
    mergeSignals({ era: 18, craft: -30, tone: 12, market: 18, expression: -18, energy: -12 });
    interpretation.typography = "warmer modern wordmark with human rhythm, not default tech sans";
    interpretation.palette = "warmer neutrals or muted accent instead of electric blue gradients";
    interpretation.icon = "restrained human-designed mark; avoid circuits, nodes, sparks, and generic AI symbols";
    interpretation.avoid = "generic tech-bro aesthetic, cold blue gradient, random network nodes, AI sparkles";
    add("Reduce generic tech cues and make the identity warmer, more mature, and less cliché.");
  }

  if (has(/\b(less busy|cleaner|simpler|simplify|more minimal|minimalist|quiet|restrained)\b/)) {
    mergeSignals({ expression: -38, energy: -12, market: 10 });
    interpretation.spacing = "more negative space, fewer elements, stronger silhouette";
    interpretation.composition = "one clear focal point with uncluttered hierarchy";
    interpretation.icon = "remove unnecessary symbol details and keep only the most ownable cue";
    interpretation.avoid = [interpretation.avoid, "clutter, multiple icons, tiny text, decorative filler"].filter(Boolean).join("; ");
    add("Simplify by removing details while keeping the concept specific.");
  }

  if (has(/\b(stronger typography|bold typography|type focus|typography focus|better font|stronger font|wordmark)\b/)) {
    mergeSignals({ expression: -14, market: 10 });
    interpretation.typography = "make typography the main identity asset with confident weight, tuned spacing, and one memorable custom detail";
    interpretation.icon = interpretation.icon || "make icon secondary or remove it if it competes with the wordmark";
    interpretation.composition = interpretation.composition || "wordmark-led lockup with clear type hierarchy";
    add("Prioritize wordmark quality, kerning, and hierarchy over adding more symbol detail.");
  }

  return {
    ...interpretation,
    summary: directives.join(" "),
  };
}

function inferBrandPersonality({ subject, brandName = "", logoStyle = "", logoIndustry = "", logoSymbol = "", logoColors = "", userPrompt = "", logoPrompt = "", styles = [] }) {
  const matrix = Object.fromEntries(
    Object.entries(PERSONALITY_AXES).map(([axis, labels]) => [
      axis,
      { low: labels[0], high: labels[1], score: 50, signals: [] },
    ])
  );
  const state = { matrix };
  const text = `${brandName} ${logoStyle} ${logoIndustry} ${logoSymbol} ${logoColors} ${userPrompt} ${logoPrompt}`.toLowerCase();
  const name = String(brandName || "").toLowerCase();
  const has = (pattern) => pattern.test(text);
  const nameHas = (pattern) => pattern.test(name);

  addPersonalitySignals(state, SUBJECT_PERSONALITY_SIGNALS[subject], `industry ${subject}`);

  styles.forEach((style, index) => {
    const strength = Math.max(5, 18 - index * 5);
    const map = {
      luxury: { price: strength + 6, era: 8, market: strength + 8, expression: -10 },
      minimal: { era: -6, tone: -6, expression: -strength - 6 },
      corporate: { tone: -strength - 6, scale: 12, expression: -10 },
      futuristic: { era: -strength - 10, scale: -10, craft: strength + 12, expression: 4 },
      playful: { price: -8, tone: strength + 14, market: -8, expression: strength + 10 },
      vintage: { era: strength + 12, craft: -10, expression: 8 },
      retro: { era: 12, tone: 10, expression: 14 },
      brutalist: { gender: -8, energy: strength + 12, expression: strength + 8 },
      feminine: { gender: strength + 14, energy: -10 },
      masculine: { gender: -strength - 10, energy: 8 },
      streetwear: { tone: 16, energy: 18, expression: 20 },
      western: { era: 12, gender: -8, craft: -18, expression: 8 },
      tattoo: { craft: -18, energy: 12, expression: 22 },
    }[style.key];
    addPersonalitySignals(state, map, `style ${style.key}`);
  });

  if (has(/\b(luxury|luxe|premium|high.?end|exclusive|private|bespoke|estate|boutique|editorial|couture|heirloom|signature)\b/)) {
    addPersonalitySignals(state, { price: 32, era: 16, market: 34, energy: -12, expression: -16 }, "premium wording");
  }
  if (has(/\b(cheap|affordable|budget|discount|value|fast|quick|deal|simple pricing)\b/)) {
    addPersonalitySignals(state, { price: -34, market: -30, tone: 8, expression: 8 }, "accessible wording");
  }
  if (has(/\b(ai|artificial intelligence|software|saas|platform|automation|neural|cloud|data|digital|app|robot|machine learning)\b/)) {
    addPersonalitySignals(state, { era: -32, scale: -22, reach: 16, craft: 38, expression: -8 }, "technology wording");
  }
  if (has(/\b(heritage|classic|timeless|legacy|foundry|manor|atelier|maison|house|rose|stone|blackwell|and co|& co)\b/) || nameHas(/\b(maison|atelier|house|rose|stone|vale|co\.?|&)\b/)) {
    addPersonalitySignals(state, { price: 16, era: 28, market: 18, energy: -10, expression: -12 }, "heritage/name pattern");
  }
  if (has(/\b(kids|children|child|little|tiny|sprout|play|party|toy|school|learning|daycare)\b/)) {
    addPersonalitySignals(state, { price: -12, gender: 10, tone: 34, energy: -8, expression: 28 }, "kids/play wording");
  }
  if (has(/\b(forge|iron|steel|apex|peak|torque|grit|alpha|battle|beast|power|performance|combat|dominate)\b/) || nameHas(/\b(forge|iron|steel|apex|torque|grit)\b/)) {
    addPersonalitySignals(state, { gender: -28, energy: 34, expression: 12, tone: -6 }, "strong masculine wording");
  }
  if (has(/\b(calm|care|harmony|bloom|ritual|spa|skin|wellness|therapy|gentle|serene|soft|luna|flora)\b/) || nameHas(/\b(bloom|ritual|harmony|luna|flora|rose)\b/)) {
    addPersonalitySignals(state, { gender: 24, energy: -34, expression: -8, market: 12 }, "calm/feminine wording");
  }
  if (has(/\b(local|neighborhood|family owned|family|home service|near me|community|county|city|trusted local)\b/)) {
    addPersonalitySignals(state, { reach: -34, scale: -8, craft: -10, market: -4 }, "local wording");
  }
  if (has(/\b(global|world|international|atlas|universal|enterprise|corporate|institutional|capital group|partners)\b/)) {
    addPersonalitySignals(state, { reach: 34, scale: 30, tone: -18, market: 14 }, "enterprise/global wording");
  }
  if (has(/\b(handmade|crafted|artisan|studio|wood|leather|ceramic|farm|ranch|bakery|roastery|plaster|stucco|contractor|builder)\b/)) {
    addPersonalitySignals(state, { craft: -30, reach: -12, era: 8 }, "craft/trade wording");
  }
  if (has(/\b(bold|wild|expressive|maximal|colorful|mascot|character|illustrated|street|graffiti|y2k)\b/)) {
    addPersonalitySignals(state, { expression: 32, tone: 14, energy: 16 }, "expressive wording");
  }
  if (has(/\b(minimal|simple|clean|quiet|refined|restrained|monoline|negative space|wordmark)\b/)) {
    addPersonalitySignals(state, { expression: -34, energy: -8, market: 12 }, "minimal wording");
  }

  const interpreted = interpretDesignLanguage(text);
  addPersonalitySignals(state, interpreted.personalitySignals, "interpreted user language");

  const summary = summarizePersonalityMatrix(matrix);
  const directives = {
    ...getPersonalityDesignDirectives(matrix),
    interpretedTypography: interpreted.typography,
    interpretedSpacing: interpreted.spacing,
    interpretedComposition: interpreted.composition,
    interpretedPalette: interpreted.palette,
    interpretedIcon: interpreted.icon,
    interpretedAvoid: interpreted.avoid,
    interpretedSummary: interpreted.summary,
  };

  return { matrix, summary, directives };
}

function getPersonalityLean(matrix, axis, threshold = 12) {
  const item = matrix[axis];
  if (!item) return "neutral";
  if (item.score >= 50 + threshold) return item.high;
  if (item.score <= 50 - threshold) return item.low;
  return "balanced";
}

function summarizePersonalityMatrix(matrix) {
  return Object.entries(matrix)
    .map(([axis, item]) => {
      const distance = Math.abs(item.score - 50);
      const label = item.score >= 50 ? item.high : item.low;
      return { axis, label, distance, score: item.score };
    })
    .filter((item) => item.distance >= 10)
    .sort((a, b) => b.distance - a.distance)
    .slice(0, 5)
    .map((item) => `${item.label} ${item.axis}`)
    .join(", ") || "balanced professional personality";
}

function getPersonalityDesignDirectives(matrix) {
  const price = getPersonalityLean(matrix, "price");
  const tone = getPersonalityLean(matrix, "tone");
  const craft = getPersonalityLean(matrix, "craft");
  const market = getPersonalityLean(matrix, "market");
  const energy = getPersonalityLean(matrix, "energy");
  const expression = getPersonalityLean(matrix, "expression");
  const era = getPersonalityLean(matrix, "era");
  const scale = getPersonalityLean(matrix, "scale");

  const spacing = expression === "minimal" || price === "luxury" || market === "premium"
    ? "generous"
    : expression === "expressive" || tone === "playful"
      ? "compact-energy"
      : "balanced";
  const iconStyle = expression === "minimal" || price === "luxury"
    ? "reduced symbolic mark with negative space"
    : tone === "playful" || expression === "expressive"
      ? "distinct characterful mark with simplified details"
      : craft === "handcrafted"
        ? "material-aware trade symbol"
        : "clean geometric brand mark";
  const layoutBias = price === "luxury" || market === "premium" || era === "timeless"
    ? "restrained"
    : energy === "aggressive" || expression === "expressive"
      ? "dynamic"
      : scale === "enterprise"
        ? "institutional"
        : "balanced";

  return {
    spacing,
    iconStyle,
    layoutBias,
    paletteBias: market === "premium" || price === "luxury" ? "premium restrained contrast" : tone === "playful" ? "friendly high-contrast color" : "professional high-contrast palette",
    scoringBias: `${spacing} spacing, ${iconStyle}, ${layoutBias} layout`,
  };
}

function buildHumanDesignRealism({ subject, personality, styles = [] }) {
  const matrix = personality?.matrix || {};
  const styleKeys = styles.map((style) => style.key);
  const luxury = (matrix.price?.score || 50) >= 66 || (matrix.market?.score || 50) >= 66 || styleKeys.includes("luxury");
  const expressive = (matrix.expression?.score || 50) >= 64 || (matrix.tone?.score || 50) >= 66 || (matrix.energy?.score || 50) >= 66;
  const institutional = (matrix.scale?.score || 50) >= 66 || (matrix.tone?.score || 50) <= 34;
  const trade = (matrix.craft?.score || 50) <= 36 || ["construction", "plastering", "roofing", "plumbing", "electrical", "automotive", "landscaping"].includes(subject);
  const calm = (matrix.energy?.score || 50) <= 36;

  const composition = institutional
    ? "formal offset lockup"
    : expressive
      ? "dynamic off-axis mark with confident whitespace"
      : luxury || calm
        ? "quiet asymmetrical editorial balance"
        : trade
          ? "practical badge with material-aware tension"
          : "balanced asymmetry with restrained tension";

  const negativeSpace = luxury || calm
    ? "wide breathing room around the mark and wordmark"
    : expressive
      ? "strong empty field opposite the visual weight"
      : "clear internal cutouts and uncluttered outer margins";

  const tension = expressive
    ? "one deliberate scale or axis contrast"
    : luxury
      ? "subtle optical offset and refined spacing contrast"
      : trade
        ? "solid mark offset against precise type"
        : "small non-centered offset that prevents template symmetry";

  return {
    composition,
    negativeSpace,
    tension,
    avoid: "avoid stock centering, generic icon badges, over-balanced geometry, obvious gradients, and repeated icon placement",
    summary: `${composition}; ${negativeSpace}; ${tension}`,
  };
}

function buildDesignTrendIntelligence({ subject, personality, styles = [] }) {
  const matrix = personality?.matrix || {};
  const styleKeys = styles.map((style) => style.key);
  const techDriven = (matrix.craft?.score || 50) >= 64 || ["tech", "agency", "gaming"].includes(subject);
  const luxury = (matrix.price?.score || 50) >= 66 || (matrix.market?.score || 50) >= 66 || styleKeys.includes("luxury");
  const expressive = (matrix.expression?.score || 50) >= 66 || (matrix.tone?.score || 50) >= 68;
  const timeless = (matrix.era?.score || 50) >= 64;
  const localTrade = (matrix.reach?.score || 50) <= 38 || (matrix.craft?.score || 50) <= 38;

  const typographyTrend = luxury
    ? "quiet high-contrast serif or restrained custom wordmark with deliberate spacing"
    : techDriven
      ? "precise geometric sans, subtle custom letter detail, product-grade readability"
      : expressive
        ? "friendly custom sans with one ownable letter or rhythm detail"
        : timeless
          ? "classic serif/sans pairing with modern spacing and no nostalgia clutter"
          : "clean custom wordmark with one memorable optical detail";

  const spacingTrend = luxury || techDriven
    ? "wide whitespace, crisp hierarchy, fewer elements"
    : expressive
      ? "large simple shapes with controlled empty space"
      : "breathing room around the mark, no crowded lockups";

  const iconTrend = techDriven
    ? "simple adaptive symbol that can work as app icon, favicon, and avatar"
    : luxury
      ? "reduced symbol or monogram with negative space instead of literal illustration"
      : localTrade
        ? "useful category cue reduced into a durable mark, not a stock service icon"
        : expressive
          ? "bold simplified mascot/object with brandable silhouette"
          : "simplified geometric mark with clear category meaning";

  const colorTrend = luxury
    ? "monochrome or deep neutral base with one restrained premium accent"
    : techDriven
      ? "monochrome-first with one electric or system-color accent; gradients only if subtle"
      : expressive
        ? "confident flat colors, no glossy gradients"
        : "monochrome-first, one meaningful accent, strong contrast";

  const minimalismTrend = expressive
    ? "expressive minimalism: keep the idea bold but remove small decoration"
    : "precision minimalism: fewer parts, sharper spacing, stronger silhouette";

  return {
    typographyTrend,
    spacingTrend,
    iconTrend,
    colorTrend,
    minimalismTrend,
    penalties: [
      "generic sans wordmark with no custom detail",
      "centered template badge",
      "glossy or obvious AI gradient",
      "random sparkles or tech orbs",
      "stock swoosh/checkmark/leaf without concept reason",
      "thin low-contrast type",
      "too many small icon details",
    ],
    summary: `${typographyTrend}; ${spacingTrend}; ${iconTrend}; ${colorTrend}`,
  };
}

function normalizeMemoryList(value) {
  return Array.isArray(value) ? value.map((item) => String(item || "").toLowerCase().trim()).filter(Boolean).slice(0, 18) : [];
}

function normalizeMemoryDirection(value = null) {
  if (!value || typeof value !== "object") return null;
  return {
    name: String(value.name || "").trim(),
    brandName: String(value.brandName || "").trim(),
    industry: String(value.industry || "").trim(),
    style: String(value.style || value.logoStyle || "").trim(),
    symbol: String(value.symbol || "").trim(),
    typography: String(value.typography || "").trim(),
    palette: String(value.palette || "").trim(),
    layout: String(value.layout || "").trim(),
    whyFits: String(value.whyFits || "").trim(),
  };
}

function normalizeGenerationMemory(memory = {}) {
  return {
    brandName: String(memory.brandName || "").trim(),
    industry: String(memory.industry || "").trim(),
    concepts: normalizeMemoryList(memory.concepts),
    rejectedStyles: normalizeMemoryList(memory.rejectedStyles),
    rejectedIconDirections: normalizeMemoryList(memory.rejectedIconDirections),
    rejectedPalettes: normalizeMemoryList(memory.rejectedPalettes),
    typographyPreferences: normalizeMemoryList(memory.typographyPreferences),
    compositions: normalizeMemoryList(memory.compositions),
    generatedStyles: normalizeMemoryList(memory.generatedStyles),
    generatedIconDirections: normalizeMemoryList(memory.generatedIconDirections),
    generatedPalettes: normalizeMemoryList(memory.generatedPalettes),
    generatedTypography: normalizeMemoryList(memory.generatedTypography),
    generatedCompositions: normalizeMemoryList(memory.generatedCompositions),
    lastSuccessfulDirection: normalizeMemoryDirection(memory.lastSuccessfulDirection),
    continuityIntent: String(memory.continuityIntent || "").trim(),
    refinementMode: String(memory.refinementMode || "").trim(),
    refinementInstruction: String(memory.refinementInstruction || "").trim(),
    interpretedDesignDirection: String(memory.interpretedDesignDirection || "").trim(),
    designDirectives: normalizeMemoryList(memory.designDirectives),
    changedAreas: normalizeMemoryList(memory.changedAreas),
    preserveAreas: normalizeMemoryList(memory.preserveAreas),
    refinementHistory: Array.isArray(memory.refinementHistory)
      ? memory.refinementHistory.slice(0, 8).map((item) => ({
          instruction: String(item?.instruction || "").trim(),
          changedAreas: normalizeMemoryList(item?.changedAreas),
          preservedDirection: normalizeMemoryDirection(item?.preservedDirection),
          createdAt: String(item?.createdAt || "").trim(),
        }))
      : [],
  };
}

function buildGenerationMemoryIntelligence(memory = {}) {
  const normalized = normalizeGenerationMemory(memory);
  const avoid = [
    ...normalized.rejectedStyles,
    ...normalized.rejectedIconDirections,
    ...normalized.rejectedPalettes,
    ...normalized.compositions,
  ].filter(Boolean);
  const anchor = normalized.lastSuccessfulDirection;
  const anchorPreferences = anchor
    ? [anchor.typography, anchor.palette, anchor.layout, anchor.style].filter(Boolean)
    : [];
  const preferences = [...new Set([...normalized.typographyPreferences, ...anchorPreferences.map((item) => item.toLowerCase())])];
  const hasContinuity = Boolean(anchor || normalized.continuityIntent);

  return {
    ...normalized,
    avoid,
    anchor,
    preferences,
    hasMemory: avoid.length > 0 || preferences.length > 0 || hasContinuity,
    summary: hasContinuity
      ? `designer refinement from prior successful direction${anchor?.name ? ` (${anchor.name})` : ""}; preserve useful typography, palette, layout, and brand identity while improving only requested areas${normalized.changedAreas.length ? ` (${normalized.changedAreas.join(", ")})` : ""}${normalized.interpretedDesignDirection ? `; interpreted design direction: ${normalized.interpretedDesignDirection}` : ""}${normalized.continuityIntent ? `; user intent: ${normalized.continuityIntent}` : ""}${avoid.length ? `; avoid rejected: ${avoid.slice(0, 5).join(", ")}` : ""}`
      : avoid.length
      ? `avoid rejected directions: ${avoid.slice(0, 8).join(", ")}${preferences.length ? `; keep typography preferences: ${preferences.slice(0, 4).join(", ")}` : ""}`
      : preferences.length
        ? `honor typography preferences: ${preferences.slice(0, 4).join(", ")}`
        : "no prior logo memory",
  };
}

function conceptMatchesMemory(concept, memoryIntelligence) {
  if (!memoryIntelligence?.hasMemory) return false;
  const text = `${concept.name} ${concept.style} ${concept.symbol} ${concept.typography} ${concept.palette} ${concept.layout} ${concept.whyFits}`.toLowerCase();
  return memoryIntelligence.avoid.some((item) => item.length > 3 && text.includes(item));
}

function scoreConceptContinuity(concept, memoryIntelligence) {
  const anchor = memoryIntelligence?.anchor;
  if (!anchor) return 0;

  const conceptText = `${concept.name} ${concept.style} ${concept.symbol} ${concept.typography} ${concept.palette} ${concept.layout} ${concept.whyFits}`.toLowerCase();
  const intent = String(memoryIntelligence.continuityIntent || "").toLowerCase();
  let score = 0;

  const shouldChangeIcon = /(different icon|try different icon|improve icon|remove the icon|no icon|monogram instead)/.test(intent);
  const shouldSimplify = /(simpler|simple|less|minimal|cleaner)/.test(intent);
  const shouldModernize = /(modern|spacing|premium|luxury|expensive)/.test(intent);

  if (anchor.style && conceptText.includes(anchor.style.toLowerCase())) score += 7;
  if (anchor.typography && conceptText.includes(anchor.typography.toLowerCase().split(";")[0].slice(0, 26))) score += 8;
  if (anchor.palette && conceptText.includes(anchor.palette.toLowerCase().split(",")[0])) score += 6;
  if (anchor.layout && conceptText.includes(anchor.layout.toLowerCase().split(" ").slice(0, 3).join(" "))) score += shouldChangeIcon ? 9 : 6;
  if (anchor.symbol && !shouldChangeIcon && conceptText.includes(anchor.symbol.toLowerCase().split(" ").slice(0, 2).join(" "))) score += 5;
  if (anchor.symbol && shouldChangeIcon && conceptText.includes(anchor.symbol.toLowerCase().split(" ").slice(0, 2).join(" "))) score -= 10;
  if (shouldSimplify && /(minimal|simple|clean|restrained|fewer|scalable|negative space)/.test(conceptText)) score += 9;
  if (shouldModernize && /(premium|modern|refined|spacing|whitespace|restrained|editorial)/.test(conceptText)) score += 8;
  if (/(evolve|same creative direction|preserve|keep)/.test(intent) && /(alternative|refined|variation|evolved|same system|lockup)/.test(conceptText)) score += 5;

  return score;
}

function updateGenerationMemory(memory = {}, { concepts = [], typographySystem = {}, palette = "", humanDesign = {}, trend = {}, brandName = "", industry = "" }) {
  const normalized = normalizeGenerationMemory(memory);
  const addUnique = (list, values, limit = 18) => {
    const next = [...values.map((value) => String(value || "").toLowerCase().trim()).filter(Boolean), ...list];
    return [...new Set(next)].slice(0, limit);
  };

  const nextDirection = normalizeMemoryDirection({
    ...(concepts[0] || {}),
    brandName: brandName || normalized.brandName || concepts[0]?.brandName || "",
    industry: industry || normalized.industry || concepts[0]?.industry || "",
  });

  return {
    ...normalized,
    brandName: brandName || normalized.brandName,
    industry: industry || normalized.industry,
    concepts: addUnique(normalized.concepts, concepts.map((concept) => concept.name), 20),
    generatedStyles: addUnique(normalized.generatedStyles, concepts.map((concept) => concept.style), 16),
    generatedIconDirections: addUnique(normalized.generatedIconDirections, concepts.map((concept) => concept.symbol).concat(trend?.iconTrend || []), 20),
    generatedPalettes: addUnique(normalized.generatedPalettes, concepts.map((concept) => concept.palette).concat(palette || []), 16),
    generatedTypography: addUnique(normalized.generatedTypography, concepts.map((concept) => concept.typography).concat(typographySystem.label || []), 16),
    generatedCompositions: addUnique(normalized.generatedCompositions, concepts.map((concept) => concept.layout).concat(humanDesign?.composition || []), 16),
    lastSuccessfulDirection: nextDirection || normalized.lastSuccessfulDirection,
    continuityIntent: normalized.continuityIntent,
    refinementMode: normalized.refinementMode,
    refinementInstruction: normalized.refinementInstruction,
    changedAreas: normalized.changedAreas,
    preserveAreas: normalized.preserveAreas,
    refinementHistory: normalized.refinementHistory,
    summary: `remembered ${concepts.length} concepts; next retry should evolve from the strongest direction while preserving useful typography, palette, layout, and brand identity`,
    updatedAt: new Date().toISOString(),
  };
}

function getHumanComposition({ hash, variant, layout, subject, humanDesign = {}, personalityDirectives = {} }) {
  const seed = Math.abs(hash + variant * 97);
  const sign = seed % 2 === 0 ? 1 : -1;
  const restrained = /quiet|editorial|formal|restrained/.test(`${humanDesign.composition || ""} ${personalityDirectives.layoutBias || ""}`);
  const dynamic = /dynamic|off-axis|expressive/.test(humanDesign.composition || "") || personalityDirectives.layoutBias === "dynamic";
  const institutional = /formal|institutional/.test(`${humanDesign.composition || ""} ${personalityDirectives.layoutBias || ""}`);
  const noOffsetSubjects = ["law", "finance", "insurance"].includes(subject) && institutional;
  const offsetBase = noOffsetSubjects ? 0 : dynamic ? 38 : restrained ? 18 : 26;
  const markDx = sign * (offsetBase + (seed % 9));
  const wordDx = sign * (dynamic ? -18 : restrained ? 10 : -10);
  const accentDx = Math.round((markDx + wordDx) / 3);
  const markDy = dynamic ? -52 : restrained ? -18 : -30;
  const lineInset = dynamic ? 315 : restrained ? 338 : 300;
  const frameInset = restrained ? 62 : dynamic ? 48 : 54;
  const frameRx = subject === "plastering" ? 34 : restrained ? 58 : dynamic ? 88 : 72;
  const opacity = restrained ? 0.055 : dynamic ? 0.075 : 0.065;

  return {
    markDx,
    wordDx,
    accentDx,
    markDy,
    lineInset,
    frameInset,
    frameRx,
    frameOpacity: opacity,
    markScaleBoost: dynamic ? 1.04 : restrained ? 0.98 : 1,
    data: `${humanDesign.composition || "balanced asymmetry"} | ${humanDesign.tension || "subtle optical offset"}`,
  };
}

const TYPOGRAPHY_SYSTEMS = {
  luxurySerif: {
    label: "high-contrast editorial serif with generous tracking and small-caps support",
    primaryFamily: "Georgia, 'Times New Roman', Times, serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 700,
    trackingBase: 4,
    subtitleTracking: 7,
    lineGapRatio: 1.02,
    caseMode: "upper",
    maxLineChars: 13,
    hierarchy: "mark first, restrained uppercase wordmark, quiet small-caps descriptor",
  },
  authoritySerif: {
    label: "authoritative serif paired with precise sans small caps",
    primaryFamily: "Georgia, 'Times New Roman', Times, serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 800,
    trackingBase: 1,
    subtitleTracking: 5,
    lineGapRatio: 0.96,
    caseMode: "title",
    maxLineChars: 15,
    hierarchy: "balanced institution-style wordmark with measured descriptor spacing",
  },
  geometricSans: {
    label: "modern geometric sans with neutral spacing and crisp hierarchy",
    primaryFamily: "Inter, Arial, Helvetica, sans-serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 850,
    trackingBase: 0,
    subtitleTracking: 5,
    lineGapRatio: 0.92,
    caseMode: "preserve",
    maxLineChars: 16,
    hierarchy: "large readable wordmark with clean tech/product spacing",
  },
  tradeSans: {
    label: "bold trade sans with practical kerning and high small-size readability",
    primaryFamily: "Arial Black, Arial, Helvetica, sans-serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 900,
    trackingBase: -0.5,
    subtitleTracking: 4,
    lineGapRatio: 0.9,
    caseMode: "title",
    maxLineChars: 14,
    hierarchy: "strong service-business wordmark with compact readable descriptor",
  },
  hospitalitySans: {
    label: "warm hospitality sans with friendly width and appetizing spacing",
    primaryFamily: "Trebuchet MS, Inter, Arial, Helvetica, sans-serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 900,
    trackingBase: 0,
    subtitleTracking: 4,
    lineGapRatio: 0.92,
    caseMode: "title",
    maxLineChars: 14,
    hierarchy: "approachable restaurant wordmark with clear category descriptor",
  },
  editorialSerif: {
    label: "editorial serif with delicate hierarchy and refined support type",
    primaryFamily: "Georgia, 'Times New Roman', Times, serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 700,
    trackingBase: 2.5,
    subtitleTracking: 6,
    lineGapRatio: 1,
    caseMode: "title",
    maxLineChars: 14,
    hierarchy: "fashion/editorial wordmark with airy premium spacing",
  },
  playfulRounded: {
    label: "rounded friendly sans with relaxed spacing and strong legibility",
    primaryFamily: "Trebuchet MS, Inter, Arial, Helvetica, sans-serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 900,
    trackingBase: 0,
    subtitleTracking: 4,
    lineGapRatio: 0.94,
    caseMode: "title",
    maxLineChars: 13,
    hierarchy: "friendly wordmark with readable rhythm and simple descriptor",
  },
  vintageDisplay: {
    label: "heritage display serif with badge-ready spacing",
    primaryFamily: "Georgia, 'Times New Roman', Times, serif",
    supportFamily: "Inter, Arial, Helvetica, sans-serif",
    weight: 800,
    trackingBase: 1.5,
    subtitleTracking: 6,
    lineGapRatio: 0.96,
    caseMode: "title",
    maxLineChars: 13,
    hierarchy: "classic badge wordmark with clear period-inspired support type",
  },
};

function applyTypographyPersonality(base, personality, trend = null) {
  if (!personality) return base;
  const expression = personality.matrix.expression.score;
  const price = personality.matrix.price.score;
  const market = personality.matrix.market.score;
  const energy = personality.matrix.energy.score;
  const era = personality.matrix.era.score;
  const tone = personality.matrix.tone.score;

  return {
    ...base,
    trackingBase: clampPersonalityScore(50 + (base.trackingBase || 0) * 10 + (price > 64 || market > 64 ? 10 : 0) + (expression < 38 ? 8 : 0) - (energy > 68 ? 6 : 0)) / 10 - 5,
    subtitleTracking: Math.max(3, Math.min(9, (base.subtitleTracking || 5) + (price > 64 ? 1 : 0) + (expression < 38 ? 1 : 0) - (tone > 66 ? 1 : 0))),
    lineGapRatio: Math.max(0.88, Math.min(1.08, (base.lineGapRatio || 0.94) + (era > 64 ? 0.03 : 0) + (expression < 38 ? 0.02 : 0) - (energy > 66 ? 0.02 : 0))),
    hierarchy: `${base.hierarchy}; personality: ${personality.directives.spacing} spacing with ${personality.directives.layoutBias} hierarchy${personality.directives.interpretedTypography ? `; user-language translation: ${personality.directives.interpretedTypography}` : ""}${trend ? `; trend: ${trend.typographyTrend}` : ""}`,
  };
}

function selectTypography({ subject, styles, personality = null, trend = null }) {
  const primary = styles[0]?.key || "minimal";
  let selected = null;
  if (personality?.matrix.price.score >= 68 || personality?.matrix.market.score >= 70 || primary === "luxury") selected = TYPOGRAPHY_SYSTEMS.luxurySerif;
  else if (personality?.matrix.craft.score >= 68 || personality?.matrix.era.score <= 34 || ["tech", "agency", "gaming"].includes(subject) || primary === "futuristic") selected = TYPOGRAPHY_SYSTEMS.geometricSans;
  else if (personality?.matrix.tone.score >= 68 || primary === "playful" || ["pet", "education", "nonprofit"].includes(subject)) selected = TYPOGRAPHY_SYSTEMS.playfulRounded;
  else if (personality?.matrix.energy.score >= 68 || personality?.matrix.gender.score <= 32) selected = TYPOGRAPHY_SYSTEMS.tradeSans;
  else if (personality?.matrix.era.score >= 66) selected = TYPOGRAPHY_SYSTEMS.vintageDisplay;
  else if (["law", "finance", "insurance"].includes(subject)) selected = TYPOGRAPHY_SYSTEMS.authoritySerif;
  else if (subject === "ranch") selected = TYPOGRAPHY_SYSTEMS.luxurySerif;
  else if (["construction", "plastering", "roofing", "plumbing", "electrical", "automotive", "fitness", "logistics", "security", "tattoo"].includes(subject)) selected = TYPOGRAPHY_SYSTEMS.tradeSans;
  else if (["pizza", "restaurant", "coffee", "chocolate"].includes(subject)) selected = TYPOGRAPHY_SYSTEMS.hospitalitySans;
  else if (["fashion", "wedding-photo", "wellness", "architecture", "cannabis"].includes(subject)) selected = TYPOGRAPHY_SYSTEMS.editorialSerif;
  else if (primary === "vintage" || primary === "western") selected = TYPOGRAPHY_SYSTEMS.vintageDisplay;
  else if (primary === "minimal") selected = TYPOGRAPHY_SYSTEMS.geometricSans;
  else selected = { ...TYPOGRAPHY_SYSTEMS.geometricSans, label: styles[0]?.typography || TYPOGRAPHY_SYSTEMS.geometricSans.label };
  return applyTypographyPersonality(selected, personality, trend);
}

function selectAudience({ subject, positioning }) {
  const map = {
    pizza: "hungry local customers looking for a memorable restaurant",
    chocolate: "gift buyers, dessert lovers, and customers looking for a memorable confectionery brand",
    restaurant: "diners who need to understand the food concept instantly",
    law: "clients looking for trust, authority, and clarity",
    finance: "clients looking for stability, guidance, and professionalism",
    tech: "founders, creators, and teams looking for a smart digital product",
    ranch: "premium lifestyle guests, partners, and private ranch followers",
    plastering: "local customers who need a credible plastering or stucco contractor",
    construction: "property owners who need a capable, reliable contractor",
    automotive: "drivers looking for a trustworthy auto service or performance brand",
    fashion: "style-conscious buyers who judge the brand by taste and polish",
    "wedding-photo": "couples looking for refined photo and video storytelling",
    fitness: "people looking for energy, progress, and confidence",
    healthcare: "patients looking for calm, trust, and professional care",
    insurance: "customers looking for protection, clarity, and dependable coverage",
    agency: "founders and teams looking for creative growth and sharper brand presence",
    security: "customers looking for protection, control, and serious reliability",
    logistics: "customers who need speed, tracking, and dependable delivery",
    gaming: "players and fans looking for energy, identity, and culture",
    architecture: "clients who care about taste, proportion, and elevated spaces",
  };
  return map[subject] || (positioning === "premium" ? "customers who expect a polished premium brand" : "customers who need a clear, memorable brand");
}

function selectPalette({ subject, styles, logoColors, personality = null, trend = null }) {
  if (logoColors) return logoColors;
  if (personality?.directives?.interpretedPalette) return personality.directives.interpretedPalette;
  const primary = styles[0]?.key || "minimal";
  if (trend?.colorTrend?.includes("monochrome-first") && personality?.matrix.expression.score < 66) return "monochrome-first: ink black, warm white, one restrained accent";
  if (personality?.matrix.price.score >= 68 || personality?.matrix.market.score >= 70) return "ink black, warm ivory, restrained champagne accent";
  if (personality?.matrix.energy.score >= 70) return "deep black, white, sharp red or electric accent";
  if (personality?.matrix.tone.score >= 70) return "friendly high-contrast palette with one memorable warm accent";
  if (personality?.matrix.gender.score >= 70 && personality?.matrix.energy.score <= 42) return "soft ivory, muted rose, deep olive or charcoal";
  if (personality?.matrix.craft.score >= 70) return "ink black, clean white, electric blue or violet accent";
  if (personality?.matrix.reach.score <= 34 && personality?.matrix.craft.score <= 40) return "charcoal, cream, earthy local accent";
  if (subject === "pizza") return "tomato red, mozzarella cream, basil green, oven charcoal";
  if (subject === "chocolate") return "deep cocoa brown, cream, copper foil, warm caramel";
  if (subject === "restaurant") return "charcoal, warm cream, copper or ingredient accent";
  if (subject === "ranch") return "deep green, warm ivory, muted gold";
  if (subject === "tech") return "ink black, cloud white, electric blue";
  if (subject === "law") return "navy, ivory, brass";
  if (subject === "finance") return "navy, white, muted gold";
  if (subject === "insurance") return "navy, white, calm blue";
  if (subject === "agency") return "ink black, white, sharp creative accent";
  if (subject === "security") return "charcoal, white, signal red";
  if (subject === "logistics") return "navy, white, route blue";
  if (subject === "gaming") return "black, white, electric violet";
  if (subject === "architecture") return "charcoal, ivory, warm stone";
  if (subject === "cannabis") return "deep green, cream, muted gold";
  if (subject === "plastering") return "black, white, construction gray";
  if (primary === "luxury") return "black, ivory, champagne gold";
  if (primary === "playful") return "warm bright palette with professional contrast";
  return styles[0]?.palette || "black, white, one meaningful accent";
}

const ICON_CREATIVITY_SYSTEMS = {
  negativeSpace: {
    mode: "negative-space",
    label: "single ownable silhouette with negative-space category cue",
    rules: ["one dominant shape", "category appears through cutout/absence", "no object pileups", "works as favicon"],
  },
  monogramFusion: {
    mode: "monogram-fusion",
    label: "custom letterform fused with industry symbol",
    rules: ["initials become the icon", "symbol is embedded, not placed beside it", "balanced symmetry", "readable at small sizes"],
  },
  abstractSystem: {
    mode: "abstract-system",
    label: "geometric mark built from category movement and brand personality",
    rules: ["abstract but meaningful", "distinct proportions", "no generic AI sparkle", "clean vector geometry"],
  },
  editorialEmblem: {
    mode: "editorial-emblem",
    label: "premium emblem using refined line, space, and restraint",
    rules: ["quiet luxury", "thin accent detail", "no mascot clutter", "strong silhouette"],
  },
  mascotReduction: {
    mode: "mascot-reduction",
    label: "simplified mascot/object reduced to a brandable symbol",
    rules: ["mascot is iconic, not cartoon clipart", "large simple shapes", "minimal details", "strong expression"],
  },
};

function selectIconSystem({ subject, styles, logoSymbol = "", personality = null, trend = null }) {
  const styleKeys = styles.map((style) => style.key);
  const symbolText = logoSymbol.toLowerCase();
  if (personality?.directives?.interpretedIcon && /secondary|remove|restrained|negative|adaptive|monogram/.test(personality.directives.interpretedIcon)) {
    return {
      ...ICON_CREATIVITY_SYSTEMS.monogramFusion,
      label: personality.directives.interpretedIcon,
      rules: [...ICON_CREATIVITY_SYSTEMS.monogramFusion.rules, "follow the user's interpreted icon restraint"],
    };
  }
  if (/(mascot|animal|character|hippo|horse|dog|cat)/.test(symbolText) || ["hippo", "hippo-football", "pet"].includes(subject)) {
    return ICON_CREATIVITY_SYSTEMS.mascotReduction;
  }
  if (trend?.iconTrend?.includes("adaptive symbol") || trend?.minimalismTrend?.includes("precision")) {
    if (!["pizza", "restaurant", "coffee", "chocolate", "pet", "education"].includes(subject)) return ICON_CREATIVITY_SYSTEMS.abstractSystem;
  }
  if (personality?.matrix.expression.score <= 34 || personality?.matrix.price.score >= 68) {
    return ICON_CREATIVITY_SYSTEMS.editorialEmblem;
  }
  if (personality?.matrix.expression.score >= 70 || personality?.matrix.tone.score >= 70) {
    return ICON_CREATIVITY_SYSTEMS.mascotReduction;
  }
  if (personality?.matrix.craft.score >= 68 || personality?.matrix.era.score <= 36) {
    return ICON_CREATIVITY_SYSTEMS.abstractSystem;
  }
  if (["luxury", "fashion", "feminine"].some((key) => styleKeys.includes(key)) || ["wedding-photo", "ranch", "fashion"].includes(subject)) {
    return ICON_CREATIVITY_SYSTEMS.editorialEmblem;
  }
  if (["tech", "finance", "law"].includes(subject) || styleKeys.includes("futuristic")) {
    return ICON_CREATIVITY_SYSTEMS.abstractSystem;
  }
  if (["pizza", "restaurant", "coffee", "chocolate", "plastering", "construction", "automotive", "fitness", "surf", "roofing", "landscaping", "barber", "logistics"].includes(subject)) {
    return ICON_CREATIVITY_SYSTEMS.negativeSpace;
  }
  return ICON_CREATIVITY_SYSTEMS.monogramFusion;
}

function buildInternalConceptPool({ subject, profile, styles, logoSymbol, logoColors, typography, palette, iconSystem, personality, trend, memoryIntelligence }) {
  const directives = personality?.directives || {};
  const personalitySummary = personality?.summary || "balanced professional personality";
  const trendSummary = trend?.summary || "contemporary scalable logo system";
  const memoryInstruction = memoryIntelligence?.hasMemory ? ` Memory diversification: ${memoryIntelligence.summary}.` : "";
  const base = getConceptLibrary(subject, profile).map(([name, symbol, type, basePalette, layout, whyFits]) => ({
    name,
    style: styles[0]?.key || "professional",
    symbol: logoSymbol || symbol,
    iconSystem,
    typography: typography?.label || type,
    typographySystem: typography,
    palette: logoColors || palette || basePalette,
    layout: `${layout}; ${directives.layoutBias || "balanced"} layout with ${directives.spacing || "balanced"} spacing`,
    whyFits: `${whyFits} Personality fit: ${personalitySummary}. Trend fit: ${trendSummary}.${memoryInstruction}`,
    source: "library",
  }));

  const styleConcepts = styles.flatMap((style) => ([
    {
      name: `${titleCase(style.key)} Signature Mark`,
      style: style.key,
      symbol: logoSymbol || `a meaning-first ${subject.replace("-", " ")} symbol using ${style.traits.join(", ")} design cues`,
      iconSystem,
      typography: typography?.label || style.typography,
      typographySystem: typography,
      palette: logoColors || style.palette,
      layout: `large ownable icon above a highly readable wordmark; ${directives.layoutBias || "balanced"} composition`,
      whyFits: `It translates the ${subject.replace("-", " ")} concept through a ${style.key} visual language instead of using a generic icon. Personality fit: ${personalitySummary}. Trend fit: ${trend?.minimalismTrend || "current minimalism with brand personality"}.${memoryInstruction}`,
      source: "style",
    },
    {
      name: `${titleCase(style.key)} Wordmark System`,
      style: style.key,
      symbol: logoSymbol || `subtle embedded symbol from the brand meaning, integrated into the wordmark`,
      iconSystem,
      typography: typography?.label || style.typography,
      typographySystem: typography,
      palette: logoColors || style.palette,
      layout: `wordmark-led logo with small supporting icon; ${directives.spacing || "balanced"} spacing`,
      whyFits: `It keeps the brand name readable while still reflecting the requested category and mood. Personality fit: ${personalitySummary}. Trend fit: ${trend?.typographyTrend || "type-forward modern identity"}.${memoryInstruction}`,
      source: "style",
    },
  ]));

  const layoutConcepts = ["stacked emblem", "horizontal lockup", "badge system", "icon-first social mark", "wordmark with hidden symbol", "mascot or object-led mark"].map((layout, index) => ({
    name: `${titleCase(subject.replace("-", " "))} ${titleCase(layout)}`,
    style: styles[index % styles.length]?.key || "professional",
    symbol: logoSymbol || `distinct ${subject.replace("-", " ")} visual cue built for ${layout}`,
    iconSystem,
    typography: typography?.label || "clean readable brand wordmark",
    typographySystem: typography,
    palette,
    layout: `${layout}; ${directives.layoutBias || "balanced"} personality bias`,
    whyFits: `This direction gives the brand a different composition so the options are not small variations of the same logo. It is tuned for ${personalitySummary} and ${trend?.spacingTrend || "current spacing standards"}.${memoryInstruction}`,
    source: "layout",
  }));

  const iconModes = Object.values(ICON_CREATIVITY_SYSTEMS).map((system, index) => ({
    name: `${titleCase(subject.replace("-", " "))} ${titleCase(system.mode.replace("-", " "))}`,
    style: styles[index % styles.length]?.key || styles[0]?.key || "professional",
    symbol: logoSymbol || `${system.label} for a ${subject.replace("-", " ")} brand, using ${system.rules[0]} and ${system.rules[1]}`,
    iconSystem: system,
    typography: typography?.label || "readable brand typography",
    typographySystem: typography,
    palette: logoColors || palette,
    layout: index % 2 === 0 ? `large icon with compact wordmark; ${directives.spacing || "balanced"} spacing` : `wordmark-led mark with embedded category cue; ${directives.layoutBias || "balanced"} layout`,
    whyFits: `It explores a different brandable icon system so the final options do not repeat the same stock-looking mark. The icon logic follows ${directives.iconStyle || "a clean brand mark"} and ${trend?.iconTrend || "simplified contemporary symbols"}.${memoryInstruction}`,
    source: "icon",
  }));

  const positioningConcepts = ["premium flagship", "local trust", "social avatar", "signage-ready", "merch-ready"].map((angle, index) => ({
    name: `${titleCase(subject.replace("-", " "))} ${titleCase(angle)}`,
    style: styles[(index + 1) % styles.length]?.key || styles[0]?.key || "professional",
    symbol: logoSymbol || `reduced ${subject.replace("-", " ")} cue shaped into one ownable silhouette for ${angle}`,
    iconSystem,
    typography: typography?.label || "readable brand typography",
    typographySystem: typography,
    palette: logoColors || palette,
    layout: index % 2 === 0 ? `large simplified mark with type-forward wordmark and ${directives.spacing || "premium"} spacing` : `wide editorial lockup with restrained icon scale and clear hierarchy`,
    whyFits: `It designs the logo for a specific real-world use case: ${angle}, while matching ${personalitySummary}. The direction favors clean typography, fewer elements, scalable silhouette, and avoids ${trend?.penalties?.[0] || "generic template styling"}.${memoryInstruction}`,
    source: "positioning",
  }));

  return [...base, ...styleConcepts, ...layoutConcepts, ...iconModes, ...positioningConcepts].slice(0, 28);
}

function scoreLogoConcept(concept, { subject, styles, logoSymbol = "", logoAvoid = "", personality = null, trend = null, memoryIntelligence = null }) {
  const text = `${concept.name} ${concept.symbol} ${concept.typography} ${concept.palette} ${concept.layout} ${concept.whyFits}`.toLowerCase();
  const aliases = {
    realestate: ["real estate", "property", "home", "house", "brokerage", "realtor"],
    law: ["law", "legal", "counsel", "attorney"],
    finance: ["finance", "wealth", "capital", "tax", "ledger", "money"],
    wellness: ["wellness", "beauty", "spa", "skincare", "leaf", "calm"],
    tech: ["ai", "tech", "software", "saas", "neural", "platform"],
    healthcare: ["health", "clinic", "medical", "dental", "care", "therapy"],
    fitness: ["fitness", "strength", "training", "athletic", "body", "performance", "motion"],
    automotive: ["automotive", "auto", "car", "garage", "detailing", "road", "wrench"],
    music: ["music", "sound", "audio", "podcast", "waveform", "record", "studio"],
    landscaping: ["landscape", "lawn", "garden", "tree", "leaf"],
    logistics: ["logistics", "shipping", "delivery", "route", "freight"],
    security: ["security", "secure", "lock", "protection", "sentinel"],
    tattoo: ["tattoo", "ink", "flash", "ornamental"],
  }[subject] || [subject.replace("-", " "), subject.split("-")[0]];
  const subjectMatches = aliases.some((alias) => text.includes(alias));
  let score = 58;
  if (concept.source === "library") score += SCORING_WEIGHTS.conceptLibraryBoost + 10;
  if (subjectMatches) score += SCORING_WEIGHTS.subjectMatch;
  if (logoSymbol && text.includes(logoSymbol.toLowerCase().split(/\s+/)[0])) score += SCORING_WEIGHTS.requestedSymbolMatch;
  styles.forEach((style, index) => {
    if (text.includes(style.key)) score += SCORING_WEIGHTS.styleMatch - index;
    style.traits.forEach((trait) => {
      if (text.includes(trait)) score += 2;
    });
  });
  if (WEAK_LOGO_TERMS.test(text)) score += SCORING_WEIGHTS.genericPenalty;
  if (/(decorative filler|multiple icons|icon mashup|presentation card|frame|mockup|tiny detail|over-designed|overgenerated|over-generated)/.test(text)) score -= 18;
  if (/(readable|scalable|clean|meaning|category|symbol|custom|ownable|negative|hidden|reduced|brandable)/.test(text)) score += SCORING_WEIGHTS.readabilityAndScalability;
  if (ELITE_QUALITY_TERMS.test(text)) score += 12;
  if (/(one clear idea|fewer elements|typography-first|type-forward|monochrome-first|strong silhouette|confident whitespace|optical spacing)/.test(text)) score += 8;
  const shieldOrBadge = /(shield|badge|crest)/.test(text);
  const shieldFriendly = ["law", "finance", "insurance", "ranch", "football", "hippo-football", "education", "security"].includes(subject);
  if (shieldOrBadge && !shieldFriendly && !/(shield|badge|crest)/.test(logoSymbol.toLowerCase())) score -= 9;
  if (/(monogram|initials)/.test(text) && !/(monogram|initial|letter)/.test(logoSymbol.toLowerCase())) score -= subject === "abstract" ? 0 : 5;
  if (subject !== "abstract" && !subjectMatches) score -= 14;
  if (concept.source === "icon" && concept.iconSystem?.mode) score += 5;
  if (personality) {
    const layoutText = String(concept.layout || "").toLowerCase();
    const whyText = String(concept.whyFits || "").toLowerCase();
    if (personality.matrix.price.score >= 68 && /(premium|restrained|refined|editorial|luxury|generous)/.test(text)) score += 8;
    if (personality.matrix.price.score <= 34 && /(friendly|clear|local|accessible|readable)/.test(text)) score += 6;
    if (personality.matrix.tone.score >= 68 && /(playful|friendly|character|mascot|warm)/.test(text)) score += 7;
    if (personality.matrix.energy.score >= 68 && /(bold|dynamic|strong|performance|large icon)/.test(text)) score += 7;
    if (personality.matrix.energy.score <= 34 && /(calm|restrained|quiet|refined|balanced)/.test(text)) score += 6;
    if (personality.matrix.expression.score <= 34 && /(minimal|negative|restrained|simple|clean)/.test(text)) score += 7;
    if (personality.matrix.expression.score >= 68 && /(expressive|mascot|object|distinct|characterful)/.test(text)) score += 7;
    if (personality.matrix.craft.score <= 34 && /(craft|material|trade|hand|local)/.test(text)) score += 5;
    if (layoutText.includes(personality.directives.layoutBias) || whyText.includes(personality.directives.iconStyle.split(" ")[0])) score += 4;
  }
  if (trend) {
    if (/(monochrome|restrained|adaptive|favicon|app icon|type-forward|custom wordmark|negative space|simplified|whitespace|fewer elements|current|modern spacing)/.test(text)) score += 8;
    if (trend.typographyTrend?.includes("custom") && /(custom|letter|wordmark|optical|spacing)/.test(text)) score += 5;
    if (trend.iconTrend?.includes("adaptive") && /(adaptive|favicon|avatar|app icon|system)/.test(text)) score += 5;
    trend.penalties.forEach((penalty) => {
      const firstTerm = penalty.split(" ").slice(0, 2).join(" ");
      if (firstTerm && text.includes(firstTerm)) score -= 8;
    });
  }
  if (memoryIntelligence?.hasMemory) {
    if (conceptMatchesMemory(concept, memoryIntelligence)) score -= 22;
    score += scoreConceptContinuity(concept, memoryIntelligence);
    memoryIntelligence.preferences.forEach((preference) => {
      if (preference.length > 3 && text.includes(preference)) score += 6;
    });
    if (memoryIntelligence.anchor && /(refined|evolved|alternative|same system|lockup|variation)/.test(text)) score += 4;
    if (!memoryIntelligence.anchor && /(different|alternative|diversify|new composition|different composition|new icon)/.test(text)) score += 6;
  }
  if (logoAvoid) {
    logoAvoid.toLowerCase().split(/\s+/).filter(Boolean).forEach((word) => {
      if (word.length > 3 && text.includes(word)) score += SCORING_WEIGHTS.avoidWordPenalty;
    });
  }
  return Math.max(0, Math.min(100, score));
}

function runCreativeDirectorReview(concept, { subject, styles, logoSymbol = "", personality = null, trend = null, memoryIntelligence = null }) {
  const text = `${concept.name} ${concept.style} ${concept.symbol} ${concept.typography} ${concept.palette} ${concept.layout} ${concept.whyFits}`.toLowerCase();
  const weaknesses = [];
  const improvements = [];
  let scoreAdjustment = 0;

  const genericPattern = /(category-specific|generic|stock|template|default|hexagon|initials only|simple emblem built from|distinct [a-z-]+ visual cue|subtle embedded symbol|random|clip.?art)/;
  if (genericPattern.test(text)) {
    weaknesses.push("icon direction feels too generic or placeholder-like");
    improvements.push("replace placeholder icon logic with a specific, ownable symbol tied to the brand words");
    scoreAdjustment -= 28;
  }

  if (/(centered mark over readable wordmark|centered crest above wordmark|symbol above or beside wordmark|overly centered|template badge)/.test(text)) {
    weaknesses.push("composition risks looking like a centered logo-generator template");
    improvements.push("use optical offset, stronger negative space, and a less predictable mark-to-type relationship");
    scoreAdjustment -= 14;
  }

  if (!/(custom|ownable|negative|hidden|reduced|brandable|adaptive|material-aware|wordmark|letter|silhouette|monochrome|editorial|refined)/.test(text)) {
    weaknesses.push("visual uniqueness is not strong enough");
    improvements.push("add a custom letter detail, negative-space cue, or simplified silhouette that can be recognized at favicon size");
    scoreAdjustment -= 14;
  }

  if (!/(spacing|hierarchy|small-caps|tracking|wordmark|type|typography|serif|sans|kerning|optical)/.test(text)) {
    weaknesses.push("typography hierarchy is under-specified");
    improvements.push("define a clearer type hierarchy with wordmark scale, tracking, and support-type rhythm");
    scoreAdjustment -= 12;
  }

  if (/(glossy|3d|orb|sparkle|swoosh|gradient blob|busy detail|decorative filler|multiple icons|icon mashup|over-designed|overgenerated|over-generated)/.test(text)) {
    weaknesses.push("visual language feels over-generated or decorative");
    improvements.push("remove decorative effects, reduce to one idea, and use flat vector restraint");
    scoreAdjustment -= 24;
  }

  if (!/(fewer elements|one clear idea|reduced|simplified|minimal|restrained|scalable|strong silhouette|whitespace|negative space|typography-first|type-forward)/.test(text)) {
    weaknesses.push("simplicity and scalability are not explicit enough");
    improvements.push("simplify the concept into fewer elements with a stronger silhouette and clearer spacing");
    scoreAdjustment -= 10;
  }

  if (personality?.matrix.market.score >= 66 || personality?.matrix.price.score >= 66) {
    if (!/(premium|refined|restrained|quiet|luxury|editorial|generous|champagne|ivory)/.test(text)) {
      weaknesses.push("premium positioning is not visible enough");
      improvements.push("increase restraint, whitespace, refined typography, and a premium monochrome-first palette");
      scoreAdjustment -= 12;
    } else {
      scoreAdjustment += 5;
    }
  }

  if (personality?.matrix.tone.score >= 66 || personality?.matrix.expression.score >= 66) {
    if (!/(character|bold|expressive|friendly|mascot|large simple|distinct)/.test(text)) {
      weaknesses.push("playful or expressive personality needs a stronger recognizable shape");
      improvements.push("make the mark more characterful while keeping details large and simple");
      scoreAdjustment -= 8;
    }
  }

  if (memoryIntelligence?.hasMemory && conceptMatchesMemory(concept, memoryIntelligence)) {
    weaknesses.push("direction repeats something from generation memory");
    improvements.push("change style, icon direction, palette, or composition instead of repeating the prior route");
    scoreAdjustment -= 16;
  }

  const requestedSymbol = String(logoSymbol || "").toLowerCase().split(/\s+/).filter((word) => word.length > 3)[0];
  if (requestedSymbol && !text.includes(requestedSymbol)) {
    weaknesses.push("requested symbol is not explicit enough");
    improvements.push(`make the requested ${requestedSymbol} cue visible in the primary mark`);
    scoreAdjustment -= 10;
  }

  const improvedConcept = {
    ...concept,
    typography: `${concept.typography}; Creative Director: clearer hierarchy, stronger optical spacing, and more readable support type`,
    layout: `${concept.layout}; Creative Director: intentional negative space, optical balance, and non-template placement`,
    whyFits: `${concept.whyFits} Creative Director refinement: ${improvements.length ? improvements.join("; ") : "preserve this direction, but sharpen spacing, hierarchy, uniqueness, brand fit, and premium finish."}`,
  };

  const adjustedScore = Math.max(0, Math.min(100, (concept.score || 0) + scoreAdjustment));
  const rejected = adjustedScore < 74 || weaknesses.length >= 3;

  return {
    concept: improvedConcept,
    adjustedScore,
    rejected,
    weaknesses,
    improvements,
    summary: weaknesses.length
      ? `Rejected risks: ${weaknesses.join("; ")}. Improvements: ${improvements.join("; ")}.`
      : "Passed senior brand review with spacing, hierarchy, uniqueness, brand fit, and premium feel intact.",
  };
}

function refineConceptForEliteQuality(concept, context = {}) {
  const { subject, personality = null, trend = null, logoSymbol = "" } = context;
  const premium = (personality?.matrix?.price?.score || 50) >= 66 || (personality?.matrix?.market?.score || 50) >= 66;
  const expressive = (personality?.matrix?.expression?.score || 50) >= 68 || (personality?.matrix?.tone?.score || 50) >= 68;
  const subjectLabel = String(subject || "brand").replace("-", " ");
  const typography = premium
    ? "premium editorial wordmark with generous tracking, optical kerning, and restrained support type"
    : expressive
      ? "bold readable wordmark with one custom letter rhythm and simple support type"
      : "modern custom wordmark with precise spacing, strong hierarchy, and scalable proportions";
  const symbol = logoSymbol
    ? `reduced ${logoSymbol} cue shaped into one ownable silhouette with negative space`
    : premium
      ? `restrained ${subjectLabel} monogram or abstract cue with negative space and no decorative filler`
      : `single brandable ${subjectLabel} symbol reduced to a clean scalable silhouette`;
  const palette = premium
    ? "monochrome-first: ink black, warm ivory, one restrained champagne or deep-neutral accent"
    : "monochrome-first with one meaningful accent and no generic startup gradient";

  return {
    ...concept,
    name: `${concept.name || titleCase(subjectLabel)} Refined`,
    symbol,
    typography,
    palette,
    layout: "type-forward lockup with confident whitespace, large scalable mark, optical balance, and no template badge framing",
    whyFits: `Elite quality refinement: this version removes weak decorative logic and keeps one clear brand idea. It favors agency-quality typography, icon restraint, consistent spacing, modern composition, memorability, simplicity, and scalable vector use. ${trend?.minimalismTrend || "Precision minimalism with personality."}`,
    source: "elite-refinement",
    score: Math.max(82, concept.score || 0),
    creativeDirectorReview: {
      rejected: false,
      weaknesses: [],
      improvements: ["internally refined weak concept before display"],
      summary: "Passed after elite quality refinement: simplified, type-forward, restrained, scalable, and less template-like.",
    },
  };
}

function runCreativeDirectorGate(scored, context) {
  const reviewed = scored.map((concept) => {
    const review = runCreativeDirectorReview(concept, context);
    return {
      ...review.concept,
      score: review.adjustedScore,
      creativeDirectorReview: {
        rejected: review.rejected,
        weaknesses: review.weaknesses,
        improvements: review.improvements,
        summary: review.summary,
      },
    };
  }).sort((a, b) => b.score - a.score);

  const accepted = reviewed.filter((concept) => !concept.creativeDirectorReview.rejected && concept.score >= 74);
  const refinedFallbacks = reviewed
    .filter((concept) => !accepted.some((item) => item.name === concept.name))
    .slice(0, 8)
    .map((concept) => refineConceptForEliteQuality(concept, context));
  const finalPool = [...accepted, ...refinedFallbacks]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(4, accepted.length));
  const rejected = reviewed.filter((concept) => concept.creativeDirectorReview.rejected);

  return {
    concepts: finalPool,
    rejected,
    summary: `${accepted.length} concepts passed review; ${rejected.length} weak concepts rejected or refined before display.`,
  };
}

function getConceptSymbolKey(concept) {
  return String(concept.symbol || "")
    .toLowerCase()
    .replace(/\b(a|an|the|and|with|inside|into|forming|custom|clean|simple|mark|symbol|icon|brand|logo)\b/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 5)
    .join(" ");
}

function runLogoGenerationPipeline({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory }) {
  const inferredName = inferBrandName({ brandName, userPrompt, logoPrompt });
  const wordsResult = getLogoWords({ brandName: inferredName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const subject = getSubject(wordsResult.words);
  const safeGenerationMemory = sanitizeGenerationMemoryForRequest(generationMemory, { brandName: inferredName, logoIndustry: subject });
  const profile = getStyleProfile({ logoStyle, logoIndustry, userPrompt: `${userPrompt || ""} ${logoPrompt || ""}` });
  const styles = detectLogoStyles({ subject, logoStyle, logoIndustry, logoSymbol, userPrompt, logoPrompt });
  const personality = inferBrandPersonality({ subject, brandName: inferredName, logoStyle, logoIndustry, logoSymbol, logoColors, userPrompt, logoPrompt, styles });
  const humanDesign = buildHumanDesignRealism({ subject, personality, styles });
  const trend = buildDesignTrendIntelligence({ subject, personality, styles });
  const memoryIntelligence = buildGenerationMemoryIntelligence(safeGenerationMemory);
  const positioning = inferPositioning({ subject, styles, source: wordsResult.source, personality });
  const typography = selectTypography({ subject, styles, personality, trend });
  const palette = selectPalette({ subject, styles, logoColors, personality, trend });
  const iconSystem = selectIconSystem({ subject, styles, logoSymbol, personality, trend });
  const audience = selectAudience({ subject, positioning });
  const pool = buildInternalConceptPool({ subject, profile, styles, logoSymbol, logoColors, typography, palette, iconSystem, personality, trend, memoryIntelligence });
  const scored = pool
    .map((concept) => ({ ...concept, score: scoreLogoConcept(concept, { subject, styles, logoSymbol, logoAvoid, personality, trend, memoryIntelligence }) }))
    .sort((a, b) => b.score - a.score);
  const creativeDirectorGate = runCreativeDirectorGate(scored, { subject, styles, logoSymbol, personality, trend, memoryIntelligence });
  const reviewedScored = creativeDirectorGate.concepts;

  const diversified = [];
  reviewedScored.forEach((concept) => {
    const duplicateStyle = diversified.filter((item) => item.style === concept.style).length >= 2;
    const duplicateLayout = diversified.some((item) => item.layout === concept.layout && getConceptSymbolKey(item) === getConceptSymbolKey(concept));
    const duplicateSymbol = diversified.some((item) => getConceptSymbolKey(item) === getConceptSymbolKey(concept));
    const sourceCapReached = diversified.filter((item) => item.source === concept.source).length >= 2;
    if (!duplicateStyle && !duplicateLayout && !duplicateSymbol && !sourceCapReached && diversified.length < 4) diversified.push(concept);
  });

  const concepts = (diversified.length >= 4 ? diversified : reviewedScored.slice(0, 4)).map((concept) => ({
    name: concept.name,
    style: concept.style,
    symbol: concept.symbol,
    iconSystem: concept.iconSystem,
    typography: concept.typography,
    typographySystem: concept.typographySystem,
    palette: concept.palette,
    layout: concept.layout,
    whyFits: concept.whyFits,
    score: concept.score,
    creativeDirectorReview: concept.creativeDirectorReview,
  }));

  return {
    brandName: inferredName,
    category: subject,
    styles,
    personalityMatrix: personality.matrix,
    personalitySummary: personality.summary,
    personalityDirectives: personality.directives,
    humanDesign,
    trendIntelligence: trend,
    generationMemory: memoryIntelligence,
    creativeDirectorGate: {
      summary: creativeDirectorGate.summary,
      rejected: creativeDirectorGate.rejected.slice(0, 8).map((concept) => ({
        name: concept.name,
        score: concept.score,
        weaknesses: concept.creativeDirectorReview?.weaknesses || [],
      })),
    },
    positioning,
    typography: typography.label,
    typographySystem: typography,
    iconSystem,
    palette,
    targetAudience: audience,
    concepts,
    scores: reviewedScored.slice(0, 8).map(({ name, score, source, creativeDirectorReview }) => ({ name, score, source, review: creativeDirectorReview?.summary || "" })),
    pipeline: {
      brandAnalysis: { brandName: inferredName, rawWords: wordsResult.words, positioning },
      brandPersonality: {
        summary: personality.summary,
        matrix: personality.matrix,
        directives: personality.directives,
      },
      humanDesignRealism: humanDesign,
      designTrendIntelligence: trend,
      generationMemory: {
        summary: memoryIntelligence.summary,
        avoided: memoryIntelligence.avoid.slice(0, 12),
        typographyPreferences: memoryIntelligence.preferences.slice(0, 8),
      },
      creativeDirectorGate: creativeDirectorGate.summary,
      industryDetection: { category: subject, confidence: subject === "abstract" ? "medium" : "high" },
      styleDetection: styles.map((style) => style.key),
      typographySelection: typography.label,
      typographyHierarchy: typography.hierarchy,
      iconGeneration: concepts.map((concept) => concept.symbol),
      iconCreativitySystem: iconSystem.label,
      iconRules: iconSystem.rules,
      layoutGeneration: concepts.map((concept) => concept.layout),
      colorPaletteGeneration: palette,
      refinementScoring: "20+ concepts scored for readability, memorability, uniqueness, scalability, professionalism, icon balance, typography balance, and anti-generic quality.",
      exportFormatting: ["SVG", "transparent SVG", "downloadable preview", "editable layer metadata"],
    },
  };
}

function inferBrandName({ brandName, userPrompt, logoPrompt }) {
  const explicit = String(brandName || "").trim();
  if (explicit) return explicit;

  const source = String(userPrompt || logoPrompt || "").trim();
  const split = source.split(/\s+[—-]\s+/)[0]?.trim();
  if (split && split.length <= 48 && !/^create|make|design|generate/i.test(split)) return split;

  const quoted = source.match(/["“]([^"”]{2,48})["”]/);
  if (quoted?.[1]) return quoted[1].trim();

  return titleCase(source.replace(/\b(logo|brand|for|create|make|design|generate)\b/gi, " ").split(/\s+/).filter(Boolean).slice(0, 3).join(" ")) || "Brand";
}

function getConceptLibrary(subject, profile) {
  const libraries = {
    ranch: [
      ["Luxury Ranch Crest", "refined horse and alpaca silhouette inside a tasteful ranch gate crest", "elegant serif wordmark with wide spacing", "charcoal, warm ivory, muted gold", "centered crest above wordmark", "It makes the ranch feel private, premium, and rooted in animals without looking cartoonish."],
      ["Heritage Pasture Mark", "rolling pasture line with subtle barn-gate geometry and animal profile", "classic editorial serif", "deep green, cream, antique gold", "horizontal mark with wordmark beneath", "It connects land, animals, and high-end hospitality."],
      ["Boutique Ranch Monogram", "interlocking initials with small horseshoe or gate detail", "luxury monogram with small caps", "black, ivory, champagne", "monogram icon above restrained type", "It fits a private ranch that wants a clean luxury identity."],
    ],
    tech: [
      ["AI Brand Grid", "neural nodes forming a clean brand spark or B-style system mark", "modern geometric sans", "black, white, electric blue", "icon left or above wordmark", "It connects AI intelligence with branding systems instead of random tech shapes."],
      ["Creative OS Mark", "layered cursor, spark, and modular grid symbol", "clean SaaS wordmark", "ink black, cloud white, signal blue", "stacked product-logo layout", "It feels like a modern platform creators can trust."],
      ["Automated Identity Symbol", "abstract generated mark built from connected blocks", "bold startup sans", "navy, white, cyan", "large icon with compact wordmark", "It communicates AI-built brand assets with a scalable tech identity."],
    ],
    "wedding-photo": [
      ["Editorial Rose Lens", "rose petal forms wrapped around a camera aperture", "high-end serif with cinematic spacing", "soft black, ivory, dusty rose", "delicate symbol above elegant wordmark", "It blends weddings, romance, photography, and premium video."],
      ["Fine Art Film Mark", "minimal aperture with flowing ribbon/veil line", "luxury editorial serif", "charcoal, porcelain, muted blush", "thin icon over wide-set type", "It feels refined, romantic, and appropriate for wedding photo/video."],
      ["Signature Rose Monogram", "rose stem forming a subtle letter mark", "elegant serif and small caps", "black, cream, rose gold", "monogram and wordmark lockup", "It makes the name memorable while staying upscale."],
    ],
    plastering: [
      ["Finish Sweep", "smooth plaster sweep with a professional trowel angle", "strong contractor sans", "black, white, construction gray", "large trade mark above bold wordmark", "It directly reflects plastering and surface finishing."],
      ["Wall Finish Badge", "finished wall panel with curved skim-coat strokes and trowel", "clean local-service wordmark", "charcoal, white, silver", "framed icon above name", "It feels credible for a professional plastering company."],
      ["Craft Contractor Mark", "abstract skim-coat curve forming the initials", "bold readable sans", "black, white, muted gray", "initial-integrated symbol with wordmark", "It gives the trade a more custom identity than a generic tool icon."],
    ],
    surf: [
      ["Coastal Wave Shop", "clean wave curl forming a shop sign or sun line", "relaxed bold sans", "deep navy, sand, seafoam", "wave icon above casual wordmark", "It instantly signals surf, ocean, and retail energy."],
      ["Board Badge", "surfboard silhouette with wave negative space", "vintage shop typography", "ocean blue, cream, coral", "badge or horizontal lockup", "It feels like a real surf shop identity."],
      ["Tide Mark", "minimal wave line and horizon mark", "modern coastal sans", "black, off-white, aqua", "simple icon with wide wordmark", "It works on apparel, signs, and social profile images."],
    ],
    law: [
      ["Trust Pillar Mark", "abstract courthouse columns in a balanced monogram", "authoritative serif", "navy, white, brass", "pillar icon above firm name", "It signals legal credibility without cheesy scales."],
      ["Modern Counsel Seal", "shield-like legal seal with subtle column geometry", "premium law serif", "charcoal, ivory, gold", "seal and wordmark", "It feels established, serious, and professional."],
      ["Equity Line Mark", "balanced horizontal lines forming an understated legal symbol", "reserved serif/sans pairing", "black, white, muted gold", "minimal mark with precise typography", "It avoids generic law icons while keeping trust and authority."],
    ],
    fitness: [
      ["Strength Pulse", "dynamic bolt/body movement mark", "bold athletic sans", "black, white, energy red", "large kinetic icon with compact type", "It shows motion, strength, and transformation."],
      ["Performance Badge", "shield-like training mark with subtle bar path", "condensed sports typography", "navy, white, bright green", "badge above wordmark", "It works for gym signage, apparel, and social."],
      ["Minimal Motion Mark", "abstract body line and upward arrow", "clean modern sans", "charcoal, white, electric accent", "icon-left lockup", "It feels modern and less generic than a dumbbell icon."],
    ],
    coffee: [
      ["Roaster Steam Mark", "cup and steam line forming a custom initial", "warm serif wordmark", "espresso, cream, copper", "icon above wordmark", "It instantly reads coffee with a premium cafe tone."],
      ["Bean Badge", "coffee bean shape with subtle location/shop badge", "vintage cafe type", "deep brown, cream, brass", "badge layout", "It suits packaging, cups, and storefronts."],
      ["Modern Cafe Line", "minimal cup line and sunrise steam", "clean friendly sans", "black, ivory, caramel", "horizontal logo", "It is simple and usable across menus and social."],
    ],
    pizza: [
      ["Pizzeria Slice Mark", "large pizza slice with melted cheese, pepperoni dots, and a warm oven arc", "bold friendly restaurant wordmark", "tomato red, mozzarella cream, basil green", "big food icon above readable name", "It immediately shows pizza instead of a random badge or initials."],
      ["Wood-Fired Badge", "round pizza, flame, and oven curve inside a classic pizzeria badge", "heritage Italian-inspired display type", "deep red, charcoal, warm cream", "badge icon with curved wordmark feel", "It fits a pizza restaurant, takeout shop, or neighborhood pizzeria."],
      ["Modern Slice House", "minimal pizza slice forming a roof/shop sign shape", "clean modern sans with playful weight", "black, ivory, oregano green, red accent", "icon-left or stacked lockup", "It keeps the logo modern while still being unmistakably food themed."],
    ],
    chocolate: [
      ["Cocoa Factory Mark", "stacked chocolate squares with a cocoa pod curve and subtle factory window geometry", "warm premium confectionery wordmark", "deep cocoa brown, cream, copper foil", "large chocolate symbol above readable brand name", "It directly connects chocolate, craft, and production without drifting into unrelated ranch or luxury hotel cues."],
      ["Truffle Ribbon Wordmark", "melted chocolate ribbon forming a custom initial or underline", "soft bold hospitality type", "dark chocolate, caramel, ivory", "wordmark-led lockup with chocolate ribbon accent", "It makes the brand feel edible, handcrafted, and clearly confectionery."],
      ["Bean & Bar Emblem", "cocoa bean nested inside a chocolate bar tile", "vintage candy-shop typography", "espresso brown, warm cream, muted gold", "compact emblem with clear wordmark", "It gives the logo an unmistakable chocolate-factory cue while staying scalable."],
    ],
    restaurant: [
      ["Chef Table Mark", "chef hat and plate silhouette with a subtle utensil detail", "warm hospitality wordmark", "charcoal, cream, copper", "centered restaurant emblem above type", "It reads clearly as a restaurant without relying on generic initials."],
      ["Signature Plate", "round plate mark with fork/knife negative space and ingredient accent", "premium menu-style typography", "black, ivory, muted gold", "plate icon plus clean wordmark", "It fits restaurants, catering, and food brands with a polished feel."],
      ["Neighborhood Kitchen", "simple storefront/plate symbol with steam line", "friendly bold sans", "deep green, cream, tomato accent", "stacked icon and wordmark", "It feels approachable, food-focused, and useful for signage and social."],
    ],
    automotive: [
      ["Motion Garage Mark", "car silhouette with speed line and wrench negative space", "bold mechanical sans", "black, white, racing red", "wide icon above strong wordmark", "It clearly signals auto service, detailing, or performance."],
      ["Detail Shield", "shield with tire curve, shine spark, and road line", "clean shop typography", "charcoal, silver, electric blue", "badge plus wordmark", "It feels trustworthy for a garage or detailing brand."],
      ["Roadline Wordmark", "minimal road curve forming a custom initial", "modern condensed sans", "navy, white, chrome accent", "horizontal lockup", "It keeps the mark automotive without looking like clip art."],
    ],
    healthcare: [
      ["Care Cross Mark", "soft medical cross with leaf or human curve", "clear trustworthy sans", "deep teal, white, calm blue", "symbol above clean wordmark", "It reads as health, care, and trust immediately."],
      ["Clinic Shield", "protective shield with pulse line and rounded cross", "professional clinic typography", "navy, white, aqua", "emblem and wordmark", "It fits clinics, dental offices, therapy, and healthcare services."],
      ["Wellness Pulse", "heart/pulse line forming a human movement arc", "friendly modern sans", "charcoal, white, green accent", "icon-left system", "It makes the brand feel human, calm, and credible."],
    ],
    finance: [
      ["Growth Pillar Mark", "upward bar, pillar, and coin-circle geometry", "authoritative serif or clean sans", "navy, white, muted gold", "stable icon above wordmark", "It communicates money, stability, and growth without generic dollar signs."],
      ["Capital Compass", "compass/arrow mark suggesting guidance and wealth planning", "premium finance wordmark", "black, ivory, brass", "symbol plus wordmark", "It fits advisors, accountants, funds, and tax brands."],
      ["Trust Ledger", "stacked lines forming a ledger and upward path", "precise professional type", "charcoal, white, blue accent", "horizontal lockup", "It feels practical and trustworthy for financial work."],
    ],
    education: [
      ["Learning Spark", "open book with spark or rising star", "friendly academic sans", "navy, cream, golden yellow", "book icon above name", "It clearly represents learning, tutoring, schools, or academies."],
      ["Academy Crest", "shield with book line and upward path", "classic academic serif", "deep green, ivory, gold", "crest and wordmark", "It gives education brands credibility and structure."],
      ["Bright Path", "pencil/path line forming a simple symbol", "modern rounded sans", "blue, white, sunshine accent", "icon-left lockup", "It feels approachable for kids, tutoring, and learning tools."],
    ],
    music: [
      ["Soundwave Mark", "waveform forming a custom initial or record groove", "bold creative sans", "black, white, electric purple", "large sound icon above type", "It instantly suggests music, audio, podcasting, or studio work."],
      ["Studio Disc", "vinyl/record circle with subtle play triangle", "modern entertainment typography", "charcoal, cream, neon accent", "disc symbol and wordmark", "It works for bands, DJs, studios, and audio brands."],
      ["Rhythm Signal", "equalizer bars forming a clean emblem", "condensed display type", "navy, white, cyan", "badge layout", "It communicates sound and energy without random shapes."],
    ],
    pet: [
      ["Companion Paw Mark", "paw print integrated with heart or friendly animal face", "warm rounded wordmark", "deep brown, cream, sage", "centered icon above name", "It clearly reads pet care, grooming, vet, or animal brand."],
      ["Pet Shield", "dog/cat silhouette in a soft protective badge", "friendly professional sans", "navy, white, soft green", "badge plus type", "It gives pet brands trust and warmth."],
      ["Tail Smile", "tail curve forming a smile and simple animal cue", "playful clean typography", "charcoal, cream, coral", "icon-left lockup", "It feels approachable and memorable for pet services."],
    ],
    fashion: [
      ["Boutique Monogram", "elegant initials with thread, hanger, gem, or fabric curve", "luxury editorial serif", "black, ivory, champagne", "monogram above refined wordmark", "It fits clothing, jewelry, boutiques, and lifestyle brands."],
      ["Runway Line", "minimal fabric fold or hanger line symbol", "high-end fashion sans", "charcoal, white, muted gold", "thin icon and wide type", "It feels premium and wearable across tags and packaging."],
      ["Street Label", "bold label mark with stitched edge detail", "strong streetwear display type", "black, white, sharp accent", "badge/label lockup", "It works for apparel and merch without generic icons."],
    ],
    cleaning: [
      ["Shine Drop Mark", "water drop with sparkle and clean sweep", "fresh trustworthy sans", "navy, white, aqua", "large icon above wordmark", "It signals cleaning, washing, and freshness clearly."],
      ["Clean Sweep Badge", "broom/sweep arc and star shine in a rounded badge", "friendly service typography", "teal, white, blue accent", "badge plus wordmark", "It feels reliable for home and commercial cleaning."],
      ["Pressure Wave", "water jet curve with motion line", "bold local-service sans", "black, white, bright blue", "horizontal mark", "It fits pressure washing, janitorial, and laundry services."],
    ],
    plumbing: [
      ["Pipe Drop Mark", "water drop and pipe elbow forming a bold service icon", "strong contractor sans", "navy, white, blue", "trade icon above wordmark", "It clearly communicates plumbing and water service."],
      ["Drain Flow Badge", "circular pipe flow with droplet center", "clean local-service typography", "charcoal, white, aqua", "badge lockup", "It fits repair, drains, and plumbing companies."],
      ["Wrench Waterline", "wrench shape blended with a wave line", "bold practical sans", "black, white, cyan", "wide symbol plus name", "It gives the trade a custom mark rather than generic initials."],
    ],
    electrical: [
      ["Power Bolt Mark", "lightning bolt and circuit path forming a strong icon", "bold technical sans", "black, white, electric yellow", "large icon and wordmark", "It instantly signals electrical, solar, energy, or lighting."],
      ["Circuit Shield", "shield with bolt and node details", "clean contractor wordmark", "navy, white, bright yellow", "badge above type", "It feels safe and professional for electrical services."],
      ["Energy Line", "minimal plug/bolt line forming an initial", "modern utility sans", "charcoal, white, cyan", "icon-left layout", "It works for power, solar, and service brands."],
    ],
    construction: [
      ["Builder Beam Mark", "beam, roofline, and block geometry", "strong contractor sans", "black, white, safety orange", "heavy icon above wordmark", "It represents building, remodeling, and construction clearly."],
      ["Craft Structure Badge", "framed structure with hammer/level negative space", "industrial display type", "charcoal, cream, brass", "badge plus wordmark", "It feels established and practical for contractors."],
      ["Concrete Grid", "block/grid mark with upward structure line", "modern trade typography", "navy, white, gray accent", "stacked lockup", "It makes the construction brand feel organized and credible."],
    ],
    travel: [
      ["Destination Compass", "compass, horizon, and route line", "premium hospitality serif", "deep blue, ivory, sun gold", "symbol above wordmark", "It suggests travel, resorts, tours, and memorable destinations."],
      ["Stay Marker", "map pin with house/hotel line and sun", "friendly hospitality sans", "green, cream, coral", "icon-left lockup", "It works for hotels, rentals, and destination brands."],
      ["Resort Horizon", "minimal wave/mountain/sun horizon", "clean elevated type", "black, ivory, gold", "wide landscape mark", "It feels calm and aspirational for hospitality."],
    ],
    nonprofit: [
      ["Community Hands Mark", "hands, heart, and circle of support", "warm trustworthy sans", "deep blue, cream, hopeful gold", "centered emblem above type", "It communicates care, community, and mission."],
      ["Foundation Spark", "star/heart rising from a simple pillar", "clear nonprofit typography", "charcoal, white, warm accent", "symbol plus wordmark", "It feels credible and optimistic for a foundation."],
      ["Circle of Impact", "interlocking circles forming a people/community mark", "modern approachable sans", "green, white, blue accent", "round emblem lockup", "It represents connection and shared purpose."],
    ],
    realestate: [
      ["Property Signature", "roofline, window, and location pin reduced into one clean property mark", "credible real estate sans or refined serif", "navy, ivory, muted gold", "large house mark above wordmark", "It instantly signals property and trust without looking like a stock house icon."],
      ["Modern Home Key", "key shape hidden inside a minimal home outline", "professional brokerage typography", "charcoal, white, blue accent", "horizontal lockup", "It ties home ownership and service together in a memorable symbol."],
      ["Neighborhood Crest", "street grid and roofline inside a restrained badge", "stable corporate wordmark", "deep green, cream, brass", "badge with readable name", "It works for realtors, brokerages, and property teams."],
    ],
    wellness: [
      ["Balanced Leaf Mark", "leaf and human arc forming a calm centered symbol", "soft editorial serif", "sage, ivory, charcoal", "quiet icon above refined type", "It communicates care, calm, and premium wellness."],
      ["Spa Monogram", "initials shaped with a subtle petal or water ripple", "elegant serif small caps", "cream, blush, deep green", "monogram-led lockup", "It feels boutique and personal rather than clinical."],
      ["Ritual Circle", "sun, leaf, and breath-line combined into one simple round mark", "warm modern sans", "stone, cream, muted gold", "round emblem with airy wordmark", "It gives the brand a calming ritual identity."],
    ],
    roofing: [
      ["Roofline Trust Mark", "roof pitch and shingle layers forming a bold contractor icon", "bold trade sans", "charcoal, white, safety orange", "heavy icon above wordmark", "It clearly says roofing and feels reliable for local service."],
      ["Storm Shield", "roofline inside a protective shield with rain-shedding angle", "strong service typography", "navy, white, steel blue", "shield plus wordmark", "It communicates protection without becoming generic."],
      ["Shingle Grid", "overlapping shingle pattern forming initials", "practical readable sans", "black, cream, muted gray", "pattern mark with name", "It makes the trade-specific material part of the identity."],
    ],
    landscaping: [
      ["Lawn Horizon", "leaf, horizon, and mower path reduced into a clean growth mark", "friendly service sans", "deep green, cream, sun gold", "landscape mark above name", "It communicates outdoor care and growth quickly."],
      ["Tree Path Emblem", "tree canopy with path negative space", "modern local-service wordmark", "forest green, white, earth brown", "emblem and wordmark", "It works for lawn, garden, and tree services."],
      ["Garden Line", "simple sprout and soil line forming a custom initial", "clean rounded sans", "sage, ivory, charcoal", "horizontal icon lockup", "It feels fresh and less generic than a plain leaf."],
    ],
    barber: [
      ["Cut & Comb Mark", "scissors and comb turned into a sharp monogram", "bold heritage display", "black, cream, brass", "badge or stacked wordmark", "It instantly reads barber while staying brandable."],
      ["Chair Crest", "barber chair silhouette with stripe-line detail", "vintage shop type", "charcoal, white, red accent", "crest above wordmark", "It feels like a real shop sign, not clipart."],
      ["Clean Fade Symbol", "fade gradient represented by three crisp geometry bars", "modern streetwear sans", "black, white, electric accent", "icon-left lockup", "It gives barbering a modern, wearable identity."],
    ],
    football: [
      ["Fantasy Shield", "football laces and draft-board geometry inside a competitive badge", "bold athletic sans", "midnight navy, white, turf green", "badge above team-style wordmark", "It connects fantasy football, competition, and league identity."],
      ["Gridiron Bolt", "football shape with speed line and scoreboard spark", "condensed sports typography", "black, white, electric gold", "large icon with compact name", "It feels energetic and social-profile ready."],
      ["League Monogram", "initials fused with football laces and yard-line stripes", "sports wordmark", "deep green, cream, orange accent", "monogram and wordmark", "It makes the brand/team name the hero."],
    ],
    hippo: [
      ["Hippo Mascot Mark", "friendly simplified hippo head reduced into a bold mascot silhouette", "rounded confident sans", "charcoal, cream, blue accent", "mascot above name", "It clearly shows the animal and keeps it usable as an icon."],
      ["Heavyweight Hippo", "hippo face with strong brow and simple geometric mouth", "bold sports-style type", "black, white, gold accent", "mascot badge lockup", "It gives the brand a memorable character without clutter."],
      ["Minimal Hippo Smile", "hippo snout and ears as two or three clean shapes", "playful modern sans", "deep gray, ivory, coral", "small icon with readable wordmark", "It feels friendly and less cartoonish."],
    ],
    "hippo-football": [
      ["Fantasy Hippo Badge", "hippo mascot wearing football-lace crown inside a team crest", "bold fantasy sports typography", "dark green, cream, gold", "large mascot crest above name", "It combines the animal and fantasy football instead of choosing only one."],
      ["Gridiron Hippo Mark", "hippo face merged with football oval and yard-line stripes", "condensed sports wordmark", "black, white, turf green", "mascot-led stacked logo", "It reads as both hippo and football at a glance."],
      ["League Mascot Lockup", "simple hippo head with draft-board spark and football laces", "athletic sans", "navy, white, orange accent", "icon left with wordmark", "It works for league apps, merch, and social avatars."],
    ],
    insurance: [
      ["Coverage Shield", "protective roof, check, and circle reduced into a trust mark", "authoritative serif/sans pairing", "navy, white, calm blue", "shield above stable wordmark", "It communicates protection and coverage without generic stock art."],
      ["Policy Compass", "compass and document corner forming a guidance symbol", "serious professional typography", "charcoal, ivory, gold accent", "symbol plus wordmark", "It fits an advisor-like insurance brand."],
      ["Risk Balance Mark", "balanced shapes forming a subtle safety net", "precise corporate sans", "deep blue, white, silver", "horizontal lockup", "It suggests protection, planning, and stability."],
    ],
    agency: [
      ["Creative Growth Spark", "cursor, spark, and upward brand-grid line fused into one mark", "modern studio sans", "ink black, white, signal blue", "icon-left product-style lockup", "It communicates creative work and measurable growth."],
      ["Brand System Mark", "modular blocks forming a custom initial and campaign grid", "clean geometric wordmark", "charcoal, ivory, vivid accent", "stacked logo system", "It feels like a modern branding or marketing agency."],
      ["Attention Loop", "eye/loop shape with small spark and message cue", "bold editorial sans", "black, white, coral accent", "large mark above name", "It signals advertising, attention, and brand presence."],
    ],
    security: [
      ["Sentinel Mark", "lock, shield, and watchful eye reduced into one serious symbol", "bold protective sans", "charcoal, white, signal red", "large protective icon above wordmark", "It communicates control and safety without cheap shield clipart."],
      ["Cyber Gate", "network nodes forming a locked gate silhouette", "technical sans", "deep navy, white, electric blue", "tech-security lockup", "It works for cybersecurity or physical security brands."],
      ["Perimeter Line", "corner brackets and protected center point", "strong contractor/corporate type", "black, ivory, red accent", "horizontal lockup", "It feels modern, scalable, and serious."],
    ],
    logistics: [
      ["Route Arrow Mark", "route line, package corner, and arrow merged into one motion symbol", "bold operational sans", "navy, white, route blue", "wide icon with name", "It shows delivery and movement instantly."],
      ["Freight Grid", "container/block grid with forward motion cut", "clean industrial typography", "charcoal, white, safety orange", "stacked trade mark", "It fits freight, transport, and shipping."],
      ["Fast Courier Loop", "location pin and speed loop forming a custom mark", "friendly service sans", "deep blue, cream, green accent", "icon-left lockup", "It feels fast and dependable."],
    ],
    gaming: [
      ["Esports Crest", "controller/visor shape reduced into a fierce team mark", "bold gaming sans", "black, white, electric violet", "crest above wordmark", "It gives the brand competitive gaming energy without messy effects."],
      ["Stream Signal", "play button, chat bubble, and lightning line fused into one mark", "sharp digital type", "midnight, white, neon cyan", "icon and wordmark", "It fits streaming and creator gaming brands."],
      ["Arcade Monogram", "initials built from pixel-grid corners and joystick negative space", "retrofuture display", "black, silver, hot pink", "monogram-led logo", "It feels game-native but still clean."],
    ],
    architecture: [
      ["Spatial Line Mark", "floorplan corner and doorway line forming a refined monogram", "minimal architectural sans", "charcoal, ivory, warm stone", "thin mark above wide wordmark", "It signals space, proportion, and design taste."],
      ["Studio Column Grid", "column/grid geometry with subtle perspective", "elevated serif/sans pairing", "black, white, muted gold", "structured icon and name", "It feels premium for architecture or interiors."],
      ["Interior Frame", "window/frame shape with negative-space room path", "clean editorial typography", "deep taupe, cream, black", "horizontal lockup", "It connects interiors and built environments."],
    ],
    cannabis: [
      ["Botanical Leaf Seal", "cannabis leaf simplified into a premium botanical emblem", "quiet serif or wellness sans", "deep green, cream, muted gold", "emblem above name", "It reflects the category clearly while avoiding head-shop clutter."],
      ["Dispensary Monogram", "initials with a subtle leaf vein and sun arc", "premium modern serif", "forest green, ivory, copper", "monogram-led lockup", "It feels elevated, regulated, and retail-ready."],
      ["Hemp Line Mark", "single leaf line and circle of care", "clean wellness typography", "sage, cream, charcoal", "simple icon-left logo", "It keeps the plant cue refined and scalable."],
    ],
    tattoo: [
      ["Flash Rose Dagger", "traditional tattoo rose and dagger simplified into a bold ink mark", "ornamental vintage display type", "black, cream, red accent", "large flash-style symbol above wordmark", "It reads tattoo studio instantly without becoming a messy illustration."],
      ["Ink Needle Crest", "needle, ink drop, and banner geometry reduced into a shop crest", "bold tattoo display lettering", "charcoal, ivory, oxblood", "crest with readable name", "It feels like a real tattoo shop identity and works on signage."],
      ["Blackwork Monogram", "initials built from sharp linework and subtle flash rays", "heavy handcrafted wordmark", "black, white, muted red", "monogram-led logo", "It gives the studio a custom mark that avoids generic skull clipart."],
    ],
  };

  const fallback = [
    ["Meaning-First Mark", "custom symbol based on the strongest nouns in the brand request", profile.isLuxury ? "premium serif or refined sans" : "clean bold wordmark", "black, white, one meaningful accent", "symbol above or beside wordmark", "It avoids random icons by anchoring the mark to the brand’s actual words."],
    ["Wordmark System", "distinct typography with a subtle embedded symbol", "customized readable type", "brand-appropriate restrained palette", "wordmark-led layout", "It keeps the brand name clear while adding ownable visual detail."],
    ["Category Emblem", "simple emblem built from the category and audience cues", "balanced display type", "high-contrast palette", "emblem and wordmark", "It makes the logo usable on websites, social, and merchandise."],
  ];

  return libraries[subject] || fallback;
}

function buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory }) {
  const pipeline = runLogoGenerationPipeline({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory });
  const styleText = pipeline.styles.map((style) => style.key).join(", ") || "professional";

  return {
    brandName: pipeline.brandName,
    category: pipeline.category,
    personality: pipeline.personalitySummary || styleText,
    personalityMatrix: pipeline.personalityMatrix,
    personalityDirectives: pipeline.personalityDirectives,
    humanDesign: pipeline.humanDesign,
    trendIntelligence: pipeline.trendIntelligence,
    generationMemory: pipeline.generationMemory,
    creativeDirectorReview: pipeline.creativeDirectorGate,
    targetAudience: pipeline.targetAudience,
    visualTerritory: pipeline.concepts.map((concept) => concept.name).join(", "),
    avoid: logoAvoid || "Avoid random generic icons, misspelled text, crowded clip-art, and visuals unrelated to the brand words.",
    concepts: pipeline.concepts,
    pipeline: pipeline.pipeline,
    scores: pipeline.scores,
    styles: pipeline.styles,
    typographySystem: pipeline.typographySystem,
    iconSystem: pipeline.iconSystem,
  };
}

function getStyleProfile({ logoStyle = "", logoIndustry = "", userPrompt = "" }) {
  const text = `${logoStyle} ${logoIndustry} ${userPrompt}`.toLowerCase();
  return {
    isLuxury: /(luxury|premium|high.?end|elegant|editorial)/.test(text),
    isBold: /(bold|strong|mascot|aggressive|sport|sports|competitive)/.test(text),
    isMinimal: /(minimal|simple|clean|modern|professional)/.test(text),
    isVintage: /(vintage|retro|heritage|classic|badge)/.test(text),
    isTrade: /(stucco|plaster|plastering|drywall|roof|roofing|landscape|lawn|contractor|construction|barber|salon)/.test(text),
  };
}

function getPlasteringMark({ ink, accent, paper, initials, variant = 0, profile = {} }) {
  if (variant === 3) {
    return `
      <g transform="translate(0 -8)">
        <path d="M324 428 C338 284 452 206 610 238" fill="none" stroke="${ink}" stroke-width="58" stroke-linecap="round"/>
        <path d="M356 438 C442 354 560 324 708 352" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
        <path d="M360 542 C488 478 626 478 752 532" fill="none" stroke="${ink}" stroke-width="30" stroke-linecap="round"/>
        <text x="520" y="450" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="118" font-weight="900" fill="${ink}" letter-spacing="-7">${escapeXml(initials.slice(0, 2))}</text>
        <path d="M650 244 L776 370" stroke="${ink}" stroke-width="24" stroke-linecap="round"/>
        <path d="M758 352 L838 272" stroke="${accent}" stroke-width="30" stroke-linecap="round"/>
      </g>
    `;
  }

  if (variant === 4) {
    return `
      <g transform="translate(0 -18)">
        <path d="M256 518 H768" stroke="${ink}" stroke-width="32" stroke-linecap="round"/>
        <path d="M300 448 C414 358 564 318 742 342" fill="none" stroke="${ink}" stroke-width="54" stroke-linecap="round"/>
        <path d="M320 446 C448 384 574 366 714 382" fill="none" stroke="${paper}" stroke-width="18" stroke-linecap="round" opacity=".94"/>
        <path d="M602 286 L740 424 L704 460 L566 322 Z" fill="${paper}"/>
        <path d="M720 404 L814 310" stroke="${accent}" stroke-width="42" stroke-linecap="round"/>
        <path d="M336 590 H688" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
      </g>
    `;
  }

  if (variant === 5) {
    return `
      <g transform="translate(0 -18)">
        <rect x="270" y="204" width="484" height="370" rx="34" fill="${ink}"/>
        <rect x="312" y="252" width="400" height="274" rx="22" fill="${paper}"/>
        <path d="M358 352 C462 298 574 296 674 340" fill="none" stroke="${ink}" stroke-width="24" stroke-linecap="round"/>
        <path d="M358 424 C464 376 574 374 668 410" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
        <path d="M626 452 L778 300" stroke="${ink}" stroke-width="34" stroke-linecap="round"/>
        <path d="M758 320 L828 250" stroke="${accent}" stroke-width="38" stroke-linecap="round"/>
      </g>
    `;
  }

  if (variant === 1) {
    return `
      <g transform="translate(0 -8)">
        <path d="M272 438 C354 294 514 230 742 258 C660 340 526 398 324 450 Z" fill="${ink}"/>
        <path d="M316 418 C436 352 566 326 710 334" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
        <path d="M596 226 L736 366 L704 398 L564 258 Z" fill="${paper}"/>
        <path d="M714 346 L816 244 Q846 214 876 244 Q904 272 874 302 L772 404 Z" fill="${ink}"/>
        <path d="M792 270 L846 324" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
        <path d="M292 536 H738 M336 592 H694" stroke="${ink}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (variant === 2) {
    return `
      <g transform="translate(0 -16)">
        <rect x="300" y="222" width="424" height="322" rx="38" fill="${paper}" stroke="${ink}" stroke-width="22"/>
        <path d="M360 314 C456 276 566 276 664 316" fill="none" stroke="${ink}" stroke-width="18" stroke-linecap="round"/>
        <path d="M350 398 C470 342 598 344 694 390" fill="none" stroke="${accent}" stroke-width="26" stroke-linecap="round"/>
        <path d="M370 470 H650" stroke="${ink}" stroke-width="16" stroke-linecap="round"/>
        <path d="M632 478 L792 318 L836 362 L676 522 Z" fill="${ink}"/>
        <path d="M788 318 L854 252 Q878 228 902 252 Q924 274 900 298 L834 364 Z" fill="${accent}"/>
      </g>
    `;
  }

  if (profile.isLuxury) {
    return `
      <g transform="translate(0 -20)">
        <path d="M296 460 C410 314 574 284 748 346" fill="none" stroke="${ink}" stroke-width="44" stroke-linecap="round"/>
        <path d="M316 458 C434 388 558 368 714 392" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
        <path d="M572 274 L724 426" stroke="${ink}" stroke-width="34" stroke-linecap="round"/>
        <path d="M706 408 L820 294" stroke="${accent}" stroke-width="38" stroke-linecap="round"/>
        <text x="398" y="416" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="142" font-weight="900" fill="${ink}" letter-spacing="-8">${escapeXml(initials.slice(0, 1))}</text>
      </g>
    `;
  }

  return `
    <g transform="translate(0 -12)">
      <path d="M252 456 C366 322 536 268 780 316 C690 398 540 472 306 548 Z" fill="${ink}"/>
      <path d="M306 472 C430 394 574 358 748 378" fill="none" stroke="${accent}" stroke-width="26" stroke-linecap="round"/>
      <path d="M588 244 L738 394 L700 432 L550 282 Z" fill="${paper}"/>
      <path d="M716 374 L820 270 Q852 238 884 270 Q914 300 882 332 L778 436 Z" fill="${ink}"/>
      <path d="M326 594 H698" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
      <path d="M386 650 H638" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
    </g>
  `;
}

function getBrandableSubjectMark({ subject, ink, accent, paper, initials, variant = 0, iconSystem = ICON_CREATIVITY_SYSTEMS.negativeSpace }) {
  const mode = iconSystem.mode || "negative-space";

  if (subject === "pizza") {
    if (variant === 1 || mode === "editorial-emblem") {
      return `
        <g transform="translate(0 -18)">
          <circle cx="512" cy="400" r="196" fill="${ink}"/>
          <path d="M512 238 A162 162 0 1 1 350 400 L512 400 Z" fill="${paper}"/>
          <path d="M512 288 L662 566 H362 Z" fill="${ink}"/>
          <path d="M418 520 Q512 470 606 520" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
          <circle cx="486" cy="392" r="17" fill="${accent}"/>
          <circle cx="552" cy="462" r="15" fill="${accent}"/>
          <path d="M512 238 C560 274 594 314 612 360" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
        </g>
      `;
    }
    return `
      <g transform="translate(0 -18)">
        <path d="M512 198 C642 276 728 410 758 586 H266 C296 410 382 276 512 198 Z" fill="${ink}"/>
        <path d="M512 274 C604 344 658 442 682 548 H342 C366 442 420 344 512 274 Z" fill="${paper}"/>
        <path d="M374 542 C448 498 576 498 650 542" fill="none" stroke="${accent}" stroke-width="25" stroke-linecap="round"/>
        <circle cx="470" cy="398" r="24" fill="${accent}"/>
        <circle cx="568" cy="462" r="21" fill="${accent}"/>
        <circle cx="444" cy="492" r="17" fill="${accent}"/>
      </g>
    `;
  }

  if (subject === "restaurant") {
    if (variant === 1) {
      return `
        <g transform="translate(0 -18)">
          <path d="M294 518 C360 366 466 288 512 288 C558 288 664 366 730 518 Z" fill="${ink}"/>
          <path d="M370 492 C428 414 596 414 654 492" fill="none" stroke="${paper}" stroke-width="28" stroke-linecap="round"/>
          <path d="M416 342 C430 296 458 260 512 238 C566 260 594 296 608 342" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
          <path d="M338 594 H686" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
        </g>
      `;
    }
    if (variant === 2) {
      return `
        <g transform="translate(0 -18)">
          <circle cx="512" cy="402" r="188" fill="${ink}"/>
          <path d="M384 402 C448 312 576 312 640 402 C580 462 444 462 384 402 Z" fill="${paper}"/>
          <path d="M448 394 H576" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
          <path d="M512 272 V528" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
          <path d="M350 596 H674" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
        </g>
      `;
    }
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="404" r="196" fill="${ink}"/>
        <circle cx="512" cy="404" r="122" fill="${paper}"/>
        <path d="M512 282 C574 312 604 360 604 416 C558 388 512 382 420 420 C438 356 470 310 512 282 Z" fill="${accent}"/>
        <path d="M382 568 C454 524 570 524 642 568" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
        <path d="M396 288 V506" stroke="${paper}" stroke-width="24" stroke-linecap="round"/>
        <path d="M628 284 V506 C704 440 704 348 628 284 Z" fill="${paper}"/>
      </g>
    `;
  }

  if (subject === "tech") {
    if (variant === 1) {
      return `
        <g transform="translate(0 -18)">
          <path d="M512 198 L714 316 V552 L512 670 L310 552 V316 Z" fill="${ink}"/>
          <path d="M394 480 C452 356 578 322 662 406" fill="none" stroke="${paper}" stroke-width="28" stroke-linecap="round"/>
          <circle cx="394" cy="480" r="20" fill="${accent}"/>
          <circle cx="512" cy="366" r="20" fill="${accent}"/>
          <circle cx="662" cy="406" r="20" fill="${accent}"/>
          <path d="M394 480 L512 366 L662 406" fill="none" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>
        </g>
      `;
    }
    if (variant === 2) {
      return `
        <g transform="translate(0 -18)">
          <rect x="306" y="226" width="412" height="330" rx="64" fill="${ink}"/>
          <path d="M408 416 H616 M512 312 V520" stroke="${paper}" stroke-width="30" stroke-linecap="round"/>
          <path d="M408 416 C466 356 558 356 616 416 C558 476 466 476 408 416 Z" fill="none" stroke="${accent}" stroke-width="22"/>
          <circle cx="512" cy="416" r="32" fill="${accent}"/>
          <path d="M350 626 H674" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
        </g>
      `;
    }
    return `
      <g transform="translate(0 -18)">
        <rect x="320" y="206" width="384" height="384" rx="96" fill="${ink}"/>
        <path d="M402 402 C454 314 570 286 646 350 C574 350 524 390 498 468 C464 440 432 418 402 402 Z" fill="${paper}"/>
        <circle cx="420" cy="402" r="19" fill="${accent}"/>
        <circle cx="646" cy="350" r="19" fill="${accent}"/>
        <circle cx="498" cy="468" r="19" fill="${accent}"/>
        <path d="M420 402 L646 350 L498 468 Z" fill="none" stroke="${accent}" stroke-width="15" stroke-linejoin="round"/>
      </g>
    `;
  }

  if (subject === "law" || subject === "finance") {
    if (variant === 1) {
      return `
        <g transform="translate(0 -20)">
          <path d="M310 574 H714" stroke="${ink}" stroke-width="30" stroke-linecap="round"/>
          <path d="M512 218 L682 334 H342 Z" fill="${ink}"/>
          <path d="M390 376 H438 V548 H390 Z M488 376 H536 V548 H488 Z M586 376 H634 V548 H586 Z" fill="${ink}"/>
          <path d="M360 342 H664" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
          <path d="M438 622 H586" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
        </g>
      `;
    }
    if (variant === 2) {
      return `
        <g transform="translate(0 -20)">
          <circle cx="512" cy="410" r="190" fill="${ink}"/>
          <path d="M400 428 H624" stroke="${paper}" stroke-width="28" stroke-linecap="round"/>
          <path d="M512 302 V536" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
          <path d="M404 352 L512 286 L620 352" fill="none" stroke="${paper}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M388 592 H636" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
        </g>
      `;
    }
    return `
      <g transform="translate(0 -20)">
        <path d="M512 206 L724 322 V538 L512 650 L300 538 V322 Z" fill="${ink}"/>
        <path d="M386 342 H638 M422 402 H602 M456 462 H568" stroke="${paper}" stroke-width="26" stroke-linecap="round"/>
        <path d="M512 276 V568" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
        <path d="M390 588 H634" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "insurance" || subject === "security") {
    return `
      <g transform="translate(0 -20)">
        <path d="M512 202 L734 300 V446 C734 558 642 626 512 672 C382 626 290 558 290 446 V300 Z" fill="${ink}"/>
        <path d="M390 418 L474 502 L648 330" fill="none" stroke="${paper}" stroke-width="40" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M512 252 L674 324" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
        <path d="M368 610 H656" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "agency") {
    return `
      <g transform="translate(0 -18)">
        <rect x="318" y="220" width="388" height="342" rx="82" fill="${ink}"/>
        <path d="M402 430 C472 332 576 318 652 382 C576 392 528 442 500 520 C466 484 432 452 402 430 Z" fill="${paper}"/>
        <path d="M642 258 L670 318 L736 330 L684 372 L700 436 L642 402 L584 436 L600 372 L548 330 L614 318 Z" fill="${accent}"/>
        <path d="M356 624 H668" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "logistics") {
    return `
      <g transform="translate(0 -18)">
        <path d="M280 422 H610" stroke="${ink}" stroke-width="58" stroke-linecap="round"/>
        <path d="M590 300 L768 422 L590 544" fill="none" stroke="${ink}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M330 336 H486 M300 506 H512" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
        <rect x="344" y="370" width="176" height="104" rx="20" fill="${paper}"/>
        <path d="M370 622 H668" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "gaming") {
    return `
      <g transform="translate(0 -18)">
        <path d="M512 204 L716 314 V544 L512 662 L308 544 V314 Z" fill="${ink}"/>
        <path d="M394 432 H630" stroke="${paper}" stroke-width="34" stroke-linecap="round"/>
        <path d="M448 374 V490 M576 374 V490" stroke="${accent}" stroke-width="26" stroke-linecap="round"/>
        <path d="M420 322 L512 270 L604 322" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M382 610 H642" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "architecture") {
    return `
      <g transform="translate(0 -18)">
        <path d="M332 570 V286 H692 V570" fill="none" stroke="${ink}" stroke-width="36" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M390 348 H634 V512 H458 V420 H634" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M332 626 H692" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "cannabis") {
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="410" r="190" fill="${ink}"/>
        <path d="M512 252 C552 352 622 386 704 374 C642 438 612 508 620 584 C564 522 512 498 512 498 C512 498 460 522 404 584 C412 508 382 438 320 374 C402 386 472 352 512 252 Z" fill="${paper}"/>
        <path d="M512 306 V560" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
        <path d="M370 620 H654" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "tattoo") {
    return `
      <g transform="translate(0 -18)">
        <path d="M512 208 C590 306 662 354 758 372 C672 426 628 510 640 612 C572 548 512 526 512 526 C512 526 452 548 384 612 C396 510 352 426 266 372 C362 354 434 306 512 208 Z" fill="${ink}"/>
        <path d="M512 300 L560 408 L678 420 L586 492 L616 606 L512 546 L408 606 L438 492 L346 420 L464 408 Z" fill="${paper}"/>
        <path d="M378 638 H646" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "fashion" || subject === "wedding-photo" || subject === "wellness") {
    return `
      <g transform="translate(0 -18)">
        <path d="M512 214 C646 314 674 470 512 618 C350 470 378 314 512 214 Z" fill="${ink}"/>
        <path d="M512 264 C566 344 574 460 512 552 C450 460 458 344 512 264 Z" fill="${paper}"/>
        <path d="M414 416 C470 350 554 350 610 416" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
        <path d="M430 604 C490 562 534 562 594 604" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "ranch") {
    return `
      <g transform="translate(0 -20)">
        <path d="M290 514 C374 346 506 272 704 312 C640 380 574 442 542 562 C458 502 374 492 290 514 Z" fill="${ink}"/>
        <path d="M384 424 C466 350 564 332 666 360" fill="none" stroke="${accent}" stroke-width="21" stroke-linecap="round"/>
        <path d="M414 338 L486 246 L514 378 M594 338 L702 266 L658 408" fill="none" stroke="${ink}" stroke-width="25" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M336 608 H704" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "plastering" || subject === "construction") {
    return `
      <g transform="translate(0 -16)">
        <path d="M274 498 C400 326 562 280 754 344 C654 412 550 472 438 588 C378 548 324 518 274 498 Z" fill="${ink}"/>
        <path d="M334 482 C458 392 586 358 724 382" fill="none" stroke="${accent}" stroke-width="26" stroke-linecap="round"/>
        <path d="M602 270 L750 418 L704 464 L556 316 Z" fill="${paper}"/>
        <path d="M730 398 L836 292" stroke="${ink}" stroke-width="36" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "automotive") {
    return `
      <g transform="translate(0 -18)">
        <path d="M276 480 C356 326 500 286 666 356 C724 380 766 422 804 478 C706 450 606 452 512 520 C430 470 350 464 276 480 Z" fill="${ink}"/>
        <path d="M352 460 C450 382 578 364 704 410" fill="none" stroke="${accent}" stroke-width="25" stroke-linecap="round"/>
        <circle cx="412" cy="540" r="38" fill="${paper}" stroke="${ink}" stroke-width="20"/>
        <circle cx="662" cy="540" r="38" fill="${paper}" stroke="${ink}" stroke-width="20"/>
      </g>
    `;
  }

  if (subject === "fitness") {
    return `
      <g transform="translate(0 -18)">
        <path d="M322 522 C414 324 600 280 730 438 C636 412 566 446 520 562 C458 496 390 492 322 522 Z" fill="${ink}"/>
        <path d="M392 476 L474 356 L538 500 L626 388" fill="none" stroke="${accent}" stroke-width="32" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M350 612 H700" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
      </g>
    `;
  }

  if (variant === 2 || mode === "monogram-fusion") {
    return `
      <g transform="translate(0 -18)">
        <path d="M512 204 L708 316 V544 L512 656 L316 544 V316 Z" fill="${ink}"/>
        <path d="M394 478 C440 366 584 338 650 426 C588 420 548 452 512 536 C476 474 434 462 394 478 Z" fill="${paper}"/>
        <text x="512" y="444" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="102" font-weight="900" fill="${accent}" letter-spacing="1">${escapeXml(initials.slice(0, 2))}</text>
      </g>
    `;
  }

  return null;
}

function buildSubjectMark({ subject, ink, accent, paper, initials, variant = 0, profile = {}, iconSystem = ICON_CREATIVITY_SYSTEMS.negativeSpace }) {
  const brandableMark = getBrandableSubjectMark({ subject, ink, accent, paper, initials, variant, iconSystem });
  if (brandableMark) return brandableMark;

  if (subject === "plastering") {
    return getPlasteringMark({ ink, accent, paper, initials, variant, profile });
  }

  if (subject === "roofing") {
    return `
      <path d="M244 430 L512 216 L780 430" fill="none" stroke="${ink}" stroke-width="48" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M332 454 H692 V590 H332 Z" fill="${ink}"/>
      <path d="M390 500 H634 M390 548 H634" stroke="${paper}" stroke-width="16" stroke-linecap="round"/>
      <path d="M244 430 L512 216 L780 430" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
    `;
  }

  if (subject === "landscaping") {
    return `
      <circle cx="512" cy="390" r="168" fill="${ink}"/>
      <path d="M512 246 C612 344 608 480 512 588 C416 480 412 344 512 246 Z" fill="${paper}"/>
      <path d="M512 286 C468 390 472 492 512 568 C552 492 556 390 512 286 Z" fill="${accent}"/>
      <path d="M352 602 C438 548 586 548 672 602" fill="none" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
    `;
  }

  if (subject === "barber") {
    return `
      <circle cx="512" cy="396" r="170" fill="${ink}"/>
      <path d="M392 310 L642 560 M642 310 L392 560" stroke="${paper}" stroke-width="26" stroke-linecap="round"/>
      <circle cx="390" cy="310" r="42" fill="none" stroke="${accent}" stroke-width="18"/>
      <circle cx="636" cy="310" r="42" fill="none" stroke="${accent}" stroke-width="18"/>
      <path d="M416 584 H608" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
    `;
  }

  if (subject === "hippo-football") {
    return `
      <ellipse cx="512" cy="356" rx="226" ry="158" fill="${ink}"/>
      <path d="M312 316 Q512 168 712 316 Q684 220 512 198 Q340 220 312 316 Z" fill="${accent}"/>
      <path d="M344 318 Q512 230 680 318" fill="none" stroke="${paper}" stroke-width="14" stroke-linecap="round"/>
      <path d="M512 190 V300 M460 214 L460 294 M564 214 L564 294" stroke="${paper}" stroke-width="10" stroke-linecap="round"/>
      <circle cx="370" cy="250" r="50" fill="${ink}"/>
      <circle cx="654" cy="250" r="50" fill="${ink}"/>
      <ellipse cx="512" cy="418" rx="174" ry="92" fill="${paper}" opacity="0.97"/>
      <circle cx="454" cy="398" r="14" fill="${ink}"/>
      <circle cx="570" cy="398" r="14" fill="${ink}"/>
      <path d="M452 454 Q512 486 572 454" fill="none" stroke="${ink}" stroke-width="15" stroke-linecap="round"/>
      <text x="512" y="610" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="76" font-weight="900" fill="${ink}" letter-spacing="2">${escapeXml(initials.slice(0, 3))}</text>
    `;
  }

  if (subject === "hippo") {
    return `
      <ellipse cx="512" cy="352" rx="210" ry="154" fill="${ink}"/>
      <circle cx="380" cy="236" r="54" fill="${ink}"/>
      <circle cx="644" cy="236" r="54" fill="${ink}"/>
      <circle cx="398" cy="247" r="24" fill="${accent}"/>
      <circle cx="626" cy="247" r="24" fill="${accent}"/>
      <ellipse cx="512" cy="406" rx="170" ry="92" fill="${paper}" opacity="0.96"/>
      <circle cx="456" cy="390" r="14" fill="${ink}"/>
      <circle cx="568" cy="390" r="14" fill="${ink}"/>
      <path d="M455 446 Q512 482 569 446" fill="none" stroke="${ink}" stroke-width="15" stroke-linecap="round"/>
      <path d="M318 352 Q512 170 706 352" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
    `;
  }

  if (subject === "football") {
    return `
      <ellipse cx="512" cy="350" rx="244" ry="138" fill="${ink}" transform="rotate(-12 512 350)"/>
      <path d="M326 389 Q512 258 698 311" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
      <path d="M468 315 L558 386" stroke="${paper}" stroke-width="13" stroke-linecap="round"/>
      <path d="M486 327 L463 356 M508 344 L485 373 M530 361 L507 390" stroke="${paper}" stroke-width="8" stroke-linecap="round"/>
      <text x="512" y="382" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="76" font-weight="900" fill="${paper}" letter-spacing="2">${escapeXml(initials.slice(0, 3))}</text>
    `;
  }

  if (subject === "ranch") {
    if (variant === 1) {
      return `
        <g transform="translate(0 -10)">
          <path d="M260 486 C344 366 448 308 570 318 C660 326 736 380 782 470" fill="none" stroke="${ink}" stroke-width="38" stroke-linecap="round"/>
          <path d="M342 492 C432 432 582 420 692 476" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
          <path d="M344 332 C420 254 532 238 628 294" fill="none" stroke="${ink}" stroke-width="26" stroke-linecap="round"/>
          <path d="M608 288 L690 234 L672 330" fill="${ink}"/>
          <path d="M362 612 H734 M412 664 H682" stroke="${ink}" stroke-width="18" stroke-linecap="round"/>
        </g>
      `;
    }
    if (variant === 2) {
      return `
        <g transform="translate(0 -18)">
          <path d="M286 560 H738" stroke="${ink}" stroke-width="24" stroke-linecap="round"/>
          <path d="M330 520 C426 390 586 350 720 430" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
          <path d="M388 432 C418 324 520 276 628 318 C576 356 520 398 474 478" fill="${ink}"/>
          <circle cx="506" cy="360" r="12" fill="${paper}"/>
          <path d="M416 318 L470 244 L500 344 M604 316 L686 252 L656 358" fill="none" stroke="${ink}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
        </g>
      `;
    }
    return `
      <circle cx="512" cy="346" r="184" fill="${ink}"/>
      <path d="M360 390 Q436 258 548 288 Q638 308 696 390" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      <path d="M416 430 Q512 360 608 430" fill="none" stroke="${paper}" stroke-width="18" stroke-linecap="round"/>
      <path d="M432 320 Q474 276 524 304 Q562 326 594 300" fill="none" stroke="${paper}" stroke-width="18" stroke-linecap="round"/>
      <circle cx="462" cy="342" r="14" fill="${paper}"/>
      <circle cx="564" cy="342" r="14" fill="${paper}"/>
    `;
  }

  if (subject === "coffee") {
    return `
      <circle cx="512" cy="350" r="190" fill="${ink}"/>
      <path d="M420 320 H570 Q628 320 628 378 Q628 436 570 436 H420 Z" fill="${paper}"/>
      <path d="M572 348 H620 Q660 348 660 386 Q660 424 620 424 H574" fill="none" stroke="${paper}" stroke-width="20"/>
      <path d="M444 286 Q470 250 448 218 M512 286 Q540 248 516 214 M580 286 Q606 250 584 218" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>
    `;
  }

  if (subject === "chocolate") {
    if (variant === 1) {
      return `
        <g transform="translate(0 -18)">
          <rect x="330" y="236" width="364" height="312" rx="52" fill="${ink}"/>
          <path d="M330 340 H694 M452 236 V548 M572 236 V548" stroke="${paper}" stroke-width="18" opacity=".88"/>
          <path d="M386 610 C442 536 580 536 636 610" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
          <path d="M424 278 C482 214 552 214 612 278" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
        </g>
      `;
    }
    return `
      <g transform="translate(0 -16)">
        <rect x="332" y="254" width="360" height="278" rx="46" fill="${ink}"/>
        <rect x="382" y="302" width="86" height="72" rx="18" fill="${paper}" opacity=".92"/>
        <rect x="498" y="302" width="86" height="72" rx="18" fill="${paper}" opacity=".92"/>
        <rect x="556" y="406" width="86" height="72" rx="18" fill="${paper}" opacity=".92"/>
        <path d="M354 584 C438 514 586 518 672 584" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
        <path d="M440 206 C496 154 574 160 626 220 C552 230 492 256 440 316 C426 270 420 234 440 206 Z" fill="${accent}"/>
      </g>
    `;
  }

  if (subject === "pizza") {
    if (variant === 1) {
      return `
        <g transform="translate(0 -16)">
          <circle cx="512" cy="388" r="190" fill="${ink}"/>
          <path d="M512 226 A162 162 0 1 1 350 388 H512 Z" fill="${paper}"/>
          <path d="M512 246 A142 142 0 1 1 370 388 H512 Z" fill="${accent}"/>
          <path d="M512 286 L686 588 L338 588 Z" fill="${paper}" stroke="${ink}" stroke-width="18" stroke-linejoin="round"/>
          <circle cx="490" cy="404" r="18" fill="${accent}"/><circle cx="558" cy="486" r="18" fill="${accent}"/><circle cx="448" cy="520" r="16" fill="${accent}"/>
        </g>
      `;
    }
    return `
      <g transform="translate(0 -18)">
        <path d="M512 210 L768 618 H256 Z" fill="${ink}" stroke="${ink}" stroke-width="18" stroke-linejoin="round"/>
        <path d="M512 262 L704 580 H320 Z" fill="${paper}"/>
        <path d="M350 552 Q512 492 674 552" fill="none" stroke="${accent}" stroke-width="28" stroke-linecap="round"/>
        <circle cx="486" cy="386" r="24" fill="${accent}"/><circle cx="576" cy="462" r="22" fill="${accent}"/><circle cx="438" cy="492" r="20" fill="${accent}"/>
        <path d="M440 306 Q512 270 584 306" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "restaurant") {
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="402" r="178" fill="${ink}"/>
        <circle cx="512" cy="402" r="112" fill="${paper}"/>
        <path d="M392 542 V280 M632 542 V278 M632 278 C690 330 690 430 632 472" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
        <path d="M438 292 V404 M482 292 V404 M526 292 V404 M438 404 Q482 450 526 404" fill="none" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
        <path d="M438 604 H586" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "realestate") {
    return `
      <rect x="344" y="338" width="336" height="198" rx="18" fill="${ink}"/>
      <path d="M318 350 L512 206 L706 350" fill="none" stroke="${accent}" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="468" y="420" width="88" height="116" rx="8" fill="${paper}"/>
    `;
  }

  if (subject === "wellness") {
    return `
      <circle cx="512" cy="356" r="184" fill="${ink}"/>
      <path d="M512 254 C620 282 660 402 512 506 C364 402 404 282 512 254 Z" fill="${paper}"/>
      <path d="M512 276 C470 344 472 420 512 492 C552 420 554 344 512 276 Z" fill="${accent}"/>
    `;
  }

  if (subject === "surf") {
    return `
      <g transform="translate(0 -18)">
        <path d="M252 504 C354 310 594 262 752 392 C636 368 540 414 504 514 C592 484 684 500 766 574 C588 640 370 604 252 504 Z" fill="${ink}"/>
        <path d="M336 488 C464 380 590 360 708 420" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
        <path d="M380 598 H690" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "law") {
    return `
      <g transform="translate(0 -24)">
        <path d="M292 300 H732" stroke="${ink}" stroke-width="34" stroke-linecap="round"/>
        <path d="M334 300 L512 206 L690 300" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="350" y="342" width="50" height="194" rx="8" fill="${ink}"/>
        <rect x="472" y="342" width="50" height="194" rx="8" fill="${ink}"/>
        <rect x="594" y="342" width="50" height="194" rx="8" fill="${ink}"/>
        <path d="M312 570 H712 M270 628 H754" stroke="${ink}" stroke-width="30" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "wedding-photo") {
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="396" r="168" fill="${ink}"/>
        <circle cx="512" cy="396" r="78" fill="${paper}"/>
        <path d="M512 246 C610 278 648 352 632 444 C568 412 514 364 512 246 Z" fill="${accent}"/>
        <path d="M512 246 C416 282 376 356 394 448 C458 410 510 360 512 246 Z" fill="${paper}" opacity=".96"/>
        <path d="M430 592 C512 520 594 520 676 592" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "fitness") {
    return `
      <g transform="translate(0 -14)">
        <path d="M300 482 C400 300 598 276 724 438" fill="none" stroke="${ink}" stroke-width="54" stroke-linecap="round"/>
        <path d="M382 468 L474 352 L538 484 L616 380 L710 500" fill="none" stroke="${accent}" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M338 594 H706" stroke="${ink}" stroke-width="24" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "automotive") {
    return `
      <g transform="translate(0 -18)">
        <path d="M268 458 C326 338 430 294 552 314 C642 328 724 378 782 462" fill="none" stroke="${ink}" stroke-width="48" stroke-linecap="round"/>
        <path d="M338 464 H742" stroke="${ink}" stroke-width="54" stroke-linecap="round"/>
        <circle cx="398" cy="530" r="44" fill="${paper}" stroke="${ink}" stroke-width="22"/>
        <circle cx="680" cy="530" r="44" fill="${paper}" stroke="${ink}" stroke-width="22"/>
        <path d="M304 606 H728" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "healthcare") {
    return `
      <g transform="translate(0 -18)">
        <rect x="352" y="212" width="320" height="320" rx="78" fill="${ink}"/>
        <path d="M512 286 V458 M426 372 H598" stroke="${paper}" stroke-width="58" stroke-linecap="round"/>
        <path d="M338 610 C430 528 594 528 686 610" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "finance") {
    return `
      <g transform="translate(0 -18)">
        <path d="M318 568 H722" stroke="${ink}" stroke-width="28" stroke-linecap="round"/>
        <rect x="352" y="420" width="66" height="148" rx="10" fill="${ink}"/>
        <rect x="480" y="344" width="66" height="224" rx="10" fill="${ink}"/>
        <rect x="608" y="260" width="66" height="308" rx="10" fill="${ink}"/>
        <path d="M340 328 L492 270 L634 190 L716 238" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    `;
  }

  if (subject === "education") {
    return `
      <g transform="translate(0 -20)">
        <path d="M272 342 C360 300 438 300 512 356 C586 300 664 300 752 342 V584 C664 542 586 542 512 598 C438 542 360 542 272 584 Z" fill="${ink}"/>
        <path d="M512 356 V598" stroke="${paper}" stroke-width="16" stroke-linecap="round"/>
        <path d="M512 250 L548 322 L628 334 L570 390 L584 470 L512 432 L440 470 L454 390 L396 334 L476 322 Z" fill="${accent}"/>
      </g>
    `;
  }

  if (subject === "music") {
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="396" r="176" fill="${ink}"/>
        <circle cx="512" cy="396" r="76" fill="${paper}"/>
        <circle cx="512" cy="396" r="22" fill="${accent}"/>
        <path d="M662 252 V500 Q662 568 594 568 Q538 568 538 526 Q538 486 592 486 Q622 486 642 502 V292" fill="${accent}"/>
        <path d="M308 618 C432 578 590 578 716 618" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "pet") {
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="438" r="106" fill="${ink}"/>
        <circle cx="376" cy="346" r="52" fill="${ink}"/>
        <circle cx="470" cy="294" r="52" fill="${ink}"/>
        <circle cx="554" cy="294" r="52" fill="${ink}"/>
        <circle cx="648" cy="346" r="52" fill="${ink}"/>
        <path d="M438 456 Q512 522 586 456" fill="none" stroke="${paper}" stroke-width="18" stroke-linecap="round"/>
        <path d="M366 618 H658" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "fashion") {
    return `
      <g transform="translate(0 -22)">
        <path d="M512 220 C640 318 674 478 512 604 C350 478 384 318 512 220 Z" fill="${ink}"/>
        <path d="M512 260 C576 344 588 454 512 560 C436 454 448 344 512 260 Z" fill="${paper}"/>
        <path d="M408 388 H616 M450 312 C512 360 572 312 572 312" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "cleaning") {
    return `
      <g transform="translate(0 -18)">
        <path d="M512 214 C640 350 676 466 512 604 C348 466 384 350 512 214 Z" fill="${ink}"/>
        <path d="M412 440 C476 374 564 374 632 440" fill="none" stroke="${paper}" stroke-width="24" stroke-linecap="round"/>
        <path d="M354 604 C460 546 582 546 686 604" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
        <path d="M630 264 L662 326 L730 340 L670 374 L682 442 L630 396 L578 442 L590 374 L530 340 L598 326 Z" fill="${accent}"/>
      </g>
    `;
  }

  if (subject === "plumbing") {
    return `
      <g transform="translate(0 -18)">
        <path d="M512 212 C626 342 668 452 512 600 C356 452 398 342 512 212 Z" fill="${ink}"/>
        <path d="M408 426 H616 M512 322 V530" stroke="${paper}" stroke-width="36" stroke-linecap="round"/>
        <path d="M334 622 C438 560 586 560 690 622" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "electrical") {
    return `
      <g transform="translate(0 -18)">
        <path d="M560 188 L364 454 H500 L452 646 L674 350 H532 Z" fill="${ink}"/>
        <path d="M512 250 L430 418 H542 L500 558 L614 374 H516 Z" fill="${accent}"/>
        <path d="M334 638 H690" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "construction") {
    return `
      <g transform="translate(0 -18)">
        <path d="M286 564 H738" stroke="${ink}" stroke-width="34" stroke-linecap="round"/>
        <path d="M334 506 L512 286 L690 506" fill="none" stroke="${ink}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="414" y="430" width="196" height="134" rx="16" fill="${ink}"/>
        <path d="M356 650 H668" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "travel") {
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="396" r="176" fill="${ink}"/>
        <path d="M512 236 L570 514 L512 474 L454 514 Z" fill="${paper}"/>
        <path d="M360 434 C448 368 576 368 664 434" fill="none" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
        <path d="M336 604 H688" stroke="${ink}" stroke-width="20" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "nonprofit") {
    return `
      <g transform="translate(0 -18)">
        <circle cx="512" cy="390" r="176" fill="${ink}"/>
        <path d="M512 514 C366 410 390 286 480 286 C512 286 512 322 512 322 C512 322 512 286 544 286 C634 286 658 410 512 514 Z" fill="${paper}"/>
        <path d="M350 590 C430 536 594 536 674 590" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
      </g>
    `;
  }

  if (subject === "tech") {
    return `
      <rect x="340" y="178" width="344" height="344" rx="74" fill="${ink}"/>
      <path d="M418 352 H606 M512 258 V446 M430 270 L594 434 M594 270 L430 434" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      <circle cx="512" cy="352" r="62" fill="${paper}"/>
      <text x="512" y="378" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="46" font-weight="900" fill="${ink}">${escapeXml(initials.slice(0, 2))}</text>
    `;
  }

  if (variant === 1) {
    return `
      <circle cx="512" cy="388" r="176" fill="${ink}"/>
      <path d="M368 394 C430 260 594 260 656 394 C608 516 416 516 368 394 Z" fill="${paper}"/>
      <path d="M402 392 C464 332 560 332 622 392" fill="none" stroke="${accent}" stroke-width="20" stroke-linecap="round"/>
      <text x="512" y="432" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="86" font-weight="900" fill="${ink}" letter-spacing="3">${escapeXml(initials.slice(0, 3))}</text>
    `;
  }

  if (variant === 2) {
    return `
      <path d="M260 478 C388 260 636 260 764 478 C650 614 374 614 260 478 Z" fill="${ink}"/>
      <path d="M340 462 C436 344 588 344 684 462" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
      <text x="512" y="498" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="112" font-weight="900" fill="${paper}" letter-spacing="4">${escapeXml(initials.slice(0, 3))}</text>
    `;
  }

  return `
    <rect x="312" y="184" width="400" height="400" rx="112" fill="${ink}"/>
    <path d="M410 390 H614 M512 288 V492 M436 314 L588 466 M588 314 L436 466" stroke="${accent}" stroke-width="22" stroke-linecap="round"/>
    <text x="512" y="428" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="92" font-weight="900" fill="${paper}" letter-spacing="4">${escapeXml(initials.slice(0, 3))}</text>
  `;
}

function getRequestedColors(value = "") {
  const text = String(value).toLowerCase();
  if ((text.includes("black") || text.includes("charcoal")) && (text.includes("gold") || text.includes("brass") || text.includes("champagne"))) return ["#0f0f0f", "#fffaf0", "#c7a45a"];
  if ((text.includes("navy") || text.includes("blue")) && (text.includes("gold") || text.includes("brass"))) return ["#0f1f3a", "#f7f2e8", "#c9a449"];
  if (text.includes("green") && text.includes("gold")) return ["#0f2a22", "#f7f2e8", "#c9a449"];
  if (text.includes("black") && text.includes("white")) return ["#101010", "#ffffff", "#777777"];
  if (text.includes("monochrome") || text.includes("mono")) return ["#111111", "#fafafa", "#5f5f5f"];
  if (text.includes("earth") || text.includes("earthy") || text.includes("natural")) return ["#28362f", "#f5ead7", "#9a6b43"];
  if (text.includes("pastel")) return ["#333044", "#fff8f4", "#f4a7b9"];
  if (text.includes("neon")) return ["#0a0b12", "#f7fbff", "#6dffb5"];
  if (text.includes("brown") || text.includes("espresso") || text.includes("coffee")) return ["#2a1810", "#fff4df", "#b7793d"];
  if (text.includes("cream") || text.includes("ivory")) return ["#1a1a1a", "#f7f0df", "#b9975b"];
  if (text.includes("teal") || text.includes("aqua")) return ["#092f35", "#f3fbfa", "#27b4a8"];
  if (text.includes("orange") || text.includes("copper")) return ["#1f1712", "#fff7ed", "#e66a2c"];
  if (text.includes("yellow")) return ["#161616", "#fffbea", "#f5c542"];
  if (text.includes("pink") || text.includes("blush") || text.includes("rose")) return ["#2d2026", "#fff6f8", "#d98aa5"];
  if (text.includes("silver") || text.includes("chrome") || text.includes("gray") || text.includes("grey")) return ["#171717", "#f8fafc", "#9ca3af"];
  if (text.includes("blue")) return ["#0f172a", "#f8fafc", "#38bdf8"];
  if (text.includes("red")) return ["#1a1010", "#fff8f3", "#e0502f"];
  if (text.includes("purple")) return ["#21152f", "#faf7ff", "#a78bfa"];
  if (text.includes("gold")) return ["#15120c", "#fff8ea", "#c9a449"];
  if (text.includes("green")) return ["#0f2a22", "#f7f2e8", "#7c9a6d"];
  return null;
}

function svgToDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function splitDisplayName(value = "") {
  const words = String(value).trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [words.join(" ") || "Brand"];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")].filter(Boolean);
}

function applyTypographyCase(value = "", typographySystem = TYPOGRAPHY_SYSTEMS.geometricSans) {
  if (typographySystem.caseMode === "upper" && value.length <= 22) return value.toUpperCase();
  if (typographySystem.caseMode === "title") return titleCase(value);
  return value;
}

function getTypographyTracking({ longest, typographySystem }) {
  const base = Number(typographySystem.trackingBase || 0);
  if (longest > 22) return Math.min(0, base);
  if (longest > 16) return Math.min(1, base);
  if (longest <= 8) return base + 1.5;
  return base;
}

function getWordmarkSvg({ displayName, fontFamily, nameY, layout, inkToken, typographySystem = TYPOGRAPHY_SYSTEMS.geometricSans, x = 512 }) {
  const preferredChars = typographySystem.maxLineChars || 16;
  const rawLines = splitDisplayName(displayName).flatMap((line) => {
    if (line.length <= preferredChars + 5) return [line];
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length <= 1) return [line];
    const midpoint = Math.ceil(words.length / 2);
    return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
  }).filter(Boolean).slice(0, 3);
  const lines = rawLines.map((line) => applyTypographyCase(line, typographySystem));
  const longest = lines.reduce((max, line) => Math.max(max, line.length), 0);
  const baseSize = layout === 2 ? 72 : 82;
  const fontSize = Math.max(42, Math.min(baseSize, Math.floor(760 / Math.max(longest, 8))));
  const letterSpacing = getTypographyTracking({ longest, typographySystem });
  const weight = typographySystem.weight || 850;

  if (lines.length === 1) {
    return {
      wordmark: `<text data-layer="wordmark" x="${x}" y="${nameY}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${inkToken}" letter-spacing="${letterSpacing}" font-kerning="normal" text-rendering="geometricPrecision">${escapeXml(lines[0])}</text>`,
      bottomY: nameY,
    };
  }

  const gap = Math.max(42, Math.floor(fontSize * (typographySystem.lineGapRatio || 0.94)));
  const firstY = nameY - Math.floor((gap * (lines.length - 1)) / 2);
  const wordmark = lines.map((line, index) => {
    const y = firstY + gap * index;
    return `<text data-layer="wordmark" x="${x}" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${inkToken}" letter-spacing="${letterSpacing}" font-kerning="normal" text-rendering="geometricPrecision">${escapeXml(line)}</text>`;
  }).join("\n");
  return {
    wordmark,
    bottomY: firstY + gap * (lines.length - 1),
  };
}

function buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory, variant = 0, transparent = false, director = null }) {
  const { displayName, initials, words } = getLogoWords({ brandName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const creativeDirector = director || buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory });
  const concept = creativeDirector.concepts?.[variant % creativeDirector.concepts.length] || {};
  const isPrimaryResult = variant === 0;
  const hash = hashString(`${brandName} ${logoIndustry} ${logoStyle} ${logoSymbol} ${logoColors} ${userPrompt} ${logoPrompt} ${variant}`);
  const profile = getStyleProfile({ logoStyle: `${logoStyle} ${concept.style || ""}`, logoIndustry, userPrompt });
  const palettes = [
    ["#111111", "#f7f4ed", "#9b7b3f"],
    ["#10231f", "#f5f1e8", "#c7a45a"],
    ["#1a1a2e", "#f8f7f2", "#4f7cff"],
    ["#171717", "#ffffff", "#e0502f"],
    ["#24342f", "#fbfaf6", "#7c9a6d"],
    ["#0f172a", "#f8fafc", "#38bdf8"],
  ];
  const [ink, paper, accent] = getRequestedColors(logoColors || concept.palette) || palettes[(hash + variant) % palettes.length];
  const subject = creativeDirector.category || getSubject(words);
  const inkToken = "var(--logo-ink)";
  const paperToken = "var(--logo-paper)";
  const accentToken = "var(--logo-accent)";
  const subjectVariant = subject === "plastering" ? variant % 6 : (hash + variant) % 3;
  const iconSystem = concept.iconSystem || creativeDirector.iconSystem || selectIconSystem({ subject, styles: creativeDirector.styles || [], logoSymbol });
  const subjectMark = buildSubjectMark({ subject, ink: inkToken, accent: accentToken, paper: paperToken, initials, variant: subjectVariant, profile, iconSystem });
  const nameWords = displayName.toLowerCase().split(/\s+/);
  const subtitleWords = words
    .filter((word) => !nameWords.includes(word.toLowerCase()))
    .filter((word) => word.length > 2)
    .filter((word, index, list) => list.findIndex((item) => item.toLowerCase() === word.toLowerCase()) === index)
    .slice(0, 4);
  const subjectSubtitle = {
    plastering: "stucco plastering",
    roofing: "roofing contractor",
    landscaping: "landscape service",
    barber: "barber studio",
    realestate: "real estate",
    law: "legal counsel",
    surf: "surf shop",
    "wedding-photo": "photo video",
    fitness: "training brand",
    "hippo-football": "fantasy football",
    chocolate: "chocolate factory",
    pizza: "pizza restaurant",
    restaurant: "restaurant brand",
    automotive: "auto service",
    healthcare: "healthcare brand",
    finance: "financial brand",
    education: "education brand",
    music: "music studio",
    pet: "pet care",
    fashion: "fashion label",
    cleaning: "cleaning service",
    plumbing: "plumbing service",
    electrical: "electrical service",
    construction: "construction brand",
    travel: "travel brand",
    nonprofit: "community mission",
    insurance: "coverage protection",
    agency: "creative growth",
    security: "protection systems",
    logistics: "delivery transport",
    gaming: "gaming brand",
    architecture: "architecture studio",
    cannabis: "botanical brand",
    tattoo: "tattoo studio",
    football: "fantasy football",
    hippo: "mascot brand",
  }[subject];
  const subtitle = escapeXml(
    (subjectSubtitle || subtitleWords.join(" ") || subject.replace("-", " "))
      .toUpperCase()
  );
  const typographySystem = concept.typographySystem || creativeDirector.typographySystem || TYPOGRAPHY_SYSTEMS.geometricSans;
  const fontFamily = typographySystem.primaryFamily || "Inter, Arial, Helvetica, sans-serif";
  const supportFamily = typographySystem.supportFamily || fontFamily;
  const personalityDirectives = creativeDirector.personalityDirectives || {};
  const preferredLayout = isPrimaryResult
    ? (["pizza", "restaurant", "coffee", "pet", "fitness"].includes(subject) ? 0 : 3)
    : personalityDirectives.layoutBias === "restrained" ? 3 : personalityDirectives.layoutBias === "dynamic" ? 1 : personalityDirectives.layoutBias === "institutional" ? 2 : null;
  const layout = subject === "plastering" ? variant % 4 : preferredLayout ?? ((hash + variant) % 4);
  const humanComposition = getHumanComposition({ hash, variant, layout, subject, humanDesign: creativeDirector.humanDesign, personalityDirectives });
  const markScale = (isPrimaryResult ? 0.78 : personalityDirectives.layoutBias === "dynamic" ? 1.1 : personalityDirectives.spacing === "generous" ? 0.96 : 1) * humanComposition.markScaleBoost;
  const baseMarkTransform = layout === 1 ? `translate(${humanComposition.markDx} ${-42 + humanComposition.markDy}) scale(${(1.05 * markScale).toFixed(2)})` : layout === 2 ? `translate(${humanComposition.markDx} ${-28 + humanComposition.markDy}) scale(${(0.98 * markScale).toFixed(2)})` : layout === 3 ? `translate(${humanComposition.markDx} ${-12 + humanComposition.markDy}) scale(${(0.94 * markScale).toFixed(2)})` : `translate(${humanComposition.markDx} ${humanComposition.markDy}) scale(${markScale.toFixed(2)})`;
  const markTransform = baseMarkTransform;
  const nameY = isPrimaryResult ? (layout === 3 ? 735 : 742) : layout === 1 ? 748 : layout === 2 ? 700 : layout === 3 ? 720 : 730;
  const wordmarkX = 512 + humanComposition.wordDx;
  const { wordmark, bottomY } = getWordmarkSvg({ displayName, fontFamily, nameY, layout, inkToken, typographySystem, x: wordmarkX });
  const lineY = bottomY + 48;
  const subtitleY = lineY + 58;
  const backgroundPattern = isPrimaryResult ? "" : subject === "plastering"
    ? `<path data-layer="texture" d="M110 170 C250 128 384 130 514 168 M630 850 C760 902 884 890 962 850 M116 792 C232 742 364 734 484 770" fill="none" stroke="${inkToken}" stroke-width="8" stroke-linecap="round" opacity=".05"/>`
    : `<path data-layer="composition-tension" d="M${134 + humanComposition.accentDx} ${226 + (hash % 25)} C${274 + humanComposition.accentDx} ${172 + (variant * 13)} ${390 - humanComposition.accentDx} ${188} ${504 + humanComposition.accentDx} ${236}" fill="none" stroke="${inkToken}" stroke-width="5" stroke-linecap="round" opacity="${transparent ? "0" : "0.035"}"/>`;
  const lineStart = humanComposition.lineInset + humanComposition.accentDx;
  const lineEnd = 1024 - humanComposition.lineInset + humanComposition.accentDx;
  const subtitleX = 512 + Math.round(humanComposition.wordDx / 2);
  const showSupportLine = !isPrimaryResult || ["pizza", "restaurant", "coffee", "chocolate", "pet", "fitness", "construction", "plumbing", "automotive"].includes(subject);
  const supportOpacity = isPrimaryResult ? "0.44" : "0.64";
  const accentWidth = isPrimaryResult ? 6 : 10;
  const accentOpacity = isPrimaryResult ? "0.72" : "1";
  const frameOpacity = isPrimaryResult ? "0" : humanComposition.frameOpacity;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" data-brandthat-vector="true" data-layout="${layout}" data-human-composition="${escapeXml(humanComposition.data)}" style="--logo-ink:${ink};--logo-paper:${paper};--logo-accent:${accent};">
    ${transparent ? "" : `<rect data-layer="background" width="1024" height="1024" fill="${paperToken}"/>`}
    ${backgroundPattern}
    <rect data-layer="frame" x="${humanComposition.frameInset}" y="52" width="${1024 - humanComposition.frameInset * 2}" height="920" rx="${humanComposition.frameRx}" fill="none" stroke="${inkToken}" stroke-opacity="${transparent ? "0" : frameOpacity}" stroke-width="4"/>
    <g data-layer="mark" transform="${markTransform}">
      ${subjectMark}
    </g>
    ${wordmark}
    ${showSupportLine ? `<line data-layer="accent" x1="${lineStart}" y1="${lineY}" x2="${lineEnd}" y2="${lineY}" stroke="${accentToken}" stroke-width="${accentWidth}" stroke-opacity="${accentOpacity}" stroke-linecap="round"/>
    <text data-layer="tagline" x="${subtitleX}" y="${subtitleY}" text-anchor="middle" font-family="${supportFamily}" font-size="${isPrimaryResult ? 21 : 25}" font-weight="750" fill="${inkToken}" opacity="${supportOpacity}" letter-spacing="${Math.max(4, typographySystem.subtitleTracking || 5)}" font-kerning="normal" text-rendering="geometricPrecision">${subtitle || "CUSTOM LOGO MARK"}</text>` : ""}
  </svg>`;
}

function buildFallbackLogo({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory }) {
  const creativeBrief = buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory });
  const safeGenerationMemory = sanitizeGenerationMemoryForRequest(generationMemory, { brandName: creativeBrief.brandName || brandName, logoIndustry: creativeBrief.category || logoIndustry });
  const baseSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory: safeGenerationMemory, variant: 0, director: creativeBrief });
  const transparentSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory: safeGenerationMemory, variant: 0, transparent: true, director: creativeBrief });
  const subject = creativeBrief.category;
  const variantIds = [0, 1, 2, 3];
  const variationNames = ["Primary", "Editorial", "Bold", "Monogram", "Icon System", "Premium Lockup"];
  const variations = variantIds.map((variant) => {
    const concept = creativeBrief.concepts[variant % creativeBrief.concepts.length] || {};
    const svg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory: safeGenerationMemory, variant, director: creativeBrief });
    return {
      id: `variation-${variant + 1}`,
      name: concept.name || variationNames[variant] || `Variation ${variant + 1}`,
      image: svgToDataUrl(svg),
      svg: svgToDataUrl(svg),
      logoStyle: concept.style || logoStyle || "professional",
      symbol: concept.symbol || logoSymbol || subject,
      typography: concept.typography || "clean readable wordmark",
      palette: concept.palette || logoColors || "brand-appropriate high contrast palette",
      layout: concept.layout || "symbol and wordmark lockup",
      whyFits: concept.whyFits || "This direction is tied to the meaning of the brand request.",
      prompt: `${concept.name || variationNames[variant]}: ${concept.symbol || logoSymbol || subject}. ${concept.whyFits || ""}`,
    };
  });

  const updatedMemory = updateGenerationMemory(safeGenerationMemory, {
    concepts: creativeBrief.concepts,
    typographySystem: creativeBrief.typographySystem,
    palette: creativeBrief.concepts?.[0]?.palette,
    humanDesign: creativeBrief.humanDesign,
    trend: creativeBrief.trendIntelligence,
    brandName: creativeBrief.brandName || brandName,
    industry: creativeBrief.category || logoIndustry,
  });

  return {
    image: svgToDataUrl(baseSvg),
    svg: svgToDataUrl(baseSvg),
    transparentSvg: svgToDataUrl(transparentSvg),
    creativeBrief,
    generationMemory: updatedMemory,
    variations,
    layers: [
      { id: "background", name: "Background" },
      { id: "mark", name: "Icon or mascot" },
      { id: "wordmark", name: "Brand name" },
      { id: "accent", name: "Accent line" },
      { id: "tagline", name: "Tagline" },
    ],
  };
}

async function generateOpenAiLogo({ finalPrompt, signal }) {
  const client = getOpenAiClient();
  if (!client) {
    throw new Error("OpenAI API key is not configured.");
  }

  const model = process.env.LOGO_IMAGE_MODEL || "gpt-image-1";
  const image = await client.images.generate({
    model,
    prompt: finalPrompt,
    size: "1024x1024",
    n: 1,
  }, { signal });

  const imageResult = image?.data?.[0];
  const imageUrl = imageResult?.url;
  const base64Image = imageResult?.b64_json;

  if (!imageUrl && !base64Image) {
    throw new Error("OpenAI did not return a logo image.");
  }

  return imageUrl || `data:image/png;base64,${base64Image}`;
}

exports.handler = async (event, context) => {
  if (context) context.callbackWaitsForEmptyEventLoop = false;

  try {
    const { logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, generationMemory, parsedLogo, contextReset } = JSON.parse(event.body || "{}");

    if (!logoPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Logo prompt is required." }),
      };
    }

    const requestBrandName = parsedLogo?.brandName || brandName || "";
    const requestIndustry = parsedLogo?.industry || logoIndustry || "";
    const requestStyle = parsedLogo?.style || logoStyle || "";
    const requestSymbol = parsedLogo?.symbol || logoSymbol || "";
    const requestColors = parsedLogo?.colors || logoColors || "";
    const requestAvoid = parsedLogo?.avoid || logoAvoid || "";
    const requestMemory = contextReset ? {} : sanitizeGenerationMemoryForRequest(generationMemory || {}, { brandName: requestBrandName, logoIndustry: requestIndustry });

    const finalPrompt = buildLogoPrompt({ logoPrompt, brandName: requestBrandName, logoStyle: requestStyle, logoIndustry: requestIndustry, logoSymbol: requestSymbol, logoColors: requestColors, logoAvoid: requestAvoid, userPrompt, generationMemory: requestMemory });
    const vectorLogo = buildFallbackLogo({ logoPrompt, brandName: requestBrandName, logoStyle: requestStyle, logoIndustry: requestIndustry, logoSymbol: requestSymbol, logoColors: requestColors, logoAvoid: requestAvoid, userPrompt, generationMemory: requestMemory });
    const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 8000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const image = await generateOpenAiLogo({ finalPrompt, signal: controller.signal });
      clearTimeout(timeout);

      return {
        statusCode: 200,
        body: JSON.stringify({
          image,
          source: "openai",
          vectorImage: vectorLogo.image,
          svg: vectorLogo.svg,
          transparentSvg: vectorLogo.transparentSvg,
          variations: [
            { id: "ai-primary", name: "AI Logo", image, svg: "" },
            ...vectorLogo.variations,
          ],
          creativeBrief: vectorLogo.creativeBrief,
          generationMemory: vectorLogo.generationMemory,
          layers: vectorLogo.layers,
        }),
      };
    } catch (imageError) {
      clearTimeout(timeout);

      return {
        statusCode: 200,
        body: JSON.stringify({
          image: vectorLogo.image,
          source: "instant-svg",
          vectorImage: vectorLogo.image,
          svg: vectorLogo.svg,
          transparentSvg: vectorLogo.transparentSvg,
          variations: vectorLogo.variations,
          creativeBrief: vectorLogo.creativeBrief,
          generationMemory: vectorLogo.generationMemory,
          layers: vectorLogo.layers,
          note: "Brandthat created an editable vector logo from your exact fields, including the brand name, industry, style, colors, and notes.",
        }),
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Logo generation failed.",
      }),
    };
  }
};
