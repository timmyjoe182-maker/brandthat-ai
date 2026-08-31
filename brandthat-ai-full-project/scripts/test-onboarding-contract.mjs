import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const membership = readFileSync(new URL("../src/membershipState.js", import.meta.url), "utf8");
const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");

[
  "CUSTOMER_INTENT_DRAFT_KEY",
  "getVisibleCustomerDraft",
  "persistVisibleCustomerDraft",
  "getInitialWorkspaceDraft",
  "localStorage.removeItem(CUSTOMER_INTENT_DRAFT_KEY)",
].forEach((needle) => assert.ok(app.includes(needle), `Visible draft persistence missing: ${needle}`));

assert.ok(app.includes("Free Preview"), "Free preview must be explicitly labeled.");
assert.ok(app.includes("A focused snapshot, not the complete workspace."), "Preview must not masquerade as the paid workspace.");
assert.ok(app.includes("Brand thesis"), "Preview must show thesis.");
assert.ok(app.includes("Audience"), "Preview must show audience.");
assert.ok(app.includes("Three voice traits"), "Preview must show three voice traits.");
assert.ok(app.includes("Positioning direction"), "Preview must show positioning.");
assert.ok(app.includes("Visual direction"), "Preview must show visual direction.");
assert.ok(app.includes("Unlock the Complete Workspace"), "Preview must include the unlock CTA.");

assert.ok(app.includes("WORKSPACE_TOUR_DISMISSED_KEY"), "First paid session tour must persist dismissal.");
assert.ok(app.includes("WorkspaceWelcomePanel"), "Workspace must include a first-session welcome panel.");
assert.ok(app.includes("Your strategy, identity, content tools, and roadmap all share"), "Welcome must explain shared brand context.");
assert.ok(app.includes("Open Content Tools"), "Welcome must point to Content Tools.");
assert.ok(app.includes("Dismiss tour"), "Welcome must be dismissible.");

assert.ok(app.includes("Create Your First Asset"), "Empty saved-content state must prompt first asset creation.");
assert.ok(app.includes("Open Your First 30 Days"), "Empty roadmap state must point to the first roadmap period.");
assert.ok(app.includes("Saved and approved work helps BrandThat learn this brand over time."), "Memory empty state guidance must be present.");
assert.ok(app.includes("A saved logo concept counts after you set it as the primary logo."), "Completion must explain logo concept versus primary logo.");

assert.ok(app.includes("htmlFor=\"workspace-brand-name\""), "New Brand name field needs a programmatic label.");
assert.ok(app.includes("htmlFor=\"workspace-brand-description\""), "New Brand description field needs a programmatic label.");
assert.ok(app.includes("aria-describedby=\"workspace-brand-name-help\""), "Name field needs accessible validation help.");
assert.ok(app.includes("aria-describedby=\"workspace-brand-description-help\""), "Description field needs accessible validation help.");
assert.ok(app.includes("Required to create a workspace."), "New Brand form must provide useful required-field text.");

[
  "/workspace",
  "/workspace/strategy",
  "/workspace/identity",
  "/workspace/content",
  "/workspace/roadmap",
  "/workspace/assets",
  "/workspace/settings",
  "/workspace/identity/logos",
].forEach((route) => assert.ok(app.includes(route) || main.includes(route), `Workspace route missing: ${route}`));
assert.ok(app.includes("`/workspace/content/${toolKey || \"captions\"}`"), "Generator routes must be built under /workspace/content/:tool.");

assert.doesNotMatch(app, /window\.history\.(pushState|replaceState)\(\{\}, "", "\/#workspace"\)/, "Successful app navigation should use /workspace, not #workspace.");
assert.ok(membership.includes("Checking membership..."), "Membership CTA must show a neutral loading state.");
assert.ok(membership.includes("Retry account check"), "Subscription lookup failure must be recoverable.");
assert.ok(app.includes("checkoutResumePrompt && authStatus === \"logged_in\" && !membershipLoading"), "Checkout resume banner must wait for membership lookup.");

console.log("Onboarding contract tests passed.");
