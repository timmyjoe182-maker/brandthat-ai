import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyOutputQualityStage,
  repairGeneratedItemQuality,
  sanitizeUnsafeGeneratedClaims,
  validateGeneratedItemQuality,
} from "../netlify/functions/generate.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const generateSource = readFileSync(new URL("../netlify/functions/generate.js", import.meta.url), "utf8");

const requiredStyleLabels = [
  "Punchy",
  "Story",
  "Benefit",
  "Conversational",
  "Educational",
  "Product",
  "Community",
  "Direct CTA",
  "Brand-building",
  "Platform-native",
];

for (const label of requiredStyleLabels) {
  assert.ok(appSource.includes(`"${label}"`), `Caption style label missing: ${label}`);
}

for (const goal of ["Awareness", "Engagement", "Launch", "Conversion", "Education", "Community"]) {
  assert.ok(appSource.includes(`"${goal}"`), `Caption goal option missing: ${goal}`);
}

assert.ok(
  appSource.includes("If the goal is Conversion, at least 6 of 10 captions must include a concrete conversion action"),
  "Conversion goal must materially change caption output."
);

assert.ok(
  appSource.includes("If the goal is Awareness, prioritize distinct brand memory"),
  "Awareness goal must have a distinct strategy."
);

assert.ok(
  appSource.includes("If the goal is Education, make each teaching point safe"),
  "Education goal must have a distinct safe-teaching strategy."
);

assert.ok(
  appSource.includes("If the goal is Engagement, use specific prompts tied to the scene"),
  "Engagement goal must avoid generic questions."
);

assert.ok(
  appSource.includes("Do not use phrases like \"houseplant buddy\", \"plant journey\", \"green friend\", or \"no green thumb required\""),
  "Caption prompt must reject the verified generic plant phrases."
);

assert.ok(
  appSource.includes("Checking brand memory...") &&
  appSource.includes("Brand memory unavailable") &&
  appSource.includes("Brand memory active ·"),
  "Brand memory pilot UI must separate loading, failed, and active states."
);

assert.ok(
  appSource.includes("Do not say plants thrive in low light") &&
  appSource.includes("Do not describe the monthly delivery as featuring specific plant types") &&
  appSource.includes("Avoid \"effortless\", \"stress-free\", \"foolproof\", \"green oasis\", \"fresh air\", and \"order today\""),
  "Caption prompt must block verified unsupported care, inventory, availability, and cliché claims."
);

assert.ok(
  appSource.includes("captionStyleLabels[index]"),
  "Caption rows must visibly label each result style."
);

assert.ok(
  appSource.includes("Use the exact post description as the scene"),
  "Caption prompt must ground outputs in the submitted post context."
);

assert.ok(
  appSource.includes("Current Brand Workspace:") &&
  appSource.includes("Brand DNA:") &&
  appSource.includes("Customer emotions:"),
  "Caption generation must receive the active workspace and Brand DNA context."
);

assert.ok(
  generateSource.includes("sanitizeUnsafeGeneratedClaims") &&
  generateSource.includes("Safe plant phrasing example"),
  "Shared generation backend must retain the claim-safety pass."
);

assert.ok(
  generateSource.includes("applyOutputQualityStage") &&
  generateSource.includes("validateGeneratedItemQuality") &&
  generateSource.includes("repairGeneratedItemQuality"),
  "Shared generation backend must validate and repair output quality before returning text."
);

assert.ok(
  generateSource.includes("Complete grammatical sentence") ||
    generateSource.includes("complete grammatical sentence") ||
    generateSource.includes("Every generated item must be a complete grammatical sentence"),
  "Generator prompt must require complete grammatical output."
);

assert.ok(
  generateSource.includes("Current form input outranks workspace context; workspace facts outrank semantic memories; approved workspace memories outrank older generated outputs."),
  "Caption generator must define source precedence for the private memory pilot."
);

assert.ok(
  generateSource.includes("Never use memory to invent products, plant species, prices, locations, inventory, guarantees, statistics, certifications, scent/fragrance, care schedules, safety, health, sustainability, performance, shipping, or availability claims."),
  "Memory context rules must prevent unsupported product/species/fragrance claims."
);

