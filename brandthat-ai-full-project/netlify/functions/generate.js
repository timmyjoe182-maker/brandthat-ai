import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const rateLimitStore = global.brandthatGenerateRateLimit || new Map();
global.brandthatGenerateRateLimit = rateLimitStore;

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  };
}

function getRequestId() {
  return crypto?.randomUUID?.() || `generate_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function logGenerateFailure(fields = {}) {
  console.error("BrandThat generation failed", {
    functionName: "generate",
    requestId: fields.requestId,
    generatorType: fields.generatorType,
    status: fields.status,
    category: fields.category,
    code: fields.code,
    providerStatus: fields.providerStatus,
    providerCode: fields.providerCode,
    openaiRequestId: fields.openaiRequestId,
    authentication: fields.authentication,
    membership: fields.membership,
    timeout: Boolean(fields.timeout),
    durationMs: fields.durationMs,
    message: fields.message,
  });
}

function getPublicError(statusCode, code, message, requestId) {
  return json(statusCode, {
    ok: false,
    code,
    message,
    error: message,
    requestId,
  });
}

const supabaseAuthUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vfnkmabnocbwawbdvxfo.supabase.co";
const supabaseAuthKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "sb_publishable_Hc3jSEKgrOf1ntpRxnVJzg_Ttr1oAuk";

const supabaseAuth = createClient(supabaseAuthUrl, supabaseAuthKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function getBearerToken(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function isEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

async function requireVerifiedUser(event) {
  const token = getBearerToken(event);

  if (!token) {
    return {
      error: {
        statusCode: 401,
        code: "AUTH_REQUIRED",
        message: "Create your BrandThat account to try the full product.",
      },
    };
  }

  const { data, error } = await supabaseAuth.auth.getUser(token);
  const user = data?.user || null;

  if (error || !user) {
    return {
      error: {
        statusCode: 401,
        code: "AUTH_REQUIRED",
        message: "Please log in again to continue.",
      },
    };
  }

  if (!isEmailVerified(user)) {
    return {
      error: {
        statusCode: 403,
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Check your email to verify your account before continuing.",
      },
    };
  }

  return { user };
}

function isTransientOpenAiError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500 || error?.name === "AbortError";
}

function getOpenAiClient() {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function getMembershipResult(userId) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return {
      ok: false,
      statusCode: 500,
      code: "SUPABASE_ADMIN_MISSING",
      message: "Generation is not configured right now. Please contact BrandThat support.",
      membership: "config_missing",
    };
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("plan,stripe_subscription_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      statusCode: 500,
      code: "MEMBERSHIP_LOOKUP_FAILED",
      message: "We could not confirm your membership. Please try again.",
      membership: "lookup_failed",
      internalMessage: error.message,
    };
  }

  const plan = String(data?.plan || "").toLowerCase();
  const isMember = plan === "member" || plan === "pro" || plan === "starter";
  if (!isMember) {
    return {
      ok: false,
      statusCode: 403,
      code: "MEMBERSHIP_INACTIVE",
      message: "Your membership is required to use this generator.",
      membership: data ? "inactive" : "profile_missing",
    };
  }

  return {
    ok: true,
    membership: data?.stripe_subscription_id ? "active_subscription" : "active_plan",
  };
}

function normalizeOpenAiError(error) {
  const providerStatus = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || "");
  const rawCode = String(error?.code || error?.type || "").toUpperCase();
  const openaiRequestId = error?.request_id || error?.headers?.["x-request-id"];

  if (error?.name === "AbortError") {
    return {
      httpStatus: 504,
      code: "OPENAI_TIMEOUT",
      message: "Generation took too long. Please try again with a shorter request.",
      providerStatus,
      providerCode: rawCode || "ABORT_ERROR",
      openaiRequestId,
      timeout: true,
    };
  }

  if (providerStatus === 401) {
    return {
      httpStatus: 502,
      code: "OPENAI_INVALID_API_KEY",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "UNAUTHORIZED",
      openaiRequestId,
    };
  }

  if (providerStatus === 403) {
    return {
      httpStatus: 502,
      code: "OPENAI_ACCESS_DENIED",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "ACCESS_DENIED",
      openaiRequestId,
    };
  }

  if (providerStatus === 404) {
    return {
      httpStatus: 502,
      code: "OPENAI_MODEL_NOT_FOUND",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "MODEL_NOT_FOUND",
      openaiRequestId,
    };
  }

  if (providerStatus === 429 && /quota|billing|credits/i.test(message)) {
    return {
      httpStatus: 503,
      code: "OPENAI_INSUFFICIENT_QUOTA",
      message: "Generation is temporarily unavailable.",
      providerStatus,
      providerCode: rawCode || "INSUFFICIENT_QUOTA",
      openaiRequestId,
    };
  }

  if (providerStatus === 429) {
    return {
      httpStatus: 429,
      code: "OPENAI_RATE_LIMITED",
      message: "Generation is busy right now. Please wait a moment and try again.",
      providerStatus,
      providerCode: rawCode || "RATE_LIMITED",
      openaiRequestId,
    };
  }

  if (providerStatus === 400) {
    return {
      httpStatus: 400,
      code: "OPENAI_INVALID_REQUEST",
      message: "That request could not be generated. Please simplify it and try again.",
      providerStatus,
      providerCode: rawCode || "INVALID_REQUEST",
      openaiRequestId,
    };
  }

  return {
    httpStatus: providerStatus >= 400 && providerStatus < 600 ? providerStatus : 502,
    code: providerStatus >= 500 ? "OPENAI_PROVIDER_ERROR" : "OPENAI_REQUEST_FAILED",
    message: "We couldn't generate that right now. Please try again.",
    providerStatus,
    providerCode: rawCode || "UNKNOWN_PROVIDER_ERROR",
    openaiRequestId,
  };
}

function getClientIp(event) {
  return event.headers?.["x-nf-client-connection-ip"] || event.headers?.["client-ip"] || event.headers?.["x-forwarded-for"]?.split(",")[0] || "unknown";
}

function checkRateLimit(event, { limit = 35, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = getClientIp(event);
  const bucket = (rateLimitStore.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  bucket.push(now);
  rateLimitStore.set(key, bucket);
  return bucket.length <= limit;
}

export const handler = async (event) => {
  const requestId = getRequestId();
  const startedAt = Date.now();
  if (event.httpMethod && event.httpMethod !== "POST") {
    return getPublicError(405, "METHOD_NOT_ALLOWED", "Use POST to generate content.", requestId);
  }

  const auth = await requireVerifiedUser(event).catch(() => ({
    error: {
      statusCode: 401,
      message: "Please log in again to continue.",
      code: "AUTH_REQUIRED",
    },
  }));
  if (auth.error) {
    return getPublicError(auth.error.statusCode, auth.error.code || "AUTH_REQUIRED", auth.error.message, requestId);
  }

  let generatorType = "unknown";
  try {
    if (!checkRateLimit(event)) {
      return getPublicError(429, "RATE_LIMITED", "Too many requests. Please wait a minute and try again.", requestId);
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return getPublicError(400, "INVALID_JSON", "The request could not be read. Please try again.", requestId);
    }

    const { prompt } = body;
    generatorType = String(body.tool || body.generatorType || "unknown").slice(0, 80);

    const membership = await getMembershipResult(auth.user.id);
    if (!membership.ok) {
      logGenerateFailure({
        requestId,
        generatorType,
        status: membership.statusCode,
        category: membership.statusCode === 403 ? "authorization" : "configuration",
        code: membership.code,
        authentication: "present",
        membership: membership.membership,
        durationMs: Date.now() - startedAt,
        message: membership.internalMessage || membership.code,
      });
      return getPublicError(membership.statusCode, membership.code, membership.message, requestId);
    }

    const openAiClient = getOpenAiClient();
    if (!openAiClient) {
      logGenerateFailure({
        requestId,
        generatorType,
        status: 500,
        category: "configuration",
        code: "OPENAI_API_KEY_MISSING",
        authentication: "present",
        membership: membership.membership,
        durationMs: Date.now() - startedAt,
        message: "OPENAI_API_KEY is missing from the function runtime.",
      });
      return getPublicError(500, "OPENAI_API_KEY_MISSING", "Generation is not configured right now. Please contact BrandThat support.", requestId);
    }

    if (!String(prompt || "").trim()) {
      return getPublicError(400, "INVALID_INPUT", "Please enter what you want BrandThat to create.", requestId);
    }

    const systemPrompt = `
You are Brandthat AI, a premium AI creative studio for brands, creators, and businesses.

Your job is to generate professional, organized, useful outputs based on the user's selected category.

Brandthat AI covers these categories:

1. Logo Generator
Premium logo concepts and identity direction.
Output logo concepts, typography direction, color palette, icon ideas, usage notes, and visual identity guidance.

2. Captions
Premium captions for every social platform.
Output copy-ready caption options. Include short, polished, story-led, and CTA versions when useful.

3. Hashtags
Smart hashtag systems designed for reach.
Output clean, relevant hashtags. Avoid spam tags and decorative formatting.

4. Brand Bios
Polished bios for creators and businesses.
Output several bio versions for Instagram, TikTok, LinkedIn, website, and short profile use.

5. On-video Hooks
Short hooks for Reels, TikTok, and Shorts.
Output punchy 1–5 second hooks. Make them clear, scroll-stopping, and not cheesy.

6. Email Copy
Launch emails, promos, and newsletters.
Output subject lines, preview text, and a clean full email body.

7. Social Strategy
Content direction across every platform.
Output content pillars, posting ideas, platform strategy, tone direction, and next steps.

8. Brand Creation
Generate brand names and positioning.
Output brand name ideas, tagline ideas, positioning, tone, offer direction, and launch direction.

9. Brand Audit
Review a brand idea or workspace for gaps.
Output clear strengths, weak spots, positioning fixes, content opportunities, trust-builders, and next steps.

10. Campaign Builder
Build launch, promo, content, or growth campaigns.
Output campaign angle, audience promise, posts, hooks, emails, CTAs, and a simple campaign plan.

11. Growth Roadmap
Turn goals like 100K followers into an action plan.
Output realistic milestones, posting frequency, content mix, weekly schedule, testing plan, collaboration ideas, and measurable next steps.

Rules:
- Always match the selected category.
- Never give random generic luxury copy unless the user asks for luxury.
- Make responses clean, organized, and practical.
- Make strategic recommendations like a premium branding agency: decisive, specific, and tied to the actual business context.
- Replace vague advice with concrete actions, channels, cadence, proof points, examples, KPIs, and completion criteria.
- If the prompt includes Brand DNA, treat it as the source of truth. Do not contradict user-edited audience, positioning, tone, visual direction, colors, typography, or business goals.
- Add a concise "Why this works" line for major strategic, visual, roadmap, campaign, or audit recommendations.
- Reject filler phrases such as "post consistently", "build trust", "use premium typography", "use professional colors", or "increase awareness" unless they are followed by specific actions and measurable outcomes.
- Use clean headings and spacing when they help readability.
- Do not use Markdown bold markers like **text**.
- Do not use decorative symbols, asterisks, emoji, or spammy formatting.
- Do not wrap section labels in asterisks.
- Give multiple useful options.
- Sound premium, modern, and brand-aware.
- Avoid fluff.
- Avoid saying “as an AI.”
`;

    const createCompletion = () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18000);
      return openAiClient.chat.completions.create({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
      }, { signal: controller.signal })
        .finally(() => clearTimeout(timer));
    };

    let completion;
    try {
      completion = await createCompletion();
    } catch (error) {
      if (!isTransientOpenAiError(error)) throw error;
      completion = await createCompletion();
    }

    const text = completion.choices?.[0]?.message?.content || "";

    if (!text.trim()) {
      logGenerateFailure({
        requestId,
        generatorType,
        status: 502,
        category: "provider",
        code: "OPENAI_EMPTY_RESPONSE",
        openaiRequestId: completion?._request_id || completion?.response?.headers?.get?.("x-request-id"),
        authentication: "present",
        membership: membership.membership,
        durationMs: Date.now() - startedAt,
        message: "OpenAI returned an empty response.",
      });
      return getPublicError(502, "OPENAI_EMPTY_RESPONSE", "We couldn't generate that right now. Please try again.", requestId);
    }

    return json(200, { ok: true, text, requestId });
  } catch (error) {
    const providerError = normalizeOpenAiError(error);
    logGenerateFailure({
      requestId,
      generatorType,
      status: providerError.httpStatus,
      category: "provider",
      code: providerError.code,
      providerStatus: providerError.providerStatus,
      providerCode: providerError.providerCode,
      openaiRequestId: providerError.openaiRequestId,
      authentication: "present",
      membership: "checked",
      timeout: providerError.timeout,
      durationMs: Date.now() - startedAt,
      message: error?.message,
    });
    return getPublicError(providerError.httpStatus, providerError.code, providerError.message, requestId);
  }
};
