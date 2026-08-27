import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("src/App.jsx");
const primaryLogoFunction = read("netlify/functions/set-primary-logo.js");
const logoFunction = read("netlify/functions/logo-image.js");
const migration = read("supabase/migrations/20260827143000_add_primary_logo_fields.sql");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

[
  "logo_image_url",
  "primary_logo_asset_id",
  "primary_logo_updated_at",
  "logo_metadata",
].forEach((field) => {
  assert(migration.includes(field), `Migration must include ${field}.`);
});

assert(primaryLogoFunction.includes("requireVerifiedUser"), "Primary-logo function must require an authenticated verified user.");
assert(primaryLogoFunction.includes('.from("brand_workspaces")'), "Primary-logo function must verify the workspace.");
assert(primaryLogoFunction.includes('.from("saved_generations")'), "Primary-logo function must verify the saved logo asset.");
assert(primaryLogoFunction.includes("PRIMARY_LOGO_SCHEMA_MISSING"), "Primary-logo function must expose a safe schema-missing code.");
assert(primaryLogoFunction.includes("primary_logo_asset_id"), "Primary-logo function must persist the primary asset ID.");
assert(primaryLogoFunction.includes("success: true"), "Primary-logo function must return an explicit success value.");
assert(primaryLogoFunction.includes("workspace: updatedWorkspace"), "Primary-logo function must return the persisted workspace row.");

assert(app.includes('/.netlify/functions/set-primary-logo'), "App must use the centralized primary-logo function.");
assert(!/\.from\("brand_workspaces"\)\s*\.\s*update\(\{\s*logo_image_url/.test(app), "App must not directly write logo_image_url from the browser.");
assert(app.includes("function hasPrimaryLogo"), "App must centralize primary-logo completion checks.");
assert(app.includes("function mergePrimaryLogoIntoWorkspace"), "App must merge the persisted primary-logo response into workspace state.");
assert(app.includes("primaryLogoResult.workspace"), "App must prefer the returned persisted workspace row after setting a primary logo.");
assert(app.includes("primary_logo_asset_id"), "App must hydrate persisted primary-logo asset IDs.");
assert(app.includes("logo_image_url"), "App must hydrate persisted primary-logo URLs.");
assert(!app.includes('complete: Boolean(brand?.logoImage)'), "Completion must not depend only on the old logoImage field.");
assert(app.includes("Save Logo Concept"), "Logo result must expose Save Logo Concept.");
assert(app.includes("Set as Primary Logo"), "Logo result must expose Set as Primary Logo.");
assert(!app.includes("Save Brand Project</button>"), "Logo result must not render the old Save Brand Project button.");
assert(app.includes("Generate three meaningfully different logo directions"), "Logo prompt must request three materially different logo directions.");
assert(app.includes("saveLogoVariation"), "Logo result must expose per-direction save/set-primary actions.");

assert(logoFunction.includes("fallback: true"), "Logo function must identify instant-vector fallback responses.");
assert(logoFunction.includes("providerError"), "Logo function must return safe provider diagnostics for fallback responses.");
assert(logoFunction.includes("Logo generation is temporarily unavailable."), "Logo function must return structured JSON failure messages.");

console.log("Primary logo contract checks passed.");
