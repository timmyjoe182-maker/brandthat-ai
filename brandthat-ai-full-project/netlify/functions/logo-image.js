const OpenAI = require("openai");

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function buildLogoPrompt({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const director = buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const conceptLines = director.concepts
    .map((concept, index) => `${index + 1}. ${concept.name}: ${concept.symbol}. Typography: ${concept.typography}. Palette: ${concept.palette}. Layout: ${concept.layout}. Why: ${concept.whyFits}`)
    .join("\n");

  return `
Create one finished, usable logo image.

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
- Target audience: ${director.targetAudience}
- Visual territory: ${director.visualTerritory}
- Avoid generic mismatch: ${director.avoid}

Distinct logo directions to honor:
${conceptLines}

Design requirements:
- Make the image itself the final logo concept, not an explanation.
- Follow every user field exactly when they describe a brand name, industry, mascot, object, color, letter, style, or mood.
- Visually match the meaning of the words. If the brand says ranch, show refined ranch cues. If it says AI, show intelligence/brand-system cues. If it says surf shop, show surf/ocean/shop cues. If it says law firm, show legal trust cues.
- Use a large, clean centered composition on a simple background.
- Create a strong logo mark, emblem, mascot, wordmark, tool mark, trade mark, lettermark, or icon depending on the request.
- Avoid defaulting to a generic hexagon, shield, or initials unless the user specifically asks for that.
- Make the icon feel designed, not clipart: reduce literal objects into one ownable silhouette, use negative space, hidden symbolism, geometric tension, and custom category cues.
- Prefer one strong brandable idea over multiple decorative objects. No stock-style icon mashups.
- If the request is for a real-world trade or service business, use relevant visual language from that trade: tools, materials, textures, motion, craft, before/after surfaces, or local-service trust signals.
- Make the primary logo mark fill most of the canvas. Do not make the logo tiny.
- Make it suitable for a website header, social profile image, favicon, business card, and brand kit.
- Avoid mockup scenes, stationery, wall signs, paper sheets, hands, devices, photo backgrounds, framed cards, tiny thumbnails, clutter, tiny decorative details, and messy text.
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

function hashString(value = "") {
  return String(value).split("").reduce((hash, char) => {
    return ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  }, 2166136261);
}

function getLogoWords({ brandName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const source = `${brandName || ""} ${logoIndustry || ""} ${logoStyle || ""} ${logoSymbol || ""} ${logoColors || ""} ${userPrompt || ""} ${logoPrompt || ""}`.trim() || "Brand";
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
  const initials = words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "B";

  return { displayName, initials, words, source };
}

function hasWord(words, options) {
  return options.some((option) => words.some((word) => word.toLowerCase().includes(option)));
}

function getSubject(words) {
  const hasHippo = hasWord(words, ["hippo", "hippos"]);
  const hasFootball = hasWord(words, ["football", "fantasy"]);
  if (hasHippo && hasFootball) return "hippo-football";
  if (hasHippo) return "hippo";
  if (hasFootball) return "football";
  if (hasWord(words, ["stucco", "plaster", "plastering", "drywall", "rendering", "skim", "venetian"])) return "plastering";
  if (hasWord(words, ["law", "legal", "attorney", "lawyer", "firm"])) return "law";
  if (hasWord(words, ["surf", "surfing", "wave", "beach", "coastal", "ocean"])) return "surf";
  if (hasWord(words, ["wedding", "photo", "photography", "video", "film", "cinema", "rose"])) return "wedding-photo";
  if (hasWord(words, ["fitness", "gym", "training", "trainer", "strength"])) return "fitness";
  if (hasWord(words, ["pizza", "pizzeria", "slice", "pepperoni"])) return "pizza";
  if (hasWord(words, ["restaurant", "food", "kitchen", "chef", "diner", "grill", "bakery", "taco", "burger", "sushi", "catering"])) return "restaurant";
  if (hasWord(words, ["car", "auto", "automotive", "mechanic", "garage", "detailing", "tire", "truck"])) return "automotive";
  if (hasWord(words, ["doctor", "medical", "clinic", "health", "care", "therapy", "chiropractic", "dental", "dentist", "orthodontic"])) return "healthcare";
  if (hasWord(words, ["bank", "finance", "financial", "wealth", "advisor", "accounting", "tax", "capital", "fund"])) return "finance";
  if (hasWord(words, ["school", "education", "academy", "tutor", "learning", "childcare", "daycare"])) return "education";
  if (hasWord(words, ["music", "band", "studio", "audio", "sound", "record", "podcast", "dj"])) return "music";
  if (hasWord(words, ["pet", "dog", "cat", "veterinary", "vet", "grooming", "animal"])) return "pet";
  if (hasWord(words, ["fashion", "clothing", "apparel", "boutique", "jewelry", "watch", "shoe", "streetwear"])) return "fashion";
  if (hasWord(words, ["cleaning", "maid", "janitorial", "wash", "pressure", "laundry"])) return "cleaning";
  if (hasWord(words, ["plumbing", "plumber", "pipe", "water", "drain"])) return "plumbing";
  if (hasWord(words, ["electric", "electrical", "electrician", "power", "solar", "energy", "lighting"])) return "electrical";
  if (hasWord(words, ["construction", "builder", "contractor", "remodel", "renovation", "concrete", "masonry"])) return "construction";
  if (hasWord(words, ["travel", "hotel", "resort", "vacation", "tour", "airbnb", "hospitality"])) return "travel";
  if (hasWord(words, ["nonprofit", "charity", "foundation", "community", "church", "ministry"])) return "nonprofit";
  if (hasWord(words, ["roof", "roofing", "shingle"])) return "roofing";
  if (hasWord(words, ["landscape", "lawn", "garden", "tree"])) return "landscaping";
  if (hasWord(words, ["barber", "salon", "hair"])) return "barber";
  if (hasWord(words, ["cow", "cattle", "ranch", "alpaca", "horse", "horses", "private", "pasture", "equestrian"])) return "ranch";
  if (hasWord(words, ["coffee", "cafe"])) return "coffee";
  if (hasWord(words, ["real", "estate", "home", "house"])) return "realestate";
  if (hasWord(words, ["beauty", "wellness", "spa"])) return "wellness";
  if (hasWord(words, ["ai", "tech", "software", "saas"])) return "tech";
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
  { key: "food", keywords: ["pizza", "restaurant", "food", "chef", "bakery", "taco", "burger", "coffee", "cafe"], typography: "warm hospitality type", palette: "food-specific warm palette", traits: ["appetizing", "human", "clear"] },
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

const SUBJECT_STYLE_OVERRIDES = STYLE_SCHEMA.subjectStyleOverrides || {
  pizza: ["food", "playful", "vintage"],
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
};

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

function inferPositioning({ subject, styles, source = "" }) {
  const text = source.toLowerCase();
  if (styles.some((style) => style.key === "luxury")) return "premium";
  if (/(cheap|affordable|budget|discount|fast|quick)/.test(text)) return "accessible";
  if (/(pro|professional|expert|trusted|certified)/.test(text)) return "professional";
  if (["law", "finance", "healthcare"].includes(subject)) return "trust";
  if (["pizza", "restaurant", "coffee"].includes(subject)) return "neighborhood";
  return "modern";
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

function selectTypography({ subject, styles }) {
  const primary = styles[0]?.key || "minimal";
  if (["law", "finance"].includes(subject)) return TYPOGRAPHY_SYSTEMS.authoritySerif;
  if (primary === "luxury" || subject === "ranch") return TYPOGRAPHY_SYSTEMS.luxurySerif;
  if (["construction", "plastering", "roofing", "plumbing", "electrical", "automotive", "fitness"].includes(subject)) return TYPOGRAPHY_SYSTEMS.tradeSans;
  if (["pizza", "restaurant", "coffee"].includes(subject)) return TYPOGRAPHY_SYSTEMS.hospitalitySans;
  if (["fashion", "wedding-photo", "wellness"].includes(subject)) return TYPOGRAPHY_SYSTEMS.editorialSerif;
  if (["pet", "education", "nonprofit"].includes(subject) || primary === "playful") return TYPOGRAPHY_SYSTEMS.playfulRounded;
  if (primary === "vintage" || primary === "western") return TYPOGRAPHY_SYSTEMS.vintageDisplay;
  if (["tech"].includes(subject) || primary === "futuristic" || primary === "minimal") return TYPOGRAPHY_SYSTEMS.geometricSans;
  return { ...TYPOGRAPHY_SYSTEMS.geometricSans, label: styles[0]?.typography || TYPOGRAPHY_SYSTEMS.geometricSans.label };
}

function selectAudience({ subject, positioning }) {
  const map = {
    pizza: "hungry local customers looking for a memorable restaurant",
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
  };
  return map[subject] || (positioning === "premium" ? "customers who expect a polished premium brand" : "customers who need a clear, memorable brand");
}

function selectPalette({ subject, styles, logoColors }) {
  if (logoColors) return logoColors;
  const primary = styles[0]?.key || "minimal";
  if (subject === "pizza") return "tomato red, mozzarella cream, basil green, oven charcoal";
  if (subject === "restaurant") return "charcoal, warm cream, copper or ingredient accent";
  if (subject === "ranch") return "deep green, warm ivory, muted gold";
  if (subject === "tech") return "ink black, cloud white, electric blue";
  if (subject === "law") return "navy, ivory, brass";
  if (subject === "finance") return "navy, white, muted gold";
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

function selectIconSystem({ subject, styles, logoSymbol = "" }) {
  const styleKeys = styles.map((style) => style.key);
  const symbolText = logoSymbol.toLowerCase();
  if (/(mascot|animal|character|hippo|horse|dog|cat)/.test(symbolText) || ["hippo", "hippo-football", "pet"].includes(subject)) {
    return ICON_CREATIVITY_SYSTEMS.mascotReduction;
  }
  if (["luxury", "fashion", "feminine"].some((key) => styleKeys.includes(key)) || ["wedding-photo", "ranch", "fashion"].includes(subject)) {
    return ICON_CREATIVITY_SYSTEMS.editorialEmblem;
  }
  if (["tech", "finance", "law"].includes(subject) || styleKeys.includes("futuristic")) {
    return ICON_CREATIVITY_SYSTEMS.abstractSystem;
  }
  if (["pizza", "restaurant", "coffee", "plastering", "construction", "automotive", "fitness", "surf"].includes(subject)) {
    return ICON_CREATIVITY_SYSTEMS.negativeSpace;
  }
  return ICON_CREATIVITY_SYSTEMS.monogramFusion;
}

function buildInternalConceptPool({ subject, profile, styles, logoSymbol, logoColors, typography, palette, iconSystem }) {
  const base = getConceptLibrary(subject, profile).map(([name, symbol, type, basePalette, layout, whyFits]) => ({
    name,
    style: styles[0]?.key || "professional",
    symbol: logoSymbol || symbol,
    iconSystem,
    typography: typography?.label || type,
    typographySystem: typography,
    palette: logoColors || palette || basePalette,
    layout,
    whyFits,
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
      layout: "large ownable icon above a highly readable wordmark",
      whyFits: `It translates the ${subject.replace("-", " ")} concept through a ${style.key} visual language instead of using a generic icon.`,
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
      layout: "wordmark-led logo with small supporting icon",
      whyFits: `It keeps the brand name readable while still reflecting the requested category and mood.`,
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
    layout,
    whyFits: `This direction gives the brand a different composition so the options are not small variations of the same logo.`,
    source: "layout",
  }));

  return [...base, ...styleConcepts, ...layoutConcepts].slice(0, 24);
}

function scoreLogoConcept(concept, { subject, styles, logoSymbol = "", logoAvoid = "" }) {
  const text = `${concept.name} ${concept.symbol} ${concept.typography} ${concept.palette} ${concept.layout} ${concept.whyFits}`.toLowerCase();
  let score = 60;
  if (concept.source === "library") score += 14;
  if (text.includes(subject.replace("-", " "))) score += 12;
  if (logoSymbol && text.includes(logoSymbol.toLowerCase().split(/\s+/)[0])) score += 10;
  styles.forEach((style, index) => {
    if (text.includes(style.key)) score += 8 - index;
    style.traits.forEach((trait) => {
      if (text.includes(trait)) score += 2;
    });
  });
  if (/(generic|random|stock|template|clip.?art|default|hexagon|initials only)/.test(text)) score -= 18;
  if (/(readable|scalable|clean|meaning|category|symbol|custom|ownable)/.test(text)) score += 7;
  if (logoAvoid) {
    logoAvoid.toLowerCase().split(/\s+/).filter(Boolean).forEach((word) => {
      if (word.length > 3 && text.includes(word)) score -= 12;
    });
  }
  return Math.max(0, Math.min(100, score));
}

function runLogoGenerationPipeline({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const inferredName = inferBrandName({ brandName, userPrompt, logoPrompt });
  const wordsResult = getLogoWords({ brandName: inferredName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const subject = getSubject(wordsResult.words);
  const profile = getStyleProfile({ logoStyle, logoIndustry, userPrompt: `${userPrompt || ""} ${logoPrompt || ""}` });
  const styles = detectLogoStyles({ subject, logoStyle, logoIndustry, logoSymbol, userPrompt, logoPrompt });
  const positioning = inferPositioning({ subject, styles, source: wordsResult.source });
  const typography = selectTypography({ subject, styles });
  const palette = selectPalette({ subject, styles, logoColors });
  const iconSystem = selectIconSystem({ subject, styles, logoSymbol });
  const audience = selectAudience({ subject, positioning });
  const pool = buildInternalConceptPool({ subject, profile, styles, logoSymbol, logoColors, typography, palette, iconSystem });
  const scored = pool
    .map((concept) => ({ ...concept, score: scoreLogoConcept(concept, { subject, styles, logoSymbol, logoAvoid }) }))
    .sort((a, b) => b.score - a.score);

  const diversified = [];
  scored.forEach((concept) => {
    const duplicateStyle = diversified.filter((item) => item.style === concept.style).length >= 2;
    const duplicateLayout = diversified.some((item) => item.layout === concept.layout && item.symbol === concept.symbol);
    if (!duplicateStyle && !duplicateLayout && diversified.length < 4) diversified.push(concept);
  });

  const concepts = (diversified.length >= 4 ? diversified : scored.slice(0, 4)).map((concept) => ({
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
  }));

  return {
    brandName: inferredName,
    category: subject,
    styles,
    positioning,
    typography: typography.label,
    typographySystem: typography,
    iconSystem,
    palette,
    targetAudience: audience,
    concepts,
    scores: scored.slice(0, 8).map(({ name, score, source }) => ({ name, score, source })),
    pipeline: {
      brandAnalysis: { brandName: inferredName, rawWords: wordsResult.words, positioning },
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
  };

  const fallback = [
    ["Meaning-First Mark", "custom symbol based on the strongest nouns in the brand request", profile.isLuxury ? "premium serif or refined sans" : "clean bold wordmark", "black, white, one meaningful accent", "symbol above or beside wordmark", "It avoids random icons by anchoring the mark to the brand’s actual words."],
    ["Wordmark System", "distinct typography with a subtle embedded symbol", "customized readable type", "brand-appropriate restrained palette", "wordmark-led layout", "It keeps the brand name clear while adding ownable visual detail."],
    ["Category Emblem", "simple emblem built from the category and audience cues", "balanced display type", "high-contrast palette", "emblem and wordmark", "It makes the logo usable on websites, social, and merchandise."],
  ];

  return libraries[subject] || fallback;
}

function buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const pipeline = runLogoGenerationPipeline({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const styleText = pipeline.styles.map((style) => style.key).join(", ") || "professional";

  return {
    brandName: pipeline.brandName,
    category: pipeline.category,
    personality: styleText,
    targetAudience: pipeline.targetAudience,
    visualTerritory: pipeline.concepts.map((concept) => concept.name).join(", "),
    avoid: logoAvoid || "Avoid random generic icons, misspelled text, crowded clip-art, and visuals unrelated to the brand words.",
    concepts: pipeline.concepts,
    pipeline: pipeline.pipeline,
    scores: pipeline.scores,
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
    return `
      <g transform="translate(0 -20)">
        <path d="M512 206 L724 322 V538 L512 650 L300 538 V322 Z" fill="${ink}"/>
        <path d="M386 342 H638 M422 402 H602 M456 462 H568" stroke="${paper}" stroke-width="26" stroke-linecap="round"/>
        <path d="M512 276 V568" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
        <path d="M390 588 H634" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
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
  if (text.includes("green") && text.includes("gold")) return ["#0f2a22", "#f7f2e8", "#c9a449"];
  if (text.includes("black") && text.includes("white")) return ["#101010", "#ffffff", "#777777"];
  if (text.includes("blue")) return ["#0f172a", "#f8fafc", "#38bdf8"];
  if (text.includes("red")) return ["#1a1010", "#fff8f3", "#e0502f"];
  if (text.includes("purple")) return ["#21152f", "#faf7ff", "#a78bfa"];
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

function getWordmarkSvg({ displayName, fontFamily, nameY, layout, inkToken, typographySystem = TYPOGRAPHY_SYSTEMS.geometricSans }) {
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
      wordmark: `<text data-layer="wordmark" x="512" y="${nameY}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${inkToken}" letter-spacing="${letterSpacing}" font-kerning="normal" text-rendering="geometricPrecision">${escapeXml(lines[0])}</text>`,
      bottomY: nameY,
    };
  }

  const gap = Math.max(42, Math.floor(fontSize * (typographySystem.lineGapRatio || 0.94)));
  const firstY = nameY - Math.floor((gap * (lines.length - 1)) / 2);
  const wordmark = lines.map((line, index) => {
    const y = firstY + gap * index;
    return `<text data-layer="wordmark" x="512" y="${y}" text-anchor="middle" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${weight}" fill="${inkToken}" letter-spacing="${letterSpacing}" font-kerning="normal" text-rendering="geometricPrecision">${escapeXml(line)}</text>`;
  }).join("\n");
  return {
    wordmark,
    bottomY: firstY + gap * (lines.length - 1),
  };
}

function buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant = 0, transparent = false, director = null }) {
  const { displayName, initials, words } = getLogoWords({ brandName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const creativeDirector = director || buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const concept = creativeDirector.concepts?.[variant % creativeDirector.concepts.length] || {};
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
  }[subject];
  const subtitle = escapeXml(
    (subjectSubtitle || subtitleWords.join(" ") || subject.replace("-", " "))
      .toUpperCase()
  );
  const typographySystem = concept.typographySystem || creativeDirector.typographySystem || TYPOGRAPHY_SYSTEMS.geometricSans;
  const fontFamily = typographySystem.primaryFamily || "Inter, Arial, Helvetica, sans-serif";
  const supportFamily = typographySystem.supportFamily || fontFamily;
  const layout = subject === "plastering" ? variant % 4 : (hash + variant) % 4;
  const markTransform = layout === 1 ? "translate(0 -42) scale(1.05)" : layout === 2 ? "translate(0 -28) scale(.98)" : layout === 3 ? "translate(0 -12) scale(.94)" : "";
  const nameY = layout === 1 ? 748 : layout === 2 ? 700 : layout === 3 ? 720 : 730;
  const { wordmark, bottomY } = getWordmarkSvg({ displayName, fontFamily, nameY, layout, inkToken, typographySystem });
  const lineY = bottomY + 48;
  const subtitleY = lineY + 58;
  const backgroundPattern = subject === "plastering"
    ? `<path data-layer="texture" d="M110 170 C250 128 384 130 514 168 M630 850 C760 902 884 890 962 850 M116 792 C232 742 364 734 484 770" fill="none" stroke="${inkToken}" stroke-width="8" stroke-linecap="round" opacity=".05"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" data-brandthat-vector="true" data-layout="${layout}" style="--logo-ink:${ink};--logo-paper:${paper};--logo-accent:${accent};">
    ${transparent ? "" : `<rect data-layer="background" width="1024" height="1024" fill="${paperToken}"/>`}
    ${backgroundPattern}
    <rect data-layer="frame" x="52" y="52" width="920" height="920" rx="${subject === "plastering" ? "34" : "78"}" fill="none" stroke="${inkToken}" stroke-opacity="${transparent ? "0" : "0.08"}" stroke-width="4"/>
    <g data-layer="mark" transform="${markTransform}">
      ${subjectMark}
    </g>
    ${wordmark}
    <line data-layer="accent" x1="274" y1="${lineY}" x2="750" y2="${lineY}" stroke="${accentToken}" stroke-width="10" stroke-linecap="round"/>
    <text data-layer="tagline" x="512" y="${subtitleY}" text-anchor="middle" font-family="${supportFamily}" font-size="25" font-weight="850" fill="${inkToken}" opacity="0.64" letter-spacing="${typographySystem.subtitleTracking || 5}" font-kerning="normal" text-rendering="geometricPrecision">${subtitle || "CUSTOM LOGO MARK"}</text>
  </svg>`;
}

function buildFallbackLogo({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const creativeBrief = buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const baseSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant: 0, director: creativeBrief });
  const transparentSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant: 0, transparent: true, director: creativeBrief });
  const subject = creativeBrief.category;
  const variantIds = [0, 1, 2, 3];
  const variationNames = ["Primary", "Editorial", "Bold", "Monogram", "Icon System", "Premium Lockup"];
  const variations = variantIds.map((variant) => {
    const concept = creativeBrief.concepts[variant % creativeBrief.concepts.length] || {};
    const svg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant, director: creativeBrief });
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

  return {
    image: svgToDataUrl(baseSvg),
    svg: svgToDataUrl(baseSvg),
    transparentSvg: svgToDataUrl(transparentSvg),
    creativeBrief,
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
    const { logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt } = JSON.parse(event.body || "{}");

    if (!logoPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Logo prompt is required." }),
      };
    }

    const finalPrompt = buildLogoPrompt({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
    const vectorLogo = buildFallbackLogo({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
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