assert.ok(
  generateSource.includes("Do not invent plant species, fragrance, monthly inventory, exact plant varieties, or care-card contents"),
  "Caption prompt must explicitly block invented plant species and fragrance details."
);

assert.ok(
  generateSource.includes("removeUnsupportedPlantSpecies") && generateSource.includes("PLANT_SPECIES_TERMS"),
  "Shared generation backend must scrub unsupported species details after generation."
);

const unsupportedPlantCopy = sanitizeUnsafeGeneratedClaims(
  "1. Picture this: a fragrant pothos cascading over your shelf with cleaner air and guaranteed growth.",
  "Stone & Stem apartment-friendly houseplants with simple care cards.",
);
assert.doesNotMatch(unsupportedPlantCopy, /fragrant|pothos|cleaner air|guaranteed growth/i, "Unsupported species, scent, air-quality, and guarantee claims must be removed.");
assert.match(unsupportedPlantCopy, /houseplant|greenery|care/i, "Unsafe plant claims should be revised into safe general plant language.");

const supportedSpeciesCopy = sanitizeUnsafeGeneratedClaims(
  "Snake plants are a popular low-maintenance choice for apartment greenery.",
  "Post description: Snake plants for apartment greenery.",
);
assert.match(supportedSpeciesCopy, /Snake plants/i, "A species explicitly supplied by the user can remain when no unsupported claim is attached.");

const unsupportedFactualClaims = sanitizeUnsafeGeneratedClaims(
  [
    "Enjoy fresh air with plants that thrive in low light.",
    "Many houseplants thrive in indirect light, so they are perfect for every apartment.",
    "Order your apartment-friendly plant delivery today.",
    "Water every two weeks for guaranteed growth.",
    "Our plants are designed for effortless care.",
    "Simple care ensures beginners feel confident.",
    "Your plant delivery fits effortlessly into apartment life.",
    "This month's plant delivery features easy-care options.",
    "Transform your apartment into a green oasis.",
  ].join("\n"),
  "Stone & Stem apartment-friendly houseplants with simple care cards.",
);
assert.doesNotMatch(
  unsupportedFactualClaims,
  /fresh air|thrive in low light|thrive in indirect light|order your|order today|water every|guaranteed growth|effortless care|ensures|effortlessly|this month'?s plant delivery features|green oasis/i,
  "Unsupported air-quality, light-care, availability, ordering, and watering claims must be removed.",
);
assert.match(
  unsupportedFactualClaims,
  /fresh greenery|apartment living|care guidance|learn more/i,
  "Unsupported factual claims should become safe general copy.",
);

const harborSource = `
Current Brand Workspace:
Brand name: Harbor Hound
Description: A mobile dog-grooming service for busy coastal families and senior pet owners, focused on convenience, gentle handling, cleanliness, trust, and pet comfort.
Audience: Busy coastal families and senior pet owners
Brand tone: Warm, reassuring, dependable
`;

const stoneSource = `
Current Brand Workspace:
Brand name: Stone & Stem
Description: A local subscription service delivering low-maintenance houseplants to apartment renters, with simple care guidance.
Audience: Apartment renters, busy beginners, and people with limited natural light
Brand tone: Friendly
`;

const brokenHarborSentence = repairGeneratedItemQuality(
  "Our gentle approach helps with they feel great every time.",
  { supportedSource: harborSource, generatorType: "captions" },
);
assert.equal(
  brokenHarborSentence,
  "Our gentle approach helps them feel comfortable throughout every appointment.",
  "Broken Harbor Hound grammar must be repaired into a complete sentence.",
);

const brokenValidation = validateGeneratedItemQuality(
  "Our gentle approach helps with they feel great every time.",
  { supportedSource: harborSource, generatorType: "captions" },
);
assert.equal(brokenValidation.ok, false, "Broken grammar must fail validation.");
assert.ok(brokenValidation.reasons.includes("broken_grammar"), "Broken grammar reason should be recorded.");

const verifiedHarborFailures = [
  "your pets deserves dependable, gentle care",
  "cleanliness to helps with your pet feels safe",
  "Imagine your dog coming home fresh and calm without you leaving the house",
  "Click the link in our bio",
  "serve our local coastal community",
];

