import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyOutputQualityStage,
  buildSafeClientPrompt,
  repairGeneratedItemQuality,
  sanitizeUnsafeGeneratedClaims,
  validateGeneratedItemQuality,
} from "../netlify/functions/generate.js";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const generateSource = readFileSync(new URL("../netlify/functions/generate.js", import.meta.url), "utf8");

function createApprovalClient() {
  return {
    chat: {
      completions: {
        create: async ({ messages }) => {
          const userText = messages?.at?.(-1)?.content || "";
          if (!userText.includes("Captions to review:")) {
            const parsed = (() => {
              try {
                return JSON.parse(userText);
              } catch {
                return null;
              }
            })();
            if (Array.isArray(parsed?.candidate_captions)) {
              return {
                choices: [{
                  message: {
                    content: JSON.stringify({
                      approved_captions: parsed.candidate_captions.slice(0, 5),
                      rejected: parsed.candidate_captions.slice(5).map((_, index) => ({ index: index + 5, problems: ["not in top five"] })),
                    }),
                  },
                }],
              };
            }
            return {
              choices: [{
                message: {
                  content: "A dependable mobile grooming visit built around comfort, cleanliness, and trust.",
                },
              }],
            };
          }

          const captions = userText
            .split("Captions to review:")[1]
            .trim()
            .split("\n")
            .filter(Boolean);
          return {
            choices: [{
              message: {
                content: JSON.stringify({
                  reviews: captions.map((_, index) => ({
                    index,
                    approved: true,
                    grammatically_valid: true,
                    factually_supported: true,
                    consistent_with_request: true,
                    distinct_from_other_results: true,
                    problems: [],
                    repaired_caption: null,
                  })),
                }),
              },
            }],
          };
        },
      },
    },
  };
}

function createRejectingClient() {
  return {
    chat: {
      completions: {
        create: async ({ messages }) => {
          const userText = messages?.at?.(-1)?.content || "";
          if (userText.trim().startsWith("{")) {
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    approved_captions: [],
                    rejected: [{ index: 0, problems: ["unsupported claim"] }],
                  }),
                },
              }],
            };
          }
          return { choices: [{ message: { content: "A generic replacement that still needs review." } }] };
        },
      },
    },
  };
}

const requiredStyleLabels = [
  "Punchy",
  "Story",
  "Benefit",
  "Conversational",
  "Educational",
];

for (const label of requiredStyleLabels) {
  assert.ok(appSource.includes(`"${label}"`), `Caption style label missing: ${label}`);
}

for (const goal of ["Awareness", "Engagement", "Launch", "Conversion", "Education", "Community"]) {
  assert.ok(appSource.includes(`"${goal}"`), `Caption goal option missing: ${goal}`);
}

assert.ok(
  appSource.includes("Generate exactly 8 candidate captions") &&
    appSource.includes("best 5 approved captions"),
  "Caption prompt must generate 8 candidates for editorial selection into 5 approved captions."
);

assert.ok(
  appSource.includes("If the goal is Conversion, at least 4 of 8 candidates must include a concrete conversion action"),
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
  appSource.includes("Generate 5 Captions") &&
    appSource.includes("5 COPY-READY CAPTIONS"),
  "Caption UI must promise five reviewed captions."
);

assert.ok(
  appSource.includes("getTextGenerationResponseText(data, activeTool.key)") &&
    appSource.includes("data.approvedCaptions") &&
    appSource.includes("data.captions") &&
    appSource.includes("data.results"),
  "Caption UI must parse all supported reviewed-caption response shapes."
);

assert.ok(
  appSource.includes('toolKey === "captions"') &&
    appSource.includes("parseTenOptions(result).filter(Boolean).length >= 1") &&
    appSource.includes("getResultCountHeader(activeTool.key, result)"),
  "Caption success UI must render approved counts below five instead of requiring the old ten-caption format."
);

assert.ok(
  appSource.includes("Creating and reviewing captions") &&
    appSource.includes("approved count"),
  "Caption loading copy must explain generation and editorial review."
);

