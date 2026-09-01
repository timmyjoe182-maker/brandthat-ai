const CATEGORY_PROFILES = [
  {
    key: "guided-journaling",
    match: /\b(journal|journaling|reflection|reflective|manager|managers|leadership|overwhelmed|clarity|difficult conversation|weekly planning|guided prompt|private writing)\b/i,
    category: "guided journaling and leadership support app",
    audience: "overwhelmed first-time managers who need calm, private structure for reflection, weekly planning, and difficult conversations",
    voiceTraits: ["Calm", "Supportive", "Practical"],
    positioning: "Position as a quiet leadership companion: guided reflection that helps new managers organize thoughts, build confidence, and prepare for the moments they usually carry alone.",
    visualDirection: "Use soft contrast, warm paper tones, deep ink, muted blue-green, simple editorial layouts, private writing cues, and calm product moments that feel supportive without becoming clinical or corporate.",
    colors: ["#141512", "#f7f0e4", "#6f8a83", "#b9a27b"],
  },
  {
    key: "houseplants",
    match: /\b(plant|plants|houseplant|houseplants|botanical|greenery|subscription|low-maintenance|natural light|apartment renter|plant care)\b/i,
    category: "houseplant subscription and care service",
    audience: "apartment renters, busy beginners, and people with limited natural light who want the feeling of a calmer home without guessing which plants will survive",
    voiceTraits: ["Fresh", "Encouraging", "Practical"],
    positioning: "Own confidence for new plant owners: a local subscription that pairs resilient plants with simple care guidance, so renters can make their homes feel alive without becoming plant experts.",
    visualDirection: "Use calm greens, stone gray, warm ivory, and soft terracotta with bright apartment photography, simple care cards, delivery moments, and readable botanical typography that feels fresh without becoming a generic wellness brand.",
    colors: ["#1f3d32", "#f7f2e8", "#879f73", "#b88a63"],
  },
  {
    key: "pet-service",
    match: /\b(dog|pet|pets|groom|grooming|puppy|senior pet|families|mobile service|at-home)\b/i,
    category: "mobile pet care service",
    audience: "busy families, senior pet owners, and local households who want gentle, convenient grooming without stressful travel or long salon waits",
    voiceTraits: ["Gentle", "Reliable", "Comforting"],
    positioning: "Own convenience plus care: a mobile grooming service that makes pets feel safe and gives owners a cleaner, easier way to stay on top of grooming.",
    visualDirection: "Use clean warm whites, soft charcoal, calming blue-green, and a friendly accent with natural pet photography, van/service cues, hygiene details, and rounded typography that feels trustworthy without becoming childish.",
    colors: ["#26302d", "#fff8ed", "#7aa6a1", "#d7a66f"],
  },
  {
    key: "mobile-outdoor-coffee",
    match: /\b(mobile coffee|coffee truck|coffee cart|hikers?|trail|trails?|outdoor events?|event coffee|campsite|trailhead)\b/i,
    category: "mobile coffee and outdoor hospitality",
    audience: "hikers, trail crews, event organizers, and outdoor groups who want a quality coffee ritual without leaving the route or venue",
    voiceTraits: ["Trail-ready", "Warm", "Energizing"],
    positioning: "Own the moment between outdoor adventure and specialty coffee: a mobile coffee stop that feels rugged enough for the trail and polished enough for planned events.",
    visualDirection: "Use weathered neutrals, deep coffee brown, pine green, and sunrise amber with tactile photography, route-map details, and sturdy typography that can live on cups, vans, menus, and event signage.",
    colors: ["#2a2119", "#f4ead8", "#48624a", "#c47a38"],
  },
  {
    key: "coffee-ritual",
    match: /\b(coffee|espresso|latte|cafe|café|brew|roast|caffeine|small-batch|morning ritual)\b/i,
    category: "small-batch coffee and morning ritual",
    audience: "busy creative people who want a calm, premium morning coffee ritual without coffee-shop pretension",
    voiceTraits: ["Calm", "Premium", "Unpretentious"],
    positioning: "Own the calmer start to creative work: small-batch coffee that makes the morning feel considered, focused, and quietly premium without turning the ritual into a performance.",
    visualDirection: "Use deep coffee brown, warm cream, soft copper, and quiet charcoal with morning light, ceramic mugs, roasted texture, simple packaging, and editorial typography that feels premium without cafe cliche.",
    colors: ["#35241b", "#f7efe2", "#b8794a", "#2c2a27"],
  },
  {
    key: "interiors",
    match: /\b(interior|room|styling|decor|furniture|homeowner)\b/i,
    category: "local interior styling",
    audience: "first-time homeowners, apartment owners, and local families who want their space to feel finished without committing to a full-service design firm",
    voiceTraits: ["Practical", "Warm", "Tasteful"],
    positioning: "Position as the approachable design partner for real homes: editorial taste translated into affordable, step-by-step room decisions.",
    visualDirection: "Use warm plaster, soft charcoal, muted clay, and olive accents with natural light, before-and-after room framing, handwritten notes, and elegant but readable serif/sans typography.",
    colors: ["#312b25", "#f5eadc", "#b98463", "#7a8065"],
  },
  {
    key: "software",
    match: /\b(software|saas|invoice|invoices|sponsorship|sponsorships|deliverable|deliverables|campaign management|creator operations|workflow software|creator platform)\b/i,
    category: "sponsorship workflow software",
    audience: "independent creators, small talent managers, and sponsorship-driven teams who need cleaner control over deals, invoices, deliverables, and campaign notes",
    voiceTraits: ["Clear", "Composed", "Operator-minded"],
    positioning: "Differentiate as the calm business layer for creators: a focused workflow that keeps sponsorship status, invoices, and deliverables easier to understand and act on.",
    visualDirection: "Use crisp monochrome, cool graphite, soft blue-gray, and a precise accent color with clean product screenshots, workflow summaries, status labels, and typography that feels fast and organized.",
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
  const primaryText = [draft.name, draft.description].map(clean).join(" ");
  const optionalText = [draft.industry, draft.audience, draft.style, draft.desiredFeeling, draft.locationMarket].map(clean).join(" ");
  const primaryProfile = CATEGORY_PROFILES.find((profile) => profile.match.test(primaryText));
  if (primaryProfile) return primaryProfile;

  const optionalProfile = CATEGORY_PROFILES.find((profile) => profile.match.test(optionalText));
  if (optionalProfile) return optionalProfile;

  return {
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
  return `${sentenceCase(audience)} who want the brand to solve a clear practical problem while still feeling easy to trust, remember, and choose.`;
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
  const promise = description.replace(/^a\s+/i, "").replace(/\.$/, "");
  const thesisByProfile = {
    "guided-journaling": `${name} gives first-time managers a calmer way to reflect, plan, and prepare for leadership moments through guided journaling.`,
    houseplants: `${name} makes apartment greenery easy by pairing resilient houseplants with local delivery and straightforward care guidance.`,
    "pet-service": `${name} brings gentle grooming to the customer's doorstep, making pet care easier for busy families and senior pet owners.`,
    "mobile-outdoor-coffee": `${name} turns outdoor gatherings into a better coffee ritual with a mobile setup built for trails, events, and fresh-air energy.`,
    "coffee-ritual": `${name} gives busy creative people a calmer, more premium morning coffee ritual without coffee-shop pretension.`,
    interiors: `${name} helps first-time homeowners make rooms feel finished through affordable local interior styling and clear design decisions.`,
    software: `${name} gives creators software for a calmer way to manage sponsorships, invoices, deliverables, and campaign follow-through.`,
    apparel: `${name} turns useful everyday goods into a brand system people can recognize, wear, and carry.`,
    service: `${name} makes the service feel easier to choose by clarifying the outcome, process, and customer proof from the first touchpoint.`,
  };
  const visualDirection = profile.visualDirection.replace(/\.$/, "");

  return {
    thesis: thesisByProfile[profile.key] || `${name} turns ${promise} into a focused ${category} promise with a clear audience, practical value, and a reason to choose it.`,
    audience,
    traits: voiceTraits,
    positioning: profile.positioning,
    visualDirection: `${visualDirection}. Let the ${stylePhrase.toLowerCase()} personality show through the palette, typography, and real-use imagery.`,
    colors: profile.colors,
  };
}
