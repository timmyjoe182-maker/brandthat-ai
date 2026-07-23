const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  try {
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      const email = session.customer_email;
      const customerId = session.customer;
      const subscriptionId = session.subscription;
      const plan = "member";

      const { data: users } = await supabaseAdmin.auth.admin.listUsers();

      const matchingUser = users.users.find((user) => user.email === email);

      if (matchingUser) {
        await supabaseAdmin.from("user_profiles").upsert({
          id: matchingUser.id,
          email,
          plan,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (stripeEvent.type === "customer.subscription.deleted") {
      const subscription = stripeEvent.data.object;

      await supabaseAdmin
        .from("user_profiles")
        .update({
          plan: "free",
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscription.id);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
