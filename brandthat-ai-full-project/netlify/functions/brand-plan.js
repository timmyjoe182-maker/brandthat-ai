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

function cleanSentencePart(value = "") {
  return clean(value).replace(/[.。]+$/g, "");
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
      return titleCase(match[1].replace(/\b(for|that|with|and|in|to|a|an|selling|sells|offering|offers|making|creates|creating|serving)\b.*$/i, ""));
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

function inferCoreOpportunity({ idea = "", industry = "", personality = "" } = {}) {
  const text = `${idea} ${industry} ${personality}`.toLowerCase();
  const signals = [
    ["luxury", ["luxury", "premium", "high-end", "private", "boutique", "elegant", "exclusive"]],
    ["convenience", ["fast", "easy", "simple", "delivery", "mobile", "same-day", "quick"]],
    ["trust", ["law", "legal", "medical", "clinic", "finance", "wealth", "real estate", "home", "repair", "contractor"]],
    ["craftsmanship", ["handmade", "artisan", "crafted", "ranch", "textile", "wood", "chocolate", "bakery", "plaster", "custom"]],
    ["speed", ["ai", "automation", "software", "saas", "startup", "workflow", "instant"]],
    ["status", ["fashion", "wedding", "luxury", "hotel", "estate", "jewelry"]],
    ["sustainability", ["organic", "natural", "eco", "sustainable", "farm", "ranch", "wellness"]],
    ["innovation", ["ai", "tech", "platform", "app", "robot", "future"]],
    ["nostalgia", ["vintage", "retro", "classic", "heritage", "old", "western"]],
    ["affordability", ["affordable", "budget", "family", "local", "everyday"]],
    ["joy", ["kids", "party", "candy", "confetti", "play", "fun"]],
  ];
  return signals.find(([, words]) => words.some((word) => text.includes(word)))?.[0] || "trust";
}

function buildBrandThesis({ brandName = "", industry = "", idea = "", opportunity = "", visualDefaults = {}, audience = "", positioning = "" } = {}) {
  const customer = cleanSentencePart(audience || visualDefaults.audience || `customers in the ${industry} category`);
  const difference = cleanSentencePart(positioning || visualDefaults.positioning || `a clearer, more specific version of a ${industry} brand`);
  return `${brandName} should be built around ${opportunity}: the customer is ${customer.toLowerCase()}, and they buy when the brand makes that choice feel more emotionally certain, useful, or rewarding. The brand is different because it turns ${cleanSentencePart(idea || industry).toLowerCase()} into ${difference.toLowerCase()}, creating a reason to choose it beyond price or availability. Every visual and message decision should reinforce that ${opportunity} promise.`;
}

const GENERIC_SECTION_PATTERNS = [
  /use readable typography/i,
  /use professional colors/i,
  /create a visual identity/i,
  /stand out/i,
  /build trust/i,
  /appeal to (a )?wide audience/i,
  /modern and professional/i,
  /clean and simple/i,
  /high quality/i,
  /target customers/i,
  /increase brand awareness/i,
  /engage with (your )?audience/i,
  /post consistently/i,
  /premium feel/i,
  /clear offer/i,
];

function isGenericRecommendation(value = "") {
  const text = clean(value);
  if (text.length < 55) return true;
  const lower = text.toLowerCase();
  if (GENERIC_SECTION_PATTERNS.some((pattern) => pattern.test(lower))) return true;
  const uniqueWords = new Set(lower.split(/[^a-z0-9]+/).filter((word) => word.length > 3));
  return uniqueWords.size < 9;
}

function ensureThesisDriven(value, replacement) {
  return isGenericRecommendation(value) ? replacement : clean(value);
}

function makeTaglines({ brandName, industry, opportunity }) {
  const noun = industry.replace(/\s*\/.*$/, "");
  const options = {
    luxury: [`${brandName}, quietly exceptional.`, `Made for the rare ${noun} moment.`, `A more considered way to choose ${noun}.`, `Where restraint becomes recognition.`],
    convenience: [`${brandName} makes the next step easier.`, `${noun} without the usual friction.`, `Less hassle. More momentum.`, `Built for the easy yes.`],
    trust: [`${brandName} brings certainty closer.`, `Clearer decisions for serious moments.`, `The steady way forward.`, `Confidence, handled with care.`],
    craftsmanship: [`${brandName}, shaped with care.`, `Craft you can recognize.`, `Made with origin, finished with intention.`, `A more personal kind of ${noun}.`],
    speed: [`${brandName} moves ideas faster.`, `Less waiting. Sharper work.`, `Momentum with a clearer system.`, `Built for the next version.`],
    status: [`${brandName} signals taste without noise.`, `Recognized by restraint.`, `For the moment that should feel elevated.`, `A sharper expression of taste.`],
    sustainability: [`${brandName}, rooted in better choices.`, `Natural progress, made visible.`, `A brand with origin and intention.`, `Better materials. Better meaning.`],
    innovation: [`${brandName} turns complexity into clarity.`, `The future, made usable.`, `A cleaner way to move forward.`, `Intelligence with a human reason.`],
    nostalgia: [`${brandName} brings heritage forward.`, `Old soul. New standard.`, `A classic feeling, remade with care.`, `Rooted in memory, built for now.`],
    affordability: [`${brandName} makes good feel reachable.`, `Better choices without the premium barrier.`, `Useful, honest, and within reach.`, `Everyday value with a clearer point of view.`],
    joy: [`${brandName} makes the moment brighter.`, `Built for the happy yes.`, `More color for the moments people remember.`, `A playful reason to gather.`],
  };
  return options[opportunity] || options.trust;
}

function buildStrategicRoadmap({ brandName, industry, opportunity, thesis, visualDefaults }) {
  const category = industry.replace(/\s*\/.*$/, "");
  return [
    {
      week: "Week 1",
      focus: `Prove the ${opportunity} promise`,
      actions: [
        `Rewrite the offer as one sentence that shows how ${brandName} delivers ${opportunity} in the ${category} category.`,
        `Choose three proof points from the business idea that support the thesis: ${thesis.split(".")[0]}.`,
        `Create a homepage headline and social bio that name the customer moment instead of describing the category.`,
        `Collect two real reference examples that show the desired standard for ${visualDefaults.moodboard.toLowerCase()}`,
      ],
    },
    {
      week: "Week 2",
      focus: "Translate strategy into identity",
      actions: [
        `Build the first identity direction around ${visualDefaults.symbols.toLowerCase()}`,
        `Test the typography direction on the brand name, one tagline, and one practical CTA to make sure it supports ${opportunity}.`,
        `Apply the color system to a profile image, simple landing section, and one mock social post.`,
        `Reject any visual choice that does not connect back to the thesis or the customer buying reason.`,
      ],
    },
    {
      week: "Week 3",
      focus: "Publish proof, not filler",
      actions: [
        `Publish a short origin post explaining why ${brandName} exists in this market.`,
        `Create three posts that show the customer problem, the ${opportunity} promise, and the specific offer.`,
        `Use one behind-the-scenes or process post to make the brand feel more specific than template competitors.`,
        `Ask five likely customers which message feels most believable and refine the positioning from their language.`,
      ],
    },
    {
      week: "Week 4",
      focus: "Turn the brand into a repeatable system",
      actions: [
        `Create a small launch page using the thesis, color system, typography system, and strongest proof points.`,
        `Build a simple outreach script that explains the customer benefit in one calm, specific paragraph.`,
        `Track which phrase gets replies, saves, inquiries, or clicks, then make that phrase the next month's message anchor.`,
        `Save the strongest visuals, taglines, and roadmap lessons into the Brand Workspace so the next iteration stays consistent.`,
      ],
    },
  ];
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
      audience: "Local diners and social-first food customers who choose restaurants from atmosphere, menu confidence, and visual proof before they ever read reviews.",
      positioning: "Position the brand as an experience-led restaurant rather than another menu. The strategy should make the food, room, and service rhythm feel like one memorable destination.",
      offer: "Lead with the signature dining moment: a focused menu, recognizable atmosphere, and one reason people would bring friends back.",
      moodboard: "Use editorial food photography, warm service details, menu closeups, signage, and table-lighting references because restaurants win trust through sensory proof.",
      typography: "Use a characterful display wordmark with a neutral grotesk support font because the logo needs appetite and personality while menus and booking pages stay easy to scan.",
      colors: "Use warm cream, charcoal, and one appetite cue such as terracotta, olive, or deep red because hospitality brands need warmth without looking like fast-food clipart.",
      symbols: "Use a restrained ingredient, flame, plate geometry, or custom wordmark detail only if it can become ownable packaging/signage language.",
      voice: "Sensory, welcoming, confident, and concrete. Mention food, setting, and occasion instead of generic passion or quality claims.",
    },
    "chocolate / confectionery": {
      audience: "Gift buyers, families, and small luxury shoppers who want sweets that feel personal, packaged, and worth giving rather than mass-market candy.",
      positioning: "Position the brand between handmade confectionery and boutique gift goods. The reason to believe should be craft, packaging charm, and a product story people can bring to holidays, dates, and thank-you moments.",
      offer: "Make the hero offer giftable chocolate boxes and handmade sweets with packaging that feels special enough to display or give.",
      moodboard: "Use premium wrappers, cocoa textures, ribbon details, embossed labels, gift-box photography, and warm counter lighting because confectionery brands are judged first by packaging desire.",
      typography: "Use a crafted serif or softened display wordmark paired with a clean label sans because the brand needs sweetness and shelf presence without becoming childish.",
      colors: "Use cocoa brown, cream, warm gold, and one candy accent such as cherry red or rose because it signals chocolate richness while leaving room for gift packaging.",
      symbols: "Use a cacao pod, ribbon seal, chocolate drop, wrapper fold, or custom candy-label letterform instead of a generic candy icon.",
      voice: "Warm, sensory, giftable, and specific. Talk about handmade batches, box moments, and flavor memories rather than generic deliciousness.",
    },
    "AI / technology": {
      audience: "Founders, operators, and teams who want speed and credibility from technology but will leave if the product feels gimmicky or overly technical.",
      positioning: "Position the brand as practical intelligence, not novelty AI. The core advantage should be faster decisions, cleaner workflow, or a sharper business outcome.",
      offer: "Lead with the workflow improvement the product creates: fewer manual steps, clearer output, better launch speed, or more consistent execution.",
      moodboard: "Use precise interface grids, monochrome product surfaces, subtle technical depth, and calm documentation references because modern tech trust comes from clarity and restraint.",
      typography: "Use a modern geometric sans with exact spacing and a slightly distinctive wordmark cut because AI brands need precision without defaulting to generic circuit aesthetics.",
      colors: "Use charcoal, white, silver, and one controlled technical accent such as electric blue or cyan because it feels current while avoiding cheap neon gradients.",
      symbols: "Use a system mark, abstract node, monogram, signal path, or interface tile that implies intelligence without literal robot/circuit clichés.",
      voice: "Clear, fast, precise, and outcome-led. Avoid AI hype and explain what gets easier for the customer.",
    },
    "law firm": {
      audience: "Clients facing high-stakes decisions who need calm authority, plain-language confidence, and proof that the firm can handle sensitive details.",
      positioning: "Position the firm around judgment and clarity rather than aggressive legal posturing. The brand should feel composed, confidential, and capable.",
      offer: "Lead with the practice focus and the relief clients get: a clearer path, fewer unknowns, and a trusted advocate.",
      moodboard: "Use quiet editorial documents, stone, paper, office details, and confident negative space because legal brands need authority without intimidation.",
      typography: "Use a refined serif wordmark with a restrained sans support because law firms need institutional trust and readable practical communication.",
      colors: "Use charcoal, ivory, navy, deep green, or brass because these palettes signal discretion and permanence instead of trendiness.",
      symbols: "Use initials, a seal, column abstraction, or no icon because legal identity should avoid cliché scales unless specifically requested.",
      voice: "Measured, direct, and reassuring. Explain legal outcomes in plain language instead of sounding theatrical.",
    },
    "real estate": {
      audience: "Buyers, sellers, investors, or luxury clients who judge credibility through taste, market confidence, and how clearly the brand handles large financial decisions.",
      positioning: "Position the brand as a calm market guide with taste and execution. It should feel more like a property advisory than a generic sales team.",
      offer: "Lead with the real estate outcome: better positioning, smoother transactions, stronger listing presentation, or more confident property decisions.",
      moodboard: "Use architectural lines, premium interiors, exterior details, quiet neighborhood photography, and editorial spacing because real estate trust is visual and financial.",
      typography: "Use an elegant serif or high-end sans wordmark with wide spacing because the brand must feel established before a client shares a listing or budget.",
      colors: "Use stone, ivory, charcoal, forest, slate, or champagne because property brands need permanence, restraint, and high-value calm.",
      symbols: "Use architectural monogram geometry, a subtle roofline, stone mark, or location abstraction instead of a basic house icon.",
      voice: "Calm, knowledgeable, and polished. Speak in terms of property goals, market clarity, and guided decisions.",
    },
    "construction / trades": {
      audience: "Homeowners, builders, and local project buyers who need proof of reliability, clean workmanship, and clear communication before they request a quote.",
      positioning: "Position the company around dependable finish quality and jobsite professionalism rather than generic contractor toughness.",
      offer: "Lead with the service outcome: cleaner finish, reliable scheduling, transparent estimates, and work that makes the property feel cared for.",
      moodboard: "Use clean jobsite photography, finished surfaces, workwear, trucks, signage, and material texture because trades brands earn trust through visible proof.",
      typography: "Use a sturdy sans serif with strong weight and generous spacing because local-service logos must stay readable on trucks, shirts, invoices, and yard signs.",
      colors: "Use black, white, steel gray, navy, safety orange, or deep green because trades brands need contrast, durability, and easy vehicle visibility.",
      symbols: "Use surface geometry, shield forms, hard-edge initials, or material texture instead of generic tools unless a tool is core to the service.",
      voice: "Plainspoken, reliable, and specific. Mention estimates, scheduling, finish quality, and jobsite respect.",
    },
    "ranch / western lifestyle": {
      audience: "Lifestyle buyers, visitors, gift customers, and premium rural-content followers who are drawn to origin stories, animals, land, and products that feel slower, more personal, and less mass-produced.",
      positioning: "Position the brand between working ranch authenticity and elevated lifestyle goods. The strategy should make the ranch origin feel like the reason the product or experience has more character than a generic boutique brand.",
      offer: "Lead with the ranch-rooted moment: animals, land, handmade goods, private visits, gifting, or storytelling that customers cannot get from a standard lifestyle company.",
      moodboard: "Use warm natural light, animal details, weathered materials, refined packaging, fence lines, textiles, leather, wool, and quiet landscape photography because the brand needs origin without looking costume-western.",
      typography: "Use a refined serif or softened western-influenced wordmark paired with a clean sans because the brand needs heritage and warmth without becoming a novelty ranch logo.",
      colors: "Use cream, charcoal, saddle brown, natural wool, muted sage, and warm brass because these colors turn the ranch story into a premium lifestyle palette rather than a rustic cliché.",
      symbols: "Use a subtle animal silhouette, ranch monogram, textile mark, land contour, gate shape, or heritage seal only if it feels ownable and restrained.",
      voice: "Warm, grounded, sensory, and origin-led. Talk about land, animals, craft, and care instead of generic countryside charm.",
    },
  };

  return defaults[industry] || {
    audience: "Customers who need a clear reason to trust this specific brand before choosing it over familiar local or online alternatives.",
    positioning: "Position the brand around one concrete advantage from the idea, then make every visual and message choice reinforce that advantage.",
    offer: "Lead with the specific transformation, product, or service moment the customer is actually buying.",
    moodboard: "Use real product/service moments, tactile details, editorial spacing, and restrained brand applications because the identity needs to feel usable, not imaginary.",
    typography: "Use a distinctive but readable wordmark paired with a neutral support typeface because the brand needs personality at the logo level and clarity everywhere else.",
    colors: "Use a restrained base palette tied to the product, place, or customer emotion, plus one accent that can become recognizable across packaging and social assets.",
    symbols: "Use a custom monogram, abstract brand mark, or carefully chosen category cue that connects to the idea without feeling like stock clipart.",
    voice: "Specific, grounded, and benefit-led. Explain the customer moment and avoid generic claims about quality or passion.",
  };
}

