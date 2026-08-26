import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../netlify/functions/create-checkout-session.js", import.meta.url), "utf8");

function loadHandler({ authResult, env = {}, stripeState = {} } = {}) {
  const module = { exports: {} };
  const context = {
    console,
    process: { env },
    module,
    exports: module.exports,
    require(name) {
      if (name === "stripe") {
        return function Stripe() {
          return {
            prices: { retrieve: async () => ({ currency: "usd", unit_amount: 999, type: "recurring", recurring: { interval: "month" } }) },
            customers: {
              search: async () => ({ data: stripeState.existingCustomer ? [stripeState.existingCustomer] : [] }),
              create: async (args) => {
                stripeState.customerArgs = args;
                return { id: "cus_test_123", email: args.email };
              },
            },
            checkout: {
              sessions: {
                create: async (args) => {
                  stripeState.checkoutArgs = args;
                  return { id: "cs_test_123", url: "https://checkout.stripe.test/session" };
                },
              },
            },
          };
        };
      }
      if (name === "./lib/auth") {
        return { requireVerifiedUser: async () => authResult || { error: { statusCode: 401, message: "Create your BrandThat account to try the full product." } } };
      }
      throw new Error(`Unexpected require: ${name}`);
    },
  };
  vm.runInNewContext(source, context, { filename: "create-checkout-session.js" });
  return module.exports.handler;
}

const unauthenticatedHandler = loadHandler();

const getResponse = await unauthenticatedHandler({ httpMethod: "GET", headers: {}, body: "" });
assert.equal(getResponse.statusCode, 405, "checkout endpoint should reject non-POST requests");

const unauthenticatedResponse = await unauthenticatedHandler({ httpMethod: "POST", headers: {}, body: JSON.stringify({ plan: "member" }) });
assert.equal(unauthenticatedResponse.statusCode, 401, "checkout endpoint should require an authenticated verified user");
assert.match(JSON.parse(unauthenticatedResponse.body).error, /account|log in|login/i, "checkout endpoint should return a useful auth error");

const verifiedHandler = loadHandler({ authResult: { user: { id: "user_123", email: "founder@example.com" } } });
const missingStripeResponse = await verifiedHandler({ httpMethod: "POST", headers: { authorization: "Bearer test" }, body: JSON.stringify({ plan: "member" }) });
assert.equal(missingStripeResponse.statusCode, 500, "checkout endpoint should report missing Stripe configuration");
assert.match(JSON.parse(missingStripeResponse.body).error, /checkout is not configured/i, "checkout endpoint should return a useful configuration error");

const missingPriceHandler = loadHandler({
  authResult: { user: { id: "user_123", email: "founder@example.com" } },
  env: { STRIPE_SECRET_KEY: "sk_test_mock" },
});
const missingPriceResponse = await missingPriceHandler({ httpMethod: "POST", headers: { authorization: "Bearer test" }, body: JSON.stringify({ plan: "member" }) });
assert.equal(missingPriceResponse.statusCode, 500, "checkout endpoint should report a missing membership price ID");
assert.equal(JSON.parse(missingPriceResponse.body).code, "STRIPE_PRICE_MISSING", "checkout endpoint should return a specific missing price code");

const stripeState = {};
const successHandler = loadHandler({
  authResult: { user: { id: "user_123", email: "founder@example.com" } },
  env: { STRIPE_SECRET_KEY: "sk_test_mock", STRIPE_PRICE_ID: "price_monthly_999", URL: "https://brandthat.ai" },
  stripeState,
});
const successResponse = await successHandler({ httpMethod: "POST", headers: { authorization: "Bearer test" }, body: JSON.stringify({ plan: "member" }) });
const successBody = JSON.parse(successResponse.body);
assert.equal(successResponse.statusCode, 200, "checkout endpoint should create a Stripe session for verified members");
assert.equal(successBody.url, "https://checkout.stripe.test/session", "checkout endpoint should return Stripe checkout URL");
assert.equal(stripeState.checkoutArgs.line_items[0].price, "price_monthly_999", "checkout must use the server configured monthly price");
assert.equal(stripeState.customerArgs.email, "founder@example.com", "checkout should create a Stripe customer with the authenticated user's email");
assert.equal(stripeState.checkoutArgs.customer, "cus_test_123", "checkout should attach the session to a server-created Stripe customer");
assert.equal(stripeState.checkoutArgs.metadata.user_id, "user_123", "checkout should bind the session to the authenticated user");

const badPriceHandler = loadHandler({
  authResult: { user: { id: "user_123", email: "founder@example.com" } },
  env: { STRIPE_SECRET_KEY: "sk_test_mock", STRIPE_PRICE_ID: "https://buy.stripe.com/test_123" },
});
const badPriceResponse = await badPriceHandler({ httpMethod: "POST", headers: { authorization: "Bearer test" }, body: JSON.stringify({ plan: "member" }) });
assert.equal(badPriceResponse.statusCode, 500, "checkout endpoint should reject payment links as price configuration");
assert.match(JSON.parse(badPriceResponse.body).error, /Price ID/i, "checkout endpoint should explain that Stripe needs a price ID");

console.log("Checkout handler tests passed.");
