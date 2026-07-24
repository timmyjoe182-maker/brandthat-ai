const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { plan = "member", email } = JSON.parse(event.body || "{}");

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
          error: "Choose the BrandThat Brand Plan to continue.",
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
          error: "Missing Stripe price ID for the BrandThat Brand Plan.",
        }),
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      payment_method_types: ["card"],

      customer_email: email,

      metadata: {
        plan,
        email,
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
