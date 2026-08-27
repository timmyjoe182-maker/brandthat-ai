import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const checkoutSource = readFileSync(new URL("../netlify/functions/create-checkout-session.js", import.meta.url), "utf8");
const webhookSource = readFileSync(new URL("../netlify/functions/stripe-webhook.js", import.meta.url), "utf8");
const verifySource = readFileSync(new URL("../netlify/functions/verify-checkout-session.js", import.meta.url), "utf8");
const reconcileSource = readFileSync(new URL("../netlify/functions/reconcile-membership.js", import.meta.url), "utf8");
const membershipSource = readFileSync(new URL("../netlify/functions/lib/membership.js", import.meta.url), "utf8");
const envDiagnosticsSource = readFileSync(new URL("../netlify/functions/env-diagnostics.js", import.meta.url), "utf8");

assert.match(checkoutSource, /export const handler/, "checkout function must export an ESM handler for Netlify");
assert.match(webhookSource, /export const handler/, "webhook function must export an ESM handler for Netlify");
assert.match(verifySource, /export const handler/, "checkout verifier must export an ESM handler for Netlify");
assert.match(reconcileSource, /export const handler/, "membership reconciler must export an ESM handler for Netlify");
assert.match(envDiagnosticsSource, /export const handler/, "environment diagnostics must export an ESM handler for Netlify");

assert.match(checkoutSource, /reconcileMembershipFromStripe/, "checkout must reconcile existing paid users before creating another session");
assert.match(checkoutSource, /alreadySubscribed/, "checkout must return alreadySubscribed for active members");
assert.match(checkoutSource, /session_id=\{CHECKOUT_SESSION_ID\}/, "checkout success URL must include the Stripe checkout session placeholder");
assert.match(checkoutSource, /stripe\.checkout\.sessions\.create/, "checkout must create sessions server-side");
assert.doesNotMatch(checkoutSource, /buy\.stripe\.com/, "checkout must not hardcode a Stripe payment link");

assert.match(verifySource, /stripe\.checkout\.sessions\.retrieve/, "verify endpoint must retrieve checkout sessions server-side");
assert.match(verifySource, /sessionUserId !== auth\.user\.id/, "verify endpoint must bind sessions to the authenticated user");
assert.match(verifySource, /updateProfileMembership/, "verify endpoint must update Supabase membership after Stripe confirms payment");

assert.match(reconcileSource, /reconcileMembershipFromStripe/, "reconcile endpoint must verify Stripe subscriptions without checkout");
assert.match(membershipSource, /findActiveSubscription/, "membership helper must locate active Stripe subscriptions");
assert.match(membershipSource, /ACTIVE_SUBSCRIPTION_STATUSES/, "membership helper must centralize active subscription states");
assert.match(membershipSource, /stripe\.subscriptions\.list/, "membership helper must inspect existing subscriptions before checkout");
assert.match(membershipSource, /process\.env\.SUPABASE_URL \|\| process\.env\.VITE_SUPABASE_URL/, "admin client must accept VITE_SUPABASE_URL when SUPABASE_URL is missing");
assert.match(membershipSource, /process\.env\.SUPABASE_SERVICE_ROLE_KEY \|\| ""/, "admin writes must require the service-role key");
assert.doesNotMatch(membershipSource.match(/export function getSupabaseAdminClient\(\)[\s\S]*?\n}\n/)?.[0] || "", /SUPABASE_ANON_KEY|VITE_SUPABASE_ANON_KEY|sb_publishable/, "admin client must never use the public anon key");
assert.match(membershipSource, /getEnvironmentDiagnostics/, "membership helper must expose safe environment diagnostics");
assert.match(envDiagnosticsSource, /getEnvironmentDiagnostics/, "diagnostics endpoint must return safe configuration presence");

assert.match(webhookSource, /stripe\.webhooks\.constructEvent/, "webhook must verify Stripe signatures");
assert.match(webhookSource, /checkout\.session\.completed/, "webhook must handle checkout completion");
assert.match(webhookSource, /customer\.subscription\.created/, "webhook must handle subscription creation");
assert.match(webhookSource, /customer\.subscription\.updated/, "webhook must handle subscription updates");
assert.match(webhookSource, /customer\.subscription\.deleted/, "webhook must handle subscription deletion");
assert.match(webhookSource, /invoice\.paid/, "webhook must accept invoice paid events");
assert.match(webhookSource, /invoice\.payment_failed/, "webhook must accept invoice payment failures");
assert.match(webhookSource, /throw error/, "webhook must return 500 for failed Supabase writes so Stripe can retry");
assert.match(webhookSource, /stripe_webhook_events/, "webhook must attempt Stripe event idempotency by event ID");

console.log("Checkout and webhook contract tests passed.");
