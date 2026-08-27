import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

[
  "getBrandCompletionChecklist",
  "getBrandCompletion",
  "Brand basics",
  "Description",
  "Audience",
  "Positioning",
  "Voice",
  "Colors",
  "Typography",
  "Logo",
  "First content asset",
].forEach((needle) => assert.ok(appSource.includes(needle), `Missing completion contract: ${needle}`));

assert.ok(appSource.includes("saveGeneratedAsset = () => {}"), "GeneratorCard must receive the individual asset save function.");
assert.ok(appSource.includes("handleSaveResultItem"), "Individual result rows should use the shared save handler.");
assert.ok(appSource.includes("Saving..."), "Individual save controls should show loading feedback.");
assert.ok(appSource.includes("handleCopyResultItem"), "Individual result rows should expose copy feedback.");
assert.ok(appSource.includes("Favorited"), "Individual favorite controls should expose persisted favorite state.");
assert.ok(appSource.includes("Saved to ${activeBrand?.name || \"Workspace\"} ✓"), "Generator save buttons should show saved state.");
assert.ok(appSource.includes("This result is already saved."), "Duplicate saves should show a useful message.");
assert.ok(appSource.includes("assetControls"), "Saved Assets should include search/filter controls.");
assert.ok(appSource.includes("createMenuContext"), "Create menu should show the active brand context.");
assert.ok(appSource.includes("Avoid unsupported health, scientific"), "Caption prompt should block unsupported claims.");
assert.ok(appSource.includes("do not give an exact watering frequency"), "Caption prompt should block unsupported plant watering schedules.");
assert.ok(appSource.includes("never invent universal schedules"), "General prompt should block unsupported care schedules.");
assert.ok(appSource.includes("!isLoggedInApplicationPage && <nav"), "Logged-in app pages should not render the public marketing nav.");

console.log("Workspace app contract tests passed.");