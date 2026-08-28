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
assert(!/(^|[^A-Za-z0-9_])updated_at\s*:\s*now/.test(primaryLogoFunction), "Primary-logo function must not write brand_workspaces.updated_at unless that production column exists.");

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

assert(logoFunction.includes("return json(503") && logoFunction.includes("fallback: {"), "Logo function must return honest structured provider failures with an explicit fallback option.");
assert(logoFunction.includes("providerError"), "Logo function must return safe provider diagnostics for fallback responses.");
assert(logoFunction.includes("AI logo generation is temporarily unavailable."), "Logo function must return structured JSON failure messages.");
assert(app.includes("const [logoFallbackOption, setLogoFallbackOption] = useState(null)"), "App must define logo fallback state before rendering the error panel.");
assert(app.includes("logoFallbackOption = null"), "GeneratorCard must receive a safe default fallback option prop.");
assert(app.includes("onUseLogoFallback = () => {}"), "GeneratorCard must receive a safe fallback action prop.");
assert(app.includes("Retry AI Generation"), "Logo failure UI must expose a retry action.");
assert(app.includes("Use Instant Vector Instead"), "Logo failure UI must expose an explicit instant-vector choice.");
assert(!app.includes("BrandThat created an instant editable fallback instead"), "Timeout copy must not claim the fallback was generated before the user chooses it.");

assert(app.includes("timeoutMs: 55000"), "Logo image client request must wait for the server OpenAI window instead of aborting at 22s.");
assert(logoFunction.includes("logTiming(\"request_received\")"), "Logo function must log request_received timing.");
assert(logoFunction.includes("logTiming(\"openai_request_started\""), "Logo function must log OpenAI request start timing.");
assert(logoFunction.includes("logTiming(\"openai_response_received\""), "Logo function must log OpenAI response timing.");
assert(logoFunction.includes("logTiming(\"response_returned\""), "Logo function must log response return timing.");
assert(logoFunction.includes("logTiming(\"generation_failed\""), "Logo function must log sanitized generation failure timing.");
console.log("Primary logo contract checks passed.");