function buildFallbackBrandPlan(input = {}) {
  const idea = clean(input.idea || input.rawPrompt || input.description);
  const brandName = inferBrandName({ brandName: input.brandName, idea });
  const industry = inferIndustry(`${brandName} ${idea} ${input.positioning || ""}`);
  const colors = clean(input.colors || extractColors(idea));
  const visualDefaults = getIndustryVisualDefaults(industry);
  const coreOpportunity = inferCoreOpportunity({ idea, industry, personality: input.personality });
  const thesisAudience = clean(input.audience) || visualDefaults.audience;
  const thesisPositioning = clean(input.positioning) || visualDefaults.positioning;
  const brandThesis = buildBrandThesis({
    brandName,
    industry,
    idea,
    opportunity: coreOpportunity,
    visualDefaults,
    audience: thesisAudience,
    positioning: thesisPositioning,
  });
  const personality = clean(input.personality) || `Shape the personality around ${coreOpportunity}: ${visualDefaults.voice} Every tone choice should make the customer believe the thesis rather than just describe the category.`;
  const targetAudience = clean(input.audience) || `${visualDefaults.audience} This audience matters because the ${coreOpportunity} thesis depends on reaching buyers who notice the difference between a generic option and a brand with a sharper reason to exist.`;
  const positioning = clean(input.positioning) || `${visualDefaults.positioning} Anchor the position in ${coreOpportunity} so ${brandName} is not competing on category description alone.`;
  const coreOffer = clean(input.offer) || `${visualDefaults.offer} This offer should be the proof point that makes the ${coreOpportunity} thesis tangible in the first customer interaction.`;
  const colorSystem = colors
    ? `${colors}. Use those requested colors as the base, then apply them with the ${coreOpportunity} thesis in mind: one dominant neutral, one controlled accent, and enough contrast for web, packaging, social, and logo use.`
    : `${visualDefaults.colors} Choose the palette because it makes the ${coreOpportunity} promise visible before a customer reads the copy.`;
  const typographySystem = clean(input.typography) || `${visualDefaults.typography} This type system supports the thesis by giving ${brandName} the right balance of category credibility and emotional distinction.`;
  const moodboardDirection = clean(input.moodboard) || `${visualDefaults.moodboard} Every reference should prove the ${coreOpportunity} opportunity, not simply decorate the category.`;
  const visualIdentityDirection = clean(input.visualDirection) || `Build the visual system around ${visualDefaults.symbols} because that gives ${brandName} a category-aware identity without falling into a template. The direction should make the ${coreOpportunity} thesis visible through spacing, mark restraint, and practical applications.`;
  const taglineIdeas = makeTaglines({ brandName, industry, opportunity: coreOpportunity });
  const launchRoadmap30Days = buildStrategicRoadmap({ brandName, industry, opportunity: coreOpportunity, thesis: brandThesis, visualDefaults });

  return {
    brandName,
    coreOpportunity,
    brandThesis,
    brandSummary: `${brandName} is a ${industry} concept organized around ${coreOpportunity}. The brand plan turns "${idea || brandName}" into a specific strategic direction so messaging, visuals, launch content, and logo concepts all point to the same customer reason to care.`,
    targetAudience,
    positioning,
    brandPersonality: personality,
    competitorCategory: `${industry} brands that sell the same surface-level service, plus template-looking alternatives that fail to express the ${coreOpportunity} reason customers would choose ${brandName}.`,
    pricePositioning: idea.toLowerCase().match(/luxury|premium|high-end|private|boutique/) || ["luxury", "status", "craftsmanship"].includes(coreOpportunity)
      ? `Premium, value-led pricing because the thesis asks customers to see ${brandName} as a more considered choice, not a commodity.`
      : `Accessible but not throwaway pricing because the ${coreOpportunity} opportunity needs the brand to feel useful, credible, and worth choosing over cheaper anonymous options.`,
    coreMessage: `${brandName} gives customers a ${coreOpportunity}-led reason to choose this ${industry} brand: the offer feels specific, the experience feels intentional, and the promise is easier to believe than a generic competitor claim.`,
    coreOffer,
    visualIdentityDirection,
    moodboardDirection,
    typographySystem,
    colorSystem,
    brandVoice: `${visualDefaults.voice} Tie every line back to the thesis: customers should understand the ${coreOpportunity} promise in the product description, launch posts, CTAs, and logo rationale.`,
    taglineIdeas,
    launchRoadmap30Days,
    nextStepActionPlan: [
      `Save this plan so ${brandName}'s ${coreOpportunity} thesis becomes the source of truth for every future asset.`,
      `Generate logo concepts using the moodboard, typography, colors, and symbol logic tied to the thesis.`,
      `Create launch captions and hashtags that explain why this ${industry} brand deserves attention now.`,
      `Use the roadmap to test which proof points make customers believe the thesis fastest.`,
    ],
    workspaceContext: {
      industry,
      coreOpportunity,
      brandThesis,
      offer: coreOffer,
      differentiator: positioning,
      audience: targetAudience,
      personality,
      visualDirection: visualIdentityDirection,
      moodboard: moodboardDirection,
      typography: typographySystem,
      colors: colorSystem,
      roadmapGoal: clean(input.roadmapGoal) || `Launch with proof that ${brandName}'s ${coreOpportunity} promise is believable, useful, and visually distinct.`,
    },
    logoContext: {
      brandName,
      industry,
      coreOpportunity,
      brandThesis,
      style: personality,
      symbolIdeas: visualDefaults.symbols,
      colors: colorSystem,
      typography: typographySystem,
      avoid: "Wrong brand name, unrelated industry cues, tiny marks, clipart, clutter, unreadable text, and generic template layouts.",
    },
  };
}

