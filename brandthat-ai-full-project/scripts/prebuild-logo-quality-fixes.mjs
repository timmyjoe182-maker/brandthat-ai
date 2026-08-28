import { readFileSync, writeFileSync } from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
const logoFunctionPath = new URL("../netlify/functions/logo-image.js", import.meta.url);

let app = readFileSync(appPath, "utf8");
let logo = readFileSync(logoFunctionPath, "utf8");

let changed = false;

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) {
    console.warn(`Logo quality prebuild skipped ${label}; source already differs.`);
    return source;
  }
  changed = true;
  return source.replace(needle, replacement);
}

const logoHelpers = `function isMeaningfulLogoText(value = "") {
  const text = String(value || "").replace(/\\s+/g, " ").trim();
  if (!text) return false;
  const semantic = text.replace(/[.\\-_:;,\\s]/g, "");
  if (!semantic) return false;
  return !/^(undefined|null|n\\/a|none|placeholder)$/i.test(text);
}

function cleanLogoNarrative(value = "", { maxSentences = 4 } = {}) {
  const text = String(value || "")
    .replace(/\\b(luxury price|startup scale|premium market)\\b/gi, "")
    .replace(/\\bPersonality fit:\\s*/gi, "")
    .replace(/\\bTrend fit:\\s*/gi, "")
    .replace(/\\bCreative Director refinement:\\s*/gi, "")
    .replace(/\\s*;\\s*/g, ". ")
    .replace(/\\s+/g, " ")
    .replace(/\\s+\\./g, ".")
    .trim();
  if (!isMeaningfulLogoText(text)) return "";
  const sentences = text
    .split(/(?<=[.!?])\\s+/)
    .map((sentence) => sentence.trim())
    .filter(isMeaningfulLogoText);
  return (sentences.length ? sentences : [text]).slice(0, maxSentences).join(" ");
}

function getConceptSubjectLabel(subject = "", logoIndustry = "") {
  const raw = String(logoIndustry || subject || "").toLowerCase();
  if (/plant|botanical|houseplant|greenery|garden/.test(raw)) return "botanical";
  if (/software|saas|app|platform|creator|sponsor|invoice|workflow|tech/.test(raw)) return "software";
  if (/pet|dog|groom|animal/.test(raw)) return "pet care";
  if (/coffee|cafe|espresso|drink|beverage/.test(raw)) return "coffee";
  if (/home|interior|design|styling|room/.test(raw)) return "interior";
  if (/law|legal/.test(raw)) return "professional";
  if (/service|local|neighborhood|studio|care/.test(raw)) return "local service";
  return String(subject || "brand").replace(/-/g, " ");
}

function buildCustomerFacingConceptBlueprints({ subject = "", logoIndustry = "", logoSymbol = "", typography = null, palette = "", brandStrategy = {}, personality = null } = {}) {
  const label = getConceptSubjectLabel(subject, logoIndustry);
  const visual = cleanLogoNarrative(brandStrategy?.suggestedVisualDirection || logoSymbol || "", { maxSentences: 1 });
  const type = cleanLogoNarrative(brandStrategy?.suggestedTypographyDirection || typography?.label || "readable brand typography", { maxSentences: 1 });
  const categoryPalette = cleanLogoNarrative(brandStrategy?.suggestedColorDirection || palette || "", { maxSentences: 1 });
  const friendly = /friendly|warm|approachable|calm|beginner|local/i.test(\`\${brandStrategy?.brandPersonality || ""} \${brandStrategy?.coreMessage || ""} \${personality?.summary || ""}\`);
  if (label === "botanical") {
    return [
      ["Botanical Wordmark", "wordmark-led identity with a restrained plant detail integrated into the type", visual || "a small botanical detail that feels grown into the wordmark instead of pasted beside it", type || "warm botanical serif paired with a readable humanist sans", "website headers, packaging labels, and care cards", "This direction leads with calm recognition and keeps the name easy to read. It supports a warm, dependable plant brand without relying on a generic leaf icon.", "At small sizes, the wordmark remains primary and the plant detail reduces to a simple stroke or counterform.", categoryPalette || "leaf green carries the name, warm ivory gives the mark breathing room, and terracotta stays as a small accent."],
      ["Stone & Leaf Symbol", "compact symbol plus wordmark with the natural object reduced into one clear silhouette", visual || "a grounded stone-and-leaf symbol with enough contrast to work as an avatar", type || "humanist sans support type with a softer serif wordmark", "Instagram avatar, plant labels, subscription inserts, and small packaging", "This option gives the brand a recognizable mark when the full name is not visible. It connects delivery, plant care, and calm apartment greenery through one compact symbol.", "The symbol should still read as one shape at favicon and profile-photo size.", categoryPalette || "leaf green defines the living cue, stone gray grounds the symbol, and ivory keeps the badge clean."],
      [friendly ? "Friendly Delivery Badge" : "Local Delivery Badge", "badge/avatar system that frames the brand as a local service with a clear beginner-friendly promise", visual || "a simple badge combining plant delivery, care-card, or apartment-window cues", type || "friendly serif-and-sans pairing with practical label readability", "delivery stickers, social posts, care cards, and local launch materials", "This direction makes the service feel useful and approachable, not just decorative. It is strongest when the logo needs to reassure first-time plant owners quickly.", "The badge uses large shapes, few details, and a clear center mark for mobile use.", categoryPalette || "terracotta can mark delivery or care-card moments while green and ivory keep the system botanical."],
    ].map(([name, composition, symbol, typographyText, primaryUseCase, rationale, smallSizeBehavior, paletteUse]) => ({ name, composition, symbol, typography: typographyText, primaryUseCase, rationale, smallSizeBehavior, paletteUse }));
  }
  if (label === "software") {
    return [
      ["Workflow Wordmark", "type-led product mark with a precise custom letter detail", visual || "a subtle signal, document, or workflow cue integrated into the wordmark", type || "clean product-grade sans with confident spacing", "app header, website nav, and product screenshots", "This direction keeps the product credible and easy to recognize in software environments. It avoids decorative tech symbols and focuses on clarity.", "The custom letter detail can reduce into a favicon without losing the brand name's rhythm.", categoryPalette || "the primary color organizes UI moments while neutrals carry the product surface."],
      ["Signal System", "symbol plus wordmark built from organized movement or connected workflow states", visual || "a compact signal mark that suggests clarity, organization, and momentum", type || "geometric sans with a crisp support hierarchy", "app icon, favicon, dashboard, and social avatar", "This concept gives the brand a recognizable product symbol. The strategic focus is organized action rather than generic AI or abstract circuitry.", "The symbol uses one clear gesture so it remains legible in toolbar and favicon sizes.", categoryPalette || "accent color highlights the signal while dark and light neutrals keep it product-ready."],
      ["Creator Toolkit Badge", "compact badge system that can label templates, workflows, and creator-facing tools", visual || "a simplified badge based on documents, sponsorship flow, or organized deliverables", type || "readable sans with friendly product polish", "social launch assets, onboarding cards, templates, and help docs", "This direction makes the brand feel practical and useful for creators. It is less corporate and more suited to repeated in-product touchpoints.", "The badge keeps a bold interior shape and removes fine detail below avatar size.", categoryPalette || "the accent can identify actions while the base palette keeps the system calm."],
    ].map(([name, composition, symbol, typographyText, primaryUseCase, rationale, smallSizeBehavior, paletteUse]) => ({ name, composition, symbol, typography: typographyText, primaryUseCase, rationale, smallSizeBehavior, paletteUse }));
  }
  const localLike = label === "local service" || label === "pet care" || label === "interior";
  const names = localLike ? ["Trusted Wordmark", "Service Symbol", "Neighborhood Badge"] : [\`\${titleCase(label)} Wordmark\`, \`\${titleCase(label)} Symbol\`, \`\${titleCase(label)} Badge\`];
  return [
    [names[0], "wordmark-led identity with one ownable detail from the brand meaning", visual || \`a restrained \${label} cue integrated into the typography\`, type || "clean readable type matched to the brand personality", "website headers, social profile, and launch materials", "This direction makes the name the strongest asset and keeps the mark easy to use. It is designed for clarity before decoration.", "The custom type detail can simplify when the mark is used small.", categoryPalette || "the palette should support contrast, recognition, and practical use."],
    [names[1], "compact symbol plus wordmark with a distinct silhouette", visual || \`one reduced \${label} symbol tied to the brand promise\`, type || "readable supporting wordmark with clear hierarchy", "avatar, favicon, product label, and social posts", "This route gives the brand a shorthand mark when the full name is not available. It should feel specific to the business rather than like a template icon.", "The symbol uses few parts and remains recognizable as a single shape.", categoryPalette || "the accent color should help the symbol stand apart from the wordmark."],
    [names[2], "badge/avatar system for repeated launch and content touchpoints", visual || "a framed mark built from the clearest customer-facing moment", type || "simple type hierarchy suitable for small labels", "social assets, stickers, packaging, signage, and campaign graphics", "This direction creates a flexible mark for everyday brand applications. It is strongest when the brand needs a practical system, not only a single logo.", "The badge keeps a clear center shape and removes secondary detail at small sizes.", categoryPalette || "the palette should make the badge useful across light and dark contexts."],
  ].map(([name, composition, symbol, typographyText, primaryUseCase, rationale, smallSizeBehavior, paletteUse]) => ({ name, composition, symbol, typography: typographyText, primaryUseCase, rationale, smallSizeBehavior, paletteUse }));
}

export function polishLogoConcepts(concepts = [], context = {}) {
  const blueprints = buildCustomerFacingConceptBlueprints(context);
  const source = Array.isArray(concepts) ? concepts : [];
  return blueprints.map((blueprint, index) => {
    const concept = source[index] || source[0] || {};
    const whyFits = cleanLogoNarrative([
      blueprint.rationale,
      \`Composition: \${blueprint.composition}.\`,
      \`Primary use: \${blueprint.primaryUseCase}.\`,
      \`Small-size behavior: \${blueprint.smallSizeBehavior}.\`,
      \`Palette use: \${blueprint.paletteUse}.\`,
    ].filter(isMeaningfulLogoText).join(" "), { maxSentences: 4 });
    return {
      ...concept,
      id: concept.id || \`direction-\${index + 1}\`,
      name: blueprint.name,
      symbol: cleanLogoNarrative(blueprint.symbol || concept.symbol, { maxSentences: 1 }),
      typography: cleanLogoNarrative(blueprint.typography || concept.typography, { maxSentences: 1 }),
      palette: cleanLogoNarrative(blueprint.paletteUse || concept.palette || context.palette, { maxSentences: 1 }),
      layout: cleanLogoNarrative(blueprint.composition || concept.layout, { maxSentences: 1 }),
      primaryUseCase: blueprint.primaryUseCase,
      smallSizeBehavior: blueprint.smallSizeBehavior,
      whyFits,
    };
  });
}
`;

