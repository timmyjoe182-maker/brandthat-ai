const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { plan, email } = JSON.parse(event.body || "{}");

    if (!plan || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Plan and email required",
        }),
      };
    }

    let priceId = "";

    if (plan === "starter") {
      priceId = process.env.STRIPE_STARTER_PRICE_ID;
    }

    if (plan === "pro") {
      priceId = process.env.STRIPE_PRO_PRICE_ID;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      payment_method_types: ["card"],

      customer_email: email,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      success_url:
        `${process.env.URL}/?success=true`,

      cancel_url:
        `${process.env.URL}/pricing?canceled=true`,
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
