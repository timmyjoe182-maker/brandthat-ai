const CATEGORY_PROFILES = [
  {
    key: "coffee",
    match: /\b(coffee|espresso|latte|cafe|café|brew|roast|caffeine)\b/i,
    category: "mobile coffee and outdoor hospitality",
    audience: "hikers, trail crews, event organizers, and outdoor groups who want a quality coffee ritual without leaving the route or venue",
    voiceTraits: ["Trail-ready", "Warm", "Energizing"],
    positioning: "Own the moment between outdoor adventure and specialty coffee: a mobile coffee stop that feels rugged enough for the trail and polished enough for planned events.",
    visualDirection: "Use weathered neutrals, deep coffee brown, pine green, and sunrise amber with tactile photography, route-map details, and sturdy typography that can live on cups, vans, menus, and event signage.",
    colors: ["#2a2119", "#f4ead8", "#48624a", "#c47a38"],
  },
  {
    key: "interiors",
    match: /\b(interior|home|room|styling|decor|furniture|apartment|house|homeowner)\b/i,
    category: "local interior styling",
    audience: "first-time homeowners, apartment owners, and local families who want their space to feel finished without committing to a full-service design firm",
    voiceTraits: ["Practical", "Warm", "Tasteful"],
    positioning: "Position as the approachable design partner for real homes: editorial taste translated into affordable, step-by-step room decisions.",
    visualDirection: "Use warm plaster, soft charcoal, muted clay, and olive accents with natural light, before-and-after room framing, handwritten notes, and elegant but readable serif/sans typography.",
    colors: ["#312b25", "#f5eadc", "#b98463", "#7a8065"],
  },
  {
    key: "software",
    match: /\b(software|app|saas|platform|dashboard|workspace|invoice|sponsorship|creator|creators|tool)\b/i,
    category: "creator operations software",
    audience: "independent creators, small talent managers, and sponsorship-driven teams who need cleaner control over deals, invoices, deliverables, and campaign notes",
    voiceTraits: ["Clear", "Composed", "Operator-minded"],
    positioning: "Differentiate as the calm business layer for creators: less chaotic than spreadsheets, lighter than agency software, and built around sponsorship work.",
    visualDirection: "Use crisp monochrome, cool graphite, soft blue-gray, and a precise accent color with clean interface crops, task states, deal cards, and typography that feels fast and organized.",
    colors: ["#111317", "#f7f8f5", "#6d7f91", "#a9c6c7"],
  },
  {
    key: "apparel",
    match: /\b(apparel|shirt|hoodie|merch|clothing|fashion|wear|bag|goods|gear|outdoor|carry)\b/i,
    category: "physical goods and apparel",
    audience: "style-aware customers who want useful products with a stronger point of view than generic merchandise",
    voiceTraits: ["Useful", "Durable", "Confident"],
    positioning: "Build around the specific lifestyle job the product performs, then make every touchpoint feel like a practical object with taste.",
    visualDirection: "Use strong black, warm paper, muted utility tones, close-up material photography, product-detail language, and compact typography that works on labels, tags, packaging, and social.",
    colors: ["#11110f", "#fffdf8", "#d7c5ad", "#747863"],
  },
  {
    key: "service",
    match: /\b(service|local|consulting|studio|agency|booking|clients|events)\b/i,
    category: "local service business",
    audience: "local customers who need a reliable specialist, clear pricing expectations, and proof that the service will make their life easier",
    voiceTraits: ["Helpful", "Direct", "Trust-building"],
    positioning: "Lead with the customer outcome and the buying path, then make the brand feel easier to choose than the larger, slower alternatives.",
    visualDirection: "Use grounded neutrals, one memorable accent, real work-in-progress imagery, clear service packages, and typography that feels professional without becoming corporate.",
    colors: ["#1f1d1a", "#fbf5ea", "#8a6f52", "#5d7163"],
  },
];

function clean(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function sentenceCase(value) {
  const text = clean(value);
  return text ? text.charAt(0).toUpperCase() + text.slice(1).replace(/\.$/, "") : "";
}

function inferProfile(draft) {
  const haystack = [draft.name, draft.description, draft.industry, draft.audience, draft.style, draft.desiredFeeling, draft.locationMarket].map(clean).join(" ");
  return CATEGORY_PROFILES.find((profile) => profile.match.test(haystack)) || {
    key: "general",
    category: clean(draft.industry, "early-stage brand"),
    audience: "customers whose daily routine, taste, or work would clearly improve if this idea delivered on its promise",
    voiceTraits: ["Focused", "Credible", "Distinct"],
    positioning: "Define the strongest customer outcome, then make the brand known for that one useful transformation instead of a broad category claim.",
    visualDirection: "Use a restrained neutral foundation, one memorable accent, confident typography, and real-use imagery that shows what changes for the customer.",
    colors: ["#11110f", "#fffdf8", "#c8b79c", "#59645a"],
  };
}

function mergeAudience(inputAudience, profileAudience) {
  const audience = clean(inputAudience);
  if (!audience) return profileAudience;
  return `${sentenceCase(audience)} who need the specific outcome described in this idea, with messaging calibrated beyond the broader ${profileAudience}.`;
}

function mergeStyle(inputStyle, profile) {
  const style = clean(inputStyle);
  if (!style) return profile.voiceTraits;
  const terms = style.split(/[,/]| and /i).map((term) => clean(term)).filter(Boolean).slice(0, 3);
  return [...terms, ...profile.voiceTraits].slice(0, 3).map(sentenceCase);
}

export function buildPreviewFromDraft(draft = {}) {
  const name = clean(draft.name, "Your Brand");
  const description = clean(draft.description, "an early business idea");
  const industry = clean(draft.industry || draft.locationMarket, "");
  const profile = inferProfile(draft);
  const category = industry || profile.category;
  const audience = mergeAudience(draft.audience, profile.audience);
  const voiceTraits = mergeStyle(draft.style || draft.desiredFeeling, profile);
  const stylePhrase = clean(draft.style || draft.desiredFeeling, voiceTraits.join(", ").toLowerCase());

  return {
    thesis: `${name} should become the ${category} brand that turns "${description}" into a clear customer promise: useful enough to understand quickly and distinctive enough to remember.`,
    audience,
    traits: voiceTraits,
    positioning: `${profile.positioning} For ${name}, the sharper angle is to sell the situation and outcome, not just the product or service.`,
    visualDirection: `${profile.visualDirection} The requested personality should feel ${stylePhrase.toLowerCase()} without losing category clarity.`,
    colors: profile.colors,
  };
}
