import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8");

const app = read("src/App.jsx");
const index = read("index.html");
const robots = read("public/robots.txt");
const sitemap = read("public/sitemap.xml");

assert.ok(index.includes("<title>BrandThat.ai"), "SEO title is missing.");
assert.ok(index.includes('name="description"'), "SEO description is missing.");
assert.ok(index.includes('rel="canonical"'), "Canonical URL is missing.");
assert.ok(index.includes('property="og:image"'), "Open Graph image is missing.");
assert.ok(index.includes('application/ld+json'), "Structured data is missing.");
assert.ok(robots.includes("Sitemap: https://brandthat.ai/sitemap.xml"), "robots.txt must reference sitemap.");
assert.ok(sitemap.includes("https://brandthat.ai/"), "sitemap.xml must include homepage.");

[
  "/workspace",
  "/workspace/strategy",
  "/workspace/identity",
  "/workspace/content",
  "/workspace/roadmap",
  "/workspace/assets",
  "/workspace/settings",
  "/workspace/content/captions",
  "/workspace/identity/logos",
].forEach((route) => assert.ok(app.includes(route), `Missing route marker: ${route}`));

[
  "aria-live",
  "aria-label",
  "role=\"alert\"",
  "min-height:44px",
  "@media(max-width:1040px)",
  "@media(max-width:680px)",
].forEach((needle) => assert.ok(app.includes(needle), `Missing accessibility/mobile marker: ${needle}`));

[
  "landing_page_view",
  "preview_started",
  "preview_completed",
  "signup_opened",
  "signup_completed",
  "checkout_started",
  "checkout_completed",
  "checkout_cancelled",
  "workspace_opened",
  "generator_used",
  "checkout_canceled",
  "checkout_request_started",
  "checkout_session_created",
  "workspace_created",
  "text_generated",
  "asset_saved",
].forEach((needle) => assert.ok(app.includes(needle), `Missing funnel event: ${needle}`));

if (existsSync(new URL("dist/assets", root))) {
  const bundles = readdirSync(new URL("dist/assets", root)).filter((file) => file.endsWith(".js"));
  assert.ok(bundles.length, "Production JS bundle is missing.");
  const totalBytes = bundles.reduce((sum, file) => sum + statSync(join(new URL("dist/assets", root).pathname, file)).size, 0);
  assert.ok(totalBytes < 1_250_000, `JS bundle budget exceeded: ${totalBytes} bytes.`);
  const bundleText = bundles.map((file) => read(`dist/assets/${file}`)).join("\n");
  assert.doesNotMatch(bundleText, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|BRAND_MEMORY_TEST_USER_IDS|sk-[A-Za-z0-9]{20,}|service_role/, "Client bundle contains server-only secret markers.");
}

console.log("Launch readiness audits passed.");
