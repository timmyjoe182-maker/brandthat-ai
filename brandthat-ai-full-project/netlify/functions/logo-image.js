const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildLogoPrompt({ logoPrompt, brandName }) {
  return `
Create one finished, usable logo image.

Brand name or keywords:
${brandName || "Use the brand name, initials, or keywords from the request."}

User request:
${logoPrompt}

Design requirements:
- Make the image itself the final logo concept, not an explanation.
- Follow the user's request exactly when they describe an industry, mascot, object, color, letter, style, or mood.
- Use a clean centered composition on a simple background.
- Create a strong logo mark, emblem, mascot, monogram, wordmark, or icon depending on the request.
- Make it suitable for a website header, social profile image, favicon, business card, and brand kit.
- Avoid mockup scenes, stationery, wall signs, paper sheets, hands, devices, photo backgrounds, clutter, tiny decorative details, and messy text.
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

function getLogoWords({ brandName, logoPrompt }) {
  const source = String(brandName || logoPrompt || "Brand").trim();
  const cleaned = source
    .replace(/logo|brand|create|make|for|a |an |the /gi, " ")
    .replace(/[^a-zA-Z0-9\s&]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter(Boolean);
  const displayName = words.slice(0, 3).join(" ") || "Brand";
  const initials = words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "B";

  return { displayName, initials };
}

function buildFallbackLogo({ logoPrompt, brandName }) {
  const { displayName, initials } = getLogoWords({ brandName, logoPrompt });
  const hash = hashString(`${brandName} ${logoPrompt}`);
  const palettes = [
    ["#111111", "#f7f4ed", "#9b7b3f"],
    ["#10231f", "#f5f1e8", "#c7a45a"],
    ["#1a1a2e", "#f8f7f2", "#4f7cff"],
    ["#171717", "#ffffff", "#e0502f"],
    ["#24342f", "#fbfaf6", "#7c9a6d"],
    ["#0f172a", "#f8fafc", "#38bdf8"],
  ];
  const [ink, paper, accent] = palettes[hash % palettes.length];
  const shapes = ["circle", "shield", "diamond"];
  const shape = shapes[hash % shapes.length];
  const safeName = escapeXml(displayName);
  const safeInitials = escapeXml(initials.slice(0, 3));
  const subtitle = escapeXml(
    String(logoPrompt || "")
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 5)
      .join(" ")
      .toUpperCase()
  );

  const mark = {
    circle: `<circle cx="512" cy="378" r="154" fill="${ink}"/><circle cx="512" cy="378" r="126" fill="none" stroke="${accent}" stroke-width="10"/>`,
    shield: `<path d="M512 208 L666 266 L636 464 Q512 560 388 464 L358 266 Z" fill="${ink}"/><path d="M512 244 L626 287 L603 444 Q512 514 421 444 L398 287 Z" fill="none" stroke="${accent}" stroke-width="10"/>`,
    diamond: `<path d="M512 202 L688 378 L512 554 L336 378 Z" fill="${ink}"/><path d="M512 250 L640 378 L512 506 L384 378 Z" fill="none" stroke="${accent}" stroke-width="10"/>`,
  }[shape];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <rect width="1024" height="1024" fill="${paper}"/>
    <rect x="86" y="86" width="852" height="852" rx="56" fill="none" stroke="${ink}" stroke-opacity="0.08" stroke-width="3"/>
    ${mark}
    <text x="512" y="410" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="92" font-weight="900" fill="${paper}" letter-spacing="4">${safeInitials}</text>
    <text x="512" y="696" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="72" font-weight="900" fill="${ink}" letter-spacing="-2">${safeName}</text>
    <line x1="342" y1="742" x2="682" y2="742" stroke="${accent}" stroke-width="8" stroke-linecap="round"/>
    <text x="512" y="802" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-size="24" font-weight="800" fill="${ink}" opacity="0.62" letter-spacing="6">${subtitle || "BRAND MARK"}</text>
  </svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
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
    const { logoPrompt, brandName } = JSON.parse(event.body || "{}");

    if (!logoPrompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Logo prompt is required." }),
      };
    }

    const finalPrompt = buildLogoPrompt({ logoPrompt, brandName });
    const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 8000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const image = await generateOpenAiLogo({ finalPrompt, signal: controller.signal });
      clearTimeout(timeout);

      return {
        statusCode: 200,
        body: JSON.stringify({ image, source: "openai" }),
      };
    } catch (imageError) {
      clearTimeout(timeout);
      const image = buildFallbackLogo({ logoPrompt, brandName });

      return {
        statusCode: 200,
        body: JSON.stringify({
          image,
          source: "instant-svg",
          note: "OpenAI image generation was unavailable or too slow, so Brandthat created an instant logo image instead.",
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
