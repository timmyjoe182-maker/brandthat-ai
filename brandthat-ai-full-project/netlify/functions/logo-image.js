const OpenAI = require("openai");

function getOpenAiClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function buildLogoPrompt({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt }) {
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

Design requirements:
- Make the image itself the final logo concept, not an explanation.
- Follow every user field exactly when they describe a brand name, industry, mascot, object, color, letter, style, or mood.
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
  if (hasWord(words, ["roof", "roofing", "shingle"])) return "roofing";
  if (hasWord(words, ["landscape", "lawn", "garden", "tree"])) return "landscaping";
  if (hasWord(words, ["barber", "salon", "hair"])) return "barber";
  if (hasWord(words, ["cow", "cattle", "ranch"])) return "ranch";
  if (hasWord(words, ["coffee", "cafe"])) return "coffee";
  if (hasWord(words, ["real", "estate", "home", "house"])) return "realestate";
  if (hasWord(words, ["beauty", "wellness", "spa"])) return "wellness";
  if (hasWord(words, ["ai", "tech", "software", "saas"])) return "tech";
  return "abstract";
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
    return `
      <circle cx="512" cy="346" r="184" fill="${ink}"/>
      <path d="M370 378 Q512 230 654 378" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round"/>
      <path d="M420 416 Q512 352 604 416" fill="none" stroke="${paper}" stroke-width="16" stroke-linecap="round"/>
      <circle cx="462" cy="334" r="18" fill="${paper}"/>
      <circle cx="562" cy="334" r="18" fill="${paper}"/>
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

function buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant = 0, transparent = false }) {
  const { displayName, initials, words } = getLogoWords({ brandName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const hash = hashString(`${brandName} ${logoIndustry} ${logoStyle} ${logoSymbol} ${logoColors} ${userPrompt} ${logoPrompt} ${variant}`);
  const profile = getStyleProfile({ logoStyle, logoIndustry, userPrompt });
  const palettes = [
    ["#111111", "#f7f4ed", "#9b7b3f"],
    ["#10231f", "#f5f1e8", "#c7a45a"],
    ["#1a1a2e", "#f8f7f2", "#4f7cff"],
    ["#171717", "#ffffff", "#e0502f"],
    ["#24342f", "#fbfaf6", "#7c9a6d"],
    ["#0f172a", "#f8fafc", "#38bdf8"],
  ];
  const [ink, paper, accent] = getRequestedColors(logoColors) || palettes[(hash + variant) % palettes.length];
  const subject = getSubject(words);
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
  const baseSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant: 0 });
  const transparentSvg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant: 0, transparent: true });
  const { words } = getLogoWords({ brandName, logoPrompt, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt });
  const subject = getSubject(words);
  const variantIds = subject === "plastering" ? [0, 1, 2, 3, 4, 5] : [0, 1, 2, 3];
  const variationNames = ["Primary", "Editorial", "Bold", "Monogram", "Trade Mark", "Contractor Badge"];
  const variations = variantIds.map((variant) => {
    const svg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant });
    return {
      id: `variation-${variant + 1}`,
      name: variationNames[variant] || `Variation ${variant + 1}`,
      image: svgToDataUrl(svg),
      svg: svgToDataUrl(svg),
    };
  });

  return {
    image: svgToDataUrl(baseSvg),
    svg: svgToDataUrl(baseSvg),
    transparentSvg: svgToDataUrl(transparentSvg),
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