assert.ok(
  appSource.includes("generationSlow={generationSlow}") &&
    appSource.includes("generationSlow = false"),
  "GeneratorCard must receive generationSlow from App state instead of reading an undefined outer variable."
);

assert.ok(
  appSource.includes("Still reviewing captions for quality") &&
    appSource.includes("CAPTION_REVIEW_CLIENT_TIMEOUT") &&
    appSource.includes("timeoutMs: activeTool.key === \"captions\" ? 45000 : 20000"),
  "Caption UI must allow the two-call editorial pipeline to run and show long-review progress."
);

assert.doesNotMatch(
  appSource,
  /setPrompt\(buildBrandPrompt\((brand|finalBrand)\)\)/,
  "Brand switching and workspace creation must not place internal Brand DNA into the visible caption textbox."
);

assert.ok(
  appSource.includes("captionStyleLabels[index]"),
  "Caption rows must visibly label each approved result style."
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
    "Check out our latest delivery of low-maintenance plants designed specifically for apartment living.",
    "Sign up for our fresh plant delivery today.",
    "Keep your new green friend happy.",
  ].join("\n"),
  "Stone & Stem apartment-friendly houseplants with simple care cards.",
);
assert.doesNotMatch(
  unsupportedFactualClaims,
  /fresh air|thrive in low light|thrive in indirect light|order your|order today|sign up today|latest delivery|green friend happy|water every|guaranteed growth|effortless care|ensures|effortlessly|this month'?s plant delivery features|green oasis/i,
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

const stoneWithStaleHarborMemory = `
Server verified workspace context:
Brand name: Stone & Stem
Description: A local subscription service delivering low-maintenance houseplants to apartment renters, with simple care guidance.
Audience: Apartment renters, busy beginners, and people with limited natural light
Brand tone: Friendly

Private semantic brand memory for this selected workspace:
Brand name: Harbor Hound
Description: A mobile dog-grooming service for busy coastal families and senior pet owners.
`;

const staleMemoryLeakValidation = validateGeneratedItemQuality(
  "Our pet care deliveries include all the care tips you need.",
  { supportedSource: stoneWithStaleHarborMemory, generatorType: "captions" },
);
assert.equal(staleMemoryLeakValidation.contextKind, "plant", "Server-verified workspace context must outrank semantic-memory snippets.");
assert.equal(staleMemoryLeakValidation.ok, false, "Stone & Stem captions must reject stale Harbor Hound pet-care language.");
assert.ok(
  staleMemoryLeakValidation.reasons.includes("cross_workspace_pet_leak"),
  "Stale pet-care language must be recorded as cross-workspace leakage.",
);

const hiddenContextPrompt = `
Current Brand Workspace:
Brand name: Harbor Hound
Description: A mobile dog-grooming service for busy coastal families and senior pet owners.
Audience: Senior pet owners
Brand DNA:
Positioning: Gentle mobile pet care.

User platform:
Instagram

Caption goal:
Awareness

User request:
Introduce a practical bicycle tune-up service for commuters and students. Mention clear maintenance guidance and convenient scheduling only.
`;

const safeClientPrompt = buildSafeClientPrompt(hiddenContextPrompt);
assert.match(safeClientPrompt, /bicycle tune-up service/i, "Visible user request must be preserved.");
assert.match(safeClientPrompt, /User platform:\s*Instagram/i, "Visible platform must be preserved.");
assert.match(safeClientPrompt, /Caption goal:\s*Awareness/i, "Visible caption goal must be preserved.");
assert.doesNotMatch(safeClientPrompt, /Harbor Hound|dog-grooming|Senior pet owners|Brand DNA/i, "Hidden client workspace context must not be trusted by the server.");

const bicycleSourceWithStaleMemory = `
Current Brand Workspace:
Brand name: Memory Audit Disposable
Description: Disposable production audit workspace for a neighborhood bicycle tune-up service.
Audience: Commuters, students, and casual riders who want clear maintenance guidance and convenient tune-up scheduling.
Brand tone: Clear, practical, friendly
${safeClientPrompt}

Private semantic brand memory for this selected workspace:
Brand name: Harbor Hound
Description: A mobile dog-grooming service for busy coastal families and senior pet owners.
`;

const bicycleContextValidation = validateGeneratedItemQuality(
  "Memory Audit Disposable brings gentle mobile grooming closer to home for busy coastal families.",
  { supportedSource: bicycleSourceWithStaleMemory, generatorType: "captions" },
);
assert.equal(bicycleContextValidation.contextKind, "bicycle", "Verified bicycle workspace context must not be reclassified by stale memory.");

const bicycleQualityOutput = await applyOutputQualityStage({
  generatorType: "captions",
  supportedSource: bicycleSourceWithStaleMemory,
  openAiClient: createApprovalClient(),
  prompt: safeClientPrompt,
  text: [
    "1. Memory Audit Disposable brings gentle mobile grooming closer to home for busy coastal families.",
    "2. A mobile grooming visit can fit the home routine with gentle handling and clean details.",
    "3. For senior pet owners and busy households, convenience can still feel personal.",
    "4. Gentle handling, cleanliness, and pet comfort guide the mobile grooming experience.",
    "5. Skip the extra trip with dog grooming brought to the home.",
    "6. Practical bicycle tune-ups help commuters understand the next maintenance step.",
    "7. Clear maintenance guidance and convenient scheduling make bike care easier to plan.",
    "8. For students and commuters, a tune-up can start with straightforward guidance.",
  ].join("\n"),
});
assert.doesNotMatch(bicycleQualityOutput.text, /dog|pet|grooming|senior pet|coastal families/i, "Stale Harbor Hound client or memory context must not leak into a verified bicycle workspace.");

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
  "Our gentle approach helps with every grooming session feels like a treat.",
  "Imagine your dog coming home fresh and calm without you leaving the house",
  "Click the link in our bio",
  "serve our local coastal community",
  "Just wrapped up with a happy pup.",
  "Proudly serving our coastal community.",
  "Mobile grooming can greatly reduce your pet's stress.",
  "Ensuring dependable care for every visit.",
  "Imagine your furry friend getting pampered while you relax at home.",
  "Harbor Hound brings the spa to you.",
  "Discover Harbor Hound—your trusted mobile dog grooming service.",
  "Ready to give your pet the grooming they deserve? Reach out today.",
  "Your pup deserves a grooming experience designed just for them.",
  "Did you know gentle handling is key to a calmer grooming experience?",
  "We’re proud to serve our coastal community.",
  "Gentle care is just a call away.",
  "Your pet's comfort is our top priority.",
  "We're part of the coastal community.",
  "We provide local families with trustworthy grooming services.",
  "Let us pamper your pup right at home.",
  "Enjoy a cleaner, happier dog without the hassle of travel.",
  "Our mobile grooming service brings the salon to you.",
  "After a long day at the beach, grooming is easy.",
  "Experience grooming like never before.",
  "Grooming tailored for your pet.",
  "Your furry family member gets the best care.",
  "Joining the Harbor Hound community means your pet gets dependable care.",
  "Transform your pup's grooming experience with Harbor Hound.",
  "Imagine this: a calmer grooming session for your dog.",
  "Enjoy the peace of mind knowing your furry friend is handled with care.",
  "Mobile dog grooming that prioritizes your pet's comfort.",
  "As a local service, let us handle your pet's grooming today.",
  "Enjoy a professional groom without leaving home.",
  "Imagine your pup stepping out of a warm bath, wagging their tail after a gentle grooming session.",
  "Coastal families and senior pet owners, we know your pets deserve dependable care—let us help you keep them happy and clean.",
  "We're here in our coastal community with grooming tailored to your needs.",
  "Say goodbye to stressful trips to the grooming; we bring the gentle grooming right to your driveway.",
  "Enjoy feel more prepared knowing your dog is receiving gentle, clean care tailored for their comfort.",
  "After a long week, nothing beats a fresh groom for your furry friend. Watch them shine!",
  "Imagine your furry friend getting groomed while you enjoy a sunny day at the beach.",
  "Keep your dog clean and comfortable without the stress of travel. Our gentle handling helps create a positive grooming experience.",
  "We know your time is precious. Let Harbor Hound handle the grooming while you focus on what matters most.",
  "Join the Harbor Hound community, where we understand the needs of coastal families and senior pet owners.",
  "Your furry friends deserve a grooming experience that feels like a day at the beach.",
  "Imagine your dog looking fresh and feeling comfortable, all without leaving home.",
  "With our mobile dog grooming service, enjoy a clean, gentle, and calmer grooming right at your doorstep.",
  "Let Harbor Hound take care of your pet's grooming needs with love and care.",
  "Did you know that mobile grooming can be less stressful for pets?",
  "Experience the comfort of mobile grooming in the familiar space of home.",
  "Introducing Harbor Hound: your mobile dog grooming solution for convenience and care, at home.",
  "We’re here to support busy coastal families and senior pet owners with trusted, dependable pet care that fits your lifestyle.",
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
    /pets deserves|pup deserves|deserve|to helps|pet feels|dog coming home|link in (our|your|the) bio|click the link|serve our local coastal community|serve our coastal community|proud to serve our coastal community|just a call away|top priority|transform your pup|calmer grooming session|peace of mind|enjoy feel|nothing beats|watch them shine|while you enjoy|sunny day at the beach|day at the beach|beach|stress of travel|less stressful|positive grooming experience|experience the comfort|looking fresh|feeling comfortable|doorstep|love and care|take care of your pet's grooming needs|did you know|what matters most|join the harbor hound community|prioritizes your pet|as a local service|professional groom|let us handle your pet's grooming today|part of the coastal community|local families|trustworthy|trusted|solution|fits your lifestyle|tailored for your pet|tailored to your needs|best care|joining the harbor hound community means|pamper|happier dog|happy and clean|keep them happy|salon|warm bath|wagging|stressful trips|driveway|to the grooming|long day at the beach|like never before|spa to you|trusted mobile dog grooming service|reach out today|grooming they deserve|calmer grooming experience/i,
    `Verified production failure must be repaired safely: ${failure}`,
  );
}