function validateBrandPlan(plan = {}, input = {}) {
  const fallback = buildFallbackBrandPlan(input);
  const output = { ...fallback, ...(plan || {}) };
  const requiredStrings = [
    "brandName",
    "coreOpportunity",
    "brandThesis",
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
    if (key === "brandName") {
      output[key] = value || fallback[key];
      return;
    }
    if (key === "coreOpportunity") {
      output[key] = value || fallback[key];
      return;
    }
    output[key] = ensureThesisDriven(value, fallback[key]);
  });

  output.brandName = inferBrandName({ brandName: output.brandName, idea: input.idea || input.rawPrompt });
  output.coreOpportunity = clean(output.coreOpportunity) || fallback.coreOpportunity;
  output.brandThesis = ensureThesisDriven(output.brandThesis, fallback.brandThesis);
  if (!output.brandThesis.toLowerCase().includes(output.coreOpportunity.toLowerCase())) {
    output.brandThesis = fallback.brandThesis;
  }

  output.taglineIdeas = toArray(output.taglineIdeas, fallback.taglineIdeas)
    .filter((tagline) => !isGenericRecommendation(`${tagline} ${output.brandName} ${output.coreOpportunity}`))
    .slice(0, 6);
  if (output.taglineIdeas.length < 3) output.taglineIdeas = fallback.taglineIdeas;

  output.launchRoadmap30Days = Array.isArray(output.launchRoadmap30Days) ? output.launchRoadmap30Days : fallback.launchRoadmap30Days;
  output.launchRoadmap30Days = output.launchRoadmap30Days.slice(0, 4).map((item, index) => ({
    week: clean(item.week) || `Week ${index + 1}`,
    focus: ensureThesisDriven(item.focus, fallback.launchRoadmap30Days[index]?.focus || `Build around ${output.coreOpportunity}`),
    actions: toArray(item.actions, fallback.launchRoadmap30Days[index]?.actions || [])
      .map((action, actionIndex) => ensureThesisDriven(action, fallback.launchRoadmap30Days[index]?.actions?.[actionIndex] || fallback.launchRoadmap30Days[index]?.actions?.[0] || `Connect this step to ${output.coreOpportunity}.`))
      .slice(0, 5),
  }));

  if (output.launchRoadmap30Days.length < 4) output.launchRoadmap30Days = fallback.launchRoadmap30Days;
  output.nextStepActionPlan = toArray(output.nextStepActionPlan, fallback.nextStepActionPlan)
    .map((step, index) => ensureThesisDriven(step, fallback.nextStepActionPlan[index] || fallback.nextStepActionPlan[0]))
    .slice(0, 6);
  if (output.nextStepActionPlan.length < 3) output.nextStepActionPlan = fallback.nextStepActionPlan;

  output.workspaceContext = { ...fallback.workspaceContext, ...(output.workspaceContext || {}) };
  output.logoContext = { ...fallback.logoContext, ...(output.logoContext || {}) };
  output.workspaceContext.coreOpportunity = output.coreOpportunity;
  output.workspaceContext.brandThesis = output.brandThesis;
  output.logoContext.coreOpportunity = output.coreOpportunity;
  output.logoContext.brandThesis = output.brandThesis;
  output.logoContext.brandName = output.brandName;
  output.logoContext.industry = clean(output.logoContext.industry) || output.workspaceContext.industry || fallback.logoContext.industry;
  output.workspaceContext.industry = clean(output.workspaceContext.industry) || output.logoContext.industry;

  return output;
}

