import assert from "node:assert/strict";
import { cleanGeneratedText, ensureThesisDriven, isGenericRecommendation, makeTaglines } from "../src/brandPlanQuality.js";

assert.equal(cleanGeneratedText("**Use this**\n\n\nnow"), "Use this\n\nnow");
assert.equal(isGenericRecommendation("Use professional colors."), true);
assert.equal(ensureThesisDriven("Use professional colors.", "Use moss green and warm ivory because the buyer wants plant care to feel calm, local, and manageable."), "Use moss green and warm ivory because the buyer wants plant care to feel calm, local, and manageable.");
assert.equal(
  ensureThesisDriven("Use moss green, warm ivory, and clay because the brand has to make apartment plant care feel calm, local, and easy to keep alive.", "fallback"),
  "Use moss green, warm ivory, and clay because the brand has to make apartment plant care feel calm, local, and easy to keep alive."
);
assert.deepEqual(makeTaglines({ brandName: "Stone & Stem", industry: "houseplant subscription", opportunity: "trust" }).slice(0, 2), [
  "Stone & Stem makes greenery easier to keep.",
  "Apartment plants, delivered with confidence.",
]);
assert.ok(!makeTaglines({ brandName: "Stone & Stem", industry: "houseplant subscription", opportunity: "convenience" }).join(" ").includes("usual friction"));
assert.ok(makeTaglines({ brandName: "SignalDesk", industry: "creator sponsorship software", opportunity: "trust" }).join(" ").includes("Sponsorships"));

console.log("Brand plan quality tests passed.");