for (const failure of verifiedHarborFailures) {
  const validation = validateGeneratedItemQuality(failure, {
    supportedSource: harborSource,
    generatorType: "captions",
    allItems: [],
  });
  const repaired = repairGeneratedItemQuality(failure, {
    supportedSource: harborSource,
    generatorType: "captions",
  });
  assert.equal(validation.ok, false, `Verified production failure must fail validation: ${failure}`);
  assert.doesNotMatch(
    repaired,
    /pets deserves|to helps|pet feels|dog coming home|link in (our|your|the) bio|click the link|serve our local coastal community/i,
    `Verified production failure must be repaired safely: ${failure}`,
  );
}

const repairedHarborOutput = await applyOutputQualityStage({
  generatorType: "captions",
  supportedSource: harborSource,
  text: [
    "1. Our gentle approach helps with they feel great every time.",
    "2. your pets deserves dependable, gentle care",
    "3. cleanliness to helps with your pet feels safe",
    "4. Imagine your dog coming home fresh and calm without you leaving the house",
    "5. Click the link in our bio",
    "6. serve our local coastal community",
    "7. Pothos and plant care cards make grooming easy.",
    "8. Mobile grooming without the stressful trip.",
    "9. Book your appointment today for guaranteed comfort.",
    "10. {caption here}",
  ].join("\n"),
});
assert.doesNotMatch(
  repairedHarborOutput.text,
  /helps with they|pets deserves|to helps|pet feels|dog coming home|link in (our|your|the) bio|click the link|serve our local coastal community|deserves the best|game-changing|pothos|plant care cards|guaranteed comfort|\{caption here\}/i,
  "Quality stage must repair verified broken grammar, invented CTAs/local claims, cross-brand leakage, guarantees, and placeholders.",
);
assert.match(repairedHarborOutput.text, /Harbor Hound|mobile grooming|pet care|gentle|comfort|coastal|home/i);
assert.equal(
  new Set(repairedHarborOutput.text.split("\n").map((line) => line.replace(/^\d+[.)]\s*/, "").trim().toLowerCase())).size,
  10,
  "Quality stage must return ten distinct caption lines after duplicate repair.",
);

const repairedStoneOutput = await applyOutputQualityStage({
  generatorType: "captions",
  supportedSource: stoneSource,
  text: [
    "1. Senior pets deserve gentle grooming close to home.",
    "2. Stone & Stem makes apartment greenery approachable with local delivery and simple guidance.",
    "3. Stone & Stem makes apartment greenery approachable with local delivery and simple guidance.",
    "4. Low-maintenance plants thrive even in limited light.",
    "5. Order your apartment-friendly plant delivery today.",
    "6. This month's plant delivery features easy-care options.",
    "7. Transform your apartment into a green oasis.",
    "8. Simple care ensures beginners feel confident.",
    "9. Fresh air starts with a new houseplant.",
    "10. Picture this: a fragrant pothos cascading over your shelf.",
  ].join("\n"),
});
assert.doesNotMatch(
  repairedStoneOutput.text,
  /senior pets|grooming|thrive even in limited light|order your|this month'?s plant delivery features|green oasis|ensures|fresh air|fragrant|pothos/i,
  "Stone & Stem output must remove pet leakage and unsupported plant claims.",
);
assert.match(repairedStoneOutput.text, /apartment|greenery|care guidance|local delivery|beginners/i);

const generatedOpenings = repairedStoneOutput.text
  .split("\n")
  .map((line) => line.replace(/^\d+[.)]\s*/, "").trim().split(/\s+/).slice(0, 4).join(" ").toLowerCase());
assert.equal(
  new Set(generatedOpenings).size,
  generatedOpenings.length,
  "Quality stage must vary caption openings.",
);

assert.doesNotMatch(
  `${appSource}\n${generateSource}`,
  /Northline Goods[\s\S]{0,140}(Caption goal|Current Brand Workspace|captionStyleLabels)/i,
  "Caption generation contracts must not depend on Northline demo context."
);

console.log("Caption quality contract passed.");
