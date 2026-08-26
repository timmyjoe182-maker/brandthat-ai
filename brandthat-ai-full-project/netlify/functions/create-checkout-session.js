import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co";
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getMembershipPriceId() {
  return (
    process.env.STRIPE_BRAND_PLAN_PRICE_ID ||
    process.env.STRIPE_MEMBER_PRICE_ID ||
    process.env.STRIPE_MONTHLY_PRICE_ID ||
    process.env.STRIPE_SUBSCRIPTION_PRICE_ID ||
    process.env.STRIPE_PRICE_ID ||
    process.env.STRIPE_PRO_PRICE_ID ||
    process.env.STRIPE_STARTER_PRICE_ID ||
    ""
  );
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function getRequestId() {
  return crypto.randomUUID?.() || `checkout_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

async function requireVerifiedUser(event) {
  const token = getBearerToken(event);

  if (!token) {
    return {
      error: {
        statusCode: 401,
        message: "Create your BrandThat account to try the full product.",
      },
    };
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  const user = data?.user || null;

  if (error || !user) {
    return {
      error: {
        statusCode: 401,
        message: "Please log in again to continue.",
      },
    };
  }

  if (!isEmailVerified(user)) {
    return {
      error: {
        statusCode: 403,
        message: "Check your email to verify your account before continuing.",
      },
    };
  }

  return { user };
}

async function getOrCreateStripeCustomer(user) {
  const metadata = { user_id: user.id, supabase_user_id: user.id };

  try {
    const search = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
      limit: 1,
    });
    const existingCustomer = search?.data?.[0];
    if (existingCustomer?.id) return existingCustomer;
  } catch (error) {
    console.warn("BrandThat checkout customer search skipped:", {
      type: error?.type,
      code: error?.code,
    });
  }

  return stripe.customers.create({
    email: user.email,
    metadata,
  });
}

export const handler = async (event) => {
  const requestId = getRequestId();
  let checkoutStage = "initializing";

  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return json(405, { error: "Use POST to start checkout.", code: "METHOD_NOT_ALLOWED", requestId });
    }

    checkoutStage = "authenticating";
    const auth = await requireVerifiedUser(event);
    if (auth.error) {
      return json(auth.error.statusCode, {
        error: auth.error.message,
        code: auth.error.statusCode === 403 ? "EMAIL_NOT_VERIFIED" : "AUTH_REQUIRED",
        stage: checkoutStage,
        requestId,
      });
    }

    const { plan = "member" } = JSON.parse(event.body || "{}");
    const user = auth.user;

    if (plan !== "member") {
      return json(400, {
        error: "Choose the BrandThat monthly membership to continue.",
        code: "INVALID_PLAN",
        requestId,
      });
    }

    checkoutStage = "reading_price_id";
    if (!stripe) {
      console.error("BrandThat checkout misconfigured: STRIPE_SECRET_KEY is missing.", { requestId, stage: checkoutStage });
      return json(500, {
        error: "Checkout is not configured yet. Please contact BrandThat support.",
        code: "STRIPE_SECRET_MISSING",
        stage: checkoutStage,
        requestId,
      });
    }

    const priceId = getMembershipPriceId();

    if (!priceId) {
      console.error("BrandThat checkout misconfigured: membership price ID is missing.", { requestId, stage: checkoutStage });
      return json(500, {
        error: "Missing Stripe price ID for the BrandThat monthly membership.",
        code: "STRIPE_PRICE_MISSING",
        stage: checkoutStage,
        requestId,
      });
    }

    if (!String(priceId).startsWith("price_")) {
      console.error("BrandThat checkout misconfigured: membership price must be a Stripe Price ID.", {
        requestId,
        stage: checkoutStage,
        configuredPrefix: String(priceId).slice(0, 8),
      });
      return json(500, {
        error: "Stripe membership must be configured with a recurring Price ID, not a payment link or product ID.",
        code: "STRIPE_PRICE_INVALID_FORMAT",
        stage: checkoutStage,
        requestId,
      });
    }

    checkoutStage = "retrieving_price";
    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (error) {
      console.error("BrandThat checkout misconfigured: membership price could not be verified.", {
        requestId,
        stage: checkoutStage,
        type: error?.type,
        code: error?.code,
        statusCode: error?.statusCode,
        message: error?.message,
      });
      return json(500, {
        error: "Stripe membership price could not be verified. Please contact BrandThat support.",
        code: "STRIPE_PRICE_VERIFY_FAILED",
        stage: checkoutStage,
        requestId,
      });
    }

    const isMonthlyMembership =
      price.currency === "usd" &&
      price.unit_amount === 999 &&
      price.type === "recurring" &&
      price.recurring?.interval === "month";

    if (!isMonthlyMembership) {
      console.error("BrandThat checkout misconfigured: membership price is not recurring $9.99/month.", {
        requestId,
        stage: checkoutStage,
        currency: price.currency,
        unit_amount: price.unit_amount,
        type: price.type,
        interval: price.recurring?.interval,
      });
      return json(500, {
        error: "Stripe BrandThat membership price must be a recurring monthly $9.99 USD price.",
        code: "STRIPE_PRICE_NOT_MONTHLY_999",
        stage: checkoutStage,
        requestId,
      });
    }

    checkoutStage = "searching_customer";
    const customer = await getOrCreateStripeCustomer(user);

    checkoutStage = "creating_checkout_session";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customer.id,
      client_reference_id: user.id,
      metadata: {
        plan: "member",
        user_id: user.id,
      },
      subscription_data: {
        metadata: {
          plan: "member",
          user_id: user.id,
        },
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.URL || "https://brandthat.ai"}/?success=true#workspace`,
      cancel_url: `${process.env.URL || "https://brandthat.ai"}/?brand_plan=canceled`,
    });

    checkoutStage = "returning_checkout_url";
    return json(200, {
      url: session.url,
      sessionId: session.id,
      requestId,
    });
  } catch (error) {
    console.error("BrandThat checkout failed", {
      requestId,
      stage: checkoutStage,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      message: error?.message,
    });
    return json(500, {
      error: "Checkout could not start.",
      code: "CHECKOUT_SESSION_FAILED",
      stage: checkoutStage,
      requestId,
    });
  }
};
