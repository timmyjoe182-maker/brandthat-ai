const Stripe = require("stripe");
const { requireVerifiedUser } = require("./lib/auth");

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

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
    body: JSON.stringify(body),
  };
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

exports.handler = async (event) => {
  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return json(405, { error: "Use POST to start checkout.", code: "METHOD_NOT_ALLOWED" });
    }

    const auth = await requireVerifiedUser(event);
    if (auth.error) {
      return json(auth.error.statusCode, {
        error: auth.error.message,
        code: auth.error.statusCode === 403 ? "EMAIL_NOT_VERIFIED" : "AUTH_REQUIRED",
      });
    }

    const { plan = "member" } = JSON.parse(event.body || "{}");
    const user = auth.user;

    if (plan !== "member") {
      return json(400, {
        error: "Choose the BrandThat monthly membership to continue.",
        code: "INVALID_PLAN",
      });
    }

    if (!stripe) {
      console.error("BrandThat checkout misconfigured: STRIPE_SECRET_KEY is missing.");
      return json(500, {
        error: "Checkout is not configured yet. Please contact BrandThat support.",
        code: "STRIPE_SECRET_MISSING",
      });
    }

    const priceId = getMembershipPriceId();

    if (!priceId) {
      console.error("BrandThat checkout misconfigured: membership price ID is missing.");
      return json(500, {
        error: "Missing Stripe price ID for the BrandThat monthly membership.",
        code: "STRIPE_PRICE_MISSING",
      });
    }

    if (!String(priceId).startsWith("price_")) {
      console.error("BrandThat checkout misconfigured: membership price must be a Stripe Price ID.", {
        configuredPrefix: String(priceId).slice(0, 8),
      });
      return json(500, {
        error: "Stripe membership must be configured with a recurring Price ID, not a payment link or product ID.",
        code: "STRIPE_PRICE_INVALID_FORMAT",
      });
    }

    let price;
    try {
      price = await stripe.prices.retrieve(priceId);
    } catch (error) {
      console.error("BrandThat checkout misconfigured: membership price could not be verified.", {
        priceId,
        type: error?.type,
        code: error?.code,
        message: error?.message,
      });
      return json(500, {
        error: "Stripe membership price could not be verified. Please contact BrandThat support.",
        code: "STRIPE_PRICE_VERIFY_FAILED",
      });
    }

    const isMonthlyMembership =
      price.currency === "usd" &&
      price.unit_amount === 999 &&
      price.type === "recurring" &&
      price.recurring?.interval === "month";

    if (!isMonthlyMembership) {
      console.error("BrandThat checkout misconfigured: membership price is not recurring $9.99/month.", {
        priceId,
        currency: price.currency,
        unit_amount: price.unit_amount,
        type: price.type,
        interval: price.recurring?.interval,
      });
      return json(500, {
        error: "Stripe BrandThat membership price must be a recurring monthly $9.99 USD price.",
        code: "STRIPE_PRICE_NOT_MONTHLY_999",
      });
    }

    const customer = await getOrCreateStripeCustomer(user);

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

      success_url:
        `${process.env.URL || "https://brandthat.ai"}/?success=true#workspace`,

      cancel_url:
        `${process.env.URL || "https://brandthat.ai"}/?brand_plan=canceled`,
    });

    return json(200, {
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("BrandThat checkout session failed:", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
    });
    return json(500, {
      error: "Checkout could not start. Please try again in a moment.",
      code: "CHECKOUT_SESSION_FAILED",
    });
  }
};
