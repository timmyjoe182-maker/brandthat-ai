import { readFileSync, writeFileSync } from "node:fs";

const logoFunctionPath = new URL("../netlify/functions/logo-image.js", import.meta.url);
let logo = readFileSync(logoFunctionPath, "utf8");
let changed = false;

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) {
    console.warn(`Logo reliability prebuild skipped ${label}; source already differs.`);
    return source;
  }
  changed = true;
  return source.replace(needle, replacement);
}

logo = replaceOnce(
  logo,
  `import { getRequestId, json, requireVerifiedUser } from "./lib/membership.js";`,
  `import { getRequestId, getSupabaseAdminClient, json, requireVerifiedUser } from "./lib/membership.js";`,
  "Supabase admin import"
);

const rateLimitBlock = `function checkRateLimit(event, { limit = 18, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = getClientIp(event);
  const bucket = (rateLimitStore.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  bucket.push(now);
  rateLimitStore.set(key, bucket);
  return bucket.length <= limit;
}
`;

const reliabilityHelpers = `${rateLimitBlock}
function getLogoServerTimeoutMs() {
  const configured = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 18000);
  if (!Number.isFinite(configured) || configured <= 0) return 18000;
  return Math.min(configured, 18000);
}

function isBase64ImageDataUrl(value = "") {
  return /^data:image\/(png|jpeg|webp);base64,/i.test(String(value || ""));
}

async function persistAiLogoImageIfNeeded(image = "", requestId = "") {
  if (!isBase64ImageDataUrl(image)) return image;

  const supabaseAdmin = getSupabaseAdminClient?.();
  const bucket = process.env.SUPABASE_LOGO_BUCKET || process.env.SUPABASE_STORAGE_LOGO_BUCKET || "brandthat-logo-generations";
  if (!supabaseAdmin) {
    console.warn("BrandThat logo image storage unavailable", { requestId, reason: "SUPABASE_ADMIN_MISSING" });
    return "";
  }

  const mime = image.match(/^data:(image\/[^;]+);base64,/i)?.[1] || "image/png";
  const extension = mime.includes("webp") ? "webp" : mime.includes("jpeg") ? "jpg" : "png";
  const base64 = image.split(",")[1] || "";
  const buffer = Buffer.from(base64, "base64");
  const objectPath = "logo-generations/" + (requestId || Date.now()) + "." + extension;

  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(objectPath, buffer, {
      contentType: mime,
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) {
    console.warn("BrandThat logo image storage upload failed", {
      requestId,
      bucket,
      code: error?.code,
      message: error?.message,
    });
    return "";
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
  return data?.publicUrl || "";
}
`;

if (!logo.includes("function getLogoServerTimeoutMs()")) {
  logo = replaceOnce(logo, rateLimitBlock, reliabilityHelpers, "bounded timeout and image storage helpers");
}

logo = replaceOnce(
  logo,
  `    const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 50000);`,
  `    const timeoutMs = getLogoServerTimeoutMs();`,
  "bounded server timeout"
);

logo = replaceOnce(
  logo,
  `      const image = await generateOpenAiLogo({ finalPrompt, signal: controller.signal });
      clearTimeout(timeout);
      logTiming("openai_response_received", { model });
`,
  `      const rawImage = await generateOpenAiLogo({ finalPrompt, signal: controller.signal });
      clearTimeout(timeout);
      logTiming("openai_response_received", { model, payloadKind: isBase64ImageDataUrl(rawImage) ? "base64" : "url" });
      const image = await persistAiLogoImageIfNeeded(rawImage, requestId);
      if (!image) {
        const storageError = new Error("AI logo image was generated but could not be stored safely.");
        storageError.code = "LOGO_IMAGE_STORAGE_UNAVAILABLE";
        throw storageError;
      }
`,
  "persist generated image before response"
);

logo = replaceOnce(
  logo,
  `      const providerCode = imageError?.code || imageError?.type || imageError?.name || "LOGO_IMAGE_PROVIDER_FAILED";`,
  `      const providerCode = imageError?.name === "AbortError" ? "LOGO_IMAGE_SERVER_TIMEOUT" : (imageError?.code || imageError?.type || imageError?.name || "LOGO_IMAGE_PROVIDER_FAILED");`,
  "explicit server timeout code"
);

logo = replaceOnce(
  logo,
  `      return json(503, {`,
  `      logTiming("response_returned", { statusCode: 503, code: providerCode });

      return json(503, {`,
  "failure response timing"
);

