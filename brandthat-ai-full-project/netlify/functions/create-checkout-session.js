const Stripe = require("stripe");
const { requireVerifiedUser } = require("./lib/auth");

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

exports.handler = async (event) => {
  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Use POST to start checkout." }),
      };
    }

    const auth = await requireVerifiedUser(event);
    if (auth.error) {
      return {
        statusCode: auth.error.statusCode,
        body: JSON.stringify({ error: auth.error.message }),
      };
    }

    const { plan = "member" } = JSON.parse(event.body || "{}");
    const user = auth.user;

    if (plan !== "member") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Choose the BrandThat monthly membership to continue.",
        }),
      };
    }

    if (!stripe) {
      console.error("BrandThat checkout misconfigured: STRIPE_SECRET_KEY is missing.");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Checkout is not configured yet. Please contact BrandThat support.",
        }),
      };
    }

    const priceId =
      process.env.STRIPE_BRAND_PLAN_PRICE_ID ||
      process.env.STRIPE_MEMBER_PRICE_ID ||
      process.env.STRIPE_PRO_PRICE_ID ||
      process.env.STRIPE_STARTER_PRICE_ID ||
      "";

    if (!priceId) {
      console.error("BrandThat checkout misconfigured: membership price ID is missing.");
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing Stripe price ID for the BrandThat monthly membership.",
        }),
      };
    }

    const price = await stripe.prices.retrieve(priceId);

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
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Stripe BrandThat membership price must be a recurring monthly $9.99 USD price.",
        }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      customer_email: user.email,

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
        `${process.env.URL || "https://brandthat.ai"}/?success=true`,

      cancel_url:
        `${process.env.URL || "https://brandthat.ai"}/?brand_plan=canceled`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
    };
  } catch (error) {
    console.error("BrandThat checkout session failed:", {
      message: error?.message,
      type: error?.type,
      code: error?.code,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Checkout could not start. Please try again in a moment.",
      }),
    };
  }
};