if (!logo.includes("function isMeaningfulLogoText")) {
  logo = replaceOnce(
    logo,
    `function titleCase(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}
`,
    `function titleCase(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\\b\\w/g, (letter) => letter.toUpperCase());
}

${logoHelpers}
`,
    "logo quality helpers"
  );
}

if (!logo.includes("const pricePositioningLine = isMeaningfulLogoText(strategy.pricePositioning)")) {
  logo = replaceOnce(
    logo,
    `  const strategy = director.brandStrategy || brandStrategy || {};
`,
    `  const strategy = director.brandStrategy || brandStrategy || {};
  const pricePositioningLine = isMeaningfulLogoText(strategy.pricePositioning)
    ? \`- Price positioning: \${strategy.pricePositioning}\`
    : "";
`,
    "price positioning prompt guard"
  );
}

logo = replaceOnce(
  logo,
  `- Price positioning: \${strategy.pricePositioning || "market-appropriate"}`,
  `\${pricePositioningLine}`,
  "prompt price line"
);

logo = replaceOnce(
  logo,
  `  const pricePositioning = premiumScore >= 68 || /luxury|premium|high.?end|exclusive/i.test(\`\${logoStyle} \${userPrompt}\`)
    ? "premium / high-trust"
    : premiumScore <= 34 || /cheap|budget|affordable|discount/i.test(userPrompt)
      ? "accessible / value-focused"
      : positioning === "neighborhood"
        ? "local-market approachable"
        : "mid-market professional";`,
  `  const pricePositioning = /luxury|premium|high.?end|exclusive/i.test(\`\${logoStyle} \${userPrompt}\`)
    ? "premium / high-trust"
    : /cheap|budget|affordable|discount/i.test(userPrompt)
      ? "accessible / value-focused"
      : "";`,
  "unsupported price positioning defaults"
);

