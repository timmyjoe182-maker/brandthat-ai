const OpenAI = require("openai");
const crypto = require("node:crypto");
const { requireVerifiedUser } = require("./lib/auth.js");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    status: fields.status,
    category: fields.category,
    code: fields.code,
    openaiRequestId: fields.openaiRequestId,
    authentication: fields.authentication,
    membership: fields.membership,
    timeout: Boolean(fields.timeout),
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

function isTransientOpenAiError(error) {
  const status = Number(error?.status || error?.statusCode || 0);
  return status === 408 || status === 409 || status === 429 || status >= 500 || error?.name === "AbortError";
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

exports.handler = async (event) => {
  const requestId = getRequestId();
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

    if (!process.env.OPENAI_API_KEY) {
      logGenerateFailure({
        requestId,
        status: 500,
        category: "configuration",
        code: "OPENAI_API_KEY_MISSING",
        authentication: "present",
        membership: "client_checked",
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
      return client.chat.completions.create({
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
        status: 502,
        category: "provider",
        code: "OPENAI_EMPTY_RESPONSE",
        openaiRequestId: completion?._request_id || completion?.response?.headers?.get?.("x-request-id"),
        authentication: "present",
        membership: "client_checked",
        message: "OpenAI returned an empty response.",
      });
      return getPublicError(502, "OPENAI_EMPTY_RESPONSE", "We couldn't generate that right now. Please try again.", requestId);
    }

    return json(200, { ok: true, text, requestId });
  } catch (error) {
    const status = Number(error?.status || error?.statusCode || 500);
    const safeStatus = status >= 400 && status < 600 ? status : 500;
    const code = error?.code || error?.type || (error?.name === "AbortError" ? "OPENAI_TIMEOUT" : "OPENAI_REQUEST_FAILED");
    const openaiRequestId = error?.request_id || error?.headers?.["x-request-id"];
    logGenerateFailure({
      requestId,
      status: safeStatus,
      category: safeStatus === 401 || safeStatus === 403 ? "authorization" : "provider",
      code,
      openaiRequestId,
      authentication: "present",
      membership: "client_checked",
      timeout: error?.name === "AbortError",
      message: error?.message,
    });
    return getPublicError(safeStatus >= 500 ? 502 : safeStatus, "OPENAI_REQUEST_FAILED", "We couldn't generate that right now. Please try again.", requestId);
  }
};
