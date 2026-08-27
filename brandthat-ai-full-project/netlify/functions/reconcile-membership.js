import {
  getRequestId,
  getStripe,
  getSupabaseAdminClient,
  json,
  reconcileMembershipFromStripe,
  requireVerifiedUser,
} from "./lib/membership.js";

export const handler = async (event) => {
  const requestId = getRequestId("reconcile");
  let stage = "initializing";

  try {
    if (event.httpMethod && event.httpMethod !== "POST") {
      return json(405, { error: "Use POST to reconcile membership.", code: "METHOD_NOT_ALLOWED", requestId });
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

    stage = "reconciling_membership";
    const result = await reconcileMembershipFromStripe({
      stripe: getStripe(),
      supabaseAdmin: getSupabaseAdminClient(),
      user: auth.user,
      operation: "authenticated_reconcile",
    });

    if (!result.member) {
      return json(200, {
        member: false,
        plan: "free",
        code: "NO_ACTIVE_SUBSCRIPTION_FOUND",
        requestId,
      });
    }

    return json(200, {
      member: true,
      plan: "member",
      alreadySubscribed: true,
      stripeCustomerId: result.profile?.stripe_customer_id || result.customer?.id || "",
      stripeSubscriptionId: result.profile?.stripe_subscription_id || result.subscription?.id || "",
      requestId,
    });
  } catch (error) {
    console.error("BrandThat membership reconciliation failed", {
      requestId,
      stage,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      message: error?.message,
    });

    return json(500, {
      error: "Membership could not be confirmed yet. Please try again.",
      code: error?.code || "MEMBERSHIP_RECONCILE_FAILED",
      stage,
      requestId,
    });
  }
};

