import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../netlify/functions/create-checkout-session.js", import.meta.url), "utf8");

function loadHandler({ authResult, env = {}, stripeState = {} } = {}) {
  const transformedSource = source
    .replace('import Stripe from "stripe";', "const Stripe = __Stripe;")
    .replace('import { createClient } from "@supabase/supabase-js";', "const createClient = __createClient;")
    .replace('import crypto from "node:crypto";', "const crypto = __crypto;")
    .replace("export const handler = async (event) => {", "const handler = async (event) => {");

  function Stripe() {
    return {
      prices: {
        retrieve: async () => ({
          currency: "usd",
          unit_amount: 999,
          type: "recurring",
          recurring: { interval: "month" },
        }),
      },
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
  }

  function createClient() {
    return {
      auth: {
        getUser: async () => {
          if (authResult?.error) return { data: null, error: authResult.error };
          if (authResult?.user) return { data: { user: authResult.user }, error: null };
          return { data: null, error: { message: "No session" } };
        },
      },
    };
  }

  const crypto = {
    randomUUID: () => "request_test_123",
  };

  const factory = new Function(
    "__Stripe",
    "__createClient",
    "__crypto",
    "console",
    "process",
    `${transformedSource}\nreturn { handler };`
  );

  return factory(Stripe, createClient, crypto, console, { env }).handler;
}

function verifiedUser(overrides = {}) {
  return {
    id: "user_123",
    email: "founder@example.com",
    email_confirmed_at: "2026-08-26T00:00:00.000Z",
    ...overrides,
  };
}

function event({ method = "POST", token = "test", body = { plan: "member" } } = {}) {
  return {
    httpMethod: method,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: JSON.stringify(body),
  };
}

function parse(response) {
  return JSON.parse(response.body);
}

assert.match(source, /export const handler/, "checkout function must export an ESM handler for Netlify");

const unauthenticatedHandler = loadHandler();
assert.equal(typeof unauthenticatedHandler, "function", "checkout handler should be loadable");

const getResponse = await unauthenticatedHandler(event({ method: "GET", token: "" }));
assert.equal(getResponse.statusCode, 405, "checkout endpoint should reject non-POST requests");
assert.equal(parse(getResponse).code, "METHOD_NOT_ALLOWED", "checkout endpoint should return a method error code");

const unauthenticatedResponse = await unauthenticatedHandler(event({ token: "" }));
assert.equal(unauthenticatedResponse.statusCode, 401, "checkout endpoint should require an authenticated verified user");
assert.equal(parse(unauthenticatedResponse).code, "AUTH_REQUIRED", "checkout endpoint should return a useful auth code");

const unverifiedHandler = loadHandler({
  authResult: { user: verifiedUser({ email_confirmed_at: null }) },
});
const unverifiedResponse = await unverifiedHandler(event());
assert.equal(unverifiedResponse.statusCode, 403, "checkout endpoint should require email verification");
assert.equal(parse(unverifiedResponse).code, "EMAIL_NOT_VERIFIED", "checkout endpoint should return an email verification code");

const verifiedHandler = loadHandler({ authResult: { user: verifiedUser() } });
const missingStripeResponse = await verifiedHandler(event());
assert.equal(missingStripeResponse.statusCode, 500, "checkout endpoint should report missing Stripe configuration");
assert.equal(parse(missingStripeResponse).code, "STRIPE_SECRET_MISSING", "checkout endpoint should return a specific missing secret code");
assert.equal(parse(missingStripeResponse).stage, "reading_price_id", "checkout endpoint should identify the missing secret stage");

const missingPriceHandler = loadHandler({
  authResult: { user: verifiedUser() },
  env: { STRIPE_SECRET_KEY: "sk_test_mock" },
});
const missingPriceResponse = await missingPriceHandler(event());
assert.equal(missingPriceResponse.statusCode, 500, "checkout endpoint should report a missing membership price ID");
assert.equal(parse(missingPriceResponse).code, "STRIPE_PRICE_MISSING", "checkout endpoint should return a specific missing price code");

const stripeState = {};
const successHandler = loadHandler({
  authResult: { user: verifiedUser() },
  env: { STRIPE_SECRET_KEY: "sk_test_mock", STRIPE_PRICE_ID: "price_monthly_999", URL: "https://brandthat.ai" },
  stripeState,
});
const successResponse = await successHandler(event());
const successBody = parse(successResponse);
assert.equal(successResponse.statusCode, 200, "checkout endpoint should create a Stripe session for verified members");
assert.equal(successBody.url, "https://checkout.stripe.test/session", "checkout endpoint should return Stripe checkout URL");
assert.equal(stripeState.checkoutArgs.line_items[0].price, "price_monthly_999", "checkout must use the server configured monthly price");
assert.equal(stripeState.customerArgs.email, "founder@example.com", "checkout should create a Stripe customer with the authenticated user's email");
assert.equal(stripeState.checkoutArgs.customer, "cus_test_123", "checkout should attach the session to a server-created Stripe customer");
assert.equal(stripeState.checkoutArgs.metadata.user_id, "user_123", "checkout should bind the session to the authenticated user");

const badPriceHandler = loadHandler({
  authResult: { user: verifiedUser() },
  env: { STRIPE_SECRET_KEY: "sk_test_mock", STRIPE_PRICE_ID: "https://buy.stripe.com/test_123" },
});
const badPriceResponse = await badPriceHandler(event());
assert.equal(badPriceResponse.statusCode, 500, "checkout endpoint should reject payment links as price configuration");
assert.equal(parse(badPriceResponse).code, "STRIPE_PRICE_INVALID_FORMAT", "checkout endpoint should explain that Stripe needs a price ID");

console.log("Checkout handler tests passed.");
