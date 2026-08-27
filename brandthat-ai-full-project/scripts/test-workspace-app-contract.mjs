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

assert.ok(appSource.includes("Saved to ${activeBrand?.name || \"Workspace\"} ✓"), "Generator save-all button should show saved state.");
assert.ok(appSource.includes("isAssetSaved(item) ? \"Saved ✓\" : \"Save\""), "Individual result rows should expose saved state.");
assert.ok(appSource.includes("This result is already saved."), "Duplicate saves should show a useful message.");
assert.ok(appSource.includes("assetControls"), "Saved Assets should include search/filter controls.");
assert.ok(appSource.includes("createMenuContext"), "Create menu should show the active brand context.");
assert.ok(appSource.includes("Avoid unsupported health, scientific"), "Caption prompt should block unsupported claims.");
assert.ok(appSource.includes("!isLoggedInApplicationPage && <nav"), "Logged-in app pages should not render the public marketing nav.");

console.log("Workspace app contract tests passed.");
