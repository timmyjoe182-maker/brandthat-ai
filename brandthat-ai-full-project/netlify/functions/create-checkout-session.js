const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { plan = "member", email, userId = "" } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Email is required.",
        }),
      };
    }

    if (plan !== "member") {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Choose the BrandThat monthly membership to continue.",
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

      customer_email: email,

      metadata: {
        plan,
        email,
        user_id: userId,
      },

      subscription_data: {
        metadata: {
          plan,
          email,
          user_id: userId,
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
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