const repairedHarborOutput = await applyOutputQualityStage({
  generatorType: "captions",
  supportedSource: harborSource,
  openAiClient: createApprovalClient(),
  text: [
    "1. Our gentle approach helps with they feel great every time.",
    "2. your pets deserves dependable, gentle care",
    "3. cleanliness to helps with your pet feels safe",
    "4. Our gentle approach helps with every grooming session feels like a treat.",
    "5. Imagine your dog coming home fresh and calm without you leaving the house",
    "6. Click the link in our bio",
    "7. serve our local coastal community",
    "8. Just wrapped up with a happy pup.",
    "9. Mobile grooming can greatly reduce your pet's stress.",
    "10. Ensuring dependable care for every visit.",
    "11. Imagine your pup stepping out of a warm bath, wagging their tail after a gentle grooming session.",
    "12. We know your pets deserve dependable care—let us help you keep them happy and clean.",
    "13. We're here in our coastal community with grooming tailored to your needs.",
    "14. Say goodbye to stressful trips to the grooming; we bring care to your driveway.",
    "15. Enjoy feel more prepared knowing your dog is receiving gentle, clean care tailored for their comfort.",
    "16. After a long week, nothing beats a fresh groom for your furry friend. Watch them shine!",
    "17. Imagine your furry friend getting groomed while you enjoy a sunny day at the beach.",
    "18. Keep your dog clean and comfortable without the stress of travel. Our gentle handling helps create a positive grooming experience.",
    "19. We know your time is precious. Let Harbor Hound handle the grooming while you focus on what matters most.",
    "20. Join the Harbor Hound community, where we understand the needs of coastal families and senior pet owners.",
    "21. Your furry friends deserve a grooming experience that feels like a day at the beach.",
    "22. Imagine your dog looking fresh and feeling comfortable, all without leaving home.",
    "23. With our mobile dog grooming service, enjoy a clean, gentle, and calmer grooming right at your doorstep.",
    "24. Let Harbor Hound take care of your pet's grooming needs with love and care.",
    "25. Did you know that mobile grooming can be less stressful for pets?",
    "26. Experience the comfort of mobile grooming in the familiar space of home.",
    "27. Introducing Harbor Hound: your mobile dog grooming solution for convenience and care, at home.",
    "28. We’re here to support busy coastal families and senior pet owners with trusted, dependable pet care that fits your lifestyle.",
  ].join("\n"),
});
assert.doesNotMatch(
  repairedHarborOutput.text,
  /helps with they|helps with every grooming session feels|pets deserves|pup deserves|deserve|to helps|pet feels|dog coming home|link in (our|your|the) bio|click the link|serve our local coastal community|serve our coastal community|proud to serve our coastal community|just a call away|top priority|transform your pup|calmer grooming session|peace of mind|enjoy feel|nothing beats|watch them shine|while you enjoy|sunny day at the beach|day at the beach|beach|stress of travel|less stressful|positive grooming experience|experience the comfort|looking fresh|feeling comfortable|doorstep|love and care|take care of your pet's grooming needs|did you know|what matters most|join the harbor hound community|prioritizes your pet|as a local service|professional groom|let us handle your pet's grooming today|part of the coastal community|local families|trustworthy|trusted|solution|fits your lifestyle|tailored for your pet|tailored to your needs|best care|joining the harbor hound community means|just wrapped up|happy pup|greatly reduce|ensuring|deserves the best|game-changing|pamper|happier dog|happy and clean|keep them happy|salon|warm bath|wagging|stressful trips|driveway|to the grooming|long day at the beach|like never before|spa to you|trusted mobile dog grooming service|reach out today|grooming they deserve|calmer grooming experience|pothos|plant care cards|guaranteed comfort|\{caption here\}/i,
  "Quality stage must repair verified broken grammar, invented CTAs/local claims, cross-brand leakage, guarantees, and placeholders.",
);
assert.match(repairedHarborOutput.text, /Harbor Hound|mobile grooming|pet care|gentle|comfort|coastal|home/i);
assert.equal(
  new Set(repairedHarborOutput.text.split("\n").map((line) => line.replace(/^\d+[.)]\s*/, "").trim().toLowerCase())).size,
  5,
  "Quality stage must return five distinct approved caption lines after review.",
);