logo = replaceOnce(
  logo,
  `  const localGlobal = reachScore <= 38 ? "local presence" : reachScore >= 64 ? "scalable/global presence" : "regional or online-ready presence";`,
  `  const localGlobal = reachScore <= 38 ? "local presence" : reachScore >= 64 ? "broader online presence" : "regional or online-ready presence";`,
  "unsupported scale wording"
);

logo = replaceOnce(
  logo,
  `function summarizePersonalityMatrix(matrix) {
  return Object.entries(matrix)`,
  `function summarizePersonalityMatrix(matrix) {
  const nonCustomerFacingAxes = new Set(["price", "scale", "market"]);
  return Object.entries(matrix)
    .filter(([axis]) => !nonCustomerFacingAxes.has(axis))`,
  "customer-facing personality axes"
);

logo = replaceOnce(
  logo,
  `    if (personality.matrix.market.score >= 66 || personality.matrix.price.score >= 68) return "premium";
    if (personality.matrix.price.score <= 34 || personality.matrix.market.score <= 34) return "accessible";
    if (personality.matrix.scale.score >= 66 || personality.matrix.tone.score <= 34) return "professional";`,
  `    if (personality.matrix.scale.score >= 66 || personality.matrix.tone.score <= 34) return "professional";`,
  "personality price inference"
);