const directionPairs = [
  [
    `      ["Botanical Wordmark", "wordmark-led identity with a restrained plant detail integrated into the type", visual || "a small botanical detail that feels grown into the wordmark instead of pasted beside it", type || "warm botanical serif paired with a readable humanist sans", "website headers, packaging labels, and care cards", "This direction leads with calm recognition and keeps the name easy to read. It supports a warm, dependable plant brand without relying on a generic leaf icon.", "At small sizes, the wordmark remains primary and the plant detail reduces to a simple stroke or counterform.", categoryPalette || "leaf green carries the name, warm ivory gives the mark breathing room, and terracotta stays as a small accent."],
      ["Stone & Leaf Symbol", "compact symbol plus wordmark with the natural object reduced into one clear silhouette", visual || "a grounded stone-and-leaf symbol with enough contrast to work as an avatar", type || "humanist sans support type with a softer serif wordmark", "Instagram avatar, plant labels, subscription inserts, and small packaging", "This option gives the brand a recognizable mark when the full name is not visible. It connects delivery, plant care, and calm apartment greenery through one compact symbol.", "The symbol should still read as one shape at favicon and profile-photo size.", categoryPalette || "leaf green defines the living cue, stone gray grounds the symbol, and ivory keeps the badge clean."],
      [friendly ? "Friendly Delivery Badge" : "Local Delivery Badge", "badge/avatar system that frames the brand as a local service with a clear beginner-friendly promise", visual || "a simple badge combining plant delivery, care-card, or apartment-window cues", type || "friendly serif-and-sans pairing with practical label readability", "delivery stickers, social posts, care cards, and local launch materials", "This direction makes the service feel useful and approachable, not just decorative. It is strongest when the logo needs to reassure first-time plant owners quickly.", "The badge uses large shapes, few details, and a clear center mark for mobile use.", categoryPalette || "terracotta can mark delivery or care-card moments while green and ivory keep the system botanical."],`,
    `      ["Botanical Wordmark", "wordmark-led identity with a restrained plant detail integrated into the type", "a subtle botanical stroke, leaf counterform, or stem detail worked into the letterforms", "serif-led wordmark with warm botanical character and restrained sans support", "website headers, packaging labels, and care cards", "This direction leads with calm recognition and keeps the name easy to read. It supports a warm, dependable plant brand without relying on a generic leaf icon.", "At small sizes, the wordmark remains primary and the plant detail reduces to a simple stroke or counterform.", "leaf green carries the name, warm ivory gives the mark breathing room, and terracotta stays as a small accent."],
      ["Stone & Leaf Symbol", "standalone compact stone-and-leaf mark paired with a supporting wordmark", "a grounded stone shape and leaf silhouette reduced into one avatar-ready mark", "restrained supporting wordmark with humanist sans clarity and a softer serif accent", "Instagram avatar, plant labels, subscription inserts, and small packaging", "This option gives the brand a recognizable mark when the full name is not visible. It connects delivery, plant care, and calm apartment greenery through one compact symbol.", "The symbol should still read as one shape at favicon and profile-photo size.", "leaf green defines the living cue, stone gray grounds the symbol, and ivory keeps the compact mark clean."],
      [friendly ? "Friendly Delivery Badge" : "Local Delivery Badge", "framed badge or seal composition for delivery, care-card, and local-service moments", "a friendly badge combining plant delivery, care-card, or apartment-window cues inside a simple frame", "approachable service typography with clear label hierarchy and softer supporting type", "delivery stickers, social posts, care cards, and local launch materials", "This direction makes the service feel useful and approachable, not just decorative. It is strongest when the logo needs to reassure first-time plant owners quickly.", "The badge uses large shapes, few details, and a clear center mark for mobile use.", "terracotta marks delivery and care-card moments while green and ivory keep the system botanical."],`,
    "distinct botanical direction fields",
  ],
  [
    `      ["Workflow Wordmark", "type-led product mark with a precise custom letter detail", visual || "a subtle signal, document, or workflow cue integrated into the wordmark", type || "clean product-grade sans with confident spacing", "app header, website nav, and product screenshots", "This direction keeps the product credible and easy to recognize in software environments. It avoids decorative tech symbols and focuses on clarity.", "The custom letter detail can reduce into a favicon without losing the brand name's rhythm.", categoryPalette || "the primary color organizes UI moments while neutrals carry the product surface."],
      ["Signal System", "symbol plus wordmark built from organized movement or connected workflow states", visual || "a compact signal mark that suggests clarity, organization, and momentum", type || "geometric sans with a crisp support hierarchy", "app icon, favicon, dashboard, and social avatar", "This concept gives the brand a recognizable product symbol. The strategic focus is organized action rather than generic AI or abstract circuitry.", "The symbol uses one clear gesture so it remains legible in toolbar and favicon sizes.", categoryPalette || "accent color highlights the signal while dark and light neutrals keep it product-ready."],
      ["Creator Toolkit Badge", "compact badge system that can label templates, workflows, and creator-facing tools", visual || "a simplified badge based on documents, sponsorship flow, or organized deliverables", type || "readable sans with friendly product polish", "social launch assets, onboarding cards, templates, and help docs", "This direction makes the brand feel practical and useful for creators. It is less corporate and more suited to repeated in-product touchpoints.", "The badge keeps a bold interior shape and removes fine detail below avatar size.", categoryPalette || "the accent can identify actions while the base palette keeps the system calm."],`,
    `      ["Workflow Wordmark", "type-led product mark with a precise custom letter detail", "a workflow cue integrated into one letter or wordmark joint rather than a separate icon", "clean product sans with measured spacing and a subtle custom letter moment", "app header, website nav, and product screenshots", "This direction keeps the product credible and easy to recognize in software environments. It avoids decorative tech symbols and focuses on clarity.", "The custom letter detail can reduce into a favicon without losing the brand name's rhythm.", "the primary color highlights one wordmark detail while neutrals carry the product surface."],
      ["Signal System", "symbol plus wordmark built from organized movement or connected workflow states", "a compact signal or status mark built from connected workflow states", "geometric sans with a crisp support hierarchy and product-interface precision", "app icon, favicon, dashboard, and social avatar", "This concept gives the brand a recognizable product symbol. The strategic focus is organized action rather than generic AI or abstract circuitry.", "The symbol uses one clear gesture so it remains legible in toolbar and favicon sizes.", "accent color highlights the signal while dark and light neutrals keep it product-ready."],
      ["Creator Toolkit Badge", "compact badge system that can label templates, workflows, and creator-facing tools", "a simplified toolkit badge based on documents, sponsorship flow, or organized deliverables", "readable friendly sans with utility-label hierarchy for repeat product surfaces", "social launch assets, onboarding cards, templates, and help docs", "This direction makes the brand feel practical and useful for creators. It is less corporate and more suited to repeated in-product touchpoints.", "The badge keeps a bold interior shape and removes fine detail below avatar size.", "the accent identifies actions while the base palette keeps the system calm."],`,
    "distinct software direction fields",
  ],
  [
    `    [names[0], "wordmark-led identity with one ownable detail from the brand meaning", visual || \`a restrained \${label} cue integrated into the typography\`, type || "clean readable type matched to the brand personality", "website headers, social profile, and launch materials", "This direction makes the name the strongest asset and keeps the mark easy to use. It is designed for clarity before decoration.", "The custom type detail can simplify when the mark is used small.", categoryPalette || "the palette should support contrast, recognition, and practical use."],
    [names[1], "compact symbol plus wordmark with a distinct silhouette", visual || \`one reduced \${label} symbol tied to the brand promise\`, type || "readable supporting wordmark with clear hierarchy", "avatar, favicon, product label, and social posts", "This route gives the brand a shorthand mark when the full name is not available. It should feel specific to the business rather than like a template icon.", "The symbol uses few parts and remains recognizable as a single shape.", categoryPalette || "the accent color should help the symbol stand apart from the wordmark."],
    [names[2], "badge/avatar system for repeated launch and content touchpoints", visual || "a framed mark built from the clearest customer-facing moment", type || "simple type hierarchy suitable for small labels", "social assets, stickers, packaging, signage, and campaign graphics", "This direction creates a flexible mark for everyday brand applications. It is strongest when the brand needs a practical system, not only a single logo.", "The badge keeps a clear center shape and removes secondary detail at small sizes.", categoryPalette || "the palette should make the badge useful across light and dark contexts."],`,
    `    [names[0], "wordmark-led identity with one ownable detail from the brand meaning", \`a restrained \${label} cue integrated into the letterforms\`, "primary wordmark typography tuned to the brand's strongest personality cue", "website headers, social profile, and launch materials", "This direction makes the name the strongest asset and keeps the mark easy to use. It is designed for clarity before decoration.", "The custom type detail can simplify when the mark is used small.", "the primary brand color leads the wordmark while the accent stays secondary."],
    [names[1], "compact symbol plus wordmark with a distinct silhouette", \`one reduced standalone \${label} symbol tied to the brand promise\`, "supporting wordmark with clearer hierarchy beneath or beside the symbol", "avatar, favicon, product label, and social posts", "This route gives the brand a shorthand mark when the full name is not available. It should feel specific to the business rather than like a template icon.", "The symbol uses few parts and remains recognizable as a single shape.", "the accent color helps the symbol stand apart from the wordmark."],
    [names[2], "badge/avatar system for repeated launch and content touchpoints", "a framed mark built from the clearest customer-facing moment", "compact label typography built for stickers, cards, and small campaign graphics", "social assets, stickers, packaging, signage, and campaign graphics", "This direction creates a flexible mark for everyday brand applications. It is strongest when the brand needs a practical system, not only a single logo.", "The badge keeps a clear center shape and removes secondary detail at small sizes.", "the palette shifts toward contrast so the badge works across light and dark contexts."],`,
    "distinct generic direction fields",
  ],
];

for (const [needle, replacement, label] of directionPairs) {
  logo = replaceOnce(logo, needle, replacement, label);
}

writeFileSync(logoFunctionPath, logo);
console.log(changed ? "Applied logo reliability prebuild fixes." : "Logo reliability prebuild fixes already present.");