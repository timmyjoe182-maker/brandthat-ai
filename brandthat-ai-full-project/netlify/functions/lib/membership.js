import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const MEMBER_PLAN = "member";
export const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function getRequestId(prefix = "request") {
  return crypto.randomUUID?.() || `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function getSiteUrl() {
  return (process.env.URL || "https://brandthat.ai").replace(/\/$/, "");
}

export function getMembershipPriceId() {
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

export function getStripe() {
  return process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
}

export function getSupabaseAuthClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co";
  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseAdminClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

export function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

export async function requireVerifiedUser(event) {
  const token = getBearerToken(event);

  if (!token) {
    return {
      error: {
        statusCode: 401,
        message: "Create your BrandThat account to continue.",
        code: "AUTH_REQUIRED",
      },
    };
  }

  const supabaseAuth = getSupabaseAuthClient();
  const { data, error } = await supabaseAuth.auth.getUser(token);
  const user = data?.user || null;

  if (error || !user) {
    return {
      error: {
        statusCode: 401,
        message: "Please log in again to continue.",
        code: "AUTH_REQUIRED",
      },
    };
  }

  if (!isEmailVerified(user)) {
    return {
      error: {
        statusCode: 403,
        message: "Check your email to verify your account before continuing.",
        code: "EMAIL_NOT_VERIFIED",
      },
    };
  }

  return { user };
}

export async function getProfileByUserId(supabaseAdmin, userId) {
  if (!supabaseAdmin || !userId) return null;
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("id,email,plan,stripe_customer_id,stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function updateProfileMembership(supabaseAdmin, {
  userId,
  email = "",
  plan = MEMBER_PLAN,
  customerId = "",
  subscriptionId = "",
  operation = "membership_update",
  eventId = "",
  eventType = "",
}) {
  if (!supabaseAdmin) {
    const error = new Error("Supabase service role is not configured.");
    error.code = "SUPABASE_ADMIN_MISSING";
    throw error;
  }

  if (!userId) {
    const error = new Error("Cannot update membership without a Supabase user ID.");
    error.code = "USER_ID_MISSING";
    throw error;
  }

  const payload = {
    id: userId,
    plan,
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    updated_at: new Date().toISOString(),
  };

  if (email) payload.email = email;

  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id,plan,stripe_customer_id,stripe_subscription_id")
    .maybeSingle();

  if (error) {
    console.error("BrandThat membership profile update failed", {
      eventId,
      eventType,
      userId,
      operation,
      code: error.code,
      message: error.message,
    });
    throw error;
  }

  return data;
}

export async function findCustomerForUser(stripe, user) {
  const queries = [
    user?.id ? `metadata['supabase_user_id']:'${user.id}'` : "",
    user?.id ? `metadata['user_id']:'${user.id}'` : "",
    user?.email ? `email:'${String(user.email).replace(/'/g, "\\'")}'` : "",
  ].filter(Boolean);

  for (const query of queries) {
    try {
      const search = await stripe.customers.search({ query, limit: 1 });
      const customer = search?.data?.[0];
      if (customer?.id) return customer;
    } catch (error) {
      console.warn("BrandThat Stripe customer search skipped", {
        type: error?.type,
        code: error?.code,
      });
    }
  }

  return null;
}

export async function findActiveSubscription(stripe, customerId) {
  if (!customerId) return null;
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  return (subscriptions?.data || []).find((subscription) =>
    ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)
  ) || null;
}

export async function getOrCreateStripeCustomer(stripe, user) {
  const existing = await findCustomerForUser(stripe, user);
  if (existing?.id) return existing;

  return stripe.customers.create({
    email: user.email,
    metadata: {
      user_id: user.id,
      supabase_user_id: user.id,
    },
  });
}

export async function reconcileMembershipFromStripe({ stripe, supabaseAdmin, user, operation = "reconcile_membership" }) {
  if (!stripe) {
    const error = new Error("Stripe is not configured.");
    error.code = "STRIPE_SECRET_MISSING";
    throw error;
  }

  if (!supabaseAdmin) {
    const error = new Error("Supabase service role is not configured.");
    error.code = "SUPABASE_ADMIN_MISSING";
    throw error;
  }

  const profile = await getProfileByUserId(supabaseAdmin, user.id);

  if (profile?.stripe_subscription_id) {
    try {
      const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        const updated = await updateProfileMembership(supabaseAdmin, {
          userId: user.id,
          email: user.email || profile.email,
          plan: MEMBER_PLAN,
          customerId: subscription.customer || profile.stripe_customer_id,
          subscriptionId: subscription.id,
          operation,
        });
        return { member: true, profile: updated, subscription };
      }
    } catch (error) {
      console.warn("BrandThat profile subscription lookup skipped", {
        userId: user.id,
        type: error?.type,
        code: error?.code,
      });
    }
  }

  const customer = await findCustomerForUser(stripe, user);
  const subscription = customer?.id ? await findActiveSubscription(stripe, customer.id) : null;

  if (!subscription?.id) {
    return { member: false, profile, customer };
  }

  const updated = await updateProfileMembership(supabaseAdmin, {
    userId: user.id,
    email: user.email || profile?.email || customer?.email,
    plan: MEMBER_PLAN,
    customerId: customer.id,
    subscriptionId: subscription.id,
    operation,
  });

  return { member: true, profile: updated, customer, subscription };
}