if (!logo.includes("const rawConcepts = (diversified.length >= 4")) {
  logo = replaceOnce(
    logo,
    `  const concepts = (diversified.length >= 4 ? diversified : reviewedScored.slice(0, 4)).map((concept) => ({
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
  }));`,
    `  const rawConcepts = (diversified.length >= 4 ? diversified : reviewedScored.slice(0, 4)).map((concept) => ({
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
  const concepts = polishLogoConcepts(rawConcepts, {
    subject,
    logoIndustry,
    logoSymbol,
    typography,
    palette,
    brandStrategy: strategy,
    personality,
  });`,
    "polished concept output"
  );
}

if (!app.includes("function isMeaningfulDisplayText")) {
  app = replaceOnce(
    app,
    `function isBrandthatTester(user) {
  return false;
}
`,
    `function isBrandthatTester(user) {
  return false;
}

function isMeaningfulDisplayText(value = "") {
  const text = cleanGeneratedText(value).replace(/\\s+/g, " ").trim();
  if (!text) return false;
  const semantic = text.replace(/[.\\-_:;,\\s]/g, "");
  if (!semantic) return false;
  return !/^(undefined|null|n\\/a|none|placeholder)$/i.test(text);
}
`,
    "display text helper"
  );
}

app = replaceOnce(
  app,
  `    })).filter((note) => isMeaningfulDisplayText(note.copy));`,
  `    })).filter((note) => isMeaningfulDisplayText(note.copy));`,
  "director note filtering noop"
);

app = replaceOnce(
  app,
  `    })).filter((note) => isMeaningfulDisplayText(note.copy));`,
  `    })).filter((note) => isMeaningfulDisplayText(note.copy));`,
  "director note filtering stable"
);

app = app.includes("isMeaningfulDisplayText(note.copy)")
  ? app
  : replaceOnce(
      app,
      `    }));
  }, [logoCreativeBrief, parsedLogoPreview]);`,
      `    })).filter((note) => isMeaningfulDisplayText(note.copy));
  }, [logoCreativeBrief, parsedLogoPreview]);`,
      "director note filtering"
    );

app = replaceOnce(
  app,
  `  ].filter(([, value]) => String(value || "").trim());`,
  `  ].filter(([, value]) => isMeaningfulDisplayText(value));
  const strategyPositioning = creativeBrief?.brandStrategy?.positioning;
  const strategyMessage = creativeBrief?.brandStrategy?.coreMessage;
  const strategyCustomer = creativeBrief?.brandStrategy?.targetCustomer;
  const strategyVisual = creativeBrief?.brandStrategy?.suggestedVisualDirection;
  const showBrandStrategyStrip = [
    strategyPositioning,
    strategyMessage,
    strategyCustomer,
    strategyVisual,
  ].some(isMeaningfulDisplayText);`,
  "creative director summary filtering"
);

app = replaceOnce(
  app,
  `      {creativeBrief?.brandStrategy && (
        <div className="brandStrategyStrip">
          <span>Brand Strategy</span>
          <p>{creativeBrief.brandStrategy.positioning}. {creativeBrief.brandStrategy.coreMessage}</p>
          <small>Customer: {creativeBrief.brandStrategy.targetCustomer}. Visual: {creativeBrief.brandStrategy.suggestedVisualDirection}.</small>
        </div>
      )}`,
  `      {showBrandStrategyStrip && (
        <div className="brandStrategyStrip">
          <span>Brand Strategy</span>
          {[strategyPositioning, strategyMessage].some(isMeaningfulDisplayText) && (
            <p>{[strategyPositioning, strategyMessage].filter(isMeaningfulDisplayText).join(". ")}</p>
          )}
          {[strategyCustomer, strategyVisual].some(isMeaningfulDisplayText) && (
            <small>{[
              isMeaningfulDisplayText(strategyCustomer) ? \`Customer: \${strategyCustomer}\` : "",
              isMeaningfulDisplayText(strategyVisual) ? \`Visual: \${strategyVisual}\` : "",
            ].filter(Boolean).join(". ")}</small>
          )}
        </div>
      )}`,
  "brand strategy strip"
);

if (changed) {
  writeFileSync(appPath, app);
  writeFileSync(logoFunctionPath, logo);
  console.log("Applied logo direction quality prebuild fixes.");
} else {
  console.log("Logo direction quality prebuild fixes already present.");
}
