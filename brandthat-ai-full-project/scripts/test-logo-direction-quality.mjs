import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { polishLogoConcepts, sanitizeSupportedPersonalitySummary } from "../netlify/functions/logo-image.js";

const forbidden = /\b(luxury price|startup scale|premium market|playful tone|feminine gender|tech-driven craft|mascot or object-led|object-led mark|AI Concept|Direction 1|Option A|Logo Result|undefined|null|Brand Strategy:\s*\.|^\s*[.\-_:;,\s]+\s*$)\b/i;

const cases = [
  {
    name: "Stone & Stem",
    context: {
      subject: "houseplants",
      logoIndustry: "Houseplants / local plant delivery",
      logoSymbol: "Subtle stone-and-leaf or grounded botanical mark",
      palette: "Leaf Green #3F6F45, Stone Gray #827F73, Warm Ivory #F6F0E3, Soft Terracotta #B86F4B",
      typography: { label: "Warm botanical serif plus readable humanist sans" },
      brandStrategy: {
        coreMessage: "Stone & Stem makes apartment greenery easy for beginners.",
        targetCustomer: "Apartment renters and first-time plant owners",
        suggestedVisualDirection: "Friendly botanical identity, local plant delivery, beginner confidence and apartment greenery",
        suggestedColorDirection: "Leaf Green #3F6F45, Stone Gray #827F73, Warm Ivory #F6F0E3, Soft Terracotta #B86F4B",
        suggestedTypographyDirection: "Warm botanical serif plus readable humanist sans",
      },
      personality: { summary: "Friendly, minimal, calm, dependable" },
    },
    expectedTitles: ["Botanical Wordmark", "Stone & Leaf Symbol", "Friendly Delivery Badge"],
    expectedTerms: /botanical|plant|greenery|delivery|care|apartment/i,
    forbiddenTerms: /software|sponsorship|invoice|SaaS|AI startup/i,
  },
  {
    name: "SignalDesk",
    context: {
      subject: "tech",
      logoIndustry: "Sponsorship-management software for creators",
      logoSymbol: "Signal, workflow, invoice, and deliverable organization",
      palette: "Ink, cloud, signal blue",
      typography: { label: "Clean product-grade sans" },
      brandStrategy: {
        coreMessage: "SignalDesk helps creators keep sponsorships, invoices, and deliverables organized.",
        targetCustomer: "Creators managing paid brand work",
        suggestedVisualDirection: "Precise workflow identity with signal and organization cues",
        suggestedColorDirection: "Ink, cloud, signal blue",
        suggestedTypographyDirection: "Clean product-grade sans",
      },
      personality: { summary: "Clear, organized, efficient" },
    },
    expectedTerms: /workflow|software|creator|product|signal/i,
    forbiddenTerms: /dog grooming|houseplant|senior pets|mobile coffee/i,
  },
  {
    name: "Porchlight Pet Care",
    context: {
      subject: "pet",
      logoIndustry: "Local pet-sitting and dog-walking service",
      logoSymbol: "Warm neighborhood pet-care cue",
      palette: "Warm cream, charcoal, porchlight amber",
      typography: { label: "Rounded friendly sans with polished spacing" },
      brandStrategy: {
        coreMessage: "Porchlight Pet Care makes neighborhood pet care feel personal and dependable.",
        targetCustomer: "Busy local professionals who want dependable pet care close to home",
        suggestedVisualDirection: "Friendly pet care identity with trust, neighborhood, and gentle service cues",
        suggestedColorDirection: "Warm cream, charcoal, porchlight amber",
        suggestedTypographyDirection: "Rounded friendly sans with polished spacing",
      },
      personality: { summary: "Warm, trustworthy, personal" },
    },
    expectedTerms: /service|pet|trust|neighborhood|care/i,
    forbiddenTerms: /sponsorship|invoice|houseplant|coffee|AI startup/i,
  },
];

for (const testCase of cases) {
  const concepts = polishLogoConcepts([], testCase.context);
  assert.equal(concepts.length, 3, `${testCase.name} should produce three polished directions.`);

  const names = concepts.map((concept) => concept.name);
  assert.equal(new Set(names).size, 3, `${testCase.name} direction names must be distinct.`);
  if (testCase.expectedTitles) assert.deepEqual(names, testCase.expectedTitles);

  const layouts = concepts.map((concept) => concept.layout);
  const rationales = concepts.map((concept) => concept.whyFits);
  const symbols = concepts.map((concept) => concept.symbol.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const typography = concepts.map((concept) => concept.typography.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  const uses = concepts.map((concept) => concept.primaryUseCase.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim());
  assert.equal(new Set(layouts).size, 3, `${testCase.name} compositions must be distinct.`);
  assert.equal(new Set(rationales).size, 3, `${testCase.name} rationales must be distinct.`);
  assert.equal(new Set(symbols).size, 3, `${testCase.name} symbol treatments must be distinct.`);
  assert.equal(new Set(typography).size, 3, `${testCase.name} typography treatments must be distinct.`);
  assert.equal(new Set(uses).size, 3, `${testCase.name} primary use cases must be distinct.`);

  for (const concept of concepts) {
    const joined = [
      concept.name,
      concept.symbol,
      concept.typography,
      concept.palette,
      concept.layout,
      concept.whyFits,
      concept.primaryUseCase,
      concept.smallSizeBehavior,
    ].join(" ");
    assert(!forbidden.test(joined), `${testCase.name} leaked forbidden/internal language: ${joined}`);
    assert(!testCase.forbiddenTerms.test(joined), `${testCase.name} leaked unrelated category language: ${joined}`);
    assert(testCase.expectedTerms.test(joined), `${testCase.name} should stay specific to its workspace: ${joined}`);
    assert(
      concept.whyFits.split(/(?<=[.!?])\s+/).filter(Boolean).length <= 4,
      `${testCase.name} direction descriptions should stay concise.`
    );
  }
}

const stoneTraits = sanitizeSupportedPersonalitySummary(
  "calm energy, minimal expression, playful tone, feminine gender, tech-driven craft",
  {
    logoStyle: "Calm minimal",
    logoSymbol: "stone-and-leaf botanical mark",
    logoIndustry: "Houseplants / local plant delivery",
    brandStrategy: {
      brandPersonality: "calm, minimal",
      positioning: "Beginner-friendly local plant subscription",
      suggestedVisualDirection: "botanical apartment greenery",
    },
  }
);
assert.match(stoneTraits, /calm/);
assert.match(stoneTraits, /minimal/);
assert.doesNotMatch(stoneTraits, /playful|feminine|gender|tech-driven|craft/i);

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
assert(appSource.includes("buildCanonicalLogoDirections"), "App must build one canonical logo direction array.");
assert(appSource.includes("logoVariations={canonicalLogoDirections}"), "Creative Director must receive the canonical direction array.");
assert(appSource.includes("canonicalLogoDirections.slice(0, 3).map"), "Rendered direction cards must use the canonical direction array.");
assert(!appSource.includes(">AI Concept<"), "Rendered UI must not hardcode AI Concept as a direction title.");
assert(appSource.includes("isGenericLogoDirectionTitle"), "Generic logo direction titles must be filtered.");

console.log("Logo direction quality contract passed.");