function formatBrandPlanText(plan) {
  const roadmap = plan.launchRoadmap30Days
    .map((item) => `${item.week}: ${item.focus}\n${item.actions.map((action) => `- ${action}`).join("\n")}`)
    .join("\n\n");

  return `1. Core opportunity and brand thesis
Core opportunity: ${plan.coreOpportunity}
${plan.brandThesis}

2. Brand name and summary
${plan.brandName}
${plan.brandSummary}

3. Positioning
${plan.positioning}

4. Target customer
${plan.targetAudience}

5. Core offer
${plan.coreOffer}

6. Brand personality
${plan.brandPersonality}

7. Visual identity direction
${plan.visualIdentityDirection}

8. Moodboard direction
${plan.moodboardDirection}

9. Typography system
${plan.typographySystem}

10. Color system
${plan.colorSystem}

11. Brand voice and taglines
${plan.brandVoice}
Taglines: ${plan.taglineIdeas.join(" / ")}

12. Practical 30-day launch roadmap
${roadmap}

13. Next-step action plan
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
brandName, coreOpportunity, brandThesis, brandSummary, targetAudience, positioning, brandPersonality, competitorCategory, pricePositioning, coreMessage, coreOffer, visualIdentityDirection, moodboardDirection, typographySystem, colorSystem, brandVoice, taglineIdeas, launchRoadmap30Days, nextStepActionPlan, workspaceContext, logoContext.

New architecture:
1. First identify the coreOpportunity. Choose the primary business opportunity from ideas like luxury, convenience, trust, craftsmanship, speed, status, sustainability, innovation, nostalgia, affordability, joy, or a similarly specific opportunity.
2. Then write brandThesis as one paragraph explaining why customers buy, what makes this brand different, and what emotional need the brand serves.
3. Every later section must derive from brandThesis. Positioning, audience, moodboard, typography, colors, roadmap, taglines, and voice must reference the thesis logic or the coreOpportunity.

Rules:
- Correct obvious typos but preserve the intended brand name.
- If no brand name exists, suggest one concise name.
- Never define what a section means. Make strategic decisions.
- Never output generic advice such as "use readable typography", "use professional colors", "create a visual identity", "stand out", "build trust", "modern and professional", or "post consistently".
- If a section could apply to 1000 businesses, it is invalid.
- Every section must answer why this recommendation fits this specific business.
- Creative direction must explain why the visual choices support the brandThesis.
- Typography must name a type direction and why it supports the thesis.
- Colors must name a palette direction and why it supports the thesis.
- Roadmap actions must be specific to the brand, category, customer reason, and thesis.
- Make visual direction useful for logo generation.
- Make roadmap actions concrete and realistic.
- No asterisks, emoji, or decorative formatting.
- launchRoadmap30Days must be four week objects with week, focus, actions.
- workspaceContext must include coreOpportunity, brandThesis, industry, offer, differentiator, audience, personality, visualDirection, moodboard, typography, colors, roadmapGoal.
- logoContext must include brandName, coreOpportunity, brandThesis, industry, style, symbolIdeas, colors, typography, avoid.
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
      temperature: 0.55,
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
