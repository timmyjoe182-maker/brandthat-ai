import {
  MEMBER_PLAN,
  getMembershipPriceId,
  getOrCreateStripeCustomer,
  getRequestId,
  getSiteUrl,
  getStripe,
  getSupabaseAdminClient,
  json,
  reconcileMembershipFromStripe,
  requireVerifiedUser,
} from "./lib/membership.js";

export const handler = async (event) => {
  const requestId = getRequestId("checkout");
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
        code: auth.error.code || (auth.error.statusCode === 403 ? "EMAIL_NOT_VERIFIED" : "AUTH_REQUIRED"),
        stage: checkoutStage,
        requestId,
      });
    }

    const { plan = "member" } = JSON.parse(event.body || "{}");
    const user = auth.user;

    if (plan !== MEMBER_PLAN) {
      return json(400, {
        error: "Choose the BrandThat monthly membership to continue.",
        code: "INVALID_PLAN",
        requestId,
      });
    }

    checkoutStage = "reading_price_id";
    const stripe = getStripe();
    if (!stripe) {
      console.error("BrandThat checkout misconfigured: STRIPE_SECRET_KEY is missing.", { requestId, stage: checkoutStage });
      return json(500, {
        error: "Checkout is not configured yet. Please contact BrandThat support.",
        code: "STRIPE_SECRET_MISSING",
        stage: checkoutStage,
        requestId,
      });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      console.error("BrandThat checkout misconfigured: SUPABASE_SERVICE_ROLE_KEY is missing.", { requestId, stage: checkoutStage });
      return json(500, {
        error: "Checkout is not configured yet. Please contact BrandThat support.",
        code: "SUPABASE_ADMIN_MISSING",
        stage: checkoutStage,
        requestId,
      });
    }

    checkoutStage = "checking_existing_subscription";
    const reconciliation = await reconcileMembershipFromStripe({
      stripe,
      supabaseAdmin,
      user,
      operation: "checkout_preflight",
    });

    if (reconciliation.member) {
      return json(200, {
        alreadySubscribed: true,
        plan: MEMBER_PLAN,
        requestId,
      });
    }

    checkoutStage = "reading_price_id";
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
      success_url: `${getSiteUrl()}/?success=true&session_id={CHECKOUT_SESSION_ID}#workspace`,
      cancel_url: `${getSiteUrl()}/?brand_plan=canceled`,
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
