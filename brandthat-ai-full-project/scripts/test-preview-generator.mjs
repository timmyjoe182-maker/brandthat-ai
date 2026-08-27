import assert from "node:assert/strict";
import { buildPreviewFromDraft } from "../src/previewGenerator.js";

const cases = [
  {
    key: "houseplants",
    draft: {
      name: "Stone & Stem",
      description: "A local subscription service delivering low-maintenance houseplants to apartment renters, with simple care guidance.",
      industry: "Houseplants and subscription delivery",
      audience: "Apartment renters, busy beginners, and people with limited natural light",
      style: "Fresh, encouraging, calm, and practical",
    },
    expected: ["apartment renters", "houseplant", "subscription", "care", "natural light"],
    blocked: ["first-time homeowners", "local families", "full-service design firm", "room decisions", "warm plaster", "creators", "sponsorship", "technical work bags"],
  },
  {
    key: "pet-service",
    draft: {
      name: "Paws on Wheels",
      description: "A mobile dog grooming service for busy families and senior pet owners.",
      industry: "mobile pet grooming",
      audience: "busy families and senior pet owners",
      style: "gentle, clean, trustworthy",
    },
    expected: ["busy families", "senior pet", "grooming", "convenience", "gentle"],
    blocked: ["creators", "sponsorship", "software", "invoices", "spreadsheets", "deal cards", "technical bags"],
  },
  {
    key: "coffee",
    draft: {
      name: "Canyon Trail Coffee",
      description: "A mobile coffee brand for hikers and outdoor events.",
      industry: "mobile coffee",
      audience: "hikers and outdoor event organizers",
      style: "rugged, warm, energetic",
    },
    expected: ["hikers", "coffee", "trail", "outdoor"],
    blocked: ["sponsorship software", "dog grooming", "talent managers", "technical work bags"],
  },
  {
    key: "interiors",
    draft: {
      name: "Hearthline Studio",
      description: "Affordable local interior styling for first-time homeowners.",
      industry: "interior styling",
      audience: "first-time homeowners",
      style: "warm, practical, tasteful",
    },
    expected: ["homeowners", "room", "interior"],
    blocked: ["sponsorship", "deal cards", "technical bags"],
  },
  {
    key: "software",
    draft: {
      name: "SignalDesk",
      description: "Software for creators managing sponsorships, invoices, and deliverables.",
      industry: "creator software",
      audience: "independent creators",
      style: "clear, composed, operator-minded",
    },
    expected: ["creators", "sponsorship", "software", "invoices", "deliverables"],
    blocked: ["dog grooming", "senior pets", "mobile grooming", "physical carry goods"],
  },
];

const blockedNorthlinePhrases = [
  "creators, founders, photographers, designers, and operators",
  "weatherproof everyday carry",
  "northline goods",
  "carry-system",
  "the specific outcome described in this idea",
  "the sharper angle is",
  "useful enough to understand quickly and distinctive enough to remember",
  "the requested personality should feel",
];

const results = cases.map(({ key, draft, expected, blocked = [] }) => {
  const result = buildPreviewFromDraft(draft);
  const combined = [
    result.thesis,
    result.audience,
    result.traits.join(" "),
    result.positioning,
    result.visualDirection,
  ].join(" ").toLowerCase();

  assert.equal(result.traits.length, 3, `${key} should return three voice traits`);
  assert.ok(result.visualDirection.length > 80, `${key} should include a useful visual direction`);
  for (const term of expected) {
    assert.ok(combined.includes(term), `${key} should include category-specific term: ${term}`);
  }
  for (const phrase of blockedNorthlinePhrases) {
    assert.ok(!combined.includes(phrase), `${key} leaked Northline phrase: ${phrase}`);
  }
  for (const phrase of blocked) {
    assert.ok(!combined.includes(phrase), `${key} leaked unrelated phrase: ${phrase}`);
  }
  return { key, result };
});

for (let i = 0; i < results.length; i += 1) {
  for (let j = i + 1; j < results.length; j += 1) {
    assert.notDeepEqual(results[i].result.traits, results[j].result.traits, `${results[i].key} and ${results[j].key} should not share the same voice traits`);
    assert.notEqual(results[i].result.audience, results[j].result.audience, `${results[i].key} and ${results[j].key} should not share the same audience`);
    assert.notEqual(results[i].result.positioning, results[j].result.positioning, `${results[i].key} and ${results[j].key} should not share the same positioning`);
    assert.notEqual(results[i].result.visualDirection, results[j].result.visualDirection, `${results[i].key} and ${results[j].key} should not share the same visual direction`);
  }
}

console.log("Preview generator tests passed.");
