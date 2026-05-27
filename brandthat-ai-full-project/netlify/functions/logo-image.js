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
  const source = `${brandName || ""} ${logoIndustry || ""} ${logoStyle || ""} ${logoSymbol || ""} ${logoColors || ""} ${userPrompt || ""}`.trim() || String(logoPrompt || "Brand");
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
  const displayName = (brandWords.length ? brandWords.slice(0, 3) : words.slice(0, 3)).join(" ") || "Brand";
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
  };

  const fallback = [
    ["Meaning-First Mark", "custom symbol based on the strongest nouns in the brand request", profile.isLuxury ? "premium serif or refined sans" : "clean bold wordmark", "black, white, one meaningful accent", "symbol above or beside wordmark", "It avoids random icons by anchoring the mark to the brand’s actual words."],
    ["Wordmark System", "distinct typography with a subtle embedded symbol", "customized readable type", "brand-appropriate restrained palette", "wordmark-led layout", "It keeps the brand name clear while adding ownable visual detail."],
    ["Category Emblem", "simple emblem built from the category and audience cues", "balanced display type", "high-contrast palette", "emblem and wordmark", "It makes the logo usable on websites, social, and merchandise."],
  ];

  return libraries[subject] || fallback;
}

function buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const inferredName = inferBrandName({ brandName, userPrompt, logoPrompt });
  const { words } = getLogoWords({ brandName: inferredName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const subject = getSubject(words);
  const profile = getStyleProfile({ logoStyle, logoIndustry, userPrompt });
  const styleText = [profile.isLuxury && "luxury", profile.isBold && "bold", profile.isMinimal && "clean", profile.isVintage && "heritage"].filter(Boolean).join(", ") || "professional";
  const audience = profile.isTrade
    ? "local customers who need a credible service provider"
    : subject === "tech"
      ? "founders, creators, and businesses looking for faster branding"
      : subject === "ranch"
        ? "premium lifestyle guests, partners, and private ranch followers"
        : subject === "law"
          ? "clients looking for trust, authority, and clarity"
          : "customers who need a clear, memorable brand";
  const concepts = getConceptLibrary(subject, profile).map(([name, symbol, typography, palette, layout, whyFits]) => ({
    name,
    style: styleText,
    symbol: logoSymbol || symbol,
    typography,
    palette: logoColors || palette,
    layout,
    whyFits,
  }));

  return {
    brandName: inferredName,
    category: subject,
    personality: styleText,
    targetAudience: audience,
    visualTerritory: concepts.map((concept) => concept.name).join(", "),
    avoid: logoAvoid || "Avoid random generic icons, misspelled text, crowded clip-art, and visuals unrelated to the brand words.",
    concepts,
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

function buildSubjectMark({ subject, ink, accent, paper, initials, variant = 0, profile = {} }) {
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
  const safeName = escapeXml(displayName);
  const inkToken = "var(--logo-ink)";
  const paperToken = "var(--logo-paper)";
  const accentToken = "var(--logo-accent)";
  const subjectVariant = subject === "plastering" ? variant % 6 : (hash + variant) % 3;
  const subjectMark = buildSubjectMark({ subject, ink: inkToken, accent: accentToken, paper: paperToken, initials, variant: subjectVariant, profile });
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
  }[subject];
  const subtitle = escapeXml(
    (subjectSubtitle || subtitleWords.join(" ") || subject.replace("-", " "))
      .toUpperCase()
  );
  const fontFamily = variant === 1
    ? "Georgia, Times New Roman, serif"
    : variant === 2
      ? "Arial Black, Arial, Helvetica, sans-serif"
      : "Inter, Arial, Helvetica, sans-serif";
  const layout = subject === "plastering" ? variant % 4 : (hash + variant) % 4;
  const markTransform = layout === 1 ? "translate(0 -42) scale(1.05)" : layout === 2 ? "translate(0 -28) scale(.98)" : layout === 3 ? "translate(0 -12) scale(.94)" : "";
  const nameY = layout === 1 ? 748 : layout === 2 ? 700 : layout === 3 ? 720 : 730;
  const lineY = nameY + 52;
  const subtitleY = lineY + 68;
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
    <text data-layer="wordmark" x="512" y="${nameY}" text-anchor="middle" font-family="${fontFamily}" font-size="${layout === 2 ? "72" : "82"}" font-weight="900" fill="${inkToken}" letter-spacing="-3">${safeName}</text>
    <line data-layer="accent" x1="274" y1="${lineY}" x2="750" y2="${lineY}" stroke="${accentToken}" stroke-width="10" stroke-linecap="round"/>
    <text data-layer="tagline" x="512" y="${subtitleY}" text-anchor="middle" font-family="${fontFamily}" font-size="27" font-weight="900" fill="${inkToken}" opacity="0.64" letter-spacing="5">${subtitle || "CUSTOM LOGO MARK"}</text>
  </svg>`;
}

function buildFallbackLogo({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
  const creativeBrief = buildCreativeDirector({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const baseSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant: 0, director: creativeBrief });
  const transparentSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant: 0, transparent: true, director: creativeBrief });
  const subject = creativeBrief.category;
  const variantIds = subject === "plastering" ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5];
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
