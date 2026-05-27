const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
- Create a strong logo mark, emblem, mascot, monogram, wordmark, or icon depending on the request.
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
    .replace(/\b(logo|brand|create|make|for|with|style|direction|required|text|keywords|request|user|professional|quality|image|concept|identity|premium|modern|clean|high|avoid)\b/gi, " ")
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
  if (hasWord(words, ["cow", "cattle", "ranch"])) return "ranch";
  if (hasWord(words, ["coffee", "cafe"])) return "coffee";
  if (hasWord(words, ["real", "estate", "home", "house"])) return "realestate";
  if (hasWord(words, ["beauty", "wellness", "spa"])) return "wellness";
  if (hasWord(words, ["ai", "tech", "software", "saas"])) return "tech";
  return "abstract";
}

function buildSubjectMark({ subject, ink, accent, paper, initials }) {
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

  return `
    <path d="M512 156 L734 284 L734 540 L512 668 L290 540 L290 284 Z" fill="${ink}"/>
    <path d="M512 220 L678 316 L678 508 L512 604 L346 508 L346 316 Z" fill="none" stroke="${accent}" stroke-width="16"/>
    <text x="512" y="440" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="118" font-weight="900" fill="${paper}" letter-spacing="4">${escapeXml(initials.slice(0, 3))}</text>
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
  const subjectMark = buildSubjectMark({ subject, ink: inkToken, accent: accentToken, paper: paperToken, initials });
  const nameWords = displayName.toLowerCase().split(/\s+/);
  const subtitleWords = words
    .filter((word) => !nameWords.includes(word.toLowerCase()))
    .filter((word) => word.length > 2)
    .filter((word, index, list) => list.findIndex((item) => item.toLowerCase() === word.toLowerCase()) === index)
    .slice(0, 4);
  const subtitle = escapeXml(
    (subtitleWords.join(" ") || subject.replace("-", " "))
      .toUpperCase()
  );
  const fontFamily = variant === 1
    ? "Georgia, Times New Roman, serif"
    : variant === 2
      ? "Arial Black, Arial, Helvetica, sans-serif"
      : "Inter, Arial, Helvetica, sans-serif";
  const layout = variant % 3;
  const markTransform = layout === 1 ? "translate(0 -32) scale(1.04)" : layout === 2 ? "translate(0 -18) scale(.96)" : "";
  const nameY = layout === 1 ? 744 : layout === 2 ? 696 : 730;
  const lineY = nameY + 52;
  const subtitleY = lineY + 68;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" data-brandthat-vector="true" data-layout="${layout}" style="--logo-ink:${ink};--logo-paper:${paper};--logo-accent:${accent};">
    ${transparent ? "" : `<rect data-layer="background" width="1024" height="1024" fill="${paperToken}"/>`}
    <rect data-layer="frame" x="52" y="52" width="920" height="920" rx="78" fill="none" stroke="${inkToken}" stroke-opacity="${transparent ? "0" : "0.08"}" stroke-width="4"/>
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
  const variations = [0, 1, 2].map((variant) => {
    const svg = buildLogoSvg({ logoPrompt, brandName, logoStyle, logoIndustry, logoSymbol, logoColors, logoAvoid, userPrompt, variant });
    return {
      id: `variation-${variant + 1}`,
      name: variant === 0 ? "Primary" : variant === 1 ? "Editorial" : "Bold",
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
          note: "The full AI image model was unavailable or too slow, so Brandthat created an instant downloadable logo preview from your exact fields. Generate again for another AI image attempt.",
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
