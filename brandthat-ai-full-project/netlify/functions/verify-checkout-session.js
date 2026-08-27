import {
  ACTIVE_SUBSCRIPTION_STATUSES,
  getRequestId,
  getStripe,
  getSupabaseAdminClient,
  json,
  requireVerifiedUser,
  updateProfileMembership,
} from "./lib/membership.js";

export const handler = async (event) => {
  const requestId = getRequestId("verify_checkout");
  let stage = "initializing";

  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return json(405, { error: "Use POST to verify checkout.", code: "METHOD_NOT_ALLOWED", requestId });
    }

    stage = "authenticating";
    const auth = await requireVerifiedUser(event);
    if (auth.error) {
      return json(auth.error.statusCode, {
        error: auth.error.message,
        code: auth.error.code,
        stage,
        requestId,
      });
    }

    stage = "reading_session_id";
    const { session_id: sessionId } = JSON.parse(event.body || "{}");
    if (!sessionId || !String(sessionId).startsWith("cs_")) {
      return json(400, {
        error: "Checkout session is missing or invalid.",
        code: "CHECKOUT_SESSION_ID_INVALID",
        stage,
        requestId,
      });
    }

    const stripe = getStripe();
    const supabaseAdmin = getSupabaseAdminClient();

    if (!stripe) {
      return json(500, { error: "Stripe is not configured.", code: "STRIPE_SECRET_MISSING", stage, requestId });
    }

    if (!supabaseAdmin) {
      return json(500, { error: "Supabase admin access is not configured.", code: "SUPABASE_ADMIN_MISSING", stage, requestId });
    }

    stage = "retrieving_checkout_session";
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const sessionUserId = session.metadata?.user_id || session.client_reference_id || "";
    if (sessionUserId !== auth.user.id) {
      return json(403, {
        error: "This checkout session does not belong to the signed-in account.",
        code: "CHECKOUT_SESSION_USER_MISMATCH",
        stage,
        requestId,
      });
    }

    if (session.payment_status && !["paid", "no_payment_required"].includes(session.payment_status)) {
      return json(402, {
        error: "Stripe has not confirmed payment for this session yet.",
        code: "CHECKOUT_PAYMENT_NOT_CONFIRMED",
        stage,
        requestId,
      });
    }

    stage = "retrieving_subscription";
    const subscription = typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

    if (!subscription?.id || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
      return json(402, {
        error: "Stripe has not confirmed an active membership yet.",
        code: "CHECKOUT_SUBSCRIPTION_NOT_ACTIVE",
        stage,
        requestId,
      });
    }

    stage = "updating_profile";
    const profile = await updateProfileMembership(supabaseAdmin, {
      userId: auth.user.id,
      email: auth.user.email || session.customer_details?.email || session.customer_email || "",
      plan: "member",
      customerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || session.customer,
      subscriptionId: subscription.id,
      operation: "verify_checkout_session",
    });

    return json(200, {
      member: true,
      plan: "member",
      profile,
      requestId,
    });
  } catch (error) {
    console.error("BrandThat checkout verification failed", {
      requestId,
      stage,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      message: error?.message,
    });

    return json(500, {
      error: "Membership could not be confirmed yet. Please try again.",
      code: error?.code || "CHECKOUT_VERIFY_FAILED",
      stage,
      requestId,
    });
  }
};

