import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  MEMBER_PLAN,
  getStripe,
  getSupabaseAdminClient,
  json,
  updateProfileMembership,
} from "./lib/membership.js";

const stripe = getStripe();
const supabaseAdmin = getSupabaseAdminClient();

async function markEventStarted(stripeEvent) {
  if (!supabaseAdmin) return { processed: false, skipped: true };

  const { error } = await supabaseAdmin
    .from("stripe_webhook_events")
    .insert({
      id: stripeEvent.id,
      type: stripeEvent.type,
      processed_at: new Date().toISOString(),
    });

  if (!error) return { processed: false, skipped: false };

  if (error.code === "23505") {
    return { processed: true, skipped: false };
  }

  if (error.code === "42P01" || /relation .*stripe_webhook_events.* does not exist/i.test(error.message || "")) {
    console.warn("BrandThat webhook idempotency table missing; continuing without event lock.", {
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
    });
    return { processed: false, skipped: true };
  }

  console.error("BrandThat webhook idempotency insert failed", {
    eventId: stripeEvent.id,
    eventType: stripeEvent.type,
    code: error.code,
    message: error.message,
  });
  throw error;
}

async function findProfileUserId({ userId, customerId }) {
  if (userId) return userId;
  if (!customerId || !supabaseAdmin) return "";

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) throw error;
  return data?.id || "";
}

async function applySubscriptionMembership({ subscription, userId, email = "", eventId, eventType }) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "";
  const profileUserId = await findProfileUserId({ userId, customerId });

  if (!profileUserId) {
    console.error("BrandThat webhook could not match subscription to a Supabase user", {
      eventId,
      eventType,
      customerId,
      subscriptionId: subscription.id,
      metadataUserIdPresent: Boolean(userId),
    });
    const error = new Error("No matching Supabase user for Stripe subscription.");
    error.code = "USER_PROFILE_NOT_FOUND";
    throw error;
  }

  const plan = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status) ? MEMBER_PLAN : "free";

  return updateProfileMembership(supabaseAdmin, {
    userId: profileUserId,
    email,
    plan,
    customerId,
    subscriptionId: plan === MEMBER_PLAN ? subscription.id : null,
    operation: "stripe_webhook_subscription",
    eventId,
    eventType,
  });
}

async function handleCheckoutCompleted(stripeEvent) {
  const session = stripeEvent.data.object;

  if (session.payment_status && !["paid", "no_payment_required"].includes(session.payment_status)) {
    return { ignored: "payment_not_paid" };
  }

  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!subscriptionId) {
    const error = new Error("Checkout Session completed without a subscription ID.");
    error.code = "SUBSCRIPTION_ID_MISSING";
    throw error;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return { ignored: `subscription_${subscription.status}` };
  }

  const userId = session.metadata?.user_id || session.client_reference_id || subscription.metadata?.user_id || "";

  return applySubscriptionMembership({
    subscription,
    userId,
    email: session.customer_details?.email || session.customer_email || "",
    eventId: stripeEvent.id,
    eventType: stripeEvent.type,
  });
}

async function handleSubscriptionEvent(stripeEvent) {
  const subscription = stripeEvent.data.object;
  const userId = subscription.metadata?.user_id || "";

  return applySubscriptionMembership({
    subscription,
    userId,
    eventId: stripeEvent.id,
    eventType: stripeEvent.type,
  });
}

export const handler = async (event) => {
  if (!stripe) {
    return json(500, { error: "Stripe webhook is not configured.", code: "STRIPE_SECRET_MISSING" });
  }

  if (!supabaseAdmin) {
    return json(500, { error: "Supabase admin access is not configured.", code: "SUPABASE_ADMIN_MISSING" });
  }

  const sig = event.headers["stripe-signature"] || event.headers["Stripe-Signature"];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("BrandThat webhook signature verification failed", {
      type: error?.type,
      code: error?.code,
      message: error?.message,
    });
    return json(400, { error: "Webhook signature verification failed.", code: "WEBHOOK_SIGNATURE_FAILED" });
  }

  try {
    const lock = await markEventStarted(stripeEvent);
    if (lock.processed) {
      return json(200, { received: true, alreadyProcessed: true });
    }

    let result = { ignored: "event_not_handled" };

    if (stripeEvent.type === "checkout.session.completed") {
      result = await handleCheckoutCompleted(stripeEvent);
    }

    if (stripeEvent.type === "customer.subscription.created" || stripeEvent.type === "customer.subscription.updated") {
      result = await handleSubscriptionEvent(stripeEvent);
    }

    if (stripeEvent.type === "customer.subscription.deleted") {
      result = await handleSubscriptionEvent(stripeEvent);
    }

    if (stripeEvent.type === "invoice.paid" || stripeEvent.type === "invoice.payment_failed") {
      result = { received: true, observed: stripeEvent.type };
    }

    return json(200, { received: true, result });
  } catch (error) {
    console.error("BrandThat webhook failed", {
      eventId: stripeEvent?.id,
      eventType: stripeEvent?.type,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      message: error?.message,
    });

    return json(500, {
      error: "Webhook processing failed.",
      code: error?.code || "WEBHOOK_PROCESSING_FAILED",
      eventId: stripeEvent?.id,
    });
  }
};