const repairedStoneOutput = await applyOutputQualityStage({
  generatorType: "captions",
  supportedSource: stoneSource,
  openAiClient: createApprovalClient(),
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

assert.equal(
  repairedStoneOutput.text.split("\n").filter(Boolean).length,
  5,
  "Caption quality stage must return five approved captions.",
);

const safeHarborHashtags = await applyOutputQualityStage({
  generatorType: "hashtags",
  supportedSource: harborSource,
  text: "#MobileDogGrooming #DogGroomingNearMe #HappyDogs #PetCareProfessionals #PetWellness #DogGroomingOnDemand #PetCareWithLove #Houseplants #GentleGrooming",
});
assert.doesNotMatch(
  safeHarborHashtags.text,
  /NearMe|HappyDogs|Professionals|Wellness|OnDemand|WithLove|Houseplants/i,
  "Hashtag generator output must remove unsupported professional, wellness, availability, and cross-brand claims.",
);
assert.match(
  safeHarborHashtags.text,
  /#MobileDogGrooming|#DogGroomingAtHome|#GentleGrooming/,
  "Hashtag generator should preserve or refill safe Harbor Hound tags.",
);

const safeHarborBios = await applyOutputQualityStage({
  generatorType: "bios",
  supportedSource: harborSource,
  text: [
    "1. Convenient dog grooming at your at home. Trust us to gentle grooming your pup with care and love.",
    "2. Bringing a spa experience to your home. Reliable mobile dog grooming for busy families and pet lovers.",
    "3. dependable dog grooming on wheels. Dedicated to cleanliness and your pet's comfort.",
  ].join("\n"),
});
assert.doesNotMatch(
  safeHarborBios.text,
  /at your at home|Trust us|spa experience|care and love/i,
  "Bio generator output must not return broken or misleading Harbor Hound copy.",
);
assert.match(
  safeHarborBios.text,
  /mobile dog grooming|gentle handling|cleanliness|pet comfort/i,
  "Bio generator repairs should stay specific to Harbor Hound.",
);

const zeroApprovedOutput = await applyOutputQualityStage({
  generatorType: "captions",
  supportedSource: harborSource,
  openAiClient: createRejectingClient(),
  text: [
    "1. Your pet will love it.",
    "2. No more stressful trips.",
    "3. Trust us to care for your furry companions.",
    "4. Proudly serving our coastal community.",
    "5. Our gentle approach helps with every grooming session feels like a treat.",
    "6. Click the link in our bio.",
    "7. Just wrapped up with a happy pup.",
    "8. Professional grooming at home.",
  ].join("\n"),
});
assert.equal(zeroApprovedOutput.text, "", "A failed editorial review must return zero captions, not fallback copy disguised as approved output.");
assert.equal(zeroApprovedOutput.approvedCount, 0, "Zero approved captions must be explicit.");
assert.ok(zeroApprovedOutput.rejectedCount > 0, "Rejected captions must be counted.");

assert.ok(
  generateSource.includes("CAPTION_REVIEW_NO_APPROVED_RESULTS") &&
    generateSource.includes("We couldn't approve these captions. Try adding more detail or generate again.") &&
    generateSource.includes("approvedCaptions") &&
    generateSource.includes("actualCount"),
  "Server must return explicit zero-approved errors and reviewed-caption schema aliases."
);

assert.doesNotMatch(
  generateSource,
  /\bparseGeneratedItems\b/,
  "Netlify generate function must not call the frontend-only parseGeneratedItems helper."
);

assert.ok(
  generateSource.includes("splitGeneratedItems(safeText).slice(0, 5)"),
  "Netlify generate function must build caption response aliases with its in-scope splitGeneratedItems helper."
);

for (const code of [
  "CAPTION_CANDIDATE_GENERATION_FAILED",
  "CAPTION_EDITORIAL_REVIEW_FAILED",
  "CAPTION_REVIEW_PARSE_FAILED",
  "CAPTION_PIPELINE_TIMEOUT",
  "CAPTION_REVIEW_NO_APPROVED_RESULTS",
]) {
  assert.ok(generateSource.includes(code), `Caption pipeline must expose safe code: ${code}`);
}

assert.ok(
  generateSource.includes("createPipelineError") &&
    generateSource.includes("stage: providerError.stage") &&
    generateSource.includes("BrandThat editorial selection failed"),
  "Caption pipeline failures must be logged and returned with stage-specific diagnostics."
);

assert.ok(
  generateSource.includes("Server verified workspace context:") &&
    generateSource.includes("getVerifiedWorkspaceContext") &&
    generateSource.includes("buildSafeClientPrompt") &&
    generateSource.includes("query: `${verifiedWorkspaceContext}\\n${safeClientPrompt}`.trim()") &&
    generateSource.includes("const supportedSource = `${verifiedWorkspaceContext}\\n${safeClientPrompt}\\n${memoryPromptSection}`"),
  "Caption generation must use the authenticated workspace row and sanitized visible client prompt as authoritative context before semantic memory."
);

assert.doesNotMatch(
  `${appSource}\n${generateSource}`,
  /Northline Goods[\s\S]{0,140}(Caption goal|Current Brand Workspace|captionStyleLabels)/i,
  "Caption generation contracts must not depend on Northline demo context."
);

console.log("Caption quality contract passed.");
