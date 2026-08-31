import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";
import { buildPreviewFromDraft } from "./previewGenerator.js";
import { getMembershipCtaState } from "./membershipState.js";
import { cleanGeneratedText, ensureThesisDriven, makeTaglines } from "./brandPlanQuality.js";

const PLAN_COPY = {
  trial: {
    name: "Preview",
    badge: "Create an account",
    description: "Browse BrandThat freely. Building with the full workspace and generators requires a verified account and an active $9.99/month membership.",
  },
  member: {
    name: "BrandThat Membership",
    badge: "$9.99/month",
    description: "Monthly access unlocks Brand Plans, workspaces, generators, launch roadmaps, and logo concepts while your membership is active.",
  },
};

const MEMBER_PLAN = "member";
const BRAND_PLAN_PRICE = "$9.99/mo";
const TRIAL_GENERATION_LIMIT = 0;
const PUBLIC_SUPPORT_EMAIL = import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL || "support@brandthat.ai";
const PENDING_MEMBERSHIP_INTENT_KEY = "brandthat_pending_membership_intent";
const CUSTOMER_INTENT_DRAFT_KEY = "brandthat_customer_intent_draft";
const WORKSPACE_TOUR_DISMISSED_KEY = "brandthat_workspace_tour_dismissed";

function normalizePlan(plan = "free") {
  if (plan === "member" || plan === "starter" || plan === "pro") return MEMBER_PLAN;
  return "free";
}

function isBrandthatTester(user) {
  return false;
}

function isMeaningfulDisplayText(value = "") {
  const text = cleanGeneratedText(value).replace(/\s+/g, " ").trim();
  if (!text) return false;
  const semantic = text.replace(/[.\-_:;,\s]/g, "");
  if (!semantic) return false;
  return !/^(undefined|null|n\/a|none|placeholder)$/i.test(text);
}

function normalizeDirectionKey(value = "") {
  return cleanGeneratedText(value)
    .toLowerCase()
    .replace(/\b(ai concept|direction|option|logo result|concept)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isGenericLogoDirectionTitle(value = "") {
  return /^(ai concept|direction \d+|option [a-z]|logo result|concept|logo concept)$/i.test(cleanGeneratedText(value));
}

function buildCanonicalLogoDirections({ logoVariations = [], creativeBrief = null, logoImage = "" } = {}) {
  const concepts = Array.isArray(creativeBrief?.concepts) ? creativeBrief.concepts : [];
  const nonGenericVariations = (Array.isArray(logoVariations) ? logoVariations : [])
    .filter((variation) => !isGenericLogoDirectionTitle(variation?.name || variation?.title));
  const imageSources = (Array.isArray(logoVariations) ? logoVariations : []).filter((variation) => variation?.image || variation?.svg);
  const base = concepts.length ? concepts : nonGenericVariations;
  const seen = new Set();

  return base.slice(0, 6).reduce((directions, concept, index) => {
    if (directions.length >= 3) return directions;
    const title = cleanGeneratedText(concept?.title || concept?.name || "");
    if (!isMeaningfulDisplayText(title) || isGenericLogoDirectionTitle(title)) return directions;
    const key = normalizeDirectionKey(title);
    if (!key || seen.has(key)) return directions;
    seen.add(key);
    const matchingImage = imageSources.find((variation) => normalizeDirectionKey(variation?.name || variation?.title) === key) || imageSources[index] || {};
    const imageUrl = matchingImage.image || matchingImage.svg || (index === 0 ? logoImage : "");
    const rationale = cleanGeneratedText(concept?.rationale || concept?.whyFits || matchingImage.whyFits || "");
    const composition = cleanGeneratedText(concept?.composition || concept?.layout || matchingImage.layout || "");
    const paletteUsage = cleanGeneratedText(concept?.paletteUsage || concept?.palette || matchingImage.palette || "");
    const primaryUseCases = cleanGeneratedText(
      Array.isArray(concept?.primaryUseCases)
        ? concept.primaryUseCases.join(", ")
        : concept?.primaryUseCases || concept?.primaryUseCase || matchingImage.primaryUseCase || ""
    );
    directions.push({
      ...matchingImage,
      ...concept,
      id: concept?.id || matchingImage.id || `logo-direction-${key}`,
      title,
      name: title,
      type: concept?.type || (index === 0 ? "wordmark" : index === 1 ? "symbol" : "badge"),
      rationale,
      composition,
      layout: composition || concept?.layout || matchingImage.layout,
      symbol: cleanGeneratedText(concept?.symbol || matchingImage.symbol || ""),
      typography: cleanGeneratedText(concept?.typography || matchingImage.typography || ""),
      paletteUsage,
      palette: paletteUsage || concept?.palette || matchingImage.palette,
      primaryUseCases,
      primaryUseCase: primaryUseCases,
      imageUrl,
      image: imageUrl,
      source: matchingImage.source || concept?.source || "brand-strategy",
      whyFits: rationale || concept?.whyFits || matchingImage.whyFits || "",
    });
    return directions;
  }, []);
}

const tools = [
  {
    key: "logo",
    title: "Create Your AI Logo",
    shortTitle: "Logos",
    desc: "Generate a clean logo concept and identity direction for your brand.",
    label: "AI LOGO GENERATOR",
    platformLabel: "Logo style",
    platforms: ["Modern Minimal", "Luxury Wordmark", "Bold Monogram", "Editorial Serif", "Clean Tech", "Founder Brand", "Beauty / Wellness", "Restaurant / Hospitality", "Real Estate", "Social Media Icon"],
    placeholder: "Example: Create a black-and-white premium logo for Brandthat.ai, an AI creative studio for modern creators and brands.",
    promptGuide: "Create a modern logo image and brand identity direction. Include logo concept, typography, colors, usage notes, and visual identity guidance."
  },
  {
    key: "captions",
    title: "Caption Generator",
    shortTitle: "Captions",
    desc: "Choose a platform, describe the post, and get 5 reviewed caption options.",
    label: "CAPTION GENERATOR",
    platformLabel: "Social platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: A sunset ranch dinner with miniature cows, alpacas, and a calm luxury countryside feel.",
    promptGuide: "Generate exactly 5 reviewed social captions. The user chooses a social platform, goal, and post context. Return captions only, no long explanation. Make the captions copy-ready and relevant to what the user typed."
  },
  {
    key: "hooks",
    title: "Hook Generator",
    shortTitle: "Hooks",
    desc: "Short on-video hooks for Reels, TikTok, and Shorts.",
    label: "ON-VIDEO HOOK GENERATOR",
    platformLabel: "Video platform",
    platforms: ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook Reels", "General Short Video"],
    placeholder: "Example: A 20-second video of baby goats jumping on hay bales.",
    promptGuide: "Generate scroll-stopping 1-second, 3-second, and 5-second on-video hooks."
  },
  {
    key: "bios",
    title: "Brand Bio Generator",
    shortTitle: "Bios",
    desc: "Polished bios for Instagram, TikTok, LinkedIn, and websites.",
    label: "BRAND BIO GENERATOR",
    platformLabel: "Bio placement",
    platforms: ["Instagram", "TikTok", "LinkedIn", "Website", "X / Twitter", "Facebook", "General Brand Profile"],
    placeholder: "Example: A private luxury ranch sharing miniature animals, ranch life, and high-end gifting.",
    promptGuide: "Create polished brand bios that feel specific, premium, and useful. Include platform-specific versions."
  },
  {
    key: "hashtags",
    title: "Hashtag Generator",
    shortTitle: "Hashtags",
    desc: "Choose a platform, describe what you need hashtagged, and get clean hashtag sets instantly.",
    label: "HASHTAG GENERATOR",
    platformLabel: "Social platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: Mini cows, ranch life, goats, alpacas, luxury countryside content.",
    promptGuide: "Generate useful hashtags only. The user chooses a social platform and describes what needs hashtagged. Return clean hashtag groups for niche, audience, reach, location if relevant, and brand/community. Do not over-explain. Make the hashtags copy-ready."
  },
  {
    key: "email",
    title: "Email Copy Generator",
    shortTitle: "Emails",
    desc: "Launch emails, promos, newsletters, and team updates.",
    label: "EMAIL COPY GENERATOR",
    platformLabel: "Email type",
    platforms: ["Team Update", "Product Launch", "Promo Email", "Newsletter", "Client Announcement", "Welcome Email", "Follow-up Email", "Partnership Outreach"],
    placeholder: "Example: Write an email to our team announcing the launch of a new AI logo generator.",
    promptGuide: "Generate complete email copy with subject lines, preview text, greeting, body, CTA, and sign-off."
  },
  {
    key: "strategy",
    title: "Social Strategy Generator",
    shortTitle: "Strategy",
    desc: "Content direction and growth ideas across platforms.",
    label: "SOCIAL STRATEGY GENERATOR",
    platformLabel: "Primary platform",
    platforms: ["Instagram", "TikTok", "LinkedIn", "Facebook", "X / Twitter", "YouTube Shorts", "Pinterest", "Multi-platform"],
    placeholder: "Example: We are a ranch brand trying to grow with animal videos, gifting, and high-end lifestyle content.",
    promptGuide: "Generate platform-specific social strategy, content pillars, posting ideas, hooks, cadence, growth tactics, and next steps."
  },
  {
    key: "brand",
    title: "Guided Brand Plan",
    shortTitle: "Brand Plan",
    desc: "Turn a rough idea into strategy, identity direction, moodboard notes, type, colors, and launch steps.",
    label: "GUIDED BRAND BUILDER",
    platformLabel: "Brand stage",
    platforms: ["New Business", "Creator Brand", "Product Brand", "Luxury Brand", "Local Business", "Agency / Studio", "Personal Brand", "Online Tool / SaaS"],
    placeholder: "Example: I want to create a premium AI tool that helps small businesses make content and branding faster.",
    promptGuide: "Help the user turn an idea into a full brand plan. Include brand name direction, positioning, target customer, personality, visual identity direction, moodboard direction, typography, colors, roadmap, and workspace next steps."
  },
  {
    key: "audit",
    title: "Brand Audit Generator",
    shortTitle: "Audit",
    desc: "Audit a brand, offer, social profile, or website and get a sharper action plan.",
    label: "BRAND AUDIT GENERATOR",
    platformLabel: "Audit focus",
    platforms: ["Full Brand", "Website", "Instagram Profile", "Offer", "Brand Name", "Positioning", "Launch Plan", "Content System"],
    placeholder: "Example: Audit Brandthat.ai as an AI logo generator and brand workspace for creators, startups, and small businesses.",
    promptGuide: "Audit the brand with strengths, weaknesses, positioning gaps, audience clarity, offer clarity, trust gaps, content opportunities, and prioritized next steps."
  },
  {
    key: "campaign",
    title: "Campaign Builder",
    shortTitle: "Campaigns",
    desc: "Build launch campaigns with angles, hooks, posts, emails, CTAs, and calendar ideas.",
    label: "CAMPAIGN BUILDER",
    platformLabel: "Campaign type",
    platforms: ["Product Launch", "Brand Reveal", "Seasonal Promo", "Lead Magnet", "Founder Story", "Local Business Promo", "Content Series", "Multi-platform Launch"],
    placeholder: "Example: Build a 14-day launch campaign for Brandthat.ai's AI logo generator.",
    promptGuide: "Create a campaign with positioning, campaign promise, audience angle, content pillars, launch posts, hooks, emails, CTAs, and a simple content calendar."
  },
  {
    key: "growth",
    title: "Growth Roadmap Generator",
    shortTitle: "Growth",
    desc: "Create a practical follower-growth roadmap with posting frequency, content pillars, timing, and weekly actions.",
    label: "GROWTH ROADMAP GENERATOR",
    platformLabel: "Growth platform",
    platforms: ["Instagram", "TikTok", "YouTube Shorts", "LinkedIn", "Facebook", "Pinterest", "Multi-platform"],
    placeholder: "Example: Build a roadmap to reach 100K followers for an AI brand tool. Include what to post, when to post, how often, and weekly milestones.",
    promptGuide: "Create a follower-growth roadmap with target milestones, posting cadence, content pillars, posting windows, hooks, weekly actions, engagement routines, collaborations, metrics, and realistic next steps."
  }
];

const seoPages = {
  "seo-logo": {
    path: "/ai-logo-generator",
    toolKey: "logo",
    eyebrow: "AI LOGO GENERATOR",
    h1: "Create an AI Logo for Your Brand",
    intro: "Generate a clean logo image, brand direction, palette, typography, and profile-ready visual system from one simple brand idea.",
    examples: ["Create a premium black-and-white logo for a modern AI branding platform named Brandthat.ai. Use a clean wordmark, strong favicon-ready icon, and luxury technology feel.", "Design a circular vintage mascot logo for a coffee brand. Include a wolf icon, cream and black palette, premium typography, and packaging-ready composition.", "Create an elegant ranch lifestyle logo with refined typography, subtle animal-inspired mark, warm neutral colors, and a high-end boutique brand feeling."],
    faqs: [
      ["Does Brandthat.ai create actual logo images?", "Yes. The $9.99/month membership includes logo concepts generated from the completed strategy, identity direction, moodboard, typography, colors, and voice."],
      ["What should I type?", "Enter your brand name, audience, style, colors, and what you want the logo to feel like."],
      ["Who is this for?", "Founders, creators, local businesses, agencies, and anyone building a modern brand."]
    ]
  },
  "seo-instagram": {
    path: "/instagram-caption-generator",
    toolKey: "captions",
    eyebrow: "INSTAGRAM CAPTION GENERATOR",
    h1: "Instagram Caption Generator for Brands and Creators",
    intro: "Write polished captions for Reels, carousels, launches, lifestyle posts, founder updates, and brand storytelling.",
    examples: ["Write 5 premium Instagram captions for launching a new AI logo generator. Include a short caption, storytelling caption, CTA caption, and polished founder-style caption.", "Create Instagram captions for a luxury brand reveal that feel high-end, modern, concise, and not cheesy.", "Write captions for a behind-the-scenes creative business post that builds trust, feels authentic, and encourages people to try the product."],
    faqs: [
      ["Can it write captions for Reels?", "Yes. It creates short, polished, CTA-driven captions for Reels and feed posts."],
      ["Can I choose tone?", "Yes. Choose modern, luxury, witty, professional, emotional, high-end, viral, and more."],
      ["Is it only for influencers?", "No. It works for creators, startups, local businesses, agencies, and personal brands."]
    ]
  },
  "seo-tiktok": {
    path: "/tiktok-hook-generator",
    toolKey: "hooks",
    eyebrow: "TIKTOK HOOK GENERATOR",
    h1: "TikTok Hook Generator for Short-Form Videos",
    intro: "Create quick on-video hooks for TikTok, Instagram Reels, YouTube Shorts, and short-form content.",
    examples: ["Generate 20 TikTok hooks for a video showing an AI tool turning a rough idea into a full brand in 30 seconds.", "Create short on-screen hooks for a before-and-after logo transformation video. Make them curiosity-driven and premium, not clickbait.", "Write 1-second, 3-second, and 5-second hooks for a founder building an AI startup live on the internet."],
    faqs: [
      ["What is a video hook?", "A hook is the first line or on-screen text that makes someone keep watching."],
      ["Can this work for Reels?", "Yes. It works for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels."],
      ["Are the hooks cheesy?", "The generator is designed to keep hooks clear, modern, useful, and not cheesy."]
    ]
  },
  "seo-bio": {
    path: "/brand-bio-generator",
    toolKey: "bios",
    eyebrow: "BRAND BIO GENERATOR",
    h1: "Brand Bio Generator for Instagram, TikTok, LinkedIn, and Websites",
    intro: "Create clean brand bios that explain who you are, what you do, and why people should care.",
    examples: ["Create 10 Instagram bio options for a premium AI branding platform that helps creators make logos, captions, hooks, and brand systems.", "Write website, Instagram, TikTok, and LinkedIn bios for a luxury ranch lifestyle brand with animals, storytelling, and high-end gifting.", "Create concise brand bios for a wedding photography and social media studio that offers photo, video, advertising, and content strategy."],
    faqs: [
      ["What makes a good brand bio?", "A good bio quickly explains who you help, what you offer, and why it matters."],
      ["Can it create multiple versions?", "Yes. It can create versions for different platforms and tones."],
      ["Can it help with personal brands?", "Yes. It works for founders, creators, and business profiles."]
    ]
  },
  "seo-hashtag": {
    path: "/free-hashtag-generator",
    toolKey: "hashtags",
    eyebrow: "FREE HASHTAG GENERATOR",
    h1: "Free Hashtag Generator for Instagram, TikTok, LinkedIn, and Social Posts",
    intro: "Generate 50 clean, relevant hashtags for your post, video, brand, launch, or niche without logging in.",
    examples: ["Generate 50 hashtags for a luxury ranch lifestyle post with mini cows, alpacas, gifting, and countryside content.", "Create relevant hashtags for an AI logo generator launch on Instagram and TikTok.", "Generate hashtags for a small business behind-the-scenes video, mixing niche, community, and discovery tags."],
    faqs: [
      ["Is the hashtag generator free?", "Yes. You can generate hashtags without creating an account."],
      ["How many hashtags does it create?", "It creates 50 copy-ready hashtags in one clean block."],
      ["Does it work for TikTok and Instagram?", "Yes. Choose the platform and describe the post so the hashtags match the channel."]
    ]
  },
  "seo-growth": {
    path: "/growth-roadmap-generator",
    toolKey: "growth",
    eyebrow: "GROWTH ROADMAP GENERATOR",
    h1: "Growth Roadmap Generator for Reaching 10K, 100K, or 1M Followers",
    intro: "Turn a follower goal into a practical posting plan with content pillars, weekly cadence, posting windows, milestones, and growth actions.",
    examples: ["Build a roadmap to reach 100K followers for an AI branding tool on Instagram and TikTok.", "Create a 90-day growth roadmap for a ranch lifestyle brand posting animal videos and luxury countryside content.", "Plan weekly content, posting times, hooks, and collaborations for a founder trying to grow to 10K followers."],
    faqs: [
      ["Can it plan for 100K followers?", "Yes. Add your current follower count, platform, niche, and target, then generate a realistic roadmap."],
      ["Does it tell me when to post?", "Yes. It can suggest cadence, posting windows, weekly actions, and what to test."],
      ["Is it only for influencers?", "No. It works for creators, founders, local businesses, startups, and brand accounts."]
    ]
  },
  "seo-strategy": {
    path: "/social-strategy-generator",
    toolKey: "strategy",
    eyebrow: "SOCIAL STRATEGY GENERATOR",
    h1: "Social Strategy Generator for Brands, Creators, and Small Businesses",
    intro: "Create content pillars, posting ideas, platform strategy, growth tactics, and next steps from one brand or campaign idea.",
    examples: ["Create a social strategy for an AI logo generator targeting creators and small businesses.", "Build content pillars for a ranch lifestyle brand growing on Instagram and TikTok.", "Create a multi-platform strategy for a local business launch."],
    faqs: [
      ["What does a social strategy include?", "It can include content pillars, posting ideas, cadence, hooks, platform tactics, and next steps."],
      ["Can it work for more than one platform?", "Yes. Choose one platform or ask for a multi-platform strategy."],
      ["Can it use my saved workspace?", "Yes. Logged-in users can connect strategy outputs to a Brand Workspace."]
    ]
  },
  "seo-email": {
    path: "/email-copy-generator",
    toolKey: "email",
    eyebrow: "EMAIL COPY GENERATOR",
    h1: "Email Copy Generator for Launches, Promos, Newsletters, and Updates",
    intro: "Generate subject lines, preview text, email body copy, CTAs, and follow-up emails for brand and business campaigns.",
    examples: ["Write a launch email for an AI logo generator with subject lines, preview text, body, and CTA.", "Create a promotional email for a local business spring offer.", "Write a newsletter announcing a new brand workspace feature."],
    faqs: [
      ["What email types can it write?", "Launch emails, promo emails, newsletters, welcome emails, follow-ups, and client announcements."],
      ["Does it include subject lines?", "Yes. It can include subject lines, preview text, body copy, and CTAs."],
      ["Can it match a brand voice?", "Yes. Use a Brand Workspace or describe the tone you want."]
    ]
  },
  "seo-brand": {
    path: "/brand-creation-generator",
    toolKey: "brand",
    eyebrow: "GUIDED BRAND PLAN GENERATOR",
    h1: "Guided Brand Plan Generator for New Business Ideas",
    intro: "Turn a rough business idea into positioning, target customer clarity, visual identity direction, moodboard notes, typography, color direction, and a launch roadmap.",
    examples: ["Turn my AI branding tool idea into a complete brand plan.", "Build a premium brand plan for a private ranch experience business.", "Create positioning, visual direction, colors, typography, and launch steps for a local service business."],
    faqs: [
      ["Can I start from one sentence?", "Yes. Type a rough idea and Brandthat.ai will shape it into a clearer brand plan."],
      ["Does it create visual direction too?", "Yes. It includes moodboard, typography, color, and logo direction before logo concepts."],
      ["Can I save the brand?", "Yes. You can turn the output into a Brand Workspace and build assets from there."]
    ]
  }
};

const toolMap = Object.fromEntries(tools.map((tool) => [tool.key, tool]));

const tones = [
  "Modern", "Professional", "Minimal", "Luxury", "Bold", "Playful", "Editorial", "Cinematic",
  "Premium", "Friendly", "Witty", "Elegant", "Direct", "Emotional", "High-end", "Viral"
];

const premiumLogoPromptExamples = [
  "Create a premium black and warm-neutral carry goods logo called Northline Goods.",
  "Design a clean AI startup logo for NexusForge with modern typography.",
  "Make a premium real estate logo for Vale & Stone.",
  "Create a bold monogram logo for Iron Method fitness.",
  "Design an editorial wedding photo and video logo called Ekblad Rose.",
  "Create a timeless law firm logo for Bennett & Cole.",
];

const logoPromptSuggestions = [
  "luxury",
  "editorial",
  "minimalist",
  "monogram",
  "modern SaaS",
  "timeless",
  "bold typography",
  "abstract symbol",
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredNumber(key, fallback = 0) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

function safeParse(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function getInitialPageFromPath() {
  const path = window.location.pathname;
  if (path.startsWith("/workspace/content/")) return "studio";
  if (path === "/workspace/identity/logos") return "logo";
  if (path === "/workspace" || path.startsWith("/workspace/")) return "workspace";
  if (path === "/tools" || path.startsWith("/tools/")) return path.includes("/logo") ? "logo" : "studio";
  if (path === "/examples") return "examples";
  if (["/about", "/contact", "/privacy", "/terms", "/cancellation", "/refund"].includes(path)) {
    return path.slice(1);
  }
  const match = Object.entries(seoPages).find(([, page]) => page.path === path);
  return match ? match[0] : "home";
}

function getInitialToolFromPath() {
  const path = window.location.pathname;
  const appContentMatch = path.match(/^\/workspace\/content\/([^/]+)/);
  if (appContentMatch && toolMap[appContentMatch[1]]) return appContentMatch[1];
  if (path === "/workspace/identity/logos") return "logo";
  const toolMatch = path.match(/^\/tools\/([^/]+)/);
  if (toolMatch && toolMap[toolMatch[1]]) return toolMatch[1];
  const match = Object.values(seoPages).find((page) => page.path === path);
  return match?.toolKey || "logo";
}

function getInitialWorkspaceSectionFromPath() {
  const path = window.location.pathname;
  if (path.startsWith("/workspace/content")) return "tools";
  if (path === "/workspace/identity/logos") return "identity";
  if (path.startsWith("/tools")) return "tools";
  const section = path.match(/^\/workspace\/([^/]+)/)?.[1];
  if (section === "content") return "tools";
  if (["strategy", "identity", "roadmap", "assets", "settings"].includes(section)) return section;
  return "overview";
}

function getWorkspaceSectionPath(section = "overview") {
  const paths = {
    overview: "/workspace",
    strategy: "/workspace/strategy",
    identity: "/workspace/identity",
    tools: "/workspace/content",
    roadmap: "/workspace/roadmap",
    assets: "/workspace/assets",
    settings: "/workspace/settings",
  };
  return paths[section] || paths.overview;
}

function getWorkspaceToolPath(toolKey = "") {
  return toolKey === "logo" ? "/workspace/identity/logos" : `/workspace/content/${toolKey || "captions"}`;
}


function getCurrentSeoMeta(page) {
  const seoPage = seoPages[page];

  if (seoPage) {
    const titles = {
      "seo-logo": "AI Logo Generator | Brandthat.ai",
      "seo-instagram": "Instagram Caption Generator | Brandthat.ai",
      "seo-tiktok": "TikTok Hook Generator | Brandthat.ai",
      "seo-bio": "Brand Bio Generator | Brandthat.ai",
      "seo-hashtag": "Free Hashtag Generator | Brandthat.ai",
      "seo-growth": "Growth Roadmap Generator | Brandthat.ai",
      "seo-strategy": "Social Strategy Generator | Brandthat.ai",
      "seo-email": "Email Copy Generator | Brandthat.ai",
      "seo-brand": "Guided Brand Plan Generator | Brandthat.ai",
    };

    const descriptions = {
      "seo-logo": "Create premium AI logo images and brand identity directions for modern brands, startups, creators, and businesses with Brandthat.ai.",
      "seo-instagram": "Generate clean, copy-ready Instagram captions for brands, creators, Reels, launches, products, and social posts with Brandthat.ai.",
      "seo-tiktok": "Create TikTok hooks, Reels hooks, and short-form video openings designed to stop the scroll and improve retention with Brandthat.ai.",
      "seo-bio": "Generate polished brand bios for Instagram, TikTok, LinkedIn, websites, creators, founders, and businesses with Brandthat.ai.",
      "seo-hashtag": "Use Brandthat.ai's free hashtag generator to create 50 relevant hashtags for Instagram, TikTok, LinkedIn, Pinterest, and social posts.",
      "seo-growth": "Create a practical follower growth roadmap with posting frequency, content pillars, posting windows, weekly actions, and milestones.",
      "seo-strategy": "Generate social strategy, content pillars, posting ideas, growth tactics, and platform-specific content plans with Brandthat.ai.",
      "seo-email": "Generate email copy for launches, promos, newsletters, follow-ups, and announcements with subject lines, preview text, body, and CTA.",
      "seo-brand": "Turn a rough brand idea into positioning, audience clarity, visual direction, moodboard notes, typography, colors, and launch roadmap.",
    };

    return {
      title: titles[page] || `${seoPage.h1} | Brandthat.ai`,
      description: descriptions[page] || seoPage.intro,
      canonical: `https://brandthat.ai${seoPage.path}`,
    };
  }

  return {
    title: "BrandThat.ai | Where Brands Are Born",
    description: "Start with a brand name and rough idea. BrandThat previews strategy, identity direction, content, roadmap, and workspace before checkout.",
    canonical: ["about", "contact", "privacy", "terms", "cancellation", "refund"].includes(page) ? `https://brandthat.ai/${page}` : "https://brandthat.ai/",
  };
}

function getSeoSchema(page, meta) {
  const seoPage = seoPages[page];
  const appSchema = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Brandthat.ai",
    url: "https://brandthat.ai/",
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description: meta.description,
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
      { "@type": "Offer", name: "BrandThat Membership", price: "9.99", priceCurrency: "USD", priceSpecification: { "@type": "UnitPriceSpecification", price: "9.99", priceCurrency: "USD", billingIncrement: "P1M" } }
    ],
    featureList: [
      "AI logo generator",
      "Free caption generator",
      "Free hashtag generator",
      "Brand workspace",
      "Growth roadmap generator",
      "Brand bio generator"
    ]
  };

  if (!seoPage) return appSchema;

  return [appSchema, {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: seoPage.faqs.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answer
      }
    }))
  }];
}

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

function upsertJsonLd(schema) {
  let element = document.head.querySelector("script[data-brandthat-schema='primary']");

  if (!element) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.setAttribute("data-brandthat-schema", "primary");
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(schema);
}

async function readJsonResponse(response) {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      text,
      parseError: text ? "NON_JSON_RESPONSE" : "",
    };
  }
}

function getSafeRequestId(response, data) {
  return data?.requestId || response.headers.get("x-nf-request-id") || response.headers.get("x-request-id") || "";
}

function createRequestError(response, data, config = {}) {
  const status = response.status;
  const requestId = getSafeRequestId(response, data);
  const code = data?.code || data?.parseError || `HTTP_${status}`;
  const serverMessage = data?.error || data?.message || data?.text;
  const publicMessage = status >= 500
    ? (config.revealServerError && serverMessage
      ? serverMessage
      : (config.errorMessage || "BrandThat could not complete that request. Please try again."))
    : (serverMessage || config.errorMessage || `Request failed with status ${status}.`);
  const details = [
    code ? `Error code: ${code}` : "",
    requestId ? `Request ID: ${requestId}` : "",
  ].filter(Boolean);
  const error = new Error(details.length ? `${publicMessage}\n${details.join("\n")}` : publicMessage);
  error.status = status;
  error.code = code;
  error.requestId = requestId;
  error.diagnostic = {
    url: response.url,
    status,
    code,
    requestId,
    contentType: response.headers.get("content-type") || "",
  };
  error.data = data;
  return error;
}

async function fetchJsonWithTimeout(url, options = {}, config = {}) {
  const timeoutMs = Number(config.timeoutMs || 18000);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await readJsonResponse(response);

    if (!response.ok) {
      const error = createRequestError(response, data, config);
      if (response.status >= 500) {
        console.warn("BrandThat request failed", JSON.stringify(error.diagnostic));
      }
      throw error;
    }

    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      const timeoutError = new Error(config.timeoutMessage || "This request timed out. Please try again.");
      timeoutError.code = config.timeoutCode || "CLIENT_TIMEOUT";
      timeoutError.diagnostic = { url, status: 0, code: timeoutError.code, requestId: "", contentType: "" };
      throw timeoutError;
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function isUserEmailVerified(currentUser) {
  return Boolean(currentUser?.email_confirmed_at || currentUser?.confirmed_at);
}

function storePendingMembershipIntent(source = "membership_cta") {
  const safeSource = String(source || "membership_cta").slice(0, 80);
  localStorage.setItem(PENDING_MEMBERSHIP_INTENT_KEY, JSON.stringify({
    intent: "start_membership",
    source: safeSource,
    createdAt: new Date().toISOString(),
  }));
  localStorage.setItem("brandthat_pending_plan", MEMBER_PLAN);
}

function getPendingMembershipIntent() {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_MEMBERSHIP_INTENT_KEY) || "null");
    if (value?.intent === "start_membership") return value;
  } catch {
    // Fall through to the legacy pending-plan flag below.
  }
  if (localStorage.getItem("brandthat_pending_plan") === MEMBER_PLAN) {
    return { intent: "start_membership", source: "legacy_pending_plan" };
  }
  return null;
}

function clearPendingMembershipIntent() {
  localStorage.removeItem(PENDING_MEMBERSHIP_INTENT_KEY);
  localStorage.removeItem("brandthat_pending_plan");
}

function inferSimpleIndustry(value = "") {
  const text = String(value || "").toLowerCase();
  const matches = [
    ["houseplants / local plant delivery", ["houseplant", "houseplants", "plant care", "low-maintenance plant", "low maintenance plant", "apartment greenery", "plant subscription", "botanical", "greenery"]],
    ["pet care / mobile grooming", ["dog grooming", "mobile grooming", "pet grooming", "senior pet", "senior pets", "pet care"]],
    ["chocolate / confectionery", ["chocolate", "candy", "candies", "sweet"]],
    ["restaurant / hospitality", ["restaurant", "pizza", "cafe", "coffee", "food", "bakery"]],
    ["AI / technology", ["ai", "software", "saas", "startup", "app", "platform"]],
    ["real estate", ["real estate", "realtor", "property", "homes"]],
    ["construction / trades", ["construction", "plaster", "roofing", "plumbing", "contractor"]],
    ["beauty / skincare", ["beauty", "skincare", "salon", "spa"]],
    ["fitness / coaching", ["fitness", "gym", "coach", "training"]],
    ["ranch / western lifestyle", ["ranch", "horse", "alpaca", "farm", "western"]],
    ["law firm", ["law", "legal", "attorney", "lawyer"]],
  ];
  const hasKeyword = (word) => {
    const keyword = String(word || "").toLowerCase().trim();
    if (!keyword) return false;
    if (keyword.length <= 3 || /^[a-z0-9+#.-]+$/.test(keyword)) {
      return new RegExp(`(^|[^a-z0-9])${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(text);
    }
    return text.includes(keyword);
  };
  return matches.find(([, words]) => words.some(hasKeyword))?.[0] || "new business / brand";
}

const WORKSPACE_DATA_VERSION = "2026-06-thesis-v1";

function brandthatDevLog(label, payload) {
  if (import.meta?.env?.DEV) {
    console.log(`[BrandThat debug] ${label}`, payload);
  }
}

function inferStrategicOpportunity(value = "") {
  const text = String(value || "").toLowerCase();
  const signals = [
    ["luxury", ["luxury", "premium", "high-end", "private", "elegant", "exclusive"]],
    ["convenience", ["fast", "easy", "simple", "delivery", "quick", "same-day"]],
    ["trust", ["law", "legal", "medical", "clinic", "finance", "real estate", "contractor", "repair"]],
    ["craftsmanship", ["handmade", "artisan", "crafted", "ranch", "alpaca", "wool", "textile", "chocolate", "plaster"]],
    ["speed", ["ai", "automation", "software", "saas", "startup", "workflow"]],
    ["status", ["fashion", "wedding", "estate", "jewelry", "hotel"]],
    ["sustainability", ["organic", "natural", "eco", "sustainable", "farm", "wellness"]],
    ["innovation", ["ai", "tech", "platform", "app", "future"]],
    ["nostalgia", ["vintage", "retro", "classic", "heritage", "western"]],
    ["affordability", ["affordable", "budget", "family", "local", "everyday"]],
    ["joy", ["kids", "party", "candy", "confetti", "play", "fun"]],
  ];
  return signals.find(([, words]) => words.some((word) => text.includes(word)))?.[0] || "trust";
}

function getThesisFallback(plan = {}, payload = {}) {
  const brandName = cleanGeneratedText(plan.brandName || payload.brandName || "New Brand");
  const idea = cleanGeneratedText(payload.idea || payload.rawPrompt || plan.brandSummary || brandName);
  const industry = plan.logoContext?.industry || plan.workspaceContext?.industry || inferSimpleIndustry(`${brandName} ${idea}`);
  const coreOpportunity = plan.coreOpportunity || inferStrategicOpportunity(`${brandName} ${idea} ${industry}`);

  return {
    coreOpportunity,
    brandThesis: `${brandName} should be built around ${coreOpportunity}: customers are not just buying from the ${industry} category, they are looking for a more specific reason to feel confident choosing this brand. The brand should turn "${idea}" into a clear promise, a visual direction, and a launch plan that all prove why this business deserves attention now.`,
  };
}

function normalizeRoadmapItems(value, fallback = []) {
  const fallbackRoadmap = fallback.length ? fallback : [
    { week: "First 24 Hours", focus: "Lock the thesis", actions: ["Write the one-sentence brand promise and the customer pain it resolves.", "Choose the proof points that make the promise believable."], outcome: "A clear strategic anchor before identity work begins.", status: "Not started" },
    { week: "First Week", focus: "Shape the identity system", actions: ["Turn the thesis into moodboard, typography, and color decisions.", "Reject any visual choice that feels generic or disconnected."], outcome: "A brand direction that can guide every asset.", status: "Not started" },
    { week: "First Month", focus: "Launch the first proof loop", actions: ["Create launch content that explains why the brand exists.", "Test which message earns the strongest response."], outcome: "Early signal on what the audience notices and believes.", status: "Not started" },
    { week: "Days 31-60", focus: "Build repeatable demand", actions: ["Double down on the strongest content pillar.", "Turn audience questions into offers, posts, and email topics."], outcome: "A repeatable content and conversion rhythm.", status: "Not started" },
    { week: "Days 61-90", focus: "Systemize the workspace", actions: ["Save the strongest assets to the workspace.", "Plan the next quarter around the clearest customer reaction."], outcome: "A durable brand headquarters for growth.", status: "Not started" },
  ];

  const items = Array.isArray(value) ? value : String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ week: `Week ${index + 1}`, focus: line, actions: [] }));

  const normalized = items.slice(0, 5).map((item, index) => {
    const fallbackItem = fallbackRoadmap[index] || fallbackRoadmap[0];
    const week = cleanGeneratedText(item?.week) || fallbackItem.week || `Week ${index + 1}`;
    const focus = cleanGeneratedText(item?.focus) || fallbackItem.focus || "Build the brand plan";
    const actions = Array.isArray(item?.actions)
      ? item.actions.map(cleanGeneratedText).filter(Boolean)
      : String(item?.actions || "").split(/;|\n/).map(cleanGeneratedText).filter(Boolean);

    return {
      week,
      focus,
      actions: actions.length ? actions.slice(0, 5) : fallbackItem.actions,
      outcome: cleanGeneratedText(item?.outcome || item?.expectedOutcome) || fallbackItem.outcome || "Clearer brand direction and a practical next step.",
      status: cleanGeneratedText(item?.status) || fallbackItem.status || "Not started",
    };
  });

  return normalized.length ? normalized : fallbackRoadmap;
}

function getBrandPlanDefaults({ brandName = "New Brand", idea = "", industry = "new business / brand", opportunity = "trust" } = {}) {
  const category = industry.replace(/\s*\/.*$/, "");
  const lower = `${brandName} ${idea} ${industry} ${opportunity}`.toLowerCase();
  const categoryBuyer = /s$/.test(category) ? category : `${category} brand`;
  const categoryCompetitors = /s$/.test(category) ? category : `${category} brands`;
  const audience = lower.includes("dog")
    ? "style-conscious dog owners who treat outdoor time as part of their identity, not only a practical routine"
    : lower.includes("wedding")
      ? "modern couples who want the wedding to feel documented, shareable, and emotionally true without managing multiple creative vendors"
      : lower.includes("houseplant") || lower.includes("plant delivery") || lower.includes("apartment greenery") || lower.includes("plant care")
        ? "apartment renters and first-time plant owners who want a greener home without complicated maintenance"
      : lower.includes("ai") || lower.includes("software")
        ? "busy founders and small teams who need sharper brand decisions without hiring a full strategy team first"
        : `buyers choosing ${categoryBuyer} who need a clearer reason to trust, remember, and act`;
  const customerMotivation = `They want ${brandName} to reduce uncertainty: the brand should make the buying decision feel specific, emotionally justified, and easier to explain to someone else.`;
  const positioning = `${brandName} should own ${opportunity} in ${category} by making the customer outcome more concrete than nearby competitors and backing every claim with visible proof.`;
  const differentiation = `Competing ${categoryCompetitors} often describe what they sell. ${brandName} should make a stronger decision by showing why this version exists, who it is for, and what the customer can do next.`;
  const personality = opportunity === "luxury"
    ? "restrained, exacting, quietly confident, and taste-led"
    : opportunity === "joy"
      ? "bright, generous, energetic, and emotionally immediate"
      : opportunity === "speed"
        ? "clear, decisive, efficient, and forward-moving"
        : opportunity === "craftsmanship"
          ? "tactile, careful, grounded, and detail-aware"
          : "clear, steady, intelligent, and useful";
  const voice = `Use plain, specific language that explains the customer problem first, then shows why ${brandName}'s ${opportunity} promise is believable. Avoid vague superiority claims.`;
  const messaging = `Lead with the customer moment, name the tension, prove why ${brandName} is different, then ask for one next action.`;
  const moodboard = opportunity === "craftsmanship"
    ? `Natural materials, close-up textures, product-in-use scenes, quiet maker details, and real customer environments that make ${opportunity} visible.`
    : lower.includes("houseplant") || lower.includes("plant delivery") || lower.includes("apartment greenery") || lower.includes("plant care")
      ? `Bright apartments, resilient greenery, delivery handoff moments, simple care cards, natural textures, and calm shelf/window-light scenes that prove plant ownership can feel easy.`
    : opportunity === "luxury"
      ? `Editorial spacing, high-contrast detail shots, restrained layouts, premium materials, and calm environments that make ${brandName} feel selective.`
    : `Clean product context, customer-before-and-after moments, simple service proof, and enough negative space to make the promise feel clear.`;
  const typography = opportunity === "luxury" || opportunity === "craftsmanship"
    ? `Use a high-contrast serif for the brand voice and a restrained grotesk for practical UI because the audience needs both taste and clarity.`
    : lower.includes("houseplant") || lower.includes("plant delivery") || lower.includes("apartment greenery") || lower.includes("plant care")
      ? `Use a warm botanical serif for the wordmark with a clean humanist sans for care instructions because the identity needs both softness and beginner-friendly clarity.`
    : `Use a confident grotesk for the primary wordmark and a highly readable neutral sans for body copy because the brand needs to feel modern, usable, and easy to act on.`;
  const colors = opportunity === "craftsmanship"
    ? `Use charcoal, warm white, and muted forest green because those colors connect ${brandName} to heritage, outdoor materials, and durable quality without looking decorative.`
    : lower.includes("houseplant") || lower.includes("plant delivery") || lower.includes("apartment greenery") || lower.includes("plant care")
      ? `Use leaf green, stone gray, warm ivory, and soft terracotta because the palette connects apartment greenery, simple care, and local delivery without feeling like a tech product.`
    : opportunity === "luxury"
      ? `Use black, warm white, and one muted metallic-neutral accent because restraint makes the brand feel premium and avoids looking like a template.`
      : `Use black, white, soft gray, and one disciplined accent only where action is required because the strategy depends on clarity and repeatable recognition.`;
  const contentPillars = [
    `Problem clarity: explain the exact customer tension ${brandName} solves.`,
    `Proof: show materials, process, results, or decisions that make ${opportunity} believable.`,
    `Point of view: publish the belief that makes this brand different from generic ${category} competitors.`,
    `Offer education: make the first purchase or inquiry feel obvious and low-friction.`,
  ];
  const first20ContentIdeas = Array.from({ length: 20 }, (_, index) => {
    const ideas = [
      `Show the moment a customer realizes they need ${brandName}.`,
      `Explain one misconception in the ${category} category and what ${brandName} does instead.`,
      `Break down the brand thesis in one simple founder post.`,
      `Show the moodboard direction and explain why each reference belongs.`,
      `Compare a generic ${category} choice with the ${brandName} way.`,
      `Turn the color system into a short post about the desired customer feeling.`,
      `Explain the typography choice and what it signals about quality.`,
      `Write a before-and-after story for the customer's decision process.`,
      `Create a checklist buyers can use before choosing a ${category} brand.`,
      `Share a behind-the-scenes decision that proves ${opportunity}.`,
      `Post the strongest tagline and ask which version feels most memorable.`,
      `Create a short FAQ answering the main hesitation before purchase.`,
      `Show one practical use case for the brand in a real day.`,
      `Explain what the brand refuses to do and why that helps customers.`,
      `Publish a founder note about why this idea deserves to exist now.`,
      `Create a simple offer explainer with one clear next step.`,
      `Share three proof points that make ${brandName} credible.`,
      `Make a platform-specific intro post for the highest-priority channel.`,
      `Show the first logo concept and tie it back to the thesis.`,
      `Create a 90-day progress update template for the workspace.`,
    ];
    return ideas[index];
  });

  return { audience, customerMotivation, positioning, differentiation, personality, voice, messaging, moodboard, typography, colors, contentPillars, first20ContentIdeas };
}

function selectPlatformStrategy({ brandName = "New Brand", idea = "", industry = "", opportunity = "", audience = "" } = {}) {
  const text = `${brandName} ${idea} ${industry} ${opportunity} ${audience}`.toLowerCase();
  const candidates = [
    {
      platform: "Instagram",
      score: (text.match(/fashion|food|wedding|beauty|ranch|outdoor|clothing|visual|restaurant|photography|lifestyle|dog/g) || []).length + 2,
      strategy: `Use Instagram as the visual trust layer for ${brandName}: Reels prove the customer moment, carousels explain the point of view, and pinned posts clarify the offer.`,
      launchPlan: "Launch with three pinned posts: brand thesis, offer clarity, and proof or moodboard. Follow with 9 posts that turn the strategy into visuals.",
      postingIdeas: ["Founder intro Reel", "Moodboard carousel", "Customer problem post", "Offer explainer", "Before/after brand belief"],
    },
    {
      platform: "TikTok",
      score: (text.match(/video|creator|wedding|fashion|fitness|food|local|dog|kids|trend|story/g) || []).length + 1,
      strategy: `Use TikTok only if ${brandName} can show transformation, process, or founder POV quickly. The channel should create discovery, not polished brochure content.`,
      launchPlan: "Batch 12 short videos before launch: four customer pains, four proof/process clips, and four founder POV clips.",
      postingIdeas: ["POV hook about the customer problem", "One mistake buyers make", "Behind-the-scenes process", "Trend adapted to the niche", "Comment-reply proof video"],
    },
    {
      platform: "Facebook",
      score: (text.match(/local|community|family|real estate|restaurant|contractor|service|dog|group/g) || []).length,
      strategy: `Use Facebook if trust, locality, or community referrals matter. ${brandName} should prioritize groups, reviews, and warm audience proof.`,
      launchPlan: "Create the Page, pin the offer, join five relevant groups, and publish one useful community post before selling.",
      postingIdeas: ["Local intro", "Group value post", "Customer story", "FAQ answer", "Referral prompt"],
    },
    {
      platform: "Pinterest",
      score: (text.match(/fashion|clothing|wedding|home|food|beauty|outdoor|dog|style|moodboard|visual/g) || []).length,
      strategy: `Use Pinterest when people search and save inspiration before buying. ${brandName} should turn moodboard, product, and educational content into evergreen discovery.`,
      launchPlan: "Create boards for use cases, outcomes, style direction, and buyer questions. Publish 20 pins from the first content ideas.",
      postingIdeas: ["Moodboard pin", "Checklist pin", "Product/outcome pin", "Keyword-rich idea pin", "Before/after decision pin"],
    },
    {
      platform: "YouTube",
      score: (text.match(/education|software|ai|fitness|finance|how to|tutorial|complex|expert|founder/g) || []).length,
      strategy: `Use YouTube when the buyer needs education before trusting the brand. ${brandName} should use long-form for authority and Shorts for repeated discovery.`,
      launchPlan: "Publish one flagship explainer, then cut it into five Shorts that each answer a buying objection.",
      postingIdeas: ["Complete buyer guide", "Founder walkthrough", "Short objection answer", "Case study", "Roadmap update"],
    },
    {
      platform: "LinkedIn",
      score: (text.match(/b2b|software|ai|agency|founder|finance|legal|professional|saas|consulting/g) || []).length,
      strategy: `Use LinkedIn if the brand needs authority and founder trust. ${brandName} should publish decisions, lessons, frameworks, and proof of expertise.`,
      launchPlan: "Post the brand thesis, then publish five authority posts around the buyer's problem, process, proof, and offer.",
      postingIdeas: ["Founder thesis", "Market problem", "Process breakdown", "Customer lesson", "Offer announcement"],
    },
    {
      platform: "Email",
      score: 2,
      strategy: `Use email as the owned conversion layer for ${brandName}. It should capture interest before launch and nurture people with proof, education, and a clear offer.`,
      launchPlan: "Create one lead magnet tied to the buyer's decision, then write a five-email welcome sequence.",
      postingIdeas: ["Lead magnet", "Welcome email", "Problem email", "Proof email", "Offer email"],
    },
  ];

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score, ...item }) => item);
}

function normalizeBrandPlan(plan = {}, payload = {}) {
  const fallback = getThesisFallback(plan, payload);
  const brandName = cleanGeneratedText(plan.brandName || payload.brandName) || "New Brand";
  const industry = plan.logoContext?.industry || plan.workspaceContext?.industry || inferSimpleIndustry(`${brandName} ${payload.idea || payload.rawPrompt || ""}`);
  const coreOpportunity = cleanGeneratedText(plan.coreOpportunity) || fallback.coreOpportunity;
  const brandThesis = cleanGeneratedText(plan.brandThesis) || fallback.brandThesis;
  const launchRoadmap30Days = normalizeRoadmapItems(plan.launchRoadmap90Days || plan.launchRoadmap || plan.launchRoadmap30Days);
  const defaults = getBrandPlanDefaults({ brandName, idea: payload.idea || payload.rawPrompt || plan.brandSummary || "", industry, opportunity: coreOpportunity });
  const platformStrategy = Array.isArray(plan.platformStrategy) && plan.platformStrategy.length
    ? plan.platformStrategy.map((item) => ({
        platform: cleanGeneratedText(item.platform),
        strategy: cleanGeneratedText(item.strategy || item.contentStrategy),
        launchPlan: cleanGeneratedText(item.launchPlan || item.launch),
        postingIdeas: Array.isArray(item.postingIdeas || item.ideas) ? (item.postingIdeas || item.ideas).map(cleanGeneratedText).filter(Boolean).slice(0, 6) : [],
      })).filter((item) => item.platform && item.strategy && item.launchPlan)
    : selectPlatformStrategy({ brandName, idea: payload.idea || payload.rawPrompt || "", industry, opportunity: coreOpportunity, audience: plan.targetAudience || payload.audience });
  const contentPillars = Array.isArray(plan.contentPillars) && plan.contentPillars.length
    ? plan.contentPillars.map(cleanGeneratedText).filter(Boolean).slice(0, 6)
    : defaults.contentPillars;
  const first20ContentIdeas = Array.isArray(plan.first20ContentIdeas) && plan.first20ContentIdeas.length >= 10
    ? plan.first20ContentIdeas.map(cleanGeneratedText).filter(Boolean).slice(0, 20)
    : defaults.first20ContentIdeas;
  const growthOpportunities = Array.isArray(plan.growthOpportunities) && plan.growthOpportunities.length
    ? plan.growthOpportunities.map(cleanGeneratedText).filter(Boolean).slice(0, 6)
    : [
        `Turn the strongest ${coreOpportunity} proof into a repeatable content series.`,
        `Build a lead magnet around the buyer's hardest decision before choosing ${industry}.`,
        `Use the workspace to test which tagline, offer, and platform earns the clearest response.`,
      ];
  const normalizedSeed = {
    ...plan,
    brandName,
    coreOpportunity,
    brandThesis,
    brandSummary: cleanGeneratedText(plan.brandSummary) || `${brandName} is a ${industry} brand plan built around ${coreOpportunity}.`,
    targetAudience: ensureThesisDriven(plan.targetAudience, defaults.audience),
    customerMotivation: ensureThesisDriven(plan.customerMotivation, defaults.customerMotivation),
    positioning: ensureThesisDriven(plan.positioning, defaults.positioning),
    competitiveDifferentiation: ensureThesisDriven(plan.competitiveDifferentiation || plan.competitorCategory, defaults.differentiation),
    coreOffer: cleanGeneratedText(plan.coreOffer) || `A focused offer that makes the ${coreOpportunity} thesis tangible for the first customer.`,
    brandPersonality: ensureThesisDriven(plan.brandPersonality, defaults.personality),
    messagingDirection: ensureThesisDriven(plan.messagingDirection || plan.coreMessage, defaults.messaging),
    moodboardDirection: ensureThesisDriven(plan.moodboardDirection, defaults.moodboard),
    typographySystem: ensureThesisDriven(plan.typographySystem, defaults.typography),
    colorSystem: ensureThesisDriven(plan.colorSystem, defaults.colors),
    brandVoice: ensureThesisDriven(plan.brandVoice, defaults.voice),
  };

  return {
    ...plan,
    brandName,
    coreOpportunity,
    brandThesis,
    brandSummary: normalizedSeed.brandSummary,
    targetAudience: normalizedSeed.targetAudience,
    customerMotivation: normalizedSeed.customerMotivation,
    positioning: normalizedSeed.positioning,
    competitiveDifferentiation: normalizedSeed.competitiveDifferentiation,
    coreOffer: normalizedSeed.coreOffer,
    brandPersonality: normalizedSeed.brandPersonality,
    messagingDirection: normalizedSeed.messagingDirection,
    moodboardDirection: normalizedSeed.moodboardDirection,
    typographySystem: normalizedSeed.typographySystem,
    colorSystem: normalizedSeed.colorSystem,
    brandVoice: normalizedSeed.brandVoice,
    taglineIdeas: Array.isArray(plan.taglineIdeas) && plan.taglineIdeas.length ? plan.taglineIdeas.map(cleanGeneratedText).filter(Boolean).slice(0, 8) : makeTaglines({ brandName, industry, opportunity: coreOpportunity }),
    platformStrategy,
    contentPillars,
    first20ContentIdeas,
    growthOpportunities,
    launchRoadmap30Days,
    brandDNA: getBrandDNA(normalizedSeed, payload),
    whyThisWorks: getWhyThisWorks(normalizedSeed, payload),
    customerPsychology: getCustomerPsychology(normalizedSeed, payload),
    realityCheck: getRealityCheck(normalizedSeed, payload),
    positioningScorecard: getPositioningScorecard(normalizedSeed, payload),
    expandedRoadmap: getExpandedRoadmap({ ...normalizedSeed, launchRoadmap30Days }, payload),
    launchChecklist: getLaunchChecklist(plan, payload),
    revenuePlan: getRevenuePlan(plan, payload),
    creativeDirectorNotes: getCreativeDirectorNotes(normalizedSeed, payload),
    nextStepActionPlan: Array.isArray(plan.nextStepActionPlan) && plan.nextStepActionPlan.length
      ? plan.nextStepActionPlan.map(cleanGeneratedText).filter(Boolean)
      : [`Save this ${coreOpportunity}-led plan to the workspace.`, "Generate identity assets from the thesis.", "Use the roadmap to test the strongest proof points."],
    workspaceContext: {
      ...(plan.workspaceContext || {}),
      coreOpportunity,
      brandThesis,
      industry,
    },
    logoContext: {
      ...(plan.logoContext || {}),
      brandName,
      coreOpportunity,
      brandThesis,
      industry,
    },
  };
}

function createClientBrandPlanFallback(payload = {}) {
  const idea = cleanGeneratedText(payload.idea || payload.rawPrompt || "");
  const parsedLogo = parseNaturalLogoPrompt({
    prompt: `${payload.brandName || ""} ${idea}`,
    brandName: payload.brandName || "",
    style: payload.personality || payload.visualDirection || "",
    industry: "",
    symbol: "",
    colors: "",
    avoid: "",
  });
  const brandName = parsedLogo.brandName || payload.brandName || "New Brand";
  const industry = inferSimpleIndustry(`${brandName} ${idea} ${payload.positioning || ""}`);
  const coreOpportunity = inferStrategicOpportunity(`${brandName} ${idea} ${industry} ${payload.personality || ""}`);
  const targetAudience = payload.audience || `Buyers in the ${industry} category who will notice whether ${brandName} feels rooted in ${coreOpportunity} instead of a generic offer.`;
  const positioning = payload.positioning || `Position ${brandName} around ${coreOpportunity}: make the idea feel specific, believable, and more emotionally useful than template competitors.`;
  const defaults = getBrandPlanDefaults({ brandName, idea, industry, opportunity: coreOpportunity });
  const visualDirection = payload.visualDirection || `Shape the identity around ${coreOpportunity} with restrained symbols, practical applications, and category cues that connect directly to ${industry}.`;
  const typography = defaults.typography;
  const colors = parsedLogo.colors || defaults.colors;
  const brandThesis = buildBrandThesis({ brandName, industry, idea, opportunity: coreOpportunity, visualDefaults: defaults, audience: targetAudience, positioning });

  const basePlan = {
    brandName,
    coreOpportunity,
    brandThesis,
    brandSummary: `${brandName} is a ${industry} concept built around ${coreOpportunity}, using the original idea as the source of strategic direction.`,
    targetAudience,
    customerMotivation: defaults.customerMotivation,
    positioning,
    competitiveDifferentiation: defaults.differentiation,
    brandPersonality: payload.personality || defaults.personality,
    competitorCategory: `${industry} competitors that describe the category without giving customers a sharper ${coreOpportunity}-led reason to choose.`,
    pricePositioning: /luxury|premium|high-end/i.test(idea) ? `Premium pricing because the ${coreOpportunity} thesis depends on restraint, taste, and stronger proof.` : `Accessible but credible pricing because the ${coreOpportunity} promise still needs the brand to feel intentional.`,
    coreOffer: payload.offer || `A focused ${industry} offer that makes the ${coreOpportunity} thesis tangible in the first customer interaction.`,
    coreMessage: `${brandName} turns ${idea || industry} into a ${coreOpportunity}-led reason to care.`,
    messagingDirection: defaults.messaging,
    visualIdentityDirection: visualDirection,
    moodboardDirection: defaults.moodboard,
    typographySystem: typography,
    colorSystem: colors,
    brandVoice: defaults.voice,
    taglineIdeas: makeTaglines({ brandName, industry, opportunity: coreOpportunity }),
    platformStrategy: selectPlatformStrategy({ brandName, idea, industry, opportunity: coreOpportunity, audience: targetAudience }),
    contentPillars: defaults.contentPillars,
    first20ContentIdeas: defaults.first20ContentIdeas,
    launchRoadmap30Days: normalizeRoadmapItems([]),
    growthOpportunities: [`Turn the strongest ${coreOpportunity} proof into a repeatable content series.`, `Build a lead magnet around the buyer's hardest decision before choosing ${industry}.`, `Use the workspace to test which tagline, offer, and platform earns the clearest response.`],
    nextStepActionPlan: [`Save this ${coreOpportunity}-led plan as a Brand Workspace.`, "Review the platform strategy and publish the first proof post.", "Generate logo concepts only after the thesis, type, color, and moodboard direction feel right."],
    workspaceContext: { coreOpportunity, brandThesis: "", industry, audience: targetAudience, differentiator: positioning, visualDirection, typography, colors },
    logoContext: { brandName, coreOpportunity, brandThesis: "", industry, style: payload.personality || coreOpportunity, symbolIdeas: `Use a restrained ${industry} cue that supports ${coreOpportunity}.`, colors, typography, avoid: "Wrong name, clipart, tiny logos, clutter, and unrelated iconography." },
  };
  const plan = normalizeBrandPlan(basePlan, payload);

  return {
    plan,
    text: `Brand Summary
${plan.brandSummary}

Brand Thesis
${plan.brandThesis}

Core Opportunity
${plan.coreOpportunity}

Target Audience
${plan.targetAudience}

Customer Motivation
${plan.customerMotivation}

Brand Positioning
${plan.positioning}

Competitive Differentiation
${plan.competitiveDifferentiation}

Brand Personality
${plan.brandPersonality}

Brand Voice
${plan.brandVoice}

Messaging Direction
${plan.messagingDirection}

Moodboard Direction
${plan.moodboardDirection}

Typography Direction
${plan.typographySystem}

Color System
${plan.colorSystem}

Tagline Ideas
${plan.taglineIdeas.map((item) => `- ${item}`).join("\n")}

Platform-by-Platform Strategy
${plan.platformStrategy.map((item) => `${item.platform}: ${item.strategy}\nLaunch plan: ${item.launchPlan}\nIdeas: ${item.postingIdeas.join("; ")}`).join("\n\n")}

Content Pillars
${plan.contentPillars.map((item) => `- ${item}`).join("\n")}

First 20 Content Ideas
${plan.first20ContentIdeas.map((item, index) => `${index + 1}. ${item}`).join("\n")}

90-Day Launch Roadmap
${plan.launchRoadmap30Days.map((item) => `${item.week}: ${item.focus}\nWhat to do:\n${item.actions.map((action) => `- ${action}`).join("\n")}\nWhy it matters: ${item.outcome}\nExpected outcome: ${item.outcome}\nCompletion status: ${item.status}`).join("\n\n")}

Growth Opportunities
${plan.growthOpportunities.map((item) => `- ${item}`).join("\n")}

Next Best Actions
${plan.nextStepActionPlan.map((step) => `- ${step}`).join("\n")}

Saved Brand Workspace
${plan.brandName} is ready to save as a Brand Workspace before logo concepts are generated.`,
    source: "client-fallback",
  };
}

function escapeSvgText(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createDataUriFromSvg(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function getInitialsFromBrandName(name = "") {
  const words = String(name || "")
    .replace(/[^a-zA-Z0-9\s&]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "BT";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function titleCase(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/\b[a-z0-9]/g, (letter) => letter.toUpperCase());
}

function formatExtractedBrandName(value = "") {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.includes(".") || /[a-z][A-Z]/.test(clean)) return clean;
  const words = clean.split(/\s+/).map((word, index, allWords) => {
    const lower = word.toLowerCase().replace(/[^a-z0-9&.'-]/g, "");
    if (!lower) return "";
    if (lower === "candys") return "Candies";
    if (lower === "candy") return "Candy";
    if (/^[a-z]+s$/.test(lower) && index === 0 && allWords.length > 1) {
      return `${titleCase(lower.slice(0, -1))}'s`;
    }
    return titleCase(lower);
  }).filter(Boolean);
  return words.join(" ");
}

const LOGO_INDUSTRY_KEYWORDS = [
  ["pet grooming", ["dog grooming", "pet grooming", "groomer", "paw", "pet care"]],
  ["skincare", ["skincare", "skin care", "beauty", "spa", "esthetician", "wellness"]],
  ["AI startup", ["ai", "artificial intelligence", "startup", "saas", "software", "app", "platform", "tech"]],
  ["real estate", ["real estate", "realtor", "broker", "property", "homes", "estate group"]],
  ["fitness", ["gym", "fitness", "coach", "coaching", "training", "strength", "athletic"]],
  ["kids party", ["kids", "children", "party", "confetti", "birthday", "play"]],
  ["chocolate", ["chocolate", "chocolatier", "cocoa", "cacao", "truffle", "candy", "candies", "confectionery", "sweets", "chocolate factory"]],
  ["restaurant", ["restaurant", "pizza", "cafe", "coffee", "bar", "bakery", "food", "diner", "chef", "private chef", "roaster", "cupcake"]],
  ["law firm", ["law", "legal", "attorney", "firm", "counsel", "serious", "scales"]],
  ["construction", ["construction", "plastering", "stucco", "contractor", "builder", "roofing"]],
  ["ranch", ["ranch", "horse", "alpaca", "farm", "western", "equestrian"]],
  ["photography", ["photo", "photography", "wedding", "video", "film", "studio"]],
  ["finance", ["finance", "wealth", "capital", "fund", "accounting", "tax"]],
  ["automotive", ["auto", "automotive", "car", "garage", "detailing", "detail", "mechanic", "motors", "chrome"]],
  ["barber", ["barber", "barbershop", "barber shop", "fade", "grooming"]],
  ["surf shop", ["surf", "wave", "beach", "coastal"]],
  ["fashion", ["fashion", "maison", "apparel", "clothing", "streetwear"]],
  ["medical", ["medical", "clinic", "health", "doctor", "dental", "therapy"]],
  ["salon", ["salon", "hair", "blush", "feminine"]],
  ["tattoo studio", ["tattoo", "blackletter", "needle", "ink studio"]],
  ["plumbing", ["plumbing", "plumber", "pipe", "water", "clearflow"]],
  ["consulting", ["consulting", "advisory", "advisor", "strategy"]],
  ["candles", ["candle", "candles", "fragrance", "scent"]],
];

const LOGO_STYLE_KEYWORDS = [
  ["luxury", ["luxury", "premium", "high-end", "elegant", "refined", "exclusive", "expensive"]],
  ["clean modern", ["clean", "modern", "minimal", "simple", "sleek"]],
  ["bold", ["bold", "strong", "powerful", "aggressive", "heavy"]],
  ["playful", ["playful", "fun", "colorful", "kids", "bright", "friendly"]],
  ["vintage", ["vintage", "retro", "classic", "heritage", "old school"]],
  ["corporate", ["corporate", "professional", "trusted", "enterprise", "serious", "trustworthy"]],
  ["futuristic", ["futuristic", "cyber", "tech", "ai", "digital"]],
  ["monogram", ["monogram", "initial", "lettermark", "initials"]],
  ["wordmark", ["wordmark", "typography", "text only", "type only"]],
  ["calm", ["calm", "soft", "peaceful", "gentle"]],
  ["feminine", ["feminine", "soft", "blush", "romantic"]],
  ["edgy", ["edgy", "tattoo", "blackletter", "gritty"]],
  ["western", ["western", "ranch", "cowboy", "equestrian"]],
];

const LOGO_COLOR_KEYWORDS = [
  "black", "white", "cream", "gold", "blue", "navy", "green", "red", "pink", "purple",
  "orange", "yellow", "silver", "gray", "grey", "brown", "tan", "beige", "teal", "chrome", "rainbow"
];

const LOGO_SYMBOL_KEYWORDS = [
  "a symbol", "symbol", "icon", "mascot", "monogram", "lettermark", "badge", "emblem",
  "shield", "crown", "leaf", "rose", "horse", "alpaca", "pizza", "fork", "house",
  "key", "mountain", "bolt", "spark", "dumbbell", "barbell", "confetti", "balloon",
  "paw", "scissors", "wave", "needle", "pipe", "flame", "chocolate", "cocoa", "cacao", "truffle"
];

function normalizeLogoIdentity(value = "") {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an|logo|brand|company|business|llc|inc|co)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLogoRefinementPrompt(text = "") {
  const normalized = String(text || "").toLowerCase().trim();
  if (!normalized) return false;
  const startsLikeRefinement = /^(make it|make this|change it|change this|use |remove |try |more |less |simplify|cleaner|bolder|softer|keep |switch |turn it|revise|refine)/.test(normalized);
  const containsNewLogoIntent = /\b(create|make|design|generate|build)\b.{0,28}\blogo\b|\blogo for\b|\bcalled\b|\bnamed\b|\bcompany\b|\bbusiness\b|\bbrand\b/.test(normalized);
  return startsLikeRefinement && !containsNewLogoIntent;
}

function isDifferentLogoIdentity(next = "", previous = "") {
  const nextId = normalizeLogoIdentity(next);
  const previousId = normalizeLogoIdentity(previous);
  if (!nextId || !previousId) return false;
  return nextId !== previousId;
}

function findKeywordMatch(text, pairs, fallback = "") {
  const normalized = String(text || "").toLowerCase();
  const match = pairs.find(([, keywords]) =>
    keywords.some((keyword) => {
      const cleanKeyword = String(keyword).toLowerCase();
      if (cleanKeyword.length <= 3) {
        const escaped = cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`\\b${escaped}\\b`).test(normalized);
      }
      return normalized.includes(cleanKeyword);
    })
  );
  return match?.[0] || fallback;
}

const BRAND_NAME_STOPPER_WORDS = "with|using|featuring|that|for|in|as|maybe|modern|blue|black|white|gold|silver|red|green|cream|navy|pink|brown|orange|yellow|teal|chrome|bold|luxury|minimal|professional|playful|vintage|serif|monogram|simple|calm|not|no|avoid|factory|restaurant|company|business|brand|logo|named|name|naed|naemd|nmaed|called|callled|calld|titled|style|colors|colour|color|icon|symbol|mascot|monogram|badge|emblem|please|thanks|thank";

function cleanBrandNameCandidate(value = "") {
  const candidate = String(value || "")
    .replace(/[“”"]/g, "")
    .replace(new RegExp(`\\s+(${BRAND_NAME_STOPPER_WORDS})\\b.*$`, "i"), "")
    .replace(/\b(my|a|an|the|new|small|local)\b/gi, " ")
    .replace(/\b(chocolate factory|candy company|candy shop|logo|brand)$/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const weakFragments = /^(for|my|a|an|the|logo|brand|company|business|chocolate|factory|restaurant|candy|candies|for my|my chocolate|chocolate factory)$/i;
  if (!candidate || weakFragments.test(candidate)) return "";
  return formatExtractedBrandName(candidate);
}

function extractBrandNameFromPrompt(text = "") {
  const promptText = String(text || "").replace(/\s+/g, " ").trim();
  const stopperWords = BRAND_NAME_STOPPER_WORDS;
  const patterns = [
    new RegExp(`\\b(?:called|callled|calld|titled|named|name|naed|naemd|nmaed)\\s+([A-Z0-9][A-Za-z0-9&.' -]{1,60})(?=\\s+(?:${stopperWords})\\b|[,.:;!?]|$)`, "i"),
    new RegExp(`\\b(?:called|callled|calld|titled|named|name|naed|naemd|nmaed)\\s+([a-z0-9][a-z0-9&.' -]{1,60})`, "i"),
    new RegExp(`\\bfor\\s+(?:a|an|the)?\\s*brand\\s+(?:called|named)?\\s*([A-Z0-9][A-Za-z0-9&.' -]{1,60})(?=\\s+(?:${stopperWords})\\b|[,.:;!?]|$)`, "i"),
    new RegExp(`\\b(?:brand|company|business|logo)\\s+(?:logo\\s+)?([A-Za-z0-9][A-Za-z0-9&.' -]{1,60})(?=\\s+(?:${stopperWords})\\b|[,.:;!?]|$)`, "i"),
    new RegExp(`\\bfor\\s+(?!my\\b)([A-Z0-9][A-Za-z0-9&.' -]{1,60})(?=\\s+(?:${stopperWords})\\b|[,.:;!?]|$)`, "i"),
  ];

  const match = patterns.map((pattern) => promptText.match(pattern)).find(Boolean);
  if (match) return cleanBrandNameCandidate(match[1]);

  const trailingProperName = promptText.match(/\b([A-Z][A-Za-z0-9&.'-]{2,}(?:\s+[A-Z][A-Za-z0-9&.'-]{2,}){0,2})\s*$/);
  return trailingProperName ? cleanBrandNameCandidate(trailingProperName[1]) : "";
}

function extractColorsFromPrompt(text = "") {
  const normalized = String(text || "").toLowerCase();
  const colors = LOGO_COLOR_KEYWORDS.filter((color) => normalized.includes(color));
  return [...new Set(colors)].join(", ");
}

function extractSymbolFromPrompt(text = "") {
  const normalized = String(text || "").toLowerCase();
  if (normalized.includes("remove the icon") || normalized.includes("no icon")) return "no icon; typography-first wordmark";
  const directSymbol = LOGO_SYMBOL_KEYWORDS.find((keyword) => normalized.includes(keyword));
  if (directSymbol) return directSymbol;
  if (normalized.includes("dog") || normalized.includes("pet")) return "polished paw, grooming, or pet-care symbol";
  if (normalized.includes("chocolate") || normalized.includes("cocoa") || normalized.includes("cacao") || normalized.includes("truffle")) return "premium chocolate square, cocoa pod, melted chocolate ribbon, or confectionery factory mark";
  if (normalized.includes("skincare")) return "elegant botanical or letter symbol";
  if (normalized.includes("real estate")) return "architectural symbol or refined monogram";
  if (normalized.includes("fitness") || normalized.includes("gym")) return "strong monogram or athletic mark";
  if (normalized.includes("party") || normalized.includes("kids")) return "playful confetti-inspired symbol";
  if (normalized.includes("ai") || normalized.includes("startup")) return "abstract intelligent network mark";
  if (normalized.includes("restaurant") || normalized.includes("chef") || normalized.includes("pizza") || normalized.includes("coffee")) return "food, hospitality, or chef-inspired brand symbol";
  if (normalized.includes("auto") || normalized.includes("detailing")) return "sleek motion, shine, or automotive-detail mark";
  return "";
}

function extractAvoidFromPrompt(text = "") {
  const normalized = String(text || "").toLowerCase();
  const avoidMatches = [];
  const patterns = [
    /\bnot\s+([a-z0-9 -]{2,40})(?=,|\.|;|$)/g,
    /\bno\s+([a-z0-9 -]{2,40})(?=,|\.|;|$)/g,
    /\bavoid\s+([a-z0-9 -]{2,50})(?=,|\.|;|$)/g,
  ];

  patterns.forEach((pattern) => {
    [...normalized.matchAll(pattern)].forEach((match) => {
      const value = match[1]?.trim();
      if (value) avoidMatches.push(value);
    });
  });

  return avoidMatches.length ? `avoid ${[...new Set(avoidMatches)].join(", ")}` : "";
}

function interpretLogoLanguage(text = "") {
  const normalized = String(text || "").toLowerCase();
  const has = (pattern) => pattern.test(normalized);
  const directives = [];
  const result = {
    style: "",
    mood: "",
    typography: "",
    spacing: "",
    composition: "",
    palette: "",
    icon: "",
    avoid: "",
    directives,
  };

  const add = (copy) => {
    if (copy && !directives.includes(copy)) directives.push(copy);
  };

  if (has(/\b(expensive|luxury hotel|luxurious|more luxury|more premium|premium|high.?end|elevated)\b/)) {
    result.style = "luxury editorial";
    result.mood = "expensive, restrained, mature, high-trust";
    result.typography = "high-quality serif or refined custom wordmark with generous tracking";
    result.spacing = "wide whitespace, fewer elements, calmer hierarchy";
    result.palette = "monochrome, warm ivory, deep neutral, restrained metallic accent";
    result.icon = "minimal symbol, monogram, or negative-space mark; avoid literal decoration";
    add("Translate luxury language into restraint, mature spacing, premium type, and fewer visual elements.");
  }

  if (has(/\b(editorial|fashion house|magazine|gallery|atelier|maison)\b/)) {
    result.style = result.style || "editorial";
    result.typography = "editorial serif or elegant wordmark with deliberate letter spacing";
    result.composition = "quiet asymmetrical layout with type-forward hierarchy";
    add("Make the concept type-led, editorial, and calm instead of icon-heavy.");
  }

  if (has(/\b(timeless|classic|heritage|legacy|established|enduring)\b/)) {
    result.style = result.style || "timeless";
    result.typography = "classic serif or restrained sans with balanced proportions";
    result.palette = result.palette || "black, cream, charcoal, muted heritage accent";
    result.icon = result.icon || "simple enduring mark; avoid trend-heavy shapes";
    add("Favor classic proportions, conservative palette, and long-term readability.");
  }

  if (has(/\b(yc startup|yc|startup|saas|modern tech|ai startup|product-led|software)\b/)) {
    result.style = result.style || "modern SaaS";
    result.typography = "precise geometric sans with subtle custom letter detail";
    result.spacing = result.spacing || "clean product-grade spacing and crisp hierarchy";
    result.palette = result.palette || "monochrome-first with one confident digital accent";
    result.icon = result.icon || "adaptive abstract mark that works as an app icon and favicon";
    add("Treat startup language as product-grade: sharp type, simple adaptive symbol, no fake futuristic clutter.");
  }

  if (has(/\b(less tech bro|not tech bro|less corporate|less startupy)\b/)) {
    result.style = "warmer modern editorial";
    result.typography = "more human, less default geometric; refined wordmark with softer rhythm";
    result.palette = "warmer neutrals or muted accent instead of electric blue gradients";
    result.icon = "restrained, human-designed mark; avoid circuit, node, spark, and generic AI symbols";
    result.avoid = "generic tech aesthetic, cold blue gradients, random network nodes, tech-bro energy";
    add("Reduce generic tech cues and make the identity feel warmer, more mature, and less cliché.");
  }

  if (has(/\b(less busy|cleaner|simpler|simplify|more minimal|minimalist|quiet)\b/)) {
    result.style = result.style || "minimal";
    result.spacing = "more negative space, fewer elements, stronger silhouette";
    result.composition = "one clear focal point with uncluttered hierarchy";
    result.icon = "remove unnecessary symbol details; keep only the most ownable cue";
    result.avoid = [result.avoid, "clutter, multiple icons, tiny text, decorative filler"].filter(Boolean).join(", ");
    add("Simplify by removing details, not by making the logo generic.");
  }

  if (has(/\b(stronger typography|bold typography|type focus|typography focus|better font|stronger font|wordmark)\b/)) {
    result.typography = "make typography the main identity asset with custom letter spacing, confident weight, and a memorable wordmark detail";
    result.icon = result.icon || "icon should be secondary or removed if it competes with the wordmark";
    result.composition = result.composition || "wordmark-led layout with clear visual hierarchy";
    add("Prioritize the wordmark over the icon and make the type feel intentionally designed.");
  }

  return {
    ...result,
    summary: directives.join(" "),
  };
}

function getTypographyDirection(style = "", industry = "", promptText = "") {
  const text = `${style} ${industry} ${promptText}`.toLowerCase();
  const interpretation = interpretLogoLanguage(text);
  if (interpretation.typography) return interpretation.typography;
  if (text.includes("luxury") || text.includes("skincare") || text.includes("real estate")) return "refined serif or elegant high-contrast wordmark with premium spacing";
  if (text.includes("ai") || text.includes("startup") || text.includes("modern")) return "clean geometric sans-serif with tight, modern hierarchy";
  if (text.includes("fitness") || text.includes("bold")) return "bold condensed sans-serif with confident weight";
  if (text.includes("kids") || text.includes("playful")) return "rounded friendly display type with clear readability";
  return "clean readable wordmark with strong spacing and scalable hierarchy";
}

function getLayoutPreferenceFromPrompt(text = "") {
  const normalized = String(text || "").toLowerCase();
  if (normalized.includes("badge") || normalized.includes("emblem")) return "balanced emblem or badge layout";
  if (normalized.includes("monogram") || normalized.includes("lettermark")) return "mark-first monogram with supporting wordmark";
  if (normalized.includes("wordmark") || normalized.includes("text only")) return "typography-first wordmark";
  return "primary symbol paired with a clean wordmark";
}

function parseNaturalLogoPrompt({ prompt = "", brandName = "", style = "", industry = "", symbol = "", colors = "", avoid = "" }) {
  const promptText = String(prompt || "").trim();
  const isRefinement = isLogoRefinementPrompt(promptText);
  const promptBrandName = extractBrandNameFromPrompt(promptText);
  const combined = [promptText, brandName, style, industry, symbol, colors, avoid].filter(Boolean).join(" ");
  const promptFirstCombined = [promptText, promptBrandName, industry, style, symbol, colors, avoid].filter(Boolean).join(" ");
  const interpretation = interpretLogoLanguage(combined);
  const promptIndustry = findKeywordMatch(promptText, LOGO_INDUSTRY_KEYWORDS, "");
  const detectedIndustry = promptIndustry || industry || findKeywordMatch(promptFirstCombined, LOGO_INDUSTRY_KEYWORDS, "");
  const promptStyle = findKeywordMatch(promptText, LOGO_STYLE_KEYWORDS, "");
  const detectedStyle = promptStyle || style || interpretation.style || findKeywordMatch(promptFirstCombined, LOGO_STYLE_KEYWORDS, detectedIndustry === "skincare" || detectedIndustry === "real estate" ? "luxury" : "");
  const detectedBrandName = promptBrandName || brandName;
  const detectedColors = extractColorsFromPrompt(promptText) || colors || extractColorsFromPrompt(promptFirstCombined) || interpretation.palette;
  const detectedSymbol = extractSymbolFromPrompt(promptText) || symbol || interpretation.icon || extractSymbolFromPrompt(promptFirstCombined);
  const detectedAvoid = [extractAvoidFromPrompt(promptText) || avoid || extractAvoidFromPrompt(promptFirstCombined), interpretation.avoid].filter(Boolean).join("; ");
  const typography = getTypographyDirection(detectedStyle, detectedIndustry, promptFirstCombined);
  const layout = interpretation.composition || getLayoutPreferenceFromPrompt(promptFirstCombined);
  const isNewBrandRequest = Boolean(promptBrandName && isDifferentLogoIdentity(promptBrandName, brandName));

  return {
    brandName: detectedBrandName,
    industry: detectedIndustry || "brand inferred from request",
    style: detectedStyle || "clean modern",
    colors: detectedColors || "professional palette inferred from brand",
    symbol: detectedSymbol || "meaning-matched symbol inferred from brand words",
    mood: interpretation.mood || [detectedStyle, detectedIndustry].filter(Boolean).join(", ") || "professional, memorable, brandable",
    typography,
    layout,
    avoid: detectedAvoid || "generic clipart, misspelled words, clutter, tiny unreadable text",
    interpretation,
    originalPrompt: promptText,
    isRefinement,
    isNewBrandRequest,
    promptBrandName,
    extractionConfidence: {
      brandName: detectedBrandName ? "high" : "low",
      industry: promptIndustry ? "high" : detectedIndustry ? "medium" : "low",
      style: promptStyle ? "high" : detectedStyle ? "medium" : "low",
      symbol: detectedSymbol ? "medium" : "low",
      colors: detectedColors ? "medium" : "low",
    },
  };
}

const BRAND_KIT_COLOR_LIBRARY = {
  black: "#111111",
  white: "#ffffff",
  cream: "#f5f5f5",
  gold: "#111111",
  blue: "#2457d6",
  navy: "#0d1b2a",
  green: "#1f5b46",
  red: "#9f2d2d",
  pink: "#d78aa3",
  purple: "#6247aa",
  orange: "#c86b2d",
  yellow: "#d6a930",
  silver: "#b8bec7",
  gray: "#6f737a",
  grey: "#6f737a",
  brown: "#333333",
  tan: "#c8a77b",
  beige: "#e5e5e5",
  teal: "#167c80",
  chrome: "#aeb6c2",
  rainbow: "#6f5cff",
};

function getHexForColorWord(color = "") {
  return BRAND_KIT_COLOR_LIBRARY[String(color || "").toLowerCase()] || "";
}

function getPaletteFromLogoContext(parsedLogo = {}, logoEditor = {}, creativeBrief = {}) {
  const colorWords = String(parsedLogo.colors || creativeBrief?.concepts?.[0]?.palette || "")
    .toLowerCase()
    .split(/[^a-z]+/)
    .map(getHexForColorWord)
    .filter(Boolean);

  const seed = [
    logoEditor.ink,
    logoEditor.accent,
    ...colorWords,
    parsedLogo.style?.includes("luxury") ? "#111111" : "",
    parsedLogo.industry?.includes("skincare") ? "#f4dfd0" : "",
    parsedLogo.industry?.includes("AI") || parsedLogo.industry?.includes("tech") ? "#2457d6" : "",
    parsedLogo.industry?.includes("ranch") ? "#333333" : "",
    "#111111",
    "#f5f5f5",
  ].filter(Boolean);

  const unique = [...new Set(seed.map((color) => String(color).trim()).filter(Boolean))];
  const primary = unique.slice(0, 3);
  const secondary = [...new Set([logoEditor.paper || "#f5f5f5", "#ffffff", "#777067", ...unique.slice(3)])].slice(0, 3);

  return {
    primary: primary.length ? primary : ["#111111", "#111111", "#f5f5f5"],
    secondary: secondary.length ? secondary : ["#ffffff", "#777067", "#f5f5f5"],
  };
}

function getTypographyPairing(parsedLogo = {}) {
  const text = `${parsedLogo.style || ""} ${parsedLogo.industry || ""} ${parsedLogo.typography || ""}`.toLowerCase();
  if (text.includes("luxury") || text.includes("skincare") || text.includes("real estate") || text.includes("wedding")) {
    return {
      headline: "Editorial serif",
      supporting: "Quiet modern sans",
      note: "High contrast type with calm spacing gives the brand a more premium editorial feel.",
    };
  }
  if (text.includes("ai") || text.includes("startup") || text.includes("tech") || text.includes("saas")) {
    return {
      headline: "Geometric sans",
      supporting: "Technical neutral sans",
      note: "Clean geometry and tight hierarchy keep the system modern, scalable, and product-ready.",
    };
  }
  if (text.includes("fitness") || text.includes("construction") || text.includes("automotive")) {
    return {
      headline: "Bold condensed sans",
      supporting: "Readable utility sans",
      note: "Stronger weight and compact rhythm help the identity feel confident without adding clutter.",
    };
  }
  if (text.includes("kids") || text.includes("playful")) {
    return {
      headline: "Rounded display",
      supporting: "Friendly sans",
      note: "Softer forms keep the brand approachable while preserving readability.",
    };
  }
  return {
    headline: "Readable wordmark",
    supporting: "Humanist sans",
    note: "Simple type and generous spacing keep the identity flexible across social, web, and print.",
  };
}


function getIdentitySourceText(brand = {}, plan = {}) {
  return [brand.name, brand.description, brand.audience, brand.logoDirection, brand.style, brand.tone, brand.launchGoal, plan.workspaceContext?.industry, plan.logoContext?.industry, plan.colorSystem, plan.typographySystem, plan.moodboardDirection, plan.visualIdentityDirection, plan.brandPersonality].filter(Boolean).join(" ").toLowerCase();
}

function getWorkspaceIndustry(brand = {}, plan = {}) {
  const inferred = inferSimpleIndustry((brand.name || "") + " " + (brand.description || "") + " " + (brand.style || ""));
  if (/plant|houseplant|botanical|greenery/i.test(`${brand.description || ""} ${brand.logoDirection || ""} ${brand.style || ""}`)) {
    return "Houseplants / local plant delivery";
  }
  if (/dog|pet|groom|walking|sitting/i.test(`${brand.description || ""} ${brand.logoDirection || ""}`)) {
    return "Pet care / mobile local service";
  }
  if (/coffee|cafe|hiker|outdoor event/i.test(`${brand.description || ""} ${brand.logoDirection || ""}`)) {
    return "Outdoor coffee / mobile hospitality";
  }
  return plan.logoContext?.industry || plan.workspaceContext?.industry || inferred;
}

function getIdentityPalette(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return [{ role: "Primary", name: "Leaf Green", hex: "#3F6F45" }, { role: "Secondary", name: "Stone Gray", hex: "#827F73" }, { role: "Background", name: "Warm Ivory", hex: "#F6F0E3" }, { role: "Accent", name: "Soft Terracotta", hex: "#B86F4B" }];
  if (/coffee|cafe|bakery|restaurant|hospitality|food/.test(text)) return [{ role: "Primary", name: "Roasted Brown", hex: "#4A2F24" }, { role: "Secondary", name: "Cream Foam", hex: "#F4E9D8" }, { role: "Background", name: "Warm Paper", hex: "#FBF7EF" }, { role: "Accent", name: "Copper Heat", hex: "#B66A3C" }];
  if (/pet|dog|grooming|walking/.test(text)) return [{ role: "Primary", name: "Trust Navy", hex: "#26364A" }, { role: "Secondary", name: "Clean Cream", hex: "#F7F1E6" }, { role: "Background", name: "Soft White", hex: "#FCFAF6" }, { role: "Accent", name: "Leash Clay", hex: "#C88462" }];
  if (/software|saas|creator|invoice|sponsorship|platform|app/.test(text)) return [{ role: "Primary", name: "Deep Ink", hex: "#15171A" }, { role: "Secondary", name: "Interface Gray", hex: "#747C86" }, { role: "Background", name: "Cloud White", hex: "#F7F8F6" }, { role: "Accent", name: "Signal Blue", hex: "#4D6BFE" }];
  return [{ role: "Primary", name: "Brand Ink", hex: "#11110F" }, { role: "Secondary", name: "Warm Stone", hex: "#837B6D" }, { role: "Background", name: "Studio Cream", hex: "#F7F1E8" }, { role: "Accent", name: "Clay Accent", hex: "#AA6A45" }];
}

function hexToRgb(hex = "") {
  const clean = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return { r: 17, g: 17, b: 17 };
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

function getContrastTextColor(hex = "") {
  const rgb = hexToRgb(hex);
  return ((0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255) > 0.62 ? "#11110F" : "#FFFDF8";
}

function getRgbLabel(hex = "") {
  const rgb = hexToRgb(hex);
  return "RGB " + rgb.r + ", " + rgb.g + ", " + rgb.b;
}

function getIdentityTypography(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return { headline: "Fraunces or Cormorant Garamond", supporting: "Inter or Source Sans 3", wordmark: "Warm botanical serif", source: "Google Fonts / open-source font licenses", note: "A soft serif gives the wordmark a living, botanical quality while the humanist sans keeps care cards, captions, and subscription details easy to read." };
  return { ...getTypographyPairing({ style: (brand.style || "") + " " + (brand.tone || "") + " " + (plan.brandPersonality || ""), industry: getWorkspaceIndustry(brand, plan), typography: plan.typographySystem || brand.logoDirection || "" }), source: "Google Fonts alternatives / confirm license before final use" };
}

function getMoodboardTiles(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return [["Window-light apartment greenery", "Bright compact rooms, shelves, and entryways with practical greenery."], ["Local delivery moment", "Hands, kraft care cards, doorstep handoff, and calm packaging materials."], ["Beginner confidence", "Simple labels, clear instructions, resilient plant varieties, and no intimidating gardening language."], ["Avoid", "Generic wellness leaves, technology symbols, health claims, and over-polished greenhouse imagery."]];
  if (/pet|dog|grooming|walking/.test(text)) return [["Neighborhood trust", "Real homes, clean service details, friendly arrival moments, and calm pet handling."], ["Care cues", "Soft towels, tidy tools, appointment reminders, and warm human photography."], ["Family convenience", "Busy entryways, personal service, clear scheduling, and reliable local proof."], ["Avoid", "Cartoon paws, veterinary claims, generic pet-store colors, and chaotic grooming scenes."]];
  if (/software|saas|creator|invoice|sponsorship|platform|app/.test(text)) return [["Calm operator workspace", "Clean interface crops, organized cards, clear task states, and creator desk context."], ["Deal clarity", "Invoices, deliverables, timelines, and status moments shown as simple systems."], ["Founder credibility", "Sharp UI typography, restrained color, and lightweight product proof."], ["Avoid", "Abstract AI art, random code screens, fake metrics, and neon technology cliches."]];
  return [["Real customer context", "Show the brand in the moment where the customer understands why it matters."], ["Material proof", "Use product, service, texture, environment, or process details instead of decorative art."], ["Launch-ready system", "Show social, packaging, web, and workspace assets sharing one visual language."], ["Avoid", "Generic stock photos, random gradients, weak icons, and unrelated mockups."]];
}

function getLogoRecommendations(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return { markType: ["Icon + wordmark"], brandFeel: ["Friendly", "Minimal"], useCases: ["Website header", "Instagram profile", "Packaging"], qualityTargets: ["Readable at small size", "Distinct silhouette", "Print-ready", "No generic symbols"], symbolDirection: "Subtle stone-and-leaf symbol or grounded botanical mark, restrained enough for a profile avatar." };
  if (/software|saas|creator|invoice|sponsorship|platform|app/.test(text)) return { markType: ["Wordmark", "Icon + wordmark"], brandFeel: ["Minimal", "Tech-forward"], useCases: ["Website header", "App icon", "Social avatar"], qualityTargets: ["Readable at small size", "Distinct silhouette", "No generic symbols"], symbolDirection: "A simple signal, workflow, or status mark that reads cleanly in product UI." };
  return { markType: ["Icon + wordmark"], brandFeel: ["Premium", "Minimal"], useCases: ["Website header", "Instagram profile", "Business cards"], qualityTargets: ["Readable at small size", "Distinct silhouette", "Print-ready", "No generic symbols"], symbolDirection: "A simple meaning-led symbol tied to the brand promise, not a generic category icon." };
}

function buildWorkspaceLogoBrief(brand = {}, plan = {}) {
  if (!brand?.name) return "";
  const industry = getWorkspaceIndustry(brand, plan);
  const palette = getIdentityPalette(brand, plan);
  const type = getIdentityTypography(brand, plan);
  const recs = getLogoRecommendations(brand, plan);
  const colors = palette.map((item) => item.name.toLowerCase()).join(", ");
  const personality = [brand.tone, plan.brandPersonality, brand.style].filter(Boolean).join(", ") || "clear, useful, and premium";
  const description = brand.description || "a " + industry + " brand";
  return "Create an " + recs.markType[0].toLowerCase() + " identity for " + brand.name + ", " + description + ". Use " + (type.wordmark || type.headline) + " paired with " + (type.supporting || "a readable supporting type system") + ". Explore " + recs.symbolDirection + " Use " + colors + ". The identity should feel " + personality + ". It must work in full color, black, white, horizontal, and square formats. Avoid generic category symbols, unrelated technology cues, gradients, tiny details, unsupported claims, and misspelled text.";
}

function getStructuredLogoContext({ activeBrand = null, promptValue = "", brandNameValue = "", styleValue = "", industryValue = "", symbolValue = "", colorsValue = "", avoidValue = "" } = {}) {
  if (!activeBrand) {
    return { activeWorkspace: false, parsedLogo: parseNaturalLogoPrompt({ prompt: promptValue, brandName: brandNameValue, style: styleValue, industry: industryValue, symbol: symbolValue, colors: colorsValue, avoid: avoidValue }) };
  }

  const plan = getWorkspacePlan(activeBrand);
  const palette = getIdentityPalette(activeBrand, plan);
  const typography = getIdentityTypography(activeBrand, plan);
  const recommendations = getLogoRecommendations(activeBrand, plan);
  const category = industryValue || getWorkspaceIndustry(activeBrand, plan);
  const colors = colorsValue || palette.map((item) => `${item.name} ${item.hex}`).join(", ");
  const style = styleValue || recommendations.brandFeel.join(", ") || activeBrand.tone || plan.brandPersonality || "brand strategy-led";
  const symbol = symbolValue || recommendations.symbolDirection || activeBrand.logoDirection || plan.logoDirection || "";
  const avoid = avoidValue || "generic wellness leaves, unrelated technology symbols, misspelled text, tiny decorative details, unsupported claims";
  const promptText = String(promptValue || "").trim();
  const exampleNames = ["Northline Goods", "SignalDesk", "Hearthline Studio", "Canyon Trail Coffee", "Paws on Wheels"];
  const unrelatedExample = exampleNames.some((name) => name.toLowerCase() !== String(activeBrand.name || "").toLowerCase() && promptText.toLowerCase().includes(name.toLowerCase()));
  const promptAddsTechnology = /\b(ai startup|modern saas|software logo|technology startup|saas logo)\b/i.test(promptText) && !/\b(avoid|no|not|without)\b[^.]{0,120}\b(ai|software|technology|saas)\b/i.test(promptText);
  const workspaceSupportsTechnology = /software|saas|creator|invoice|sponsorship|platform|app|technology/i.test(`${activeBrand.description || ""} ${plan.workspaceContext?.industry || ""} ${plan.logoContext?.industry || ""}`);
  const categoryConflict = !workspaceSupportsTechnology && (/\b(ai startup|modern saas|software|technology)\b/i.test(`${category} ${style}`) || promptAddsTechnology);

  return {
    activeWorkspace: true,
    brandId: activeBrand.id,
    brandName: activeBrand.name || brandNameValue || "",
    business: activeBrand.description || plan.brandSummary || "",
    category,
    audience: activeBrand.audience || plan.targetAudience || "",
    positioning: activeBrand.differentiator || plan.positioning || plan.brandThesis || "",
    voice: activeBrand.tone || plan.brandVoice || "",
    personality: plan.brandPersonality || activeBrand.style || activeBrand.tone || "",
    palette,
    colors,
    typography: typography.wordmark ? `${typography.wordmark} plus ${typography.supporting}` : `${typography.headline} plus ${typography.supporting}`,
    markType: recommendations.markType.join(", "),
    brandFeel: recommendations.brandFeel.join(", "),
    useCases: recommendations.useCases.join(", "),
    qualityTargets: recommendations.qualityTargets.join(", "),
    symbol,
    avoid,
    prompt: promptText,
    validationIssues: [
      activeBrand.name ? "" : "Active workspace is missing a brand name.",
      categoryConflict ? "Category conflicts with the active workspace. Restore from Brand Strategy before generating." : "",
      unrelatedExample ? "The brief contains another example brand. Restore from Brand Strategy before generating." : "",
      category ? "" : "Category needs confirmation.",
      colors ? "" : "Palette needs confirmation.",
      symbol ? "" : "Symbol direction needs confirmation.",
    ].filter(Boolean),
    parsedLogo: {
      brandName: activeBrand.name || brandNameValue || "",
      industry: category || "Category needs confirmation",
      style,
      colors,
      symbol,
      mood: [recommendations.brandFeel.join(", "), activeBrand.tone || plan.brandPersonality].filter(Boolean).join(", ") || "brand strategy-led",
      typography: typography.wordmark ? `${typography.wordmark} plus ${typography.supporting}` : `${typography.headline} plus ${typography.supporting}`,
      layout: recommendations.markType.join(", "),
      avoid,
      interpretation: { summary: "Structured Brand Workspace context is the source of truth for this logo brief." },
      originalPrompt: promptText,
      isRefinement: isLogoRefinementPrompt(promptText),
      isNewBrandRequest: false,
      promptBrandName: "",
      extractionConfidence: { brandName: "workspace", industry: "workspace", style: "workspace", symbol: "workspace", colors: "workspace" },
    },
  };
}

function buildLogoContextValidationIssues(context = {}) {
  return Array.isArray(context.validationIssues) ? context.validationIssues : [];
}


function createMiniBrandAssetSvg({ brandName = "Brand", initials = "BT", primary = "#111111", accent = "#111111", paper = "#f5f5f5", variant = "avatar" }) {
  const safeBrand = escapeSvgText(brandName || "Brand");
  const safeInitials = escapeSvgText(initials || "BT");
  const isMono = variant === "mono";
  const background = isMono ? "#ffffff" : primary;
  const foreground = isMono ? "#111111" : "#ffffff";
  const line = isMono ? "#111111" : accent;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <rect width="900" height="900" rx="${variant === "avatar" ? 450 : 0}" fill="${variant === "avatar" ? background : paper}"/>
  <g transform="translate(450 386)">
    <circle r="150" fill="${variant === "avatar" ? "#ffffff" : "transparent"}" fill-opacity="${variant === "avatar" ? ".08" : "0"}" stroke="${line}" stroke-width="18"/>
    <text x="0" y="32" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="120" font-weight="850" fill="${foreground}" letter-spacing="-2">${safeInitials}</text>
  </g>
  <text x="450" y="660" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="52" font-weight="820" fill="${variant === "avatar" ? foreground : primary}" letter-spacing="-1">${safeBrand}</text>
</svg>`.trim();

  return createDataUriFromSvg(svg);
}

function buildLightweightBrandKit({ parsedLogo = {}, logoEditor = {}, logoCreativeBrief = {}, logoImage = "", activeBrand = null, workspacePlan = {} }) {
  const brandName = activeBrand?.name || parsedLogo.brandName || logoCreativeBrief?.brandName || "Brand";
  const initials = getInitialsFromBrandName(brandName);
  const workspacePalette = activeBrand ? getIdentityPalette(activeBrand, workspacePlan) : [];
  const palette = workspacePalette.length
    ? {
        primary: workspacePalette.slice(0, 3).map((color) => color.hex),
        secondary: workspacePalette.slice(2, 4).map((color) => color.hex),
      }
    : getPaletteFromLogoContext(parsedLogo, logoEditor, logoCreativeBrief);
  const typography = activeBrand ? getIdentityTypography(activeBrand, workspacePlan) : getTypographyPairing(parsedLogo);
  const primary = palette.primary[0] || "#111111";
  const accent = palette.primary[1] || "#111111";
  const paper = palette.secondary[0] || "#f5f5f5";
  const firstConcept = logoCreativeBrief?.concepts?.[0] || {};

  return {
    brandName,
    initials,
    primaryColors: palette.primary,
    secondaryColors: palette.secondary,
    typography,
    styleDirection: activeBrand
      ? workspacePlan.visualIdentityDirection || workspacePlan.moodboardDirection || activeBrand.logoDirection || activeBrand.style || "Identity direction from the active Brand Workspace."
      : firstConcept.whyFits || logoCreativeBrief?.visualTerritory || `${parsedLogo.style || "Clean modern"} identity for ${parsedLogo.industry || "a modern brand"}.`,
    logoUsage: [
      "Website header",
      "Social profile",
      "Email signature",
    ],
    socialAvatar: createMiniBrandAssetSvg({ brandName, initials, primary, accent, paper, variant: "avatar" }),
    monochrome: createMiniBrandAssetSvg({ brandName, initials, primary, accent, paper: "#ffffff", variant: "mono" }),
    sourceLogo: logoImage,
  };
}

function classifyLogoRefinement(instruction = "") {
  const text = String(instruction || "").toLowerCase();
  const areas = [];

  if (/(luxury|premium|expensive|elevated|high-end|editorial|timeless|luxury hotel|yc startup|less tech bro)/.test(text)) areas.push("positioning");
  if (/(simple|simplify|minimal|less busy|cleaner|reduce|remove clutter|quiet|restrained)/.test(text)) areas.push("simplification");
  if (/(monogram|initial|lettermark|typography|font|type|wordmark|serif|sans|bolder)/.test(text)) areas.push("typography");
  if (/(icon|symbol|mascot|mark|remove the icon|no icon|different icon|icon restraint)/.test(text)) areas.push("symbol");
  if (/(color|colour|blue|green|cream|gold|black|white|soft|softer|palette)/.test(text)) areas.push("palette");
  if (/(layout|spacing|balance|center|badge|emblem|horizontal|vertical|negative space)/.test(text)) areas.push("layout");
  if (/(yc|startup|saas|tech|modern|corporate|playful|calm|aggressive|less corporate|less tech bro)/.test(text)) areas.push("style");

  return [...new Set(areas)].slice(0, 4);
}

function buildLogoRefinementMemory({
  existingMemory = {},
  currentDirection = {},
  instruction = "",
  parsedLogo = {},
}) {
  const cleanInstruction = String(instruction || "").trim();
  const changedAreas = classifyLogoRefinement(cleanInstruction);
  const interpretation = interpretLogoLanguage(cleanInstruction);
  const currentHistory = Array.isArray(existingMemory.refinementHistory) ? existingMemory.refinementHistory : [];
  const refinedDirection = {
    ...currentDirection,
    brandName: parsedLogo.brandName || currentDirection.brandName || "",
    industry: parsedLogo.industry || currentDirection.industry || "",
  };

  return {
    ...(existingMemory || {}),
    lastSuccessfulDirection: refinedDirection,
    continuityIntent: cleanInstruction,
    refinementMode: "designer-iteration",
    refinementInstruction: cleanInstruction,
    interpretedDesignDirection: interpretation.summary,
    designDirectives: interpretation.directives,
    changedAreas,
    preserveAreas: ["brandName", "industry", "successful typography", "successful palette", "successful layout", "brand personality"]
      .filter((area) => !changedAreas.some((changed) => area.toLowerCase().includes(changed))),
    refinementHistory: [
      {
        instruction: cleanInstruction,
        changedAreas,
        preservedDirection: refinedDirection,
        createdAt: new Date().toISOString(),
      },
      ...currentHistory,
    ].slice(0, 8),
    updatedAt: new Date().toISOString(),
  };
}

function shouldPreserveLogoGenerationMemory({ parsedLogo = {}, memory = {}, explicitMemoryProvided = false }) {
  if (!parsedLogo || parsedLogo.isNewBrandRequest) return false;
  if (parsedLogo.isRefinement || explicitMemoryProvided) {
    const memoryBrand = memory?.lastSuccessfulDirection?.brandName || memory?.brandName || "";
    const memoryIndustry = memory?.lastSuccessfulDirection?.industry || memory?.industry || "";
    if (memoryBrand && parsedLogo.brandName && isDifferentLogoIdentity(parsedLogo.brandName, memoryBrand)) return false;
    if (memoryIndustry && parsedLogo.industry && memoryIndustry !== parsedLogo.industry && !parsedLogo.isRefinement) return false;
    return true;
  }

  return false;
}

function buildAuthoritativeLogoContext({
  promptValue = "",
  brandNameValue = "",
  styleValue = "",
  industryValue = "",
  symbolValue = "",
  colorsValue = "",
  avoidValue = "",
  activeBrand = null,
  memory = {},
  explicitMemoryProvided = false,
}) {
  const structuredContext = getStructuredLogoContext({ activeBrand, promptValue, brandNameValue, styleValue, industryValue, symbolValue, colorsValue, avoidValue });
  const promptBrandName = activeBrand ? "" : extractBrandNameFromPrompt(promptValue);
  const hasPromptBrand = Boolean(promptBrandName);
  const parsedLogo = structuredContext.parsedLogo;
  const preserveMemory = shouldPreserveLogoGenerationMemory({ parsedLogo, memory, explicitMemoryProvided });

  return {
    structuredContext,
    parsedLogo,
    generationMemory: preserveMemory ? memory || {} : {},
    shouldUseWorkspaceContext: Boolean(activeBrand),
    resetReason: preserveMemory ? "" : "fresh-current-prompt",
  };
}

function getRefinementStateLabel(memory = {}) {
  const history = Array.isArray(memory.refinementHistory) ? memory.refinementHistory : [];
  if (!history.length) return "Ready for designer-style refinements";
  const latest = history[0];
  const area = latest.changedAreas?.length ? latest.changedAreas.join(", ") : "selected details";
  return `Refining ${area} while preserving the brand direction`;
}

const LOGO_PROJECT_MARKER = "BRANDTHAT_LOGO_PROJECT:";
const SAVED_ASSET_META_MARKER = "BRANDTHAT_ASSET_META:";

function encodeJsonForContent(value) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(value))));
  } catch {
    return "";
  }
}

function decodeJsonFromContent(value) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value))));
  } catch {
    return null;
  }
}

function encodeLogoProjectContent(content = "", project = null) {
  const encoded = project ? encodeJsonForContent(project) : "";
  const cleanContent = stripLogoProjectMetadata(content);
  return encoded ? `${cleanContent}\n\n<!--${LOGO_PROJECT_MARKER}${encoded}-->` : cleanContent;
}

function decodeLogoProjectFromContent(content = "") {
  const match = String(content || "").match(/<!--BRANDTHAT_LOGO_PROJECT:([A-Za-z0-9+/=]+)-->/);
  return match ? decodeJsonFromContent(match[1]) : null;
}

function stripLogoProjectMetadata(content = "") {
  return String(content || "").replace(/\n?\s*<!--BRANDTHAT_LOGO_PROJECT:[A-Za-z0-9+/=]+-->\s*/g, "").trim();
}

function encodeSavedAssetContent(content = "", metadata = {}) {
  const cleanContent = stripSavedAssetMetadata(stripLogoProjectMetadata(content));
  const encoded = encodeJsonForContent(metadata);
  return encoded ? `${cleanContent}\n\n<!--${SAVED_ASSET_META_MARKER}${encoded}-->` : cleanContent;
}

function decodeSavedAssetMetadata(content = "") {
  const match = String(content || "").match(/<!--BRANDTHAT_ASSET_META:([A-Za-z0-9+/=]+)-->/);
  return match ? decodeJsonFromContent(match[1]) : null;
}

function stripSavedAssetMetadata(content = "") {
  return String(content || "").replace(/\n?\s*<!--BRANDTHAT_ASSET_META:[A-Za-z0-9+/=]+-->\s*/g, "").trim();
}

function stripAllAssetMetadata(content = "") {
  return stripSavedAssetMetadata(stripLogoProjectMetadata(content));
}

function getLogoProjectFromEntry(entry = {}) {
  if (!entry) return {};
  const decodedProject = entry.project || decodeLogoProjectFromContent(entry.content);
  return {
    ...(decodedProject || {}),
    source: decodedProject?.source || entry.source || "",
    vectorImage: decodedProject?.vectorImage || entry.vectorImage || entry.image || "",
    svg: decodedProject?.svg || entry.svg || "",
    transparentSvg: decodedProject?.transparentSvg || entry.transparentSvg || entry.svg || "",
    variations: decodedProject?.variations || entry.variations || [],
    creativeBrief: decodedProject?.creativeBrief || entry.creativeBrief || null,
    generationMemory: decodedProject?.generationMemory || entry.generationMemory || {},
    prompt: decodedProject?.prompt || entry.prompt || "",
    brandName: decodedProject?.brandName || entry.brandName || entry.title || "",
    style: decodedProject?.style || entry.style || "",
    industry: decodedProject?.industry || entry.industry || "",
    symbol: decodedProject?.symbol || entry.symbol || "",
    colors: decodedProject?.colors || entry.colors || "",
    avoid: decodedProject?.avoid || entry.avoid || "",
  };
}

function getLogoTimelineNote(entry = {}) {
  const project = getLogoProjectFromEntry(entry);
  const history = Array.isArray(project.generationMemory?.refinementHistory) ? project.generationMemory.refinementHistory : [];
  if (history[0]?.instruction) return `Latest refinement: ${history[0].instruction}`;
  if (project.prompt) return project.prompt;
  return "Saved logo concept";
}

function stableStringHash(value = "") {
  let hash = 2166136261;
  const input = String(value);
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function createClientFallbackLogo({ brandName = "", logoStyle = "", logoIndustry = "", logoColors = "", userPrompt = "" }) {
  const displayName = escapeSvgText(brandName || "Brandthat");
  const initials = escapeSvgText(getInitialsFromBrandName(brandName || userPrompt || "Brandthat"));
  const descriptor = escapeSvgText([logoIndustry, logoStyle].filter(Boolean).join(" ").slice(0, 34) || "Brand identity");
  const requestedColors = String(logoColors || "").toLowerCase();
  const dark = requestedColors.includes("blue") ? "#0d1b2a" : requestedColors.includes("green") ? "#10281f" : "#111111";
  const accent = requestedColors.includes("gold") ? "#111111" : requestedColors.includes("red") ? "#9f2d2d" : requestedColors.includes("blue") ? "#4c6fff" : "#111111";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1400" viewBox="0 0 1400 1400">
  <rect width="1400" height="1400" fill="#f5f5f5"/>
  <g transform="translate(700 462)">
    <path d="M0 -142 C82 -142 142 -82 142 0 C142 82 82 142 0 142 C-82 142 -142 82 -142 0 C-142 -82 -82 -142 0 -142 Z" fill="${dark}"/>
    <path d="M-72 0 C-36 -68 36 -68 72 0 C36 68 -36 68 -72 0 Z" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="0" y="30" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="90" font-weight="850" fill="#ffffff" letter-spacing="1">${initials}</text>
  </g>
  <text x="700" y="760" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="92" font-weight="850" fill="${dark}" letter-spacing="-2">${displayName}</text>
  <line x1="560" y1="820" x2="840" y2="820" stroke="${accent}" stroke-width="7" stroke-linecap="round"/>
  <text x="700" y="888" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="750" fill="#777067" letter-spacing="7">${descriptor.toUpperCase()}</text>
</svg>`.trim();

  const transparentSvg = svg.replace('<rect width="1400" height="1400" fill="#f5f5f5"/>', '<rect width="1400" height="1400" fill="transparent"/>');
  const image = createDataUriFromSvg(svg);

  return {
    image,
    source: "instant-svg",
    vectorImage: image,
    svg,
    transparentSvg,
    variations: [{ id: "client-fallback-primary", name: "Instant Vector", image, svg }],
    creativeBrief: {
      summary: "Instant fallback logo created from the user's brand name, style, and prompt because the hosted image service was unavailable.",
      concepts: [],
    },
    generationMemory: null,
    layers: [],
    note: "Brandthat created an instant editable vector logo because the hosted image service was unavailable.",
  };
}

function buildLogoFallbackOption(fallback = {}, requestPayload = {}, error = {}) {
  const fallbackLogo = fallback?.image ? fallback : createClientFallbackLogo(requestPayload);
  const firstVariation = Array.isArray(fallbackLogo.variations) && fallbackLogo.variations.length
    ? fallbackLogo.variations[0]
    : { id: "instant-vector-primary", name: "Instant Vector", image: fallbackLogo.image, svg: fallbackLogo.svg };
  const stableSeed = [
    requestPayload.brandName,
    requestPayload.logoIndustry,
    requestPayload.logoStyle,
    firstVariation?.name,
    fallbackLogo.image || fallbackLogo.svg,
  ].filter(Boolean).join("|");

  return {
    ...fallbackLogo,
    id: `instant-vector-${stableStringHash(stableSeed || "brandthat-logo-fallback")}`,
    name: firstVariation?.name || fallbackLogo.name || "Instant Vector",
    type: "instant-vector",
    image: fallbackLogo.image || firstVariation?.image || firstVariation?.svg || "",
    vectorImage: fallbackLogo.vectorImage || fallbackLogo.image || firstVariation?.image || firstVariation?.svg || "",
    svg: fallbackLogo.svg || firstVariation?.svg || "",
    transparentSvg: fallbackLogo.transparentSvg || fallbackLogo.svg || firstVariation?.svg || "",
    variations: [{ ...firstVariation, name: firstVariation?.name || "Instant Vector" }],
    previewData: {
      image: fallbackLogo.image || firstVariation?.image || firstVariation?.svg || "",
      source: "instant-svg",
    },
    workspaceContext: requestPayload.structuredLogo || requestPayload.brandStrategy || {},
    palette: requestPayload.logoColors || fallbackLogo.creativeBrief?.palette || "",
    typography: requestPayload.parsedLogo?.typography || fallbackLogo.creativeBrief?.typography || "",
    saveBehavior: "Save Logo Concept",
    setPrimaryBehavior: "Set as Primary Logo",
    errorCode: error?.code || fallback?.providerError?.code || "LOGO_IMAGE_UNAVAILABLE",
    requestId: error?.requestId || fallback?.requestId || "",
    note: fallbackLogo.note || "Instant editable vector fallback is available if you choose to use it.",
  };
}

function trackBrandthatEvent(name, properties = {}) {
  try {
    const event = {
      name,
      properties,
      createdAt: new Date().toISOString(),
    };
    const existing = safeParse("brandthat_analytics_events", []);
    localStorage.setItem("brandthat_analytics_events", JSON.stringify([event, ...existing].slice(0, 100)));

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...properties });

    if (typeof window.gtag === "function") {
      window.gtag("event", name, properties);
    }
  } catch {
    // Analytics should never block product actions.
  }
}

function getAssetFileName(name = "brandthat-logo", image = "") {
  const extension = image.startsWith("data:image/svg") ? "svg" : "png";
  const cleanName = String(name || "brandthat-logo")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${cleanName || "brandthat-logo"}.${extension}`;
}

async function getImageObjectUrl(image = "", forceFetch = false) {
  if (!image) return "";

  if (image.startsWith("data:") || forceFetch) {
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch {
      return image;
    }
  }

  return image;
}

async function openGeneratedImage(image = "") {
  const url = await getImageObjectUrl(image, true);
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
  trackBrandthatEvent("logo_opened_full_size");
}

async function downloadGeneratedImage(image = "", name = "brandthat-logo") {
  const url = await getImageObjectUrl(image, true);
  if (!url) return;

  const link = document.createElement("a");
  link.href = url;
  link.download = getAssetFileName(name, image);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (url.startsWith("blob:")) {
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  trackBrandthatEvent("logo_downloaded", { name });
}

function decodeSvgDataUrl(svgData = "") {
  if (!svgData.startsWith("data:image/svg")) return "";
  const encoded = svgData.split(",")[1] || "";
  try {
    return atob(encoded);
  } catch {
    try {
      return decodeURIComponent(encoded);
    } catch {
      return "";
    }
  }
}

function encodeSvgDataUrl(svg = "") {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

function applyLogoEditor(svgData = "", editor = {}) {
  const svg = decodeSvgDataUrl(svgData);
  if (!svg) return svgData;

  return encodeSvgDataUrl(
    svg
      .replace(/--logo-ink:[^;"]+/g, `--logo-ink:${editor.ink || "#111111"}`)
      .replace(/--logo-paper:[^;"]+/g, `--logo-paper:${editor.paper || "#f5f5f5"}`)
      .replace(/--logo-accent:[^;"]+/g, `--logo-accent:${editor.accent || "#111111"}`)
      .replace(/font-family="[^"]+"/g, `font-family="${editor.font || "Inter, Arial, Helvetica, sans-serif"}"`)
  );
}

async function downloadTransparentPng(svgData = "", name = "brandthat-logo") {
  const svg = decodeSvgDataUrl(svgData);
  if (!svg) return downloadGeneratedImage(svgData, name);

  const transparentSvg = svg.replace(/<rect data-layer="background"[^>]*\/>\s*/g, "");
  const imageUrl = encodeSvgDataUrl(transparentSvg);
  const image = new Image();

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
    image.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const url = canvas.toDataURL("image/png");
  await downloadGeneratedImage(url, `${name}-transparent`);
}

function splitUserList(value = "", limit = 5) {
  return String(value || "")
    .split(/,|\n/)
    .map(cleanGeneratedText)
    .filter(Boolean)
    .slice(0, limit);
}

function escapeHtml(value = "") {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inferBrandArchetype(plan = {}, brand = {}) {
  const text = `${plan.brandThesis || ""} ${plan.positioning || ""} ${plan.brandPersonality || ""} ${brand.tone || ""}`.toLowerCase();
  if (/luxury|premium|craft|heritage|quality|elevated/.test(text)) return "The Tastemaker";
  if (/rebel|challenger|bold|different|disrupt/.test(text)) return "The Challenger";
  if (/care|wellness|calm|support|comfort|nurtur/.test(text)) return "The Caretaker";
  if (/teach|guide|expert|authority|educat/.test(text)) return "The Guide";
  if (/community|local|belong|culture|social/.test(text)) return "The Connector";
  return "The Builder";
}

function getBrandDNA(plan = {}, brand = {}) {
  const dna = plan.brandDNA || brand.brandDNA || {};
  const brandName = cleanGeneratedText(plan.brandName || brand.name) || "this brand";
  const positioning = cleanGeneratedText(dna.positioning || plan.positioning || brand.differentiator);
  const visualDirection = cleanGeneratedText(dna.visualDirection || plan.moodboardDirection || plan.visualIdentityDirection || brand.style || brand.logoDirection);

  return {
    audience: cleanGeneratedText(dna.audience || plan.targetAudience || brand.audience) || `The specific buyer most likely to feel ${brandName} solves an immediate emotional or practical problem.`,
    positioning: positioning || `${brandName} should be positioned around a clear, ownable reason to choose it over generic alternatives.`,
    personality: cleanGeneratedText(dna.personality || plan.brandPersonality || brand.tone) || "Focused, useful, confident, and modern.",
    archetype: cleanGeneratedText(dna.archetype) || inferBrandArchetype(plan, brand),
    tone: cleanGeneratedText(dna.tone || plan.brandVoice || brand.tone) || "Clear, specific, warm, and decisive.",
    visualDirection: visualDirection || "A restrained identity system that turns the core idea into recognizable visual cues.",
    colors: cleanGeneratedText(dna.colors || plan.colorSystem) || "One dark anchor, one warm neutral, and one memorable accent color tied to the category emotion.",
    typographyDirection: cleanGeneratedText(dna.typographyDirection || plan.typographySystem) || "A confident headline face paired with a readable supporting sans for digital and launch materials.",
    keyDifferentiators: Array.isArray(dna.keyDifferentiators) && dna.keyDifferentiators.length
      ? dna.keyDifferentiators.map(cleanGeneratedText).filter(Boolean).slice(0, 5)
      : splitUserList(plan.competitiveDifferentiation || brand.differentiator || plan.coreOpportunity, 3),
    customerEmotions: Array.isArray(dna.customerEmotions) && dna.customerEmotions.length
      ? dna.customerEmotions.map(cleanGeneratedText).filter(Boolean).slice(0, 5)
      : ["clarity", "confidence", "trust"],
    businessGoals: Array.isArray(dna.businessGoals) && dna.businessGoals.length
      ? dna.businessGoals.map(cleanGeneratedText).filter(Boolean).slice(0, 5)
      : splitUserList(brand.businessGoal || brand.launchGoal || plan.workspaceContext?.roadmapGoal || "Launch with a sharper offer and visible proof.", 3),
  };
}

function getWhyThisWorks(plan = {}, brand = {}) {
  const dna = getBrandDNA(plan, brand);
  const brandName = cleanGeneratedText(plan.brandName || brand.name) || "the brand";

  return {
    positioning: cleanGeneratedText(plan.whyThisWorks?.positioning) || `This gives ${brandName} a decision customers can remember instead of a broad category claim.`,
    audience: cleanGeneratedText(plan.whyThisWorks?.audience) || `The audience is narrow enough to shape messaging, offers, and launch channels around a real buying trigger.`,
    colors: cleanGeneratedText(plan.whyThisWorks?.colors) || `The palette supports the emotional job of ${dna.customerEmotions.slice(0, 2).join(" and ")} while staying simple enough to apply across social, web, and packaging.`,
    typography: cleanGeneratedText(plan.whyThisWorks?.typography) || `The type direction balances memorability with readability, so the brand can feel distinct without becoming hard to use.`,
    messaging: cleanGeneratedText(plan.whyThisWorks?.messaging) || `The message connects the buyer's desire to the brand's differentiator, which makes content and conversion copy easier to repeat.`,
    launch: cleanGeneratedText(plan.whyThisWorks?.launch) || `The launch sequence prioritizes proof, repeatable content, and one clear next action before spreading across too many channels.`,
  };
}

function getCustomerPsychology(plan = {}, payload = {}) {
  const brandName = cleanGeneratedText(plan.brandName || payload.brandName) || "the brand";
  const audience = cleanGeneratedText(plan.targetAudience || payload.audience) || "the target customer";
  return {
    desires: Array.isArray(plan.customerPsychology?.desires) ? plan.customerPsychology.desires.map(cleanGeneratedText).filter(Boolean).slice(0, 5) : [`Feel that ${brandName} was made for their taste, timing, and standards.`, "Make a smarter choice without over-researching.", "Buy into an identity they are proud to show."],
    fears: Array.isArray(plan.customerPsychology?.fears) ? plan.customerPsychology.fears.map(cleanGeneratedText).filter(Boolean).slice(0, 5) : ["Wasting money on another forgettable option.", "Choosing something that looks good but does not fit their real life.", "Being sold a polished promise with no follow-through."],
    objections: Array.isArray(plan.customerPsychology?.objections) ? plan.customerPsychology.objections.map(cleanGeneratedText).filter(Boolean).slice(0, 5) : [`Why should I choose ${brandName} instead of the familiar alternative?`, "Is this actually worth the price?", "Will this feel relevant after the first impression?"],
    buyingTriggers: Array.isArray(plan.customerPsychology?.buyingTriggers) ? plan.customerPsychology.buyingTriggers.map(cleanGeneratedText).filter(Boolean).slice(0, 5) : ["A clear before-and-after promise.", "Visible proof from the founder, product, or customer experience.", "A timely launch offer or reason to act now."],
    emotionalMotivations: Array.isArray(plan.customerPsychology?.emotionalMotivations) ? plan.customerPsychology.emotionalMotivations.map(cleanGeneratedText).filter(Boolean).slice(0, 5) : ["confidence", "belonging", "momentum"],
    identityTheyWant: cleanGeneratedText(plan.customerPsychology?.identityTheyWant) || `${audience} wants to feel more discerning, capable, and ahead of the obvious choice.`,
    choiceReason: cleanGeneratedText(plan.customerPsychology?.choiceReason) || `They choose ${brandName} when the brand makes the strongest promise feel specific, believable, and easy to act on.`,
  };
}

function getRealityCheck(plan = {}, payload = {}) {
  const brandName = cleanGeneratedText(plan.brandName || payload.brandName) || "this brand";
  const opportunity = cleanGeneratedText(plan.coreOpportunity) || "the core opportunity";
  return {
    biggestRisk: cleanGeneratedText(plan.realityCheck?.biggestRisk) || `${brandName} could sound polished but interchangeable if the launch does not prove ${opportunity}.`,
    weakestAssumption: cleanGeneratedText(plan.realityCheck?.weakestAssumption) || "The first audience segment will understand the offer quickly enough to take action.",
    biggestOpportunity: cleanGeneratedText(plan.realityCheck?.biggestOpportunity) || `Own one sharp point of view around ${opportunity} before competitors notice the angle.`,
    whatCouldKillThisIdea: cleanGeneratedText(plan.realityCheck?.whatCouldKillThisIdea) || "Trying to launch on every platform before the offer, proof, and voice are repeatable.",
    whatWouldMakeThisStandOut: cleanGeneratedText(plan.realityCheck?.whatWouldMakeThisStandOut) || "A distinctive proof system: founder story, product ritual, customer transformation, or visual world that competitors cannot copy quickly.",
    whatIWouldDoFirst: cleanGeneratedText(plan.realityCheck?.whatIWouldDoFirst) || "Create one landing page, one lead capture offer, and seven pieces of content that test the clearest positioning angle.",
  };
}

function getCompetitorPositioning(plan = {}, brand = {}) {
  const supplied = splitUserList(brand.competitors || plan.competitorCategory || "", 5);
  if (Array.isArray(plan.competitorPositioning) && plan.competitorPositioning.length) return plan.competitorPositioning;
  if (!supplied.length) {
    return [{
      name: "Category alternatives",
      positioning: "Needs verification",
      tone: "Unknown until reviewed",
      visualStyle: "Unknown until reviewed",
      pricingPerception: "Unknown until reviewed",
      strengths: "Existing familiarity or category default behavior.",
      weaknesses: "Likely vulnerable if BrandThat's plan creates a sharper reason to choose.",
      opportunity: cleanGeneratedText(plan.competitiveDifferentiation) || "Define the specific promise competitors are not making clearly.",
    }];
  }
  return supplied.map((name) => ({
    name,
    positioning: "Needs verification",
    tone: "Needs verification",
    visualStyle: "Needs verification",
    pricingPerception: "Needs verification",
    strengths: `${name} is a reference point the user already respects, so compare against its perceived standard without inventing private facts.`,
    weaknesses: "Needs direct review before making factual claims.",
    opportunity: `Differentiate by making ${brand.name || plan.brandName || "the brand"} more specific to ${cleanGeneratedText(plan.targetAudience || brand.audience || "the chosen audience")}.`,
  }));
}

function getPositioningScorecard(plan = {}, brand = {}) {
  const text = `${plan.brandThesis || ""} ${plan.positioning || ""} ${plan.targetAudience || ""} ${plan.competitiveDifferentiation || ""}`;
  const lengthScore = Math.min(18, Math.floor(text.length / 35));
  const hasAudience = cleanGeneratedText(plan.targetAudience || brand.audience) ? 12 : 0;
  const hasDifferentiator = cleanGeneratedText(plan.competitiveDifferentiation || brand.differentiator) ? 12 : 0;
  const base = 58 + lengthScore + hasAudience + hasDifferentiator;
  const clamp = (value) => Math.max(45, Math.min(96, value));
  const scores = plan.positioningScorecard?.scores || {};
  const normalized = {
    Clarity: clamp(scores.Clarity || base),
    Differentiation: clamp(scores.Differentiation || base - 4),
    Memorability: clamp(scores.Memorability || base - 6),
    Credibility: clamp(scores.Credibility || base - 2),
    "Emotional Appeal": clamp(scores["Emotional Appeal"] || base - 1),
    "Visual Consistency": clamp(scores["Visual Consistency"] || base - 5),
    "Market Fit": clamp(scores["Market Fit"] || base - 3),
  };
  const overall = Math.round(Object.values(normalized).reduce((sum, score) => sum + score, 0) / Object.values(normalized).length);
  return {
    overall: plan.positioningScorecard?.overall || overall,
    scores: normalized,
    improvements: Array.isArray(plan.positioningScorecard?.improvements) && plan.positioningScorecard.improvements.length
      ? plan.positioningScorecard.improvements.map(cleanGeneratedText).filter(Boolean).slice(0, 2)
      : ["Make the differentiator more concrete by naming the exact tradeoff customers are frustrated by.", "Add one proof mechanism that makes the positioning believable on the homepage and social profiles."],
  };
}

function scoreBrandName(name = "") {
  const cleanName = cleanGeneratedText(name);
  const length = cleanName.replace(/\s/g, "").length;
  const wordCount = cleanName.split(/\s+/).filter(Boolean).length;
  const hasHardToSay = /[^a-z0-9&'.\-\s]/i.test(cleanName) || /(.)\1\1/.test(cleanName.toLowerCase());
  const memorability = Math.max(55, Math.min(96, 92 - Math.abs(length - 9) * 3 - Math.max(0, wordCount - 2) * 8));
  const pronunciation = hasHardToSay ? 62 : Math.max(64, Math.min(96, 94 - Math.max(0, wordCount - 2) * 6));
  const distinctiveness = Math.max(50, Math.min(94, 68 + Math.min(18, length) + (/[&'.-]/.test(cleanName) ? 4 : 0)));
  const premiumFeel = Math.max(52, Math.min(94, 76 + (/studio|house|supply|method|atelier|club|co\b/i.test(cleanName) ? 6 : 0) - (wordCount > 3 ? 10 : 0)));
  const scalability = Math.max(55, Math.min(96, 88 - (/logo|coffee|skincare|dog|pizza|ai/i.test(cleanName) ? 4 : 0) - Math.max(0, wordCount - 3) * 6));
  const domainFriendliness = Math.max(48, Math.min(95, 92 - Math.max(0, length - 14) * 3 - (/[&'.\s]/.test(cleanName) ? 8 : 0)));
  const scores = {
    Memorability: memorability,
    Pronunciation: pronunciation,
    Distinctiveness: distinctiveness,
    "Premium Feel": premiumFeel,
    Scalability: scalability,
    "Domain Friendliness": domainFriendliness,
  };
  const overall = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length);
  return {
    name: cleanName,
    scores,
    overall,
    note: "Trademark and domain availability require separate verification before launch.",
  };
}

function getNamingEvaluations(plan = {}, brand = {}) {
  const names = [
    brand.name,
    plan.brandName,
    ...(Array.isArray(plan.nameIdeas) ? plan.nameIdeas : []),
  ].map(cleanGeneratedText).filter(Boolean);
  return [...new Set(names)].slice(0, 6).map(scoreBrandName);
}

function getExpandedRoadmap(plan = {}, payload = {}) {
  if (Array.isArray(plan.expandedRoadmap) && plan.expandedRoadmap.length) return plan.expandedRoadmap;
  const roadmap = normalizeRoadmapItems(plan.launchRoadmap90Days || plan.launchRoadmap || plan.launchRoadmap30Days);
  const phases = ["First 30 days", "Days 31-60", "Days 61-90"];
  return phases.map((phase, index) => {
    const source = roadmap[index + 1] || roadmap[index] || {};
    return {
      phase,
      priority: index === 0 ? "Validate the sharpest brand angle" : index === 1 ? "Build repeatable demand" : "Convert attention into customers",
      tasks: Array.isArray(source.actions) && source.actions.length ? source.actions.slice(0, 4) : ["Publish focused proof content", "Collect audience feedback", "Refine the offer page", "Review weekly metrics"],
      recommendedTools: index === 0 ? ["Domain registrar", "Carrd/Webflow/Framer", "Google Analytics", "Canva or Figma"] : ["Email platform", "Scheduler", "Analytics dashboard", "Customer feedback form"],
      estimatedCosts: index === 0 ? "$20-$150 depending on domain, landing page, and email tools." : "$0-$300 depending on paid tools, samples, creative, or small tests.",
      kpis: index === 0 ? ["Landing page visits", "Email signups", "Content saves", "Profile clicks"] : index === 1 ? ["Lead conversion rate", "Content reach", "Reply rate", "Qualified inquiries"] : ["First purchases", "Repeat visits", "Referral signals", "Revenue per channel"],
      completionCriteria: cleanGeneratedText(source.outcome) || "The phase has a visible output, measured response, and a clear decision for the next phase.",
      status: source.status || "Not started",
    };
  });
}

function getLaunchChecklist(plan = {}, brand = {}) {
  const existing = Array.isArray(brand.launchChecklist) && brand.launchChecklist.length ? brand.launchChecklist : plan.launchChecklist;
  if (Array.isArray(existing) && existing.length) return existing;
  return [
    "Secure domain",
    "Claim social handles",
    "Create business email",
    "Publish landing page",
    "Set up payment or inquiry path",
    "Create primary social profiles",
    "Install basic analytics",
    "Review basic legal setup",
    "Prepare launch content",
    "Define first customer acquisition plan",
    "Set feedback collection loop",
  ].map((label) => ({ label, complete: false, why: `${label} turns the brand plan into a launchable business asset.` }));
}

function getRevenuePlan(plan = {}, brand = {}) {
  const monthlyGoal = Number(String(brand.monthlyRevenueGoal || plan.revenuePlan?.monthlyGoal || "").replace(/[^0-9.]/g, ""));
  const averagePrice = Number(String(brand.averagePrice || plan.revenuePlan?.averagePrice || "").replace(/[^0-9.]/g, ""));
  const salesNeeded = monthlyGoal && averagePrice ? Math.ceil(monthlyGoal / averagePrice) : null;
  return {
    monthlyGoal: monthlyGoal || "",
    averagePrice: averagePrice || "",
    salesNeeded,
    assumptions: salesNeeded
      ? [`At $${averagePrice.toLocaleString()} average order value, the brand needs about ${salesNeeded.toLocaleString()} sales per month to reach $${monthlyGoal.toLocaleString()}.`, "Actual results depend on conversion rate, repeat purchase, margins, traffic quality, and offer strength."]
      : ["Enter a monthly revenue goal and average product or service price to estimate the number of customers needed."],
    acquisitionPlan: salesNeeded
      ? [`Create enough launch demand for ${Math.ceil(salesNeeded * 3).toLocaleString()} qualified prospects per month.`, "Use the highest-fit platform plan to create weekly proof, education, and direct offer content.", "Review traffic, signup, inquiry, and conversion metrics every Friday."]
      : ["Set the revenue goal, price, and first acquisition channel before forecasting content volume."],
  };
}

function getCreativeDirectorNotes(plan = {}, brand = {}) {
  return {
    critique: cleanGeneratedText(plan.creativeDirectorNotes?.critique) || "The direction is strongest when it makes one memorable strategic choice and applies it consistently across voice, visuals, and launch behavior.",
    strongestElement: cleanGeneratedText(plan.creativeDirectorNotes?.strongestElement) || cleanGeneratedText(plan.coreOpportunity || brand.differentiator) || "The clearest opportunity is the brand's ability to turn a rough idea into a focused market position.",
    weakestElement: cleanGeneratedText(plan.creativeDirectorNotes?.weakestElement) || "The weakest element is usually proof: the brand still needs one tangible reason for the audience to believe the promise quickly.",
    improvement: cleanGeneratedText(plan.creativeDirectorNotes?.improvement) || "Create one signature proof asset: a founder story, offer demo, customer result, or visual ritual that makes the positioning obvious in ten seconds.",
    userNotes: cleanGeneratedText(brand.creativeDirectorNotes?.userNotes || plan.creativeDirectorNotes?.userNotes) || "",
  };
}

function getBrandImprovementAudit(plan = {}, brand = {}) {
  const name = brand?.name || plan.brandName || "this brand";
  return [
    {
      title: "Sharpen the differentiator",
      reason: "Most early brands lose momentum when the audience cannot repeat why this version exists.",
      apply: { differentiator: plan.positioning || brand.differentiator || `${name} should own one specific customer problem and one memorable reason to believe.` },
    },
    {
      title: "Create one proof asset",
      reason: "A brand feels real faster when the promise has evidence: demo, founder story, customer result, sample, or public build log.",
      apply: { launchGoal: "Create one signature proof asset and publish it across the primary launch channel this week." },
    },
    {
      title: "Reduce platform spread",
      reason: "The first 30 days should test the highest-fit channels before adding more places to maintain.",
      apply: { channels: (plan.platformStrategy || []).slice(0, 2).map((item) => item.platform).join(", ") || brand.channels || "Primary social channel and email" },
    },
    {
      title: "Make the visual system ownable",
      reason: "A strong brand needs a repeatable visual rule, not just a nice palette.",
      apply: { style: plan.moodboardDirection || brand.style || "Define a repeatable moodboard, type, color, and image rule." },
    },
    {
      title: "Turn roadmap into weekly behavior",
      reason: "The plan only creates value when it becomes a visible operating rhythm.",
      apply: { businessGoal: brand.businessGoal || "Complete the first proof asset, landing page, and seven launch posts in the next 14 days." },
    },
  ];
}

function makeOutputMoreSpecific(text = "", brand = {}) {
  const brandName = brand?.name || "the brand";
  return cleanGeneratedText(text)
    .replace(/use social media to build awareness/gi, `publish three proof-led posts per week for ${brandName}, one education post, one founder or behind-the-scenes post, and one direct offer post with profile-click or waitlist signups as the KPI`)
    .replace(/post consistently/gi, "publish on a fixed weekly cadence with named content pillars, a measurable CTA, and a Friday metrics review")
    .replace(/build trust/gi, "show trust through customer proof, founder rationale, process transparency, specific outcomes, and clear objections answered")
    .replace(/use premium typography/gi, "use a high-contrast editorial headline typeface paired with a restrained grotesk because the brand needs polish without sacrificing readability")
    .replace(/use professional colors/gi, "choose one dark anchor, one quiet neutral, and one distinctive accent tied to the buyer's desired emotion");
}

function getOutputQualityIssues(text = "", brand = {}) {
  const cleanText = cleanGeneratedText(text);
  const lower = cleanText.toLowerCase();
  const issues = [];
  const weakPhrases = [
    "post consistently",
    "build trust",
    "increase awareness",
    "use social media",
    "premium feel",
    "professional colors",
    "readable typography",
    "stand out from competitors",
    "engage your audience",
  ];
  const sentences = cleanText.split(/[.!?]\s+/).map((item) => item.trim()).filter(Boolean);
  const repeatedSentences = sentences.length - new Set(sentences.map((item) => item.toLowerCase())).size;
  const brandName = cleanGeneratedText(brand?.name || brand?.brandName || "");
  const hasBrandContext = Boolean(brandName || brand?.audience || brand?.description);

  if (cleanText.length < 180) issues.push("too short");
  if (weakPhrases.some((phrase) => lower.includes(phrase))) issues.push("generic phrasing");
  if (repeatedSentences > 1) issues.push("repetitive");
  if (hasBrandContext && brandName && !lower.includes(brandName.toLowerCase()) && !lower.includes("brand dna")) issues.push("missing brand context");
  if (/undefined|null|\[insert|placeholder|lorem ipsum/i.test(cleanText)) issues.push("placeholder text");

  return [...new Set(issues)];
}

function buildQualityRetryPrompt({ basePrompt = "", firstOutput = "", issues = [], brand = {} } = {}) {
  return `${basePrompt}

Quality control rejected the first draft for: ${issues.join(", ")}.

Rewrite the output once.
Requirements:
- Use the Brand DNA and actual business context.
- Remove generic phrasing and repeated ideas.
- Make every recommendation concrete with channel, cadence, example, KPI, cost, completion criteria, or next action where relevant.
- Include concise "Why this works" reasoning for major recommendations.
- Do not include undefined, null, placeholders, or filler.

Rejected draft:
${cleanGeneratedText(firstOutput)}`;
}

function getDefaultWorkspaceDraft() {
  return {
    name: "",
    logoDirection: "",
    description: "",
    audience: "",
    audiencePain: "",
    offer: "",
    differentiator: "",
    competitors: "",
    channels: "",
    growthPlatform: "",
    currentFollowers: "",
    targetFollowers: "",
    weeklyTime: "",
    logoImage: "",
    tone: "Modern",
    style: "",
    launchGoal: "",
    pricePositioning: "",
    desiredFeeling: "",
    locationMarket: "",
    businessGoal: "",
    monthlyRevenueGoal: "",
    averagePrice: "",
    exampleContext: "",
  };
}

function getVisibleCustomerDraft(draft = {}) {
  const visibleKeys = [
    "name",
    "description",
    "audience",
    "tone",
    "style",
    "industry",
    "locationMarket",
    "growthPlatform",
    "targetFollowers",
    "launchGoal",
    "logoDirection",
  ];
  return visibleKeys.reduce((next, key) => {
    const value = key === "tone" ? draft[key] || "Modern" : cleanGeneratedText(draft[key] || "");
    if (value) next[key] = value;
    return next;
  }, { updatedAt: new Date().toISOString() });
}

function hasVisibleCustomerDraft(draft = {}) {
  return Boolean(cleanGeneratedText(draft.name || "") || cleanGeneratedText(draft.description || ""));
}

function persistVisibleCustomerDraft(draft = {}) {
  if (!hasVisibleCustomerDraft(draft)) return;
  try {
    localStorage.setItem(CUSTOMER_INTENT_DRAFT_KEY, JSON.stringify(getVisibleCustomerDraft(draft)));
  } catch {
    localStorage.removeItem(CUSTOMER_INTENT_DRAFT_KEY);
  }
}

function getInitialWorkspaceDraft() {
  const workspaceDraft = safeParse("brandthat_workspace_draft", null);
  const intentDraft = safeParse(CUSTOMER_INTENT_DRAFT_KEY, null);
  return {
    ...getDefaultWorkspaceDraft(),
    ...(intentDraft && typeof intentDraft === "object" ? intentDraft : {}),
    ...(workspaceDraft && typeof workspaceDraft === "object" ? workspaceDraft : {}),
  };
}

function getBrandReadinessScore(brand) {
  return getBrandCompletion(brand).percent;
}

function getSavedBucketKey(toolKey = "") {
  return toolKey === "logo" ? "logos" : toolKey;
}

function normalizeAssetContent(value = "") {
  return cleanGeneratedText(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function getBrandCompletionChecklist(brand) {
  const plan = brand ? getWorkspacePlan(brand) : {};
  const hasSaved = (key) => Array.isArray(brand?.saved?.[key]) && brand.saved[key].length > 0;
  const hasContentAsset = ["captions", "hooks", "bios", "hashtags", "email", "campaign", "strategy", "growth"].some(hasSaved);
  const hasLogo = hasPrimaryLogo(brand);

  return [
    { key: "basics", completeLabel: "Brand basics complete", missingLabel: "Brand basics missing", complete: Boolean(brand?.name), action: "Review basics", section: "settings" },
    { key: "description", completeLabel: "Description complete", missingLabel: "Description missing", complete: Boolean(String(brand?.description || "").trim()), action: "Review basics", section: "settings" },
    { key: "audience", completeLabel: "Audience complete", missingLabel: "Audience missing", complete: Boolean(plan.targetAudience || brand?.audience), action: "Open Strategy", section: "strategy" },
    { key: "positioning", completeLabel: "Positioning complete", missingLabel: "Positioning missing", complete: Boolean(plan.positioning || brand?.differentiator), action: "Open Strategy", section: "strategy" },
    { key: "voice", completeLabel: "Voice complete", missingLabel: "Voice missing", complete: Boolean(plan.brandVoice || brand?.tone), action: "Open Strategy", section: "strategy" },
    { key: "colors", completeLabel: "Colors complete", missingLabel: "Colors missing", complete: Boolean(plan.colorSystem || brand?.style), action: "Open Identity", section: "identity" },
    { key: "typography", completeLabel: "Typography complete", missingLabel: "Typography missing", complete: Boolean(plan.typographySystem), action: "Open Identity", section: "identity" },
    { key: "logo", completeLabel: "Primary logo set", missingLabel: "Logo missing", complete: hasLogo, action: "Generate Logo Concepts", tool: "logo" },
    { key: "content", completeLabel: "First content asset saved", missingLabel: "First content asset missing", complete: hasContentAsset, action: "Create Content", section: "tools" },
  ];
}

function getPrimaryLogoImage(brand) {
  return cleanGeneratedText(
    brand?.logoImage ||
    brand?.logoImageUrl ||
    brand?.logo_image_url ||
    brand?.primaryLogoImage ||
    brand?.brandLogo ||
    ""
  );
}

function getPrimaryLogoAssetId(brand) {
  return cleanGeneratedText(
    brand?.primaryLogoAssetId ||
    brand?.primary_logo_asset_id ||
    brand?.logoMetadata?.assetId ||
    brand?.logo_metadata?.assetId ||
    ""
  );
}

function hasPrimaryLogo(brand) {
  return Boolean(getPrimaryLogoImage(brand) && getPrimaryLogoAssetId(brand));
}

function mergePrimaryLogoIntoWorkspace(brand, primaryLogoResult = {}, fallbackMetadata = {}) {
  const row = primaryLogoResult.workspace || primaryLogoResult;
  const logoImageUrl = primaryLogoResult.logoImageUrl || row.logo_image_url || row.logoImageUrl || brand?.logoImage || "";
  const primaryLogoAssetId = primaryLogoResult.primaryLogoAssetId || row.primary_logo_asset_id || row.primaryLogoAssetId || brand?.primaryLogoAssetId || "";
  const primaryLogoUpdatedAt = primaryLogoResult.primaryLogoUpdatedAt || row.primary_logo_updated_at || row.primaryLogoUpdatedAt || new Date().toISOString();
  const logoMetadata = primaryLogoResult.logoMetadata || row.logo_metadata || row.logoMetadata || fallbackMetadata || null;

  return {
    ...brand,
    logoImage: logoImageUrl,
    logoImageUrl,
    logo_image_url: logoImageUrl,
    primaryLogoAssetId,
    primary_logo_asset_id: primaryLogoAssetId,
    primaryLogoUpdatedAt,
    primary_logo_updated_at: primaryLogoUpdatedAt,
    logoMetadata,
    logo_metadata: logoMetadata,
  };
}

function getBrandCompletion(brand) {
  const checklist = getBrandCompletionChecklist(brand);
  const completeCount = checklist.filter((item) => item.complete).length;
  return {
    checklist,
    completeCount,
    total: checklist.length,
    percent: checklist.length ? Math.round((completeCount / checklist.length) * 100) : 0,
  };
}

function countSavedAssets(brand) {
  if (!brand?.saved) return 0;
  return Object.values(brand.saved).reduce((total, items) => total + (Array.isArray(items) ? items.length : 0), 0);
}

function getWorkspaceGoalLine(brand) {
  const goal = brand?.targetFollowers || brand?.launchGoal || "";
  const platform = brand?.growthPlatform || brand?.channels || "";

  if (goal && platform) return `${platform} • ${goal}`;
  if (goal) return goal;
  if (platform) return platform;
  return "Goal not set";
}

function getWorkspaceNextStep(brand) {
  if (!brand) return "Create a workspace to keep your logos, content, and growth assets together.";
  if (!hasPrimaryLogo(brand)) return "Generate or set a logo so this workspace has a visual anchor.";
  if (!String(brand.description || "").trim()) return "Add a one-sentence brand description so every tool understands the brand.";
  if (!String(brand.targetFollowers || brand.launchGoal || "").trim()) return "Add one clear growth goal so Brandthat can build better roadmaps.";
  if (countSavedAssets(brand) === 0) return "Save your first logo, caption, hook, hashtag set, or roadmap to start building the kit.";
  return "Keep saving the strongest outputs and export the brand kit when you are ready.";
}

function getWorkspaceSnapshot(brand) {
  return [
    ["Logo", hasPrimaryLogo(brand) ? "Set" : "Needed"],
    ["Saved", `${countSavedAssets(brand)} assets`],
    ["Goal", getWorkspaceGoalLine(brand)],
  ];
}

function getBrandFieldPreview(value = "", fallback = "Not defined yet.") {
  const cleanValue = cleanGeneratedText(value);
  if (!cleanValue) return fallback;
  return cleanValue.split("\n").filter(Boolean).slice(0, 3).join(" ");
}

function getWorkspacePlan(brand) {
  if (brand?.structuredPlan) return normalizeBrandPlan(brand.structuredPlan, { brandName: brand.name, idea: brand.description });

  return normalizeBrandPlan({
    brandName: brand?.name || "",
    brandSummary: brand?.description || "",
    targetAudience: brand?.audience || "",
    positioning: brand?.differentiator || "",
    coreOffer: brand?.offer || "",
    brandPersonality: brand?.tone || "",
    moodboardDirection: brand?.style || "",
    visualIdentityDirection: brand?.logoDirection || "",
    launchRoadmap30Days: brand?.launchGoal || "",
  }, {
    brandName: brand?.name || "",
    idea: `${brand?.description || ""} ${brand?.logoDirection || ""} ${brand?.launchGoal || ""}`,
  });
}

function getBrandRoadmapPreview(brand) {
  const plan = getWorkspacePlan(brand);
  return normalizeRoadmapItems(plan.launchRoadmap30Days).map((item) => {
    const actions = Array.isArray(item.actions) && item.actions.length ? ` — ${item.actions.slice(0, 2).join(" ")}` : "";
    return `${item.week}: ${item.focus}${actions}`;
  });
}

function getBrandNextActions(brand) {
  if (brand?.structuredPlan?.nextStepActionPlan?.length) {
    return brand.structuredPlan.nextStepActionPlan.map(cleanGeneratedText).filter(Boolean).slice(0, 4);
  }

  const base = [];
  if (!hasPrimaryLogo(brand)) base.push("Generate or set a logo concept as the brand mark.");
  if (!countSavedAssets(brand)) base.push("Save the first strategy, roadmap, or logo asset to the workspace.");
  if (!String(brand?.channels || "").trim()) base.push("Choose primary launch channels for the first 30 days.");
  base.push("Review the roadmap tomorrow and create the next brand asset.");
  return base.slice(0, 4);
}

function getBrandInsightCards(brand) {
  const plan = getWorkspacePlan(brand);
  const audience = getBrandFieldPreview(plan.targetAudience || brand?.audience, "Define the buyer, their urgency, and what they are comparing you against.");
  const offer = getBrandFieldPreview(plan.coreOffer || brand?.offer, "Turn the idea into a clear paid offer, starter service, or productized package.");
  const differentiator = getBrandFieldPreview(plan.positioning || brand?.differentiator, "Name the sharper reason this brand wins beyond looking nice.");
  const channels = brand?.channels || brand?.growthPlatform || "Instagram, TikTok, LinkedIn, YouTube Shorts, Pinterest, Facebook, and X";

  return [
    {
      label: "Positioning",
      title: "Lead with the outcome",
      copy: differentiator,
      action: "Rewrite the homepage headline so it says who it helps, what changes, and why this version is different.",
    },
    {
      label: "Audience",
      title: "Build for a specific buyer",
      copy: audience,
      action: "Create one customer profile with their problem, buying trigger, objections, and dream result.",
    },
    {
      label: "Offer",
      title: "Make the first yes easy",
      copy: offer,
      action: "Package the offer into a simple entry point, proof-backed core offer, and upgrade path.",
    },
    {
      label: "Content",
      title: "Turn strategy into a weekly rhythm",
      copy: `Primary launch channels: ${channels}.`,
      action: "Post proof, education, founder POV, offer clarity, and customer transformation every week.",
    },
  ];
}

function getSocialPlatformRecommendations(brand) {
  const plan = getWorkspacePlan(brand);
  const name = brand?.name || plan.brandName || "the brand";
  const audience = getBrandFieldPreview(plan.targetAudience || brand?.audience, "your most specific buyer");
  const voice = plan.brandVoice || brand?.tone || "clear, confident, and useful";
  const positioning = getBrandFieldPreview(plan.positioning || brand?.differentiator || plan.brandThesis, "a clear point of view people can remember");

  return [
    {
      platform: "Instagram",
      setup: `Use the bio to state ${name}, the audience, and the result in one sentence. Pin proof, offer, and origin posts.`,
      content: `Reels for discovery, carousels for education, Stories for trust, and Highlights for offer, proof, FAQ, and behind the brand.`,
      firstMove: `Create a 9-post grid: 3 proof posts, 3 educational posts, 2 personality posts, and 1 direct offer post.`,
    },
    {
      platform: "TikTok",
      setup: `Make the profile instantly readable: who ${name} helps, what viewers learn, and one simple link or waitlist action.`,
      content: `Use fast POV videos, before/after breakdowns, founder lessons, myth-busting, and comment-reply videos in a ${voice} voice.`,
      firstMove: `Batch 10 short videos from common objections and buying questions from ${audience}.`,
    },
    {
      platform: "Facebook",
      setup: `Set up a polished Page with services, contact info, reviews, and a pinned intro that explains the offer clearly.`,
      content: `Post trust-building updates, local/community proof, customer stories, and longer explanations that support conversion.`,
      firstMove: `Create a pinned welcome post plus 3 proof posts and invite the warmest first audience.`,
    },
    {
      platform: "LinkedIn",
      setup: `Use the banner, headline, and About section to frame ${name} around ${positioning}.`,
      content: `Publish founder POV, market observations, customer lessons, case studies, and practical frameworks.`,
      firstMove: `Write 5 posts: problem, belief, proof, process, and offer. Keep each tied to one buyer pain.`,
    },
    {
      platform: "YouTube Shorts",
      setup: `Create a channel with a clean avatar, strong banner, and playlists for education, proof, and brand story.`,
      content: `Turn every strong idea into a 30-60 second hook, teach, proof, and call-to-action format.`,
      firstMove: `Record 7 Shorts answering the highest-intent questions a buyer asks before paying.`,
    },
    {
      platform: "Pinterest",
      setup: `Build boards around outcomes, styles, use cases, and problem categories. Keep pin visuals consistent with the brand system.`,
      content: `Use searchable pins, checklists, idea boards, before/after visuals, and lead magnets that point to the site.`,
      firstMove: `Create 5 boards and 20 pins from the brand's core topics and visual direction.`,
    },
    {
      platform: "X",
      setup: `Make the bio sharp, specific, and opinionated. Pin the clearest thread explaining the problem ${name} solves.`,
      content: `Share concise lessons, founder notes, frameworks, launches, proof points, and useful replies to relevant conversations.`,
      firstMove: `Write one thread from the brand thesis and 10 short posts from the strongest customer pains.`,
    },
  ];
}

function getInitialStoredWorkspaces() {
  const storedVersion = localStorage.getItem("brandthat_workspace_data_version");
  if (storedVersion !== WORKSPACE_DATA_VERSION) {
    localStorage.setItem("brandthat_workspace_data_version", WORKSPACE_DATA_VERSION);
    localStorage.removeItem("brandthat_brand_workspaces");
    localStorage.removeItem("brandthat_active_brand_id");
    localStorage.removeItem("brandthat_workspace_draft");
    brandthatDevLog("cleared legacy local workspace cache", { storedVersion, nextVersion: WORKSPACE_DATA_VERSION });
    return [];
  }

  return safeParse("brandthat_brand_workspaces", []);
}

class LogoGenerationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "The logo generator could not render.",
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Brandthat logo generator render error:", error, errorInfo);
  }

  componentDidUpdate(previousProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="generateCard generatorFallback">
          <div className="tinyTag">LOGO GENERATOR</div>
          <h2>Something interrupted the logo preview.</h2>
          <p>{this.state.message}</p>
          <button className="btn dark" onClick={() => this.setState({ hasError: false, message: "" })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [page, setPage] = useState(getInitialPageFromPath());
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState("free");
  const [trialGenerationCount, setTrialGenerationCount] = useState(getStoredNumber("brandthat_trial_generation_count", 0));
  const [dailyFreeCount, setDailyFreeCount] = useState(getStoredNumber("brandthat_daily_count", 0));

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [pendingAuthAction, setPendingAuthAction] = useState(null);
  const [pendingBrandPlanPrompt, setPendingBrandPlanPrompt] = useState("");

  const [activeToolKey, setActiveToolKey] = useState(getInitialToolFromPath());
  const [workspaceSection, setWorkspaceSection] = useState(getInitialWorkspaceSectionFromPath());
  const [appMenuOpen, setAppMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const activeTool = toolMap[activeToolKey] || tools[0];
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [creativeTone, setCreativeTone] = useState("");
  const [logoIndustry, setLogoIndustry] = useState("");
  const [logoSymbol, setLogoSymbol] = useState("");
  const [logoColors, setLogoColors] = useState("");
  const [logoAvoid, setLogoAvoid] = useState("");
  const [captionGoal, setCaptionGoal] = useState("Awareness");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [logoImage, setLogoImage] = useState("");
  const [logoImageSource, setLogoImageSource] = useState("");
  const [logoVectorImage, setLogoVectorImage] = useState("");
  const [logoSvg, setLogoSvg] = useState("");
  const [logoTransparentSvg, setLogoTransparentSvg] = useState("");
  const [logoVariations, setLogoVariations] = useState([]);
  const [logoCreativeBrief, setLogoCreativeBrief] = useState(null);
  const [logoFallbackOption, setLogoFallbackOption] = useState(null);
  const [logoGenerationError, setLogoGenerationError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [generationSlow, setGenerationSlow] = useState(false);
  const [logoGenerationMemory, setLogoGenerationMemory] = useState(() => safeParse("brandthat_logo_generation_memory", {}));
  const [logoEditor, setLogoEditor] = useState({
    ink: "#111111",
    paper: "#f5f5f5",
    accent: "#111111",
    font: "Inter, Arial, Helvetica, sans-serif",
  });
  const [loading, setLoading] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutResumePrompt, setCheckoutResumePrompt] = useState(false);
  const [checkoutReturnSessionId, setCheckoutReturnSessionId] = useState("");
  const [membershipLookupFailed, setMembershipLookupFailed] = useState(false);
  const [membershipLookupPending, setMembershipLookupPending] = useState(true);
  const isCheckoutBusy = checkoutStatus === "loading" || checkoutStatus === "redirecting";
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceCreating, setWorkspaceCreating] = useState(false);
  const [recentLogoResults, setRecentLogoResults] = useState(() => safeParse("brandthat_recent_logo_results", []));

  const [brandWorkspaces, setBrandWorkspaces] = useState(getInitialStoredWorkspaces);
  const [activeBrandId, setActiveBrandId] = useState(localStorage.getItem("brandthat_active_brand_id") || "");
  const activeBrand = brandWorkspaces.find((brand) => brand.id === activeBrandId) || brandWorkspaces[0] || null;

  const [workspaceDraft, setWorkspaceDraft] = useState(getInitialWorkspaceDraft);

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [appNotice, setAppNotice] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("Draft ready");
  const [favoriteIds, setFavoriteIds] = useState(() => safeParse("brandthat_favorite_ids", {}));
  const [brandMemoryPilot, setBrandMemoryPilot] = useState({ active: false, unavailable: false, loading: false, refreshing: false, message: "", status: null });
  const [brandMemoryStatusNonce, setBrandMemoryStatusNonce] = useState(0);
  const [workspaceTourDismissed, setWorkspaceTourDismissed] = useState(() => localStorage.getItem(WORKSPACE_TOUR_DISMISSED_KEY) === "true");

  const isMember = normalizePlan(userPlan) === MEMBER_PLAN;
  const isFree = !isMember;
  const trialRemaining = Math.max(0, TRIAL_GENERATION_LIMIT - trialGenerationCount);
  const isLogoTestingUnlocked = isBrandthatTester(user);
  const emailVerified = isUserEmailVerified(user);
  const authStatus = authLoading ? "loading" : !user ? "logged_out" : !emailVerified ? "email_not_verified" : "logged_in";
  const membershipLoading = authLoading || (authStatus === "logged_in" && (workspaceLoading || membershipLookupPending) && normalizePlan(userPlan) !== MEMBER_PLAN);

  useEffect(() => {
    if (!isMember) return;
    clearPendingMembershipIntent();
    setCheckoutResumePrompt(false);
    setCheckoutError("");
    setCheckoutStatus((current) => current === "loading" || current === "redirecting" ? "idle" : current);
  }, [isMember]);

  useEffect(() => {
    setGenerationError("");
    setLogoGenerationError("");
    setResult("");
    setPrompt("");
    setSelectedPlatform("");
    setCreativeTone("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoVectorImage("");
    setLogoSvg("");
    setLogoTransparentSvg("");
    setLogoVariations([]);
    setLogoCreativeBrief(null);
  }, [activeToolKey, activeBrand?.id]);

  useEffect(() => {
    let canceled = false;
    const checkBrandMemoryPilot = async () => {
      const shouldCheckMemoryPilot = activeToolKey === "captions" || (page === "workspace" && workspaceSection === "settings");
      if (!shouldCheckMemoryPilot || !activeBrand?.id || !user?.id || !isMember) {
        setBrandMemoryPilot({ active: false, unavailable: false, loading: false, refreshing: false, message: "", status: null });
        return;
      }

      setBrandMemoryPilot((prev) => ({ ...prev, loading: true, message: "" }));
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token || "";
        if (!token) throw new Error("No active session.");
        const response = await fetchJsonWithTimeout("/.netlify/functions/brand-memory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "status", workspaceId: activeBrand.id }),
        }, {
          timeoutMs: 8000,
          errorMessage: "Brand memory status unavailable.",
        });
        if (!canceled) {
          const status = {
            endpointVersion: response?.endpointVersion || "",
            enabled: Boolean(response?.enabled),
            allowlisted: Boolean(response?.allowlisted),
            authenticatedUserIdMatchesAllowlist: Boolean(response?.authenticatedUserIdMatchesAllowlist),
            selectedWorkspaceId: response?.selectedWorkspaceId || response?.workspaceId || "",
            workspaceOwned: Boolean(response?.workspaceOwned),
            workspaceCheckCode: response?.workspaceCheckCode || "",
          };
          const active = Boolean(response?.active);
          const unavailable = Boolean(status.enabled && status.allowlisted && !active);
          setBrandMemoryPilot({
            active,
            unavailable,
            loading: false,
            refreshing: false,
            message: unavailable ? "Brand memory unavailable" + (status.workspaceCheckCode ? " (" + status.workspaceCheckCode + ")." : ".") : "",
            status,
          });
          if (!active) {
            console.info("Brand memory pilot status", JSON.stringify({
              endpointVersion: status.endpointVersion,
              enabled: status.enabled,
              allowlisted: status.allowlisted,
              authenticatedUserIdMatchesAllowlist: status.authenticatedUserIdMatchesAllowlist,
              selectedWorkspaceId: status.selectedWorkspaceId,
              workspaceOwned: status.workspaceOwned,
              workspaceCheckCode: status.workspaceCheckCode,
            }));
          }
        }
      } catch (error) {
        if (!canceled) {
          setBrandMemoryPilot({ active: false, unavailable: true, loading: false, refreshing: false, message: "Brand memory unavailable.", status: null });
          console.warn("Brand memory status check failed", {
            workspaceId: activeBrand?.id || "",
            code: error?.code || "",
            message: error?.message || "Unknown memory status error",
          });
        }
      }
    };

    checkBrandMemoryPilot();
    return () => {
      canceled = true;
    };
  }, [activeToolKey, activeBrand?.id, user?.id, isMember, brandMemoryStatusNonce, page, workspaceSection]);


  useEffect(() => {
    const meta = getCurrentSeoMeta(page);

    document.title = meta.title;

    let canonical = document.head.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", meta.canonical);

    upsertMeta("meta[name='description']", {
      name: "description",
      content: meta.description,
    });

    upsertMeta("meta[name='keywords']", {
      name: "keywords",
      content: "AI brand builder, brand strategy generator, brand plan, brand workspace, launch roadmap, visual identity direction, platform strategy",
    });

    upsertMeta("meta[property='og:type']", {
      property: "og:type",
      content: "website",
    });

    upsertMeta("meta[property='og:title']", {
      property: "og:title",
      content: meta.title,
    });

    upsertMeta("meta[property='og:description']", {
      property: "og:description",
      content: meta.description,
    });

    upsertMeta("meta[property='og:url']", {
      property: "og:url",
      content: meta.canonical,
    });

    upsertMeta("meta[property='og:image']", {
      property: "og:image",
      content: "https://brandthat.ai/og-image.png",
    });

    upsertMeta("meta[property='og:image:width']", {
      property: "og:image:width",
      content: "1200",
    });

    upsertMeta("meta[property='og:image:height']", {
      property: "og:image:height",
      content: "630",
    });

    upsertMeta("meta[property='og:site_name']", {
      property: "og:site_name",
      content: "Brandthat.ai",
    });

    upsertMeta("meta[name='twitter:title']", {
      name: "twitter:title",
      content: meta.title,
    });

    upsertMeta("meta[name='twitter:card']", {
      name: "twitter:card",
      content: "summary_large_image",
    });

    upsertMeta("meta[name='twitter:description']", {
      name: "twitter:description",
      content: meta.description,
    });

    upsertMeta("meta[name='twitter:image']", {
      name: "twitter:image",
      content: "https://brandthat.ai/twitter-image.png",
    });

    upsertJsonLd(getSeoSchema(page, meta));
  }, [page]);

  const emptySavedBuckets = () => ({
    captions: [],
    hooks: [],
    bios: [],
    hashtags: [],
    email: [],
    strategy: [],
    brand: [],
    audit: [],
    campaign: [],
    growth: [],
    logos: [],
  });

  const mapWorkspaceRow = (row) => ({
    id: row.id,
    name: row.name || "Untitled Brand",
    logoDirection: row.logo_direction || "",
    description: row.description || "",
    audience: row.audience || "",
    audiencePain: row.audience_pain || "",
    offer: row.offer || "",
    differentiator: row.differentiator || "",
    competitors: row.competitors || "",
    channels: row.channels || "",
    growthPlatform: row.growth_platform || "",
    currentFollowers: row.current_followers || "",
    targetFollowers: row.target_followers || "",
    weeklyTime: row.weekly_time || "",
    logoImage: row.logo_image_url || "",
    logoImageUrl: row.logo_image_url || "",
    logo_image_url: row.logo_image_url || "",
    primaryLogoAssetId: row.primary_logo_asset_id || "",
    primary_logo_asset_id: row.primary_logo_asset_id || "",
    primaryLogoUpdatedAt: row.primary_logo_updated_at || "",
    primary_logo_updated_at: row.primary_logo_updated_at || "",
    logoMetadata: row.logo_metadata || null,
    logo_metadata: row.logo_metadata || null,
    tone: row.tone || "Modern",
    style: row.style || "",
    launchGoal: row.launch_goal || "",
    structuredPlan: null,
    workspaceDataVersion: WORKSPACE_DATA_VERSION,
    saved: emptySavedBuckets(),
    createdAt: row.created_at || new Date().toISOString(),
  });

  const mapGenerationRow = (row) => {
    const project = decodeLogoProjectFromContent(row.content || "");
    const assetMeta = decodeSavedAssetMetadata(row.content || "") || {};
    const content = stripAllAssetMetadata(row.content || "");

    return {
      id: row.id,
      tool: row.tool,
      title: row.title || assetMeta.title || `${row.tool || "Asset"} • ${new Date(row.created_at || Date.now()).toLocaleDateString()}`,
      content,
      image: row.image_url || project?.image || "",
      favorite: Boolean(row.favorite || assetMeta.favorite),
      isCollection: Boolean(assetMeta.collection),
      assetType: assetMeta.assetType || row.tool || "",
      platform: assetMeta.platform || "",
      contentHash: assetMeta.contentHash || normalizeAssetContent(content || row.image_url || ""),
      assetMeta,
      project,
      source: project?.source || "",
      vectorImage: project?.vectorImage || "",
      svg: project?.svg || "",
      transparentSvg: project?.transparentSvg || "",
      variations: project?.variations || [],
      creativeBrief: project?.creativeBrief || null,
      generationMemory: project?.generationMemory || null,
      prompt: project?.prompt || "",
      brandName: project?.brandName || "",
      style: project?.style || "",
      industry: project?.industry || "",
      symbol: project?.symbol || "",
      colors: project?.colors || "",
      avoid: project?.avoid || "",
      createdAt: row.created_at || new Date().toISOString(),
    };
  };

  const verifyCheckoutSession = async (session, checkoutSessionId) => {
    if (!session?.access_token || !checkoutSessionId) return false;

    setCheckoutStatus("loading");
    setCheckoutError("");
    notify("info", "Confirming your membership", "BrandThat is verifying your Stripe payment before opening the workspace.");

    try {
      const data = await fetchJsonWithTimeout("/.netlify/functions/verify-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ session_id: checkoutSessionId }),
      }, {
        timeoutMs: 15000,
        errorMessage: "Membership could not be confirmed yet. Please retry from your account.",
        revealServerError: true,
      });

      if (data?.member || normalizePlan(data?.plan) === MEMBER_PLAN) {
        clearPendingMembershipIntent();
        localStorage.setItem("brandthat_plan", MEMBER_PLAN);
        setUserPlan(MEMBER_PLAN);
        setCheckoutStatus("idle");
        setCheckoutError("");
        setCheckoutReturnSessionId("");
        setPage("workspace");
        window.history.replaceState({}, "", "/workspace");
        notify("success", "Membership active", "Your BrandThat workspace is unlocked.");
        return true;
      }
    } catch (error) {
      console.warn("Checkout return verification failed:", { message: error?.message, code: error?.code, status: error?.status });
      setCheckoutError(error?.message || "Membership could not be confirmed yet. Please try again.");
      setCheckoutStatus("idle");
      return false;
    }

    setCheckoutStatus("idle");
    return false;
  };

  const reconcileMembership = async (session, source = "profile_load") => {
    if (!session?.access_token) return false;

    try {
      const data = await fetchJsonWithTimeout("/.netlify/functions/reconcile-membership", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ source }),
      }, {
        timeoutMs: 15000,
        errorMessage: "BrandThat could not confirm membership yet.",
        revealServerError: true,
      });

      if (data?.member || normalizePlan(data?.plan) === MEMBER_PLAN) {
        clearPendingMembershipIntent();
        localStorage.setItem("brandthat_plan", MEMBER_PLAN);
        setUserPlan(MEMBER_PLAN);
        setCheckoutResumePrompt(false);
        setCheckoutError("");
        return true;
      }
    } catch (error) {
      console.warn("Membership reconciliation failed:", { message: error?.message, code: error?.code, status: error?.status });
    }

    return false;
  };

  const loadSavedWorkspaceData = async (currentUser) => {
    if (!currentUser?.id) return;

    setWorkspaceLoading(true);
    setMembershipLookupPending(true);
    setMembershipLookupFailed(false);
    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("plan, stripe_subscription_id, daily_logo_uses, last_logo_use_date")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profile?.plan && profile?.stripe_subscription_id) {
        const nextPlan = normalizePlan(profile.plan);
        localStorage.setItem("brandthat_plan", nextPlan);
        setUserPlan(nextPlan);
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const reconciled = await reconcileMembership(sessionData?.session, "workspace_load");
        if (!reconciled) {
          localStorage.setItem("brandthat_plan", "free");
          setUserPlan("free");
        }
      }

      const today = getTodayKey();
      if (profile?.last_logo_use_date === today && Number.isFinite(Number(profile.daily_logo_uses))) {
        setDailyFreeCount(Number(profile.daily_logo_uses));
        localStorage.setItem("brandthat_daily_count", String(profile.daily_logo_uses));
      }

      const { data: workspaceRows, error: workspaceError } = await supabase
        .from("brand_workspaces")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (workspaceError) throw workspaceError;

      const { data: generationRows, error: generationError } = await supabase
        .from("saved_generations")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (generationError) throw generationError;

      const workspaceList = (workspaceRows || []).map(mapWorkspaceRow);
      const workspaceById = Object.fromEntries(workspaceList.map((workspace) => [workspace.id, workspace]));

      (generationRows || []).forEach((row) => {
        const workspace = workspaceById[row.workspace_id];
        if (!workspace) return;
        const bucket = row.tool === "logo" ? "logos" : row.tool;
        if (!workspace.saved[bucket]) workspace.saved[bucket] = [];
        const mappedGeneration = mapGenerationRow(row);
        workspace.saved[bucket].push(mappedGeneration);
        if (row.tool === "brand" && mappedGeneration.project?.structuredPlan && !workspace.structuredPlan) {
          workspace.structuredPlan = normalizeBrandPlan(mappedGeneration.project.structuredPlan, {
            brandName: workspace.name,
            idea: workspace.description,
          });
        }
      });

      if (workspaceList.length > 0) {
        setBrandWorkspaces(workspaceList);
        const existingActive = workspaceList.find((workspace) => workspace.id === activeBrandId);
        setActiveBrandId(existingActive?.id || workspaceList[0].id);
      }
    } catch (error) {
      console.warn("Could not load saved Brandthat workspaces:", error.message);
      setMembershipLookupFailed(true);
      notify("warning", "Workspace sync paused", "Your local workspace is still available. Refresh or try again if saved cloud projects do not appear.");
    } finally {
      setWorkspaceLoading(false);
      setMembershipLookupPending(false);
    }
  };

  useEffect(() => {
    const today = getTodayKey();
    const storedDate = localStorage.getItem("brandthat_daily_date");

    if (storedDate !== today) {
      localStorage.setItem("brandthat_daily_date", today);
      localStorage.setItem("brandthat_daily_count", "0");
      setDailyFreeCount(0);
    }

    const params = new URLSearchParams(window.location.search);
    const returnSessionId = params.get("session_id") || "";
    if (params.get("success") === "true") {
      localStorage.removeItem("brandthat_plan");
      setCheckoutReturnSessionId(returnSessionId);
      setCheckoutStatus("loading");
      notify("info", "Confirming your membership", "BrandThat is verifying your Stripe payment before opening the workspace.");
    }

    if (params.get("brand_plan") === "canceled") {
      trackBrandthatEvent("checkout_canceled", {});
      setCheckoutStatus("idle");
      setCheckoutError("Checkout was canceled. Your brand draft is still saved, and you can retry anytime.");
      notify("info", "Checkout canceled", "Your brand draft is still saved. Start membership again whenever you are ready.");
      window.history.replaceState({}, "", "/#brandthat-membership");
      setTimeout(() => document.getElementById("brandthat-membership")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }

    const getSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user || null;
        setUser(currentUser);
        trackBrandthatEvent("auth_state_resolved", { signed_in: Boolean(currentUser), source: "initial_load" });
        if (currentUser && isUserEmailVerified(currentUser)) {
          await loadSavedWorkspaceData(currentUser);
          if (params.get("success") === "true" && returnSessionId) {
            await verifyCheckoutSession(data.session, returnSessionId);
          }
          if (getPendingMembershipIntent()) {
            setCheckoutResumePrompt(true);
            setCheckoutError("Your account is ready. Continue to secure checkout to start membership.");
          }
        } else {
          setMembershipLookupPending(false);
        }
      } catch (error) {
        console.warn("Could not load Supabase session:", error.message);
        setUser(null);
        setMembershipLookupPending(false);
      } finally {
        setAuthLoading(false);
      }
    };

    getSession();

    const authFallbackTimer = window.setTimeout(() => {
      setAuthLoading((current) => {
        if (!current) return current;
        notify("warning", "Sign-in check timed out", "You can still browse BrandThat. Use Sign In if your account does not appear.");
        return false;
      });
    }, 8000);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      setAuthLoading(false);
      trackBrandthatEvent("auth_state_resolved", { signed_in: Boolean(currentUser), source: "auth_listener" });
      if (currentUser && isUserEmailVerified(currentUser)) {
        setMembershipLookupPending(true);
        loadSavedWorkspaceData(currentUser);
        const authParams = new URLSearchParams(window.location.search);
        const authReturnSessionId = authParams.get("session_id") || checkoutReturnSessionId;
        if (authParams.get("success") === "true" && authReturnSessionId) {
          verifyCheckoutSession(session, authReturnSessionId);
        }
        if (getPendingMembershipIntent()) {
          setCheckoutResumePrompt(true);
          setCheckoutError("Your account is ready. Continue to secure checkout to start membership.");
        }
      } else {
        localStorage.setItem("brandthat_plan", "free");
        setUserPlan("free");
        setMembershipLookupPending(false);
      }
    });

    const onPop = () => {
      setPage(getInitialPageFromPath());
      setActiveToolKey(getInitialToolFromPath());
    };

    window.addEventListener("popstate", onPop);

    return () => {
      window.clearTimeout(authFallbackTimer);
      listener.subscription.unsubscribe();
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("brandthat_workspace_data_version", WORKSPACE_DATA_VERSION);
    localStorage.setItem("brandthat_brand_workspaces", JSON.stringify(brandWorkspaces));
  }, [brandWorkspaces]);

  const updateActiveBrand = (patch = {}) => {
    if (!activeBrand?.id) return;
    setAutoSaveStatus("Saving...");
    setBrandWorkspaces((prev) =>
      prev.map((brand) =>
        brand.id === activeBrand.id
          ? { ...brand, ...patch, updatedAt: new Date().toISOString() }
          : brand
      )
    );
    window.clearTimeout(window.brandthatWorkspaceSaveTimer);
    window.brandthatWorkspaceSaveTimer = window.setTimeout(() => setAutoSaveStatus("Saved"), 350);
  };

  useEffect(() => {
    localStorage.setItem("brandthat_favorite_ids", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    try {
      localStorage.setItem("brandthat_recent_logo_results", JSON.stringify(recentLogoResults.slice(0, 4)));
    } catch {
      localStorage.removeItem("brandthat_recent_logo_results");
    }
  }, [recentLogoResults]);

  useEffect(() => {
    try {
      localStorage.setItem("brandthat_logo_generation_memory", JSON.stringify(logoGenerationMemory || {}));
    } catch {
      localStorage.removeItem("brandthat_logo_generation_memory");
    }
  }, [logoGenerationMemory]);

  useEffect(() => {
    if (page === "home" && activeToolKey !== "brand") {
      setActiveToolKey("brand");
    }
  }, [page, activeToolKey]);

  const rememberRejectedLogoDirection = (direction = {}, reason = "retry") => {
    setLogoGenerationMemory((prev = {}) => {
      const addUnique = (list = [], values = [], limit = 18) => {
        const next = [
          ...values.map((value) => String(value || "").toLowerCase().trim()).filter(Boolean),
          ...(Array.isArray(list) ? list : []),
        ];
        return [...new Set(next)].slice(0, limit);
      };

      return {
        ...prev,
        rejectedStyles: addUnique(prev.rejectedStyles, [direction.logoStyle, direction.style], 16),
        rejectedIconDirections: addUnique(prev.rejectedIconDirections, [direction.symbol, direction.name], 18),
        rejectedPalettes: addUnique(prev.rejectedPalettes, [direction.palette], 16),
        compositions: addUnique(prev.compositions, [direction.layout], 16),
        lastRejectedReason: reason,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  useEffect(() => {
    const draftHasContent = Object.values(workspaceDraft || {}).some((value) => String(value || "").trim());
    if (!draftHasContent) return;

    setAutoSaveStatus("Saving draft...");
    const timer = setTimeout(() => {
      localStorage.setItem("brandthat_workspace_draft", JSON.stringify(workspaceDraft));
      persistVisibleCustomerDraft(workspaceDraft);
      setAutoSaveStatus("Draft autosaved");
    }, 450);

    return () => clearTimeout(timer);
  }, [workspaceDraft]);

  useEffect(() => {
    if (activeBrand?.id) {
      localStorage.setItem("brandthat_active_brand_id", activeBrand.id);
    }
  }, [activeBrand?.id]);

  useEffect(() => {
    const protectedPage = page === "workspace" || page === "studio" || page === "logo";
    if (!protectedPage || authLoading || authStatus === "logged_in") return;

    setPage("home");
    openAuth(
      authStatus === "email_not_verified" ? "login" : "signup",
      authStatus === "email_not_verified"
        ? "Check your email to verify your account before continuing."
        : "Create your BrandThat account to try the full product.",
      `path:${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  }, [authLoading, authStatus, page]);

  const notify = (type, title, message = "") => {
    setAppNotice({ type, title, message });
    window.clearTimeout(window.brandthatNoticeTimer);
    window.brandthatNoticeTimer = window.setTimeout(() => setAppNotice(null), 5200);
  };

  const handleAppError = (title, error, fallback = "Something went wrong. Please try again.") => {
    const message = error?.message || fallback;
    console.error(title, error);
    notify("error", title, message);
  };

  const openAuth = (mode = "login", message = "", action = null) => {
    setAuthMode(mode);
    setAuthMessage(message);
    setPendingAuthAction(action);
    setShowAuth(true);
  };

  const requireVerifiedAccount = async (action = null, message = "Create your BrandThat account to try the full product.") => {
    if (authLoading) {
      notify("warning", "Checking your account", "Give BrandThat a moment to finish loading your session.");
      return null;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      const session = data.session || null;
      const currentUser = session?.user || null;

      if (!session?.access_token || !currentUser) {
        openAuth("signup", message, action);
        return null;
      }

      setUser(currentUser);

      if (!isUserEmailVerified(currentUser)) {
        openAuth("login", "Check your email to verify your account before continuing.", action);
        return null;
      }

      return session;
    } catch (error) {
      console.warn("Supabase session check failed:", error.message);
      openAuth("login", "Please log in again before continuing.", action);
      return null;
    }
  };

  const showMembershipOffer = (message = "Unlock BrandThat for $9.99/month. Full workspace, generators, roadmap, and logo concepts included.") => {
    setPage("home");
    notify("warning", "Brand Plan required", message);
    window.history.pushState({}, "", "/");
    setTimeout(() => document.getElementById("brandthat-membership")?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  };

  const getAuthorizedHeaders = async (action = "generate") => {
    const session = await requireVerifiedAccount(action);
    if (!session) return null;

    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    };
  };

  const refreshActiveBrandMemory = async () => {
    if (!activeBrand?.id || !brandMemoryPilot.active) return;

    setBrandMemoryPilot((prev) => ({ ...prev, refreshing: true, message: "" }));
    try {
      const headers = await getAuthorizedHeaders("brand_memory_refresh");
      if (!headers) return;
      const response = await fetchJsonWithTimeout("/.netlify/functions/brand-memory", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "refresh", workspaceId: activeBrand.id }),
      }, {
        timeoutMs: 25000,
        errorMessage: "Brand memory could not be refreshed.",
        revealServerError: true,
      });

      if (!response?.ok) {
        throw new Error(response?.error || response?.message || "Brand memory could not be refreshed.");
      }

      const count = Array.isArray(response.results) ? response.results.length : 0;
      setBrandMemoryPilot((prev) => ({
        ...prev,
        refreshing: false,
        message: count ? `Memory refreshed from ${activeBrand.name}.` : "Brand memory is current.",
      }));
      notify("success", "Brand memory refreshed", `${activeBrand.name} context is ready for captions.`);
    } catch (error) {
      console.warn("Brand memory refresh failed", {
        workspaceId: activeBrand?.id || "",
        code: error?.code || "",
        status: error?.status || "",
        message: error?.message || "Unknown memory refresh error",
      });
      setBrandMemoryPilot((prev) => ({
        ...prev,
        refreshing: false,
        message: "Memory refresh failed. Captions will use the normal brand context.",
      }));
      notify("warning", "Memory refresh failed", "Caption generation will keep using the normal brand context.");
    }
  };

  const runBrandMemoryAction = useCallback(async (action, payload = {}, options = {}) => {
    if (!activeBrand?.id) throw new Error("Choose a Brand Workspace first.");
    const headers = await getAuthorizedHeaders(options.authAction || "brand_memory");
    if (!headers) throw new Error("Sign in required.");
    return fetchJsonWithTimeout("/.netlify/functions/brand-memory", {
      method: "POST",
      headers,
      body: JSON.stringify({ action, workspaceId: activeBrand.id, ...payload }),
    }, {
      timeoutMs: options.timeoutMs || 25000,
      errorMessage: options.errorMessage || "Brand memory is temporarily unavailable.",
      revealServerError: true,
    });
  }, [activeBrand?.id]);

  const openProtectedPage = async (nextPage, action = null) => {
    const session = await requireVerifiedAccount(action || nextPage);
    if (!session) return;
    setPage(nextPage);
    if (nextPage === "workspace") {
      setWorkspaceSection("overview");
      window.history.pushState({}, "", "/workspace");
    }
  };

  const finishAuthSuccess = (loggedInUser) => {
    if (!isUserEmailVerified(loggedInUser)) {
      setUser(loggedInUser);
      setAuthMode("login");
      setAuthMessage("Check your email to verify your account before continuing.");
      setShowAuth(true);
      return;
    }

    setUser(loggedInUser);
    setShowAuth(false);
    setAuthEmail("");
    setAuthPassword("");
    setAuthMessage("");

    const action = pendingAuthAction;
    setPendingAuthAction(null);

    if (action === "generate") {
      notify("success", "You're logged in", "Generating your brand asset now.");
      setTimeout(() => generate(loggedInUser), 150);
    } else if (action === "save_logo_project") {
      notify("success", "You're logged in", "Your brand project is ready to save.");
      setTimeout(() => startWorkspaceFromCurrentLogo(), 150);
    } else if (action === "checkout") {
      notify("success", "You're logged in", "Continue to secure checkout when you are ready.");
      storePendingMembershipIntent("auth_success");
      setCheckoutResumePrompt(true);
      setCheckoutError("Your account is ready. Continue to secure checkout to start membership.");
    } else if (typeof action === "string" && action.startsWith("path:")) {
      const intendedPath = action.slice(5) || "/workspace";
      window.history.pushState({}, "", intendedPath);
      setPage(getInitialPageFromPath());
      setWorkspaceSection(getInitialWorkspaceSectionFromPath());
      setActiveToolKey(getInitialToolFromPath());
      notify("success", "Logged in", "Opening your workspace.");
    } else {
      notify("success", "Logged in", "Welcome back to your Brandthat workspace.");
    }
  };

  const signUp = async () => {
    const email = authEmail.trim().toLowerCase();
    persistVisibleCustomerDraft(workspaceDraft);

    if (!email || !authPassword) {
      setAuthMessage("Enter your email and create a password to make your free Brandthat account.");
      return;
    }

    setLoading(true);
    setAuthMessage("");

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: authPassword,
        options: { emailRedirectTo: window.location.origin }
      });

      if (error) {
        const message = error.message?.toLowerCase() || "";

        if (message.includes("already") || message.includes("registered") || message.includes("exists")) {
          setAuthMode("login");
          setAuthMessage("This email already has a Brandthat account. Log in with your password instead.");
        } else {
          setAuthMessage(error.message || "Signup failed. Please try again.");
        }

        setLoading(false);
        return;
      }

      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setAuthMode("login");
        setAuthMessage("This email already has a Brandthat account. Log in with your password instead.");
        setLoading(false);
        return;
      }

      localStorage.setItem("brandthat_plan", "free");
      localStorage.setItem("brandthat_trial_generation_count", "0");
      setTrialGenerationCount(0);
      setUserPlan("free");

      if (data?.session?.user) {
        if (isUserEmailVerified(data.session.user)) {
          finishAuthSuccess(data.session.user);
        } else {
          setUser(data.session.user);
          setAuthMode("login");
          setAuthMessage("Account created. Check your email to verify your account before continuing.");
        }
      } else {
        setAuthMode("login");
        setAuthMessage("Account created. Check your email to verify your account before continuing.");
      }
    } catch (error) {
      setAuthMessage("Something went wrong creating your account. Please try again.");
    }

    setLoading(false);
  };

  const logIn = async () => {
    const email = authEmail.trim().toLowerCase();
    persistVisibleCustomerDraft(workspaceDraft);

    if (!email || !authPassword) {
      setAuthMessage("Enter your email and password to log in.");
      return;
    }

    setLoading(true);
    setAuthMessage("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: authPassword
      });

      if (error) {
        const message = error.message?.toLowerCase() || "";

        if (message.includes("email not confirmed") || message.includes("confirm")) {
          setAuthMessage("This account exists, but the email is not confirmed yet. Check your inbox and spam folder. If no email arrives, the Supabase email settings need to be checked.");
        } else if (message.includes("invalid login") || message.includes("invalid credentials")) {
          setAuthMessage("That email/password did not match. If this is your account, try the correct password. If you never created one, switch to Create account.");
        } else {
          setAuthMessage(error.message || "Login failed. Please try again.");
        }

        setLoading(false);
        return;
      }

      if (!isUserEmailVerified(data.user)) {
        setUser(data.user);
        setAuthMessage("Check your email to verify your account before continuing.");
        setLoading(false);
        return;
      }

      finishAuthSuccess(data.user);
    } catch (error) {
      setAuthMessage("Something went wrong logging in. Please try again.");
    }

    setLoading(false);
  };

  const logOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setShowAuth(false);
      setPendingAuthAction(null);
      notify("success", "Logged out", "You have been signed out of Brandthat.");
    } catch (error) {
      handleAppError("Logout failed", error, "Could not log out. Please refresh and try again.");
    }
  };

  const sendMagicLink = async () => {
    const email = authEmail.trim().toLowerCase();

    if (!email) {
      setAuthMessage("Enter your email first, then we can send a login link.");
      return;
    }

    setLoading(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) {
        setAuthMessage(error.message || "Could not send login link. Please try again.");
        setLoading(false);
        return;
      }

      setAuthMode("login");
      setAuthMessage("Login link sent. Check your inbox and spam folder. Open the link on this device to continue.");
    } catch (error) {
      setAuthMessage("Could not send login link. Please try again.");
    }

    setLoading(false);
  };

  const resendConfirmation = async () => {
    const email = authEmail.trim().toLowerCase();

    if (!email) {
      setAuthMessage("Enter your email first, then we can resend confirmation.");
      return;
    }

    setLoading(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin }
      });

      if (error) {
        setAuthMessage(error.message || "Could not resend confirmation. Try the login link instead.");
        setLoading(false);
        return;
      }

      setAuthMessage("Confirmation email sent again. Check your inbox and spam folder.");
    } catch (error) {
      setAuthMessage("Could not resend confirmation. Try the login link instead.");
    }

    setLoading(false);
  };

  const startMembershipCheckout = async ({ source = "membership_cta" } = {}) => {
    const checkoutPlan = MEMBER_PLAN;
    const eventSource = String(source || "membership_cta").slice(0, 80);
    persistVisibleCustomerDraft(workspaceDraft);
    trackBrandthatEvent("membership_cta_clicked", { plan: checkoutPlan, source: eventSource });
    setCheckoutError("");
    setCheckoutResumePrompt(false);

    if (isCheckoutBusy) {
      trackBrandthatEvent("checkout_failed", { code: "CHECKOUT_ALREADY_RUNNING", source: eventSource });
      return;
    }

    if (normalizePlan(userPlan) === MEMBER_PLAN) {
      trackBrandthatEvent("auth_state_resolved", { signed_in: Boolean(user), member: true, source: eventSource });
      setCheckoutStatus("idle");
      setCheckoutError("");
      setCheckoutResumePrompt(false);
      setPage("workspace");
      window.history.pushState({}, "", "/workspace");
      notify("success", "Membership active", "Opening your BrandThat workspace.");
      return;
    }

    if (authLoading) {
      storePendingMembershipIntent(eventSource);
      trackBrandthatEvent("checkout_failed", { code: "AUTH_LOADING", source: eventSource });
      notify("info", "Checking your account", "Give BrandThat a moment to finish loading your session.");
      return;
    }

    let session = null;
    let currentUser = user;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      session = data?.session || null;
      currentUser = session?.user || user;
      trackBrandthatEvent("auth_state_resolved", { signed_in: Boolean(currentUser), source: eventSource });
    } catch (error) {
      console.warn("Membership checkout session lookup failed:", { message: error?.message });
      storePendingMembershipIntent(eventSource);
      trackBrandthatEvent("checkout_failed", { code: "SESSION_LOOKUP_FAILED", source: eventSource });
      setCheckoutError("BrandThat could not confirm your login session. Please sign in again.");
      openAuth("login", "Please log in again before starting membership.", "checkout");
      return;
    }

    if (!session?.access_token || !currentUser?.email) {
      storePendingMembershipIntent(eventSource);
      trackBrandthatEvent("checkout_failed", { code: "AUTH_REQUIRED", source: eventSource });
      openAuth("signup", "Create your BrandThat account first. We will keep your membership checkout ready after you verify your email.", "checkout");
      return;
    }

    const verified = isUserEmailVerified(currentUser);
    trackBrandthatEvent("email_verification_checked", { verified, source: eventSource });

    if (!verified) {
      setUser(currentUser);
      setAuthEmail(currentUser.email || authEmail);
      storePendingMembershipIntent(eventSource);
      setCheckoutError("Please verify your email before starting membership.");
      trackBrandthatEvent("checkout_failed", { code: "EMAIL_NOT_VERIFIED", source: eventSource });
      openAuth("login", "Check your email to verify your account before starting membership. You can resend the confirmation email here.", "checkout");
      return;
    }

    storePendingMembershipIntent(eventSource);
    setCheckoutStatus("loading");
    trackBrandthatEvent("checkout_request_started", { plan: checkoutPlan, source: eventSource });
    trackBrandthatEvent("checkout_session_requested", { plan: checkoutPlan, source: eventSource });

    try {
      const data = await fetchJsonWithTimeout("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: checkoutPlan, source: eventSource })
      }, {
        timeoutMs: 15000,
        errorMessage: "Checkout could not start. Please try again.",
        revealServerError: true,
        timeoutMessage: "Checkout took too long to start. Please try again."
      });

      trackBrandthatEvent("checkout_response_received", { ok: Boolean(data?.url), source: eventSource });
      if (data?.alreadySubscribed || normalizePlan(data?.plan) === MEMBER_PLAN) {
        clearPendingMembershipIntent();
        localStorage.setItem("brandthat_plan", MEMBER_PLAN);
        setUserPlan(MEMBER_PLAN);
        setCheckoutStatus("idle");
        setCheckoutError("");
        setCheckoutResumePrompt(false);
        setPage("workspace");
        window.history.pushState({}, "", "/workspace");
        notify("success", "Membership active", "Opening your BrandThat workspace.");
        return;
      }
      if (!data?.url) throw new Error("Stripe did not return a checkout link. Please try again.");
      const checkoutUrl = String(data.url);
      if (!checkoutUrl.includes("checkout.stripe.com") && checkoutUrl.includes("#workspace")) {
        clearPendingMembershipIntent();
        localStorage.setItem("brandthat_plan", MEMBER_PLAN);
        setUserPlan(MEMBER_PLAN);
        setCheckoutStatus("idle");
        setCheckoutError("");
        setCheckoutResumePrompt(false);
        setPage("workspace");
        window.history.pushState({}, "", "/workspace");
        notify("success", "Membership active", "Opening your BrandThat workspace.");
        return;
      }
      trackBrandthatEvent("checkout_session_created", { plan: checkoutPlan, source: eventSource });
      trackBrandthatEvent("checkout_redirect_started", { plan: checkoutPlan, source: eventSource });
      setCheckoutStatus("redirecting");
      window.location.assign(checkoutUrl);
    } catch (error) {
      const publicMessage = error?.message || "Checkout could not start. Please try again in a moment.";
      console.warn("BrandThat checkout failed:", { message: publicMessage, plan: checkoutPlan });
      trackBrandthatEvent("checkout_failed", { plan: checkoutPlan, source: eventSource, reason: publicMessage.slice(0, 80), status: error?.status || 0, code: error?.code || "CHECKOUT_REQUEST_FAILED" });
      trackBrandthatEvent("checkout_session_failed", { plan: checkoutPlan, source: eventSource, reason: publicMessage.slice(0, 80) });
      setCheckoutError(publicMessage);
      handleAppError("Checkout failed", error, publicMessage);
      setCheckoutStatus("idle");
      return;
    }

  };

  const startCheckout = (planOrOptions = MEMBER_PLAN) =>
    startMembershipCheckout(
      typeof planOrOptions === "object" && planOrOptions !== null
        ? planOrOptions
        : { source: "legacy_membership_cta" }
    );

  const createWorkspace = async () => {
    if (workspaceCreating) return;

    const session = await requireMembershipOrTrial("workspace");
    if (!session) return;

    if (!workspaceDraft.name.trim()) {
      notify("error", "Add a brand name first", "Your workspace needs a name before it can be saved.");
      return;
    }

    setWorkspaceCreating(true);
    notify("info", "Creating workspace", "Saving your brand workspace to your account.");

    const baseBrand = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: workspaceDraft.name.trim(),
      logoDirection: workspaceDraft.logoDirection.trim(),
      description: workspaceDraft.description.trim(),
      audience: workspaceDraft.audience.trim(),
      audiencePain: String(workspaceDraft.audiencePain || "").trim(),
      offer: String(workspaceDraft.offer || "").trim(),
      differentiator: String(workspaceDraft.differentiator || "").trim(),
      competitors: String(workspaceDraft.competitors || "").trim(),
      channels: String(workspaceDraft.channels || "").trim(),
      growthPlatform: String(workspaceDraft.growthPlatform || "").trim(),
      currentFollowers: String(workspaceDraft.currentFollowers || "").trim(),
      targetFollowers: String(workspaceDraft.targetFollowers || "").trim(),
      weeklyTime: String(workspaceDraft.weeklyTime || "").trim(),
      logoImage: String(workspaceDraft.logoImage || "").trim(),
      tone: workspaceDraft.tone || "Modern",
      style: workspaceDraft.style.trim(),
      launchGoal: workspaceDraft.launchGoal.trim(),
      saved: emptySavedBuckets(),
      createdAt: new Date().toISOString(),
    };

    let brand = baseBrand;

    const ownerId = session.user.id;

    if (!ownerId) {
      setWorkspaceCreating(false);
      notify("error", "Workspace was not created", "BrandThat could not confirm your account. Please sign in again.");
      return;
    }

    if (ownerId) {
      try {
        const { data, error } = await supabase
          .from("brand_workspaces")
          .insert({
            user_id: ownerId,
            name: baseBrand.name,
            description: baseBrand.description,
            logo_direction: baseBrand.logoDirection,
            audience: baseBrand.audience,
            tone: baseBrand.tone,
            style: baseBrand.style,
            launch_goal: baseBrand.launchGoal,
          })
          .select("*")
          .single();

        if (error) throw error;
        if (!data?.id) throw new Error("BrandThat did not receive a saved workspace ID. Please try again.");
        brand = mapWorkspaceRow(data);
      } catch (error) {
        const message = error?.message || "BrandThat could not save this workspace. Please try again.";
        console.warn("Workspace creation failed:", { message });
        handleAppError("Workspace creation failed", error, message);
        notify("error", "Workspace was not created", message);
        setWorkspaceCreating(false);
        return;
      }
    }

    const next = [brand, ...brandWorkspaces.filter((item) => item.id !== brand.id)];
    setBrandWorkspaces(next);
    setActiveBrandId(brand.id);
    setActiveToolKey("logo");
    setPrompt(buildWorkspaceLogoBrief(brand, getWorkspacePlan(brand)));
    setSelectedPlatform(brand.style || "");
    setCreativeTone(brand.name || "");
    setLogoIndustry(brand.description || "");
    setLogoSymbol(brand.logoDirection || "");
    setLogoColors("");
    setLogoAvoid("");
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoCreativeBrief(null);
    setPage("workspace");
    setWorkspaceSection("overview");
    window.history.pushState({}, "", "/workspace");
    setWorkspaceDraft(getDefaultWorkspaceDraft());
    localStorage.removeItem("brandthat_workspace_draft");
    localStorage.removeItem(CUSTOMER_INTENT_DRAFT_KEY);
    trackBrandthatEvent("workspace_created", { hasLogoDirection: Boolean(baseBrand.logoDirection), goal: baseBrand.targetFollowers || baseBrand.launchGoal || "" });
    notify("success", "Workspace created", `${brand.name} is saved to your BrandThat account.`);
    setWorkspaceCreating(false);
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const selectBrand = (brandId) => {
    const brand = brandWorkspaces.find((item) => item.id === brandId);
    if (!brand) return;
    setActiveBrandId(brand.id);
    setPrompt(activeToolKey === "logo" ? buildWorkspaceLogoBrief(brand, getWorkspacePlan(brand)) : "");
    setSelectedPlatform(brand.style || "");
    setCreativeTone(brand.name || "");
    setLogoIndustry(brand.description || "");
    setLogoSymbol(brand.logoDirection || "");
    setLogoColors("");
    setLogoAvoid("");
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoCreativeBrief(null);
    setLogoVectorImage("");
    setLogoSvg("");
    setLogoTransparentSvg("");
    setLogoVariations([]);
    setWorkspaceSection("overview");
  };

  const deleteBrand = async (brandId) => {
    const next = brandWorkspaces.filter((brand) => brand.id !== brandId);
    setBrandWorkspaces(next);

    if (activeBrandId === brandId) {
      setActiveBrandId(next[0]?.id || "");
    }

    if (user?.id) {
      try {
        await supabase
          .from("brand_workspaces")
          .delete()
          .eq("id", brandId)
          .eq("user_id", user.id);
      } catch (error) {
        console.warn("Could not delete workspace from Supabase:", error.message);
      }
    }
  };

  const saveGeneratedAsset = async ({ contentOverride = "", imageOverride = "", titleOverride = "", collection = false, favorite = false } = {}) => {
    const session = await requireMembershipOrTrial("save_output");
    if (!session) return;

    if (!activeBrand) {
      notify("error", "Create a Brand Workspace first", "Then you can save outputs, favorites, and brand kits to that workspace.");
      return;
    }

    const sourceContent = contentOverride || result;
    const sourceImage = imageOverride || logoImage;

    if (!sourceContent && !sourceImage) {
      notify("error", "Generate something first", "Once an output appears, you can save it to your workspace.");
      return;
    }

    if (activeTool.key !== "logo" && isGenerationFailureText(sourceContent)) {
      notify("error", "Nothing to save yet", "The last generation failed. Retry before saving this to your workspace.");
      return;
    }

    const bucket = getSavedBucketKey(activeTool.key);
    const logoProject = activeTool.key === "logo"
      ? {
          image: sourceImage,
          source: logoImageSource || "openai",
          vectorImage: logoVectorImage || sourceImage,
          svg: logoSvg || "",
          transparentSvg: logoTransparentSvg || logoSvg || "",
          variations: logoVariations || [],
          creativeBrief: logoCreativeBrief || null,
          generationMemory: logoGenerationMemory || {},
          prompt,
          brandName: creativeTone || activeBrand?.name || "",
          style: selectedPlatform || "",
          industry: logoIndustry || "",
          symbol: logoSymbol || "",
          colors: logoColors || "",
          avoid: logoAvoid || "",
          savedAt: new Date().toISOString(),
        }
      : null;
    const displayContent = stripAllAssetMetadata(sourceContent);
    const normalizedContent = normalizeAssetContent(displayContent || sourceImage);
    const duplicate = (activeBrand.saved?.[bucket] || []).find((item) => normalizeAssetContent(item.content || item.image) === normalizedContent);

    if (duplicate) {
      notify("info", "This result is already saved.", "Choose another result or generate a fresh version before saving again.");
      return duplicate;
    }

    if (!session.user?.id) {
      notify("error", "Sign in required", "Sign in again before saving this asset.");
      return null;
    }

    const assetMetadata = {
      assetType: collection ? `${bucket.replace(/s$/, "")}_collection` : bucket.replace(/s$/, ""),
      generatorType: activeTool.key,
      platform: selectedPlatform || activeBrand?.growthPlatform || activeBrand?.channels || "",
      collection,
      favorite,
      contentHash: normalizedContent,
      workspaceId: activeBrand.id,
      savedAt: new Date().toISOString(),
    };
    const contentWithAssetMetadata = encodeSavedAssetContent(displayContent, assetMetadata);
    const storageContent = logoProject ? encodeLogoProjectContent(contentWithAssetMetadata, logoProject) : contentWithAssetMetadata;
    let entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      tool: activeTool.key,
      title: titleOverride || `${activeTool.shortTitle}${collection ? " Collection" : ""} • ${new Date().toLocaleDateString()}`,
      content: displayContent,
      image: sourceImage,
      project: logoProject,
      source: logoProject?.source || "",
      vectorImage: logoProject?.vectorImage || "",
      svg: logoProject?.svg || "",
      transparentSvg: logoProject?.transparentSvg || "",
      variations: logoProject?.variations || [],
      creativeBrief: logoProject?.creativeBrief || null,
      generationMemory: logoProject?.generationMemory || null,
      prompt: logoProject?.prompt || "",
      brandName: logoProject?.brandName || "",
      style: logoProject?.style || "",
      industry: logoProject?.industry || "",
      symbol: logoProject?.symbol || "",
      colors: logoProject?.colors || "",
      avoid: logoProject?.avoid || "",
      favorite,
      isCollection: collection,
      assetType: assetMetadata.assetType,
      platform: assetMetadata.platform,
      contentHash: normalizedContent,
      assetMeta: assetMetadata,
      createdAt: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("saved_generations")
        .insert({
          user_id: session.user.id,
          workspace_id: activeBrand.id,
          tool: activeTool.key,
          title: entry.title,
          content: storageContent,
          image_url: entry.image,
        })
        .select("*")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Saved asset did not return a durable ID.");
      entry = mapGenerationRow(data);
    } catch (error) {
      console.error("BrandThat durable asset save failed", {
        tool: activeTool.key,
        workspaceId: activeBrand.id,
        code: error?.code || "",
        message: error?.message || "Unknown Supabase save error",
      });
      notify("error", `Couldn't save this ${bucket === "captions" ? "caption" : "asset"}. Try again.`, "Your generated result is still here.");
      return null;
    }

    setBrandWorkspaces((prev) =>
      prev.map((brand) =>
        brand.id === activeBrand.id
          ? {
              ...brand,
              logoImage: brand.logoImage,
              saved: {
                ...brand.saved,
                [bucket]: [entry, ...(brand.saved?.[bucket] || [])],
              },
            }
          : brand
      )
    );

    if (favorite) {
      setFavoriteIds((prev) => ({ ...prev, [entry.id]: true }));
    }

    notify("success", "Saved to workspace", `${entry.title} was added to ${activeBrand.name}.`);
    trackBrandthatEvent("asset_saved", { tool: activeTool.key, hasImage: Boolean(entry.image) });
    return entry;
  };

  const saveCurrentOutput = async () => saveGeneratedAsset({ collection: activeTool.key !== "logo" });

  const saveCurrentLogoConcept = async ({ imageOverride = "", contentOverride = "", favorite = false, titleOverride = "" } = {}) => {
    const conceptImage = imageOverride || logoImage;
    const conceptContent = contentOverride || result || "Logo concept generated from the active Brand Workspace.";

    if (!conceptImage) {
      notify("error", "Generate a logo first", "Once a concept appears, you can save it to this brand workspace.");
      return null;
    }

    return saveGeneratedAsset({
      imageOverride: conceptImage,
      contentOverride: conceptContent,
      titleOverride: titleOverride || "Logo Concept • " + new Date().toLocaleDateString(),
      collection: false,
      favorite,
    });
  };

  const setLogoAsBrandProfile = async (logoEntry = null) => {
    const session = await requireMembershipOrTrial("workspace");
    if (!session) return;

    if (!activeBrand) {
      notify("error", "Create a Brand Workspace first", "Then you can set a saved logo concept as the brand profile image.");
      return;
    }

    const candidateImage = logoEntry?.image || logoImage;

    if (!candidateImage) {
      notify("error", "Generate a logo first", "Once a logo appears, save it and set it as the primary logo.");
      return;
    }

    const savedEntry = logoEntry?.id
      ? logoEntry
      : await saveCurrentLogoConcept({
          imageOverride: candidateImage,
          contentOverride: logoEntry?.content || result || "Primary logo concept generated from the active Brand Workspace.",
          titleOverride: "Primary Logo Concept • " + new Date().toLocaleDateString(),
        });

    if (!savedEntry?.id && !savedEntry?.image) return;

    const durableLogoImage = savedEntry?.image || candidateImage;

    let primaryLogoResult = null;
    try {
      primaryLogoResult = await fetchJsonWithTimeout("/.netlify/functions/set-primary-logo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspaceId: activeBrand.id,
          assetId: savedEntry.id,
          logoImageUrl: durableLogoImage,
          logoMetadata: getLogoProjectFromEntry(savedEntry),
        }),
      }, {
        timeoutMs: 15000,
        errorMessage: "Primary logo was not updated.",
        revealServerError: true,
      });

      if (!(primaryLogoResult?.ok || primaryLogoResult?.success) || !getPrimaryLogoAssetId(primaryLogoResult.workspace || primaryLogoResult) || !getPrimaryLogoImage(primaryLogoResult.workspace || primaryLogoResult)) {
        throw new Error(primaryLogoResult?.message || "Primary logo was not updated.");
      }
    } catch (error) {
      const diagnostic = {
        workspaceId: activeBrand.id,
        assetId: savedEntry.id,
        attemptedFields: ["logo_image_url", "primary_logo_asset_id", "primary_logo_updated_at", "logo_metadata"],
        code: error?.code || "",
        status: error?.status || "",
        message: error?.message || "Unknown primary-logo server error",
        details: error?.details || "",
        hint: error?.hint || "",
      };
      console.error("BrandThat primary logo save failed", JSON.stringify(diagnostic));
      notify("error", "Primary logo was not updated", `${error?.message || "The concept is still available. Try setting it as primary again."}${error?.code ? ` (${error.code})` : ""}`);
      return;
    }

    setBrandWorkspaces((prev) =>
      prev.map((brand) =>
        brand.id === activeBrand.id
          ? mergePrimaryLogoIntoWorkspace(brand, primaryLogoResult, getLogoProjectFromEntry(savedEntry))
          : brand
      )
    );

    notify("success", "Primary logo updated", `${activeBrand.name} now uses this saved concept as its primary logo.`);
    trackBrandthatEvent("brand_logo_set", { source: "saved_generation", savedAssetId: savedEntry?.id || "existing" });
  };

  const setSavedLogoAsBrandProfile = async (entry) => {
    const session = await requireMembershipOrTrial("workspace");
    if (!session) return;

    if (!activeBrand || !entry?.image) {
      notify("error", "No saved logo selected", "Choose a saved logo with an image first.");
      return;
    }

    let primaryLogoResult = null;
    try {
      primaryLogoResult = await fetchJsonWithTimeout("/.netlify/functions/set-primary-logo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          workspaceId: activeBrand.id,
          assetId: entry.id,
          logoImageUrl: entry.image,
          logoMetadata: getLogoProjectFromEntry(entry),
        }),
      }, {
        timeoutMs: 15000,
        errorMessage: "Primary logo was not updated.",
        revealServerError: true,
      });

      if (!(primaryLogoResult?.ok || primaryLogoResult?.success) || !getPrimaryLogoAssetId(primaryLogoResult.workspace || primaryLogoResult) || !getPrimaryLogoImage(primaryLogoResult.workspace || primaryLogoResult)) {
        throw new Error(primaryLogoResult?.message || "Primary logo was not updated.");
      }
    } catch (error) {
      const diagnostic = {
        workspaceId: activeBrand.id,
        assetId: entry.id,
        attemptedFields: ["logo_image_url", "primary_logo_asset_id", "primary_logo_updated_at", "logo_metadata"],
        code: error?.code || "",
        status: error?.status || "",
        message: error?.message || "Unknown primary-logo server error",
        details: error?.details || "",
        hint: error?.hint || "",
      };
      console.error("Could not sync saved brand logo:", JSON.stringify(diagnostic));
      notify("error", "Primary logo was not updated", `${error?.message || "Please try again."}${error?.code ? ` (${error.code})` : ""}`);
      return;
    }

    setBrandWorkspaces((prev) =>
      prev.map((brand) =>
        brand.id === activeBrand.id
          ? mergePrimaryLogoIntoWorkspace(brand, primaryLogoResult, getLogoProjectFromEntry(entry))
          : brand
      )
    );

    notify("success", "Brand logo updated", `${activeBrand.name} now uses ${entry.title || "this saved logo"}.`);
    trackBrandthatEvent("brand_logo_set", { source: "saved_logo" });
  };

  const buildWorkspaceKit = () => {
    if (!activeBrand) return "Create a Brand Workspace first.";

    const plan = getWorkspacePlan(activeBrand);
    const saved = activeBrand.saved || {};
    const captions = saved.captions?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved captions yet.";
    const hooks = saved.hooks?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved hooks yet.";
    const bios = saved.bios?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved bios yet.";
    const insightCards = getBrandInsightCards(activeBrand);
    const platformPlan = Array.isArray(plan.platformStrategy) && plan.platformStrategy.length ? plan.platformStrategy : getSocialPlatformRecommendations(activeBrand);
    const roadmap = normalizeRoadmapItems(plan.launchRoadmap90Days || plan.launchRoadmap || plan.launchRoadmap30Days);
    const contentIdeas = Array.isArray(plan.first20ContentIdeas) && plan.first20ContentIdeas.length ? plan.first20ContentIdeas : [];

    return `BRANDTHAT.AI BRAND KIT

Brand Name:
${activeBrand.name}

Brand Summary:
${plan.brandSummary}

Core Opportunity:
${plan.coreOpportunity}

Brand Thesis:
${plan.brandThesis}

Target Audience:
${plan.targetAudience}

Customer Motivation:
${plan.customerMotivation}

Brand Positioning:
${plan.positioning}

Competitive Differentiation:
${plan.competitiveDifferentiation}

Core Offer:
${plan.coreOffer}

Brand Personality:
${plan.brandPersonality}

Brand Voice:
${plan.brandVoice}

Messaging Direction:
${plan.messagingDirection}

Moodboard Direction:
${plan.moodboardDirection}

Typography System:
${plan.typographySystem}

Color System:
${plan.colorSystem}

Tagline Ideas:
${(plan.taglineIdeas || []).map((item) => `- ${item}`).join("\n")}

Content Pillars:
${(plan.contentPillars || []).map((item) => `- ${item}`).join("\n")}

First 20 Content Ideas:
${contentIdeas.map((item, index) => `${index + 1}. ${item}`).join("\n")}

90-Day Launch Roadmap:
${roadmap.map((item) => `${item.week}: ${item.focus}\nWhat to do:\n${item.actions.map((action) => `- ${action}`).join("\n")}\nExpected outcome: ${item.outcome}\nCompletion status: ${item.status}`).join("\n\n")}

Brand Readiness Score:
${getBrandReadinessScore(activeBrand)}%

BRAND INTELLIGENCE:
${insightCards.map((card) => `${card.label}: ${card.title}\n${card.copy}\nNext move: ${card.action}`).join("\n\n")}

PLATFORM STRATEGY:
${platformPlan.map((item) => `${item.platform}\nStrategy: ${item.strategy || item.setup}\nLaunch plan: ${item.launchPlan || item.content}\nIdeas: ${(item.postingIdeas || [item.firstMove]).filter(Boolean).join("; ")}`).join("\n\n")}

Logo Direction:
${activeBrand.logoDirection || plan.visualIdentityDirection}

SAVED CAPTIONS:
${captions}

SAVED HOOKS:
${hooks}

SAVED BIOS:
${bios}

SAVED CAMPAIGNS:
${saved.campaign?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved campaigns yet."}

SAVED AUDITS:
${saved.audit?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved audits yet."}

SAVED GROWTH ROADMAPS:
${saved.growth?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved growth roadmaps yet."}

Generated with Brandthat.ai`;
  };

  const buildWorkspaceBookHtml = () => {
    if (!activeBrand) return "<h1>Create a Brand Workspace first.</h1>";

    const plan = getWorkspacePlan(activeBrand);
    const dna = getBrandDNA(plan, activeBrand);
    const psychology = getCustomerPsychology(plan, activeBrand);
    const roadmap = getExpandedRoadmap(plan, activeBrand);
    const scorecard = getPositioningScorecard(plan, activeBrand);
    const checklist = getLaunchChecklist(plan, activeBrand);
    const why = getWhyThisWorks(plan, activeBrand);
    const list = (items = []) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    const rows = (items = {}) => Object.entries(items).map(([label, value]) => `<section><h3>${escapeHtml(label.replace(/([A-Z])/g, " $1").trim())}</h3><p>${escapeHtml(value)}</p></section>`).join("");

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(activeBrand.name)} Brand Book</title>
  <style>
    body{font-family:Inter,Arial,sans-serif;margin:0;background:#f7f5f0;color:#111;line-height:1.55}
    main{max-width:980px;margin:0 auto;padding:56px 28px}
    h1{font-size:56px;letter-spacing:-.05em;line-height:.95;margin:0 0 14px}
    h2{font-size:28px;letter-spacing:-.03em;margin:42px 0 14px}
    h3{margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:.12em}
    p{margin:0 0 14px;color:#444}
    .hero,.grid section,.phase,.score,.check{background:white;border:1px solid #e7e1d8;border-radius:22px;padding:24px;margin-bottom:16px}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .phase strong,.score strong{font-size:32px}
    ul{margin:0;padding-left:20px;color:#333}
    @media print{body{background:white}main{padding:0}.hero,.grid section,.phase,.score,.check{break-inside:avoid}}
  </style>
</head>
<body>
<main>
  <div class="hero">
    <h1>${escapeHtml(activeBrand.name)}</h1>
    <p>${escapeHtml(plan.brandSummary)}</p>
    <p><b>Positioning:</b> ${escapeHtml(plan.positioning)}</p>
  </div>

  <h2>Brand Overview</h2>
  <div class="grid">
    <section><h3>Brand Thesis</h3><p>${escapeHtml(plan.brandThesis)}</p></section>
    <section><h3>Audience</h3><p>${escapeHtml(dna.audience)}</p></section>
    <section><h3>Personality</h3><p>${escapeHtml(dna.personality)}</p></section>
    <section><h3>Voice</h3><p>${escapeHtml(dna.tone)}</p></section>
  </div>

  <h2>Identity Direction</h2>
  <div class="grid">
    <section><h3>Visual Direction</h3><p>${escapeHtml(dna.visualDirection)}</p></section>
    <section><h3>Colors</h3><p>${escapeHtml(dna.colors)}</p></section>
    <section><h3>Typography</h3><p>${escapeHtml(dna.typographyDirection)}</p></section>
    <section><h3>Logo Guidance</h3><p>${escapeHtml(activeBrand.logoDirection || plan.visualIdentityDirection || plan.moodboardDirection)}</p></section>
  </div>

  <h2>Why This Works</h2>
  <div class="grid">${rows(why)}</div>

  <h2>Customer Psychology</h2>
  <div class="grid">
    <section><h3>Desires</h3>${list(psychology.desires)}</section>
    <section><h3>Fears</h3>${list(psychology.fears)}</section>
    <section><h3>Objections</h3>${list(psychology.objections)}</section>
    <section><h3>Buying Triggers</h3>${list(psychology.buyingTriggers)}</section>
  </div>

  <h2>Positioning Scorecard</h2>
  <div class="grid">${Object.entries(scorecard.scores || {}).map(([label, score]) => `<section class="score"><h3>${escapeHtml(label)}</h3><strong>${score}</strong></section>`).join("")}</div>

  <h2>90-Day Roadmap</h2>
  ${roadmap.map((phase) => `<section class="phase"><h3>${escapeHtml(phase.phase)}</h3><p><b>${escapeHtml(phase.priority)}</b></p>${list(phase.tasks)}<p><b>KPIs:</b> ${escapeHtml(phase.kpis.join(", "))}</p><p><b>Completion:</b> ${escapeHtml(phase.completionCriteria)}</p></section>`).join("")}

  <h2>Business Launch Checklist</h2>
  <div class="grid">${checklist.map((item) => `<section class="check"><h3>${escapeHtml(item.complete ? "Complete" : "Open")}</h3><p><b>${escapeHtml(item.label)}</b></p><p>${escapeHtml(item.why)}</p></section>`).join("")}</div>
</main>
</body>
</html>`;
  };

  const downloadBrandKit = () => {
    const kit = buildWorkspaceBookHtml();
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(kit);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
      notify("success", "Brand Book ready", "Choose Save as PDF in the print dialog to export the complete Brand Book.");
      return;
    }

    const blob = new Blob([kit], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = `${activeBrand?.name || "brandthat"}-brand-book.html`;
    element.click();
    URL.revokeObjectURL(url);
    notify("success", "Brand Book downloaded", "Open it in your browser and choose Print to save it as a PDF.");
  };

  const duplicateBrand = async (brandId) => {
    const source = brandWorkspaces.find((brand) => brand.id === brandId);
    if (!source) return;

    const duplicateDraft = {
      name: `${source.name} Copy`,
      logoDirection: source.logoDirection || "",
      description: source.description || "",
      audience: source.audience || "",
      audiencePain: source.audiencePain || "",
      offer: source.offer || "",
      differentiator: source.differentiator || "",
      competitors: source.competitors || "",
      channels: source.channels || "",
      growthPlatform: source.growthPlatform || "",
      currentFollowers: source.currentFollowers || "",
      targetFollowers: source.targetFollowers || "",
      weeklyTime: source.weeklyTime || "",
      logoImage: source.logoImage || "",
      tone: source.tone || "Modern",
      style: source.style || "",
      launchGoal: source.launchGoal || "",
      pricePositioning: source.pricePositioning || "",
      desiredFeeling: source.desiredFeeling || "",
      locationMarket: source.locationMarket || "",
      businessGoal: source.businessGoal || "",
      monthlyRevenueGoal: source.monthlyRevenueGoal || "",
      averagePrice: source.averagePrice || "",
    };

    const newBrand = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      ...duplicateDraft,
      structuredPlan: source.structuredPlan || null,
      brandDNA: source.brandDNA || source.structuredPlan?.brandDNA || null,
      launchChecklist: source.launchChecklist || source.structuredPlan?.launchChecklist || [],
      creativeDirectorNotes: source.creativeDirectorNotes || source.structuredPlan?.creativeDirectorNotes || null,
      saved: emptySavedBuckets(),
      createdAt: new Date().toISOString(),
    };

    let finalBrand = newBrand;

    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from("brand_workspaces")
          .insert({
            user_id: user.id,
            name: duplicateDraft.name,
            description: duplicateDraft.description,
            logo_direction: duplicateDraft.logoDirection,
            audience: duplicateDraft.audience,
            tone: duplicateDraft.tone,
            style: duplicateDraft.style,
            launch_goal: duplicateDraft.launchGoal,
          })
          .select("*")
          .single();

        if (error) throw error;
        finalBrand = mapWorkspaceRow(data);
      } catch (error) {
        notify("warning", "Duplicated locally", `We could not sync the duplicate yet. ${error.message || ""}`);
      }
    }

    setBrandWorkspaces((prev) => [finalBrand, ...prev]);
    setActiveBrandId(finalBrand.id);
    setPrompt(activeToolKey === "logo" ? buildWorkspaceLogoBrief(finalBrand, getWorkspacePlan(finalBrand)) : "");
    notify("success", "Workspace duplicated", `${finalBrand.name} is ready to edit.`);
  };

  const findSavedAssetById = (entryId) => {
    for (const brand of brandWorkspaces) {
      for (const [bucket, items] of Object.entries(brand.saved || {})) {
        if (!Array.isArray(items)) continue;
        const item = items.find((asset) => asset.id === entryId);
        if (item) return { brand, bucket, item };
      }
    }
    return null;
  };

  const toggleFavorite = async (entryId) => {
    if (!entryId) return;
    const savedMatch = findSavedAssetById(entryId);
    if (!savedMatch) {
      notify("error", "Favorite could not update", "This saved asset could not be found. Refresh the workspace and try again.");
      return false;
    }

    const nextFavorite = !Boolean(savedMatch.item.favorite || favoriteIds[entryId]);
    const nextMetadata = {
      ...(savedMatch.item.assetMeta || {}),
      assetType: savedMatch.item.assetType || (savedMatch.item.isCollection ? `${savedMatch.bucket.replace(/s$/, "")}_collection` : savedMatch.bucket.replace(/s$/, "")),
      generatorType: savedMatch.item.tool || savedMatch.bucket,
      platform: savedMatch.item.platform || "",
      collection: Boolean(savedMatch.item.isCollection),
      favorite: nextFavorite,
      contentHash: savedMatch.item.contentHash || normalizeAssetContent(savedMatch.item.content || savedMatch.item.image || ""),
      workspaceId: savedMatch.brand.id,
      updatedAt: new Date().toISOString(),
    };
    const nextContentWithMeta = encodeSavedAssetContent(savedMatch.item.content || "", nextMetadata);
    const nextStoredContent = savedMatch.item.project
      ? encodeLogoProjectContent(nextContentWithMeta, savedMatch.item.project)
      : nextContentWithMeta;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user?.id) throw new Error("No authenticated session.");

      const { data, error } = await supabase
        .from("saved_generations")
        .update({ content: nextStoredContent })
        .eq("id", entryId)
        .eq("user_id", sessionData.session.user.id)
        .select("*")
        .single();

      if (error) throw error;
      if (!data?.id) throw new Error("Favorite update did not return a durable record.");
    } catch (error) {
      console.error("BrandThat durable favorite update failed", {
        entryId,
        code: error?.code || "",
        message: error?.message || "Unknown Supabase favorite error",
      });
      notify("error", "Favorite could not update", "Please try again. Your saved assets were not changed.");
      return false;
    }

    setFavoriteIds((prev) => ({ ...prev, [entryId]: nextFavorite }));
    setBrandWorkspaces((prev) => prev.map((brand) => ({
      ...brand,
      saved: Object.fromEntries(Object.entries(brand.saved || {}).map(([bucket, items]) => [
        bucket,
        Array.isArray(items) ? items.map((item) => item.id === entryId ? { ...item, favorite: nextFavorite, assetMeta: { ...(item.assetMeta || {}), favorite: nextFavorite } } : item) : items,
      ])),
    })));
    notify("success", nextFavorite ? "Favorited" : "Favorite removed", nextFavorite ? "This asset now appears in Favorites." : "This asset was removed from Favorites.");
    return true;
  };

  const deleteSavedAsset = async (entryId) => {
    if (!entryId || !activeBrand) return;
    if (!window.confirm("Delete this saved asset?")) return;
    setBrandWorkspaces((prev) => prev.map((brand) => {
      if (brand.id !== activeBrand.id) return brand;
      return {
        ...brand,
        saved: Object.fromEntries(Object.entries(brand.saved || {}).map(([bucket, items]) => [
          bucket,
          Array.isArray(items) ? items.filter((item) => item.id !== entryId) : items,
        ])),
      };
    }));
    setFavoriteIds((prev) => {
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        const { error } = await supabase
          .from("saved_generations")
          .delete()
          .eq("id", entryId)
          .eq("user_id", sessionData.session.user.id);
        if (error) throw error;
      }
      notify("success", "Asset deleted", "The saved asset was removed from this workspace.");
    } catch (error) {
      notify("warning", "Deleted locally", `We could not sync the deletion yet. ${error.message || ""}`);
    }
  };

  const remixOutput = (entry) => {
    if (!entry) return;
    const tool = toolMap[entry.tool] || activeTool;
    setActiveToolKey(tool.key);
    setSelectedPlatform(activeBrand?.style || "");
    setCreativeTone(activeBrand?.name || "");
    setPrompt(`Remix this ${tool.shortTitle || "brand asset"} into a stronger version:

${entry.content || "Use the saved logo direction and improve it."}`);
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoCreativeBrief(null);
    setPage(tool.key === "logo" ? "logo" : "studio");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const regenerateWorkspaceSection = (label, value, modifier = "Regenerate") => {
    if (!activeBrand) return;
    const sectionText = typeof value === "string" ? value : JSON.stringify(value || {}, null, 2);
    setActiveToolKey("strategy");
    setSelectedPlatform(label);
    setCreativeTone(activeBrand.name || "");
    setPrompt(`${modifier} only the ${label} section for this Brand Workspace.

Use the Brand DNA and current workspace context. Do not rebuild the whole project. Keep user-edited decisions intact. Make the output specific, decisive, practical, and include a concise "Why this works" explanation.

Current Brand Workspace:
${buildBrandPrompt(activeBrand)}

Current ${label} section:
${sectionText}`);
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoCreativeBrief(null);
    setPage("studio");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const getRecentGenerations = (limit = 8) => {
    return brandWorkspaces
      .flatMap((brand) =>
        Object.entries(brand.saved || {}).flatMap(([bucket, items]) =>
          (items || []).map((item) => ({ ...item, bucket, brandName: brand.name, workspaceId: brand.id }))
        )
      )
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, limit);
  };

  function buildBrandPrompt(brand) {
    const plan = getWorkspacePlan(brand);
    const dna = getBrandDNA(plan, brand);
    return `Brand name: ${brand.name}
Core opportunity: ${plan.coreOpportunity || "Not provided"}
Brand thesis: ${plan.brandThesis || "Not provided"}
Brand description: ${brand.description}
Audience: ${brand.audience}
Brand DNA audience: ${dna.audience}
Brand DNA positioning: ${dna.positioning}
Brand archetype: ${dna.archetype}
Customer emotions: ${dna.customerEmotions.join(", ")}
Audience pain/desire: ${brand.audiencePain || "Not provided"}
Core offer: ${brand.offer || "Not provided"}
Differentiator: ${brand.differentiator || "Not provided"}
Competitors/references: ${brand.competitors || "Not provided"}
Brand tone: ${brand.tone}
Logo direction: ${brand.logoDirection}
Visual style: ${brand.style}
Visual DNA: ${dna.visualDirection}
Moodboard direction: ${plan.moodboardDirection || "Not provided"}
Typography direction: ${plan.typographySystem || "Not provided"}
Color direction: ${plan.colorSystem || "Not provided"}
Primary channels: ${brand.channels || "Not provided"}
Growth platform: ${brand.growthPlatform || "Not provided"}
Current followers: ${brand.currentFollowers || "Not provided"}
Target followers: ${brand.targetFollowers || "Not provided"}
Weekly time available: ${brand.weeklyTime || "Not provided"}
Price positioning: ${brand.pricePositioning || "Not provided"}
Location or market: ${brand.locationMarket || "Not provided"}
Business goal: ${brand.businessGoal || "Not provided"}
Launch goal: ${brand.launchGoal}
Brand readiness score: ${getBrandReadinessScore(brand)}%`;
  }

  const incrementDailyFreeUse = () => {
    const today = getTodayKey();
    const storedDate = localStorage.getItem("brandthat_daily_date");
    let currentCount = dailyFreeCount;

    if (storedDate !== today) {
      currentCount = 0;
      localStorage.setItem("brandthat_daily_date", today);
    }

    const newCount = currentCount + 1;
    localStorage.setItem("brandthat_daily_count", String(newCount));
    setDailyFreeCount(newCount);

    if (user?.id) {
      supabase
        .from("user_profiles")
        .update({ daily_logo_uses: newCount, last_logo_use_date: today, updated_at: new Date().toISOString() })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) console.warn("Could not update daily usage:", error.message);
        });
    }
  };

  const incrementTrialGenerationUse = () => {
    if (isMember) return;

    const newCount = trialGenerationCount + 1;
    localStorage.setItem("brandthat_trial_generation_count", String(newCount));
    setTrialGenerationCount(newCount);

    if (newCount >= TRIAL_GENERATION_LIMIT) {
      notify("info", "Membership required", "Start BrandThat for $9.99/month to unlock the workspace, roadmap, generators, and logo concepts.");
    }
  };

  const requireMembershipOrTrial = async (action = "generate") => {
    const session = await requireVerifiedAccount(action, "Create your BrandThat account and verify your email before generating a Brand Plan.");
    if (!session) return null;

    if (isMember) return session;

    const reconciled = await reconcileMembership(session, action);
    if (reconciled) return session;

    showMembershipOffer("BrandThat costs $9.99/month and unlocks the full workspace, roadmap, generators, and logo concepts.");
    return null;
  };

  const selectTool = async (toolKey) => {
    const session = await requireMembershipOrTrial("open_tool");
    if (!session) return;

    const nextTool = toolMap[toolKey] || tools[0];
    setActiveToolKey(nextTool.key);
    const activePlanForLogo = activeBrand ? getWorkspacePlan(activeBrand) : {};
    const logoDefaults = activeBrand ? getLogoRecommendations(activeBrand, activePlanForLogo) : null;
    const logoPalette = activeBrand ? getIdentityPalette(activeBrand, activePlanForLogo) : [];
    setSelectedPlatform(nextTool.key === "logo" && activeBrand ? logoDefaults.brandFeel.join(", ") : "");
    setCreativeTone(nextTool.key === "logo" && activeBrand ? activeBrand.name || "" : "");
    setLogoIndustry(nextTool.key === "logo" && activeBrand ? getWorkspaceIndustry(activeBrand, activePlanForLogo) : "");
    setLogoSymbol(nextTool.key === "logo" && activeBrand ? logoDefaults.symbolDirection : "");
    setLogoColors(nextTool.key === "logo" && activeBrand ? logoPalette.map((item) => item.name + " " + item.hex).join(", ") : "");
    setLogoAvoid(nextTool.key === "logo" && activeBrand ? "generic wellness leaves, unrelated technology symbols, misspelled text, tiny decorative details" : "");
    setCaptionGoal("Awareness");
    setPrompt(nextTool.key === "logo" && activeBrand ? buildWorkspaceLogoBrief(activeBrand, activePlanForLogo) : "");
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoCreativeBrief(null);
    setWorkspaceSection("tools");
    setPage(nextTool.key === "logo" ? "logo" : "studio");
    window.history.pushState({}, "", getWorkspaceToolPath(nextTool.key));
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const navigateWorkspaceSection = async (section = "overview") => {
    const session = await requireMembershipOrTrial("open_workspace");
    if (!session) return;
    const normalizedSection = ["overview", "strategy", "identity", "tools", "roadmap", "assets", "settings"].includes(section) ? section : "overview";
    setWorkspaceSection(normalizedSection);
    setPage("workspace");
    setAppMenuOpen(false);
    setCreateMenuOpen(false);
    window.history.pushState({}, "", getWorkspaceSectionPath(normalizedSection));
    setTimeout(() => document.querySelector(".appMain")?.scrollTo?.({ top: 0, behavior: "smooth" }), 40);
  };

  const openToolFromApp = async (toolKey) => {
    setCreateMenuOpen(false);
    setAppMenuOpen(false);
    await selectTool(toolKey);
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextPage = getInitialPageFromPath();
      setPage(nextPage);
      setWorkspaceSection(getInitialWorkspaceSectionFromPath());
      setActiveToolKey(getInitialToolFromPath());
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const openSeoPage = async (seoKey) => {
    const seoPage = seoPages[seoKey];
    if (!seoPage) return;
    const session = await requireVerifiedAccount("open_tool", "Create your BrandThat account to try the full product.");
    if (!session) return;

    const nextTool = toolMap[seoPage.toolKey] || tools[0];

    window.history.pushState({}, "", seoPage.path);
    setPage(seoKey);
    setActiveToolKey(nextTool.key);
    setSelectedPlatform("");
    setCreativeTone("");
    setLogoIndustry("");
    setLogoSymbol("");
    setLogoColors("");
    setLogoAvoid("");
    setPrompt("");
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const buildGuidedBrandPlan = async () => {
    const session = await requireMembershipOrTrial("generate");
    if (!session) return;

    const brandName = workspaceDraft.name.trim();
    const idea = workspaceDraft.description.trim();
    if (!brandName || !idea) {
      notify("error", "Add the brand name and idea", "BrandThat only needs two things to begin: the brand name and what you are building.");
      return;
    }

    const guidedPrompt = `You are BrandThat, a senior brand strategist. Create one complete Brand Plan from only the brand name and rough business idea.

Brand name:
${brandName}

What the user is building:
${workspaceDraft.description}

Optional context from the user:
Target customer: ${workspaceDraft.audience || "Infer the most useful first customer segment."}
Price positioning: ${workspaceDraft.pricePositioning || "Infer whether the brand should feel accessible, premium, luxury, or value-led."}
Desired feeling: ${workspaceDraft.desiredFeeling || "Infer the emotional response the brand should create."}
Location or market: ${workspaceDraft.locationMarket || "Infer the market context from the idea."}
Competitors or admired references: ${workspaceDraft.competitors || "Use category logic without inventing factual competitor details."}
Business goal: ${workspaceDraft.businessGoal || workspaceDraft.launchGoal || "Launch with a clear brand plan and first customers."}

Rules:
- Make decisions. Do not define categories.
- Every recommendation must explain WHY it fits this specific brand.
- Reject generic advice such as "use premium typography", "post consistently", or "build trust".
- If a section could apply to hundreds of businesses, regenerate it internally before answering.
- Do not output undefined, null, empty sections, placeholder labels, or repeated recommendations.
- Choose only the platforms that genuinely fit this brand. Do not recommend every platform.
- Logo concepts come last and must be based on the strategy, moodboard, typography, color system, audience, voice, and positioning.
- Build a persistent Brand DNA object containing audience, positioning, personality, archetype, tone, visual direction, colors, typography direction, key differentiators, customer emotions, and business goals.
- Add concise "Why this works" reasoning for positioning, audience, colors, typography, messaging, and launch strategy.
- Add customer psychology, competitor positioning, reality check, positioning scorecard, Creative Director Notes, business launch checklist, revenue planning assumptions, and a concrete 30/60/90 execution roadmap.

Return a complete Brand Plan with these sections:
1. Brand Summary
2. Brand Thesis
3. Core Opportunity
4. Target Audience
5. Customer Motivation
6. Brand Positioning
7. Competitive Differentiation
8. Brand Personality
9. Brand Voice
10. Messaging Direction
11. Moodboard Direction
12. Typography Direction
13. Color System
14. Tagline Ideas
15. Platform-by-Platform Strategy
16. Content Pillars
17. First 20 Content Ideas
18. Launch Roadmap with First 24 Hours, First Week, First Month, Days 31-60, Days 61-90. Each phase must include what to do, why it matters, expected outcome, and completion status.
19. Growth Opportunities
20. Next Best Actions
21. Saved Brand Workspace summary
22. Brand DNA
23. Why This Works
24. Customer Psychology
25. Competitor Positioning
26. Reality Check
27. Positioning Scorecard
28. Creative Director Notes
29. Business Launch Checklist
30. Revenue Planning

Output should make the user feel: "I know exactly what my brand is and exactly what I should do next."`;

    setActiveToolKey("brand");
    setSelectedPlatform(workspaceDraft.style || "New Business");
    setCreativeTone(workspaceDraft.tone || "Modern");
    setLogoIndustry("");
    setLogoSymbol("");
    setLogoColors("");
    setLogoAvoid("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoCreativeBrief(null);
    setResult("");
    setPrompt(guidedPrompt);
    setPendingBrandPlanPrompt(guidedPrompt);
    setPage("studio");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const getBrandPlanRequestPayload = (promptValue = prompt) => ({
    idea: workspaceDraft.description || promptValue,
    brandName: workspaceDraft.name,
    audience: workspaceDraft.audience,
    positioning: workspaceDraft.differentiator,
    personality: workspaceDraft.tone,
    visualDirection: workspaceDraft.logoDirection || workspaceDraft.style,
    moodboard: workspaceDraft.style,
    roadmapGoal: workspaceDraft.targetFollowers || workspaceDraft.launchGoal,
    offer: workspaceDraft.offer,
    pricePositioning: workspaceDraft.pricePositioning,
    desiredFeeling: workspaceDraft.desiredFeeling,
    locationMarket: workspaceDraft.locationMarket,
    competitors: workspaceDraft.competitors,
    businessGoal: workspaceDraft.businessGoal || workspaceDraft.launchGoal,
    monthlyRevenueGoal: workspaceDraft.monthlyRevenueGoal,
    averagePrice: workspaceDraft.averagePrice,
    rawPrompt: promptValue,
  });

  const applyStructuredBrandPlanToDraft = (plan = {}) => {
    const normalizedPlan = normalizeBrandPlan(plan, getBrandPlanRequestPayload());
    const workspaceContext = normalizedPlan.workspaceContext || {};
    const logoContext = normalizedPlan.logoContext || {};

    setWorkspaceDraft((current) => ({
      ...current,
      name: current.name || normalizedPlan.brandName || logoContext.brandName || "",
      description: current.description || normalizedPlan.brandSummary || "",
      audience: current.audience || normalizedPlan.targetAudience || workspaceContext.audience || "",
      offer: current.offer || normalizedPlan.coreOffer || workspaceContext.offer || "",
      differentiator: current.differentiator || normalizedPlan.positioning || workspaceContext.differentiator || "",
      competitors: current.competitors || normalizedPlan.competitorCategory || "",
      tone: current.tone && current.tone !== "Modern" ? current.tone : tones.includes(normalizedPlan.brandPersonality) ? normalizedPlan.brandPersonality : current.tone || "Modern",
      style: current.style || normalizedPlan.moodboardDirection || workspaceContext.moodboard || logoContext.style || "",
      logoDirection: [
        normalizedPlan.coreOpportunity ? `Core opportunity: ${normalizedPlan.coreOpportunity}` : "",
        normalizedPlan.brandThesis ? `Brand thesis: ${normalizedPlan.brandThesis}` : "",
        normalizedPlan.brandPersonality ? `Brand personality: ${normalizedPlan.brandPersonality}` : "",
        normalizedPlan.visualIdentityDirection || workspaceContext.visualDirection || "",
        logoContext.symbolIdeas ? `Symbol ideas: ${logoContext.symbolIdeas}` : "",
        logoContext.typography ? `Typography: ${logoContext.typography}` : normalizedPlan.typographySystem ? `Typography: ${normalizedPlan.typographySystem}` : "",
        logoContext.colors ? `Colors: ${logoContext.colors}` : normalizedPlan.colorSystem ? `Colors: ${normalizedPlan.colorSystem}` : "",
      ].filter(Boolean).join("\n"),
      launchGoal: current.launchGoal || workspaceContext.roadmapGoal || "Turn the brand plan into logo concepts, launch content, and a saved workspace.",
      businessGoal: current.businessGoal || normalizedPlan.brandDNA?.businessGoals?.[0] || "",
    }));
  };

  const createWorkspaceFromBrandPlan = async (plan = {}, planText = "", session = null) => {
    const normalizedPlan = normalizeBrandPlan(plan, getBrandPlanRequestPayload(planText));
    const workspaceContext = normalizedPlan.workspaceContext || {};
    const logoContext = normalizedPlan.logoContext || {};
    const brandName = normalizedPlan.brandName || logoContext.brandName || workspaceDraft.name || "New Brand";
    const existing = brandWorkspaces.find((brand) => brand.name?.toLowerCase() === brandName.toLowerCase());
    const brandId = existing?.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const brandAsset = {
      id: crypto.randomUUID ? crypto.randomUUID() : `brand-plan-${Date.now()}`,
      tool: "brand",
      title: `Brand Plan • ${new Date().toLocaleDateString()}`,
      content: planText,
      image: "",
      createdAt: new Date().toISOString(),
    };
    let nextBrand = {
      ...(existing || {}),
      id: brandId,
      name: brandName,
      workspaceDataVersion: WORKSPACE_DATA_VERSION,
      structuredPlan: normalizedPlan,
      description: normalizedPlan.brandSummary || workspaceDraft.description || "",
      audience: normalizedPlan.targetAudience || workspaceContext.audience || workspaceDraft.audience || "",
      audiencePain: workspaceDraft.audiencePain || "",
      offer: normalizedPlan.coreOffer || workspaceContext.offer || workspaceDraft.offer || "",
      differentiator: normalizedPlan.positioning || workspaceContext.differentiator || workspaceDraft.differentiator || "",
      competitors: normalizedPlan.competitorCategory || workspaceDraft.competitors || "",
      channels: workspaceDraft.channels || "",
      growthPlatform: workspaceDraft.growthPlatform || "",
      currentFollowers: workspaceDraft.currentFollowers || "",
      targetFollowers: workspaceDraft.targetFollowers || "",
      weeklyTime: workspaceDraft.weeklyTime || "",
      pricePositioning: workspaceDraft.pricePositioning || existing?.pricePositioning || "",
      desiredFeeling: workspaceDraft.desiredFeeling || existing?.desiredFeeling || "",
      locationMarket: workspaceDraft.locationMarket || existing?.locationMarket || "",
      businessGoal: workspaceDraft.businessGoal || existing?.businessGoal || "",
      monthlyRevenueGoal: workspaceDraft.monthlyRevenueGoal || existing?.monthlyRevenueGoal || "",
      averagePrice: workspaceDraft.averagePrice || existing?.averagePrice || "",
      brandDNA: normalizedPlan.brandDNA,
      launchChecklist: existing?.launchChecklist || normalizedPlan.launchChecklist,
      creativeDirectorNotes: existing?.creativeDirectorNotes || normalizedPlan.creativeDirectorNotes,
      logoImage: existing?.logoImage || workspaceDraft.logoImage || "",
      tone: tones.includes(normalizedPlan.brandPersonality) ? normalizedPlan.brandPersonality : workspaceDraft.tone || existing?.tone || "Modern",
      style: normalizedPlan.moodboardDirection || workspaceContext.moodboard || logoContext.style || workspaceDraft.style || existing?.style || "",
      logoDirection: [
        normalizedPlan.coreOpportunity ? `Core opportunity: ${normalizedPlan.coreOpportunity}` : "",
        normalizedPlan.brandThesis ? `Brand thesis: ${normalizedPlan.brandThesis}` : "",
        normalizedPlan.brandPersonality ? `Brand personality: ${normalizedPlan.brandPersonality}` : "",
        normalizedPlan.visualIdentityDirection || workspaceContext.visualDirection || "",
        logoContext.symbolIdeas ? `Symbol ideas: ${logoContext.symbolIdeas}` : "",
        normalizedPlan.typographySystem ? `Typography: ${normalizedPlan.typographySystem}` : "",
        normalizedPlan.colorSystem ? `Colors: ${normalizedPlan.colorSystem}` : "",
      ].filter(Boolean).join("\n"),
      launchGoal: [
        normalizedPlan.nextStepActionPlan?.length ? `Next actions: ${normalizedPlan.nextStepActionPlan.join(" ")}` : "",
        normalizedPlan.launchRoadmap30Days?.length ? normalizedPlan.launchRoadmap30Days.map((item) => `${item.week}: ${item.focus} - ${(item.actions || []).join(", ")}`).join("\n") : workspaceDraft.launchGoal || "",
      ].filter(Boolean).join("\n\n"),
      saved: {
        ...emptySavedBuckets(),
        ...(existing?.saved || {}),
        brand: [brandAsset, ...((existing?.saved?.brand || []).filter((item) => item.content !== planText))].slice(0, 8),
      },
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    if (session?.user?.id) {
      try {
        const { data, error } = await supabase
          .from("brand_workspaces")
          .insert({
            user_id: session.user.id,
            name: nextBrand.name,
            description: nextBrand.description,
            logo_direction: nextBrand.logoDirection,
            audience: nextBrand.audience,
            tone: nextBrand.tone,
            style: nextBrand.style,
            launch_goal: nextBrand.launchGoal,
          })
          .select("*")
          .single();

        if (error) throw error;

        nextBrand = {
          ...nextBrand,
          id: data.id,
          createdAt: data.created_at || nextBrand.createdAt,
        };

        const storageContent = encodeLogoProjectContent(planText, {
          structuredPlan: normalizedPlan,
          brandName: normalizedPlan.brandName,
          strategy: normalizedPlan,
          logoContext: normalizedPlan.logoContext || {},
          source: "brand-plan",
        });

        const { data: generationData, error: generationError } = await supabase
          .from("saved_generations")
          .insert({
            user_id: session.user.id,
            workspace_id: nextBrand.id,
            tool: "brand",
            title: brandAsset.title,
            content: storageContent,
            image_url: "",
          })
          .select("*")
          .single();

        if (!generationError && generationData) {
          nextBrand.saved = {
            ...nextBrand.saved,
            brand: [mapGenerationRow(generationData)],
          };
        }
      } catch (error) {
        notify("warning", "Workspace saved locally", `We could not sync this workspace to your account yet. ${error.message || ""}`);
      }
    }

    brandthatDevLog("parsed workspace object", nextBrand);
    setBrandWorkspaces((prev) => [nextBrand, ...prev.filter((brand) => brand.id !== brandId && brand.id !== nextBrand.id)]);
    setActiveBrandId(nextBrand.id);
    return nextBrand;
  };

  const getBrandStrategyContextForLogo = () => {
    const brandPlanProject = activeToolKey === "brand" ? decodeLogoProjectFromContent(result) : null;
    const currentBrandPlanText = activeToolKey === "brand" ? stripLogoProjectMetadata(result) : "";

    return {
      brandName: activeBrand?.name || workspaceDraft.name || creativeTone || "",
      industry: logoIndustry || "",
      targetCustomer: activeBrand?.audience || workspaceDraft.audience || "",
      positioning: activeBrand?.differentiator || workspaceDraft.differentiator || "",
      coreMessage: activeBrand?.offer || workspaceDraft.offer || "",
      brandPersonality: activeBrand?.tone || workspaceDraft.tone || "",
      suggestedVisualDirection: activeBrand?.logoDirection || workspaceDraft.logoDirection || "",
      suggestedMoodboardDirection: activeBrand?.style || workspaceDraft.style || "",
      suggestedTypographyDirection: workspaceDraft.logoDirection || "",
      suggestedColorDirection: logoColors || "",
      roadmapGoal: activeBrand?.launchGoal || workspaceDraft.launchGoal || workspaceDraft.targetFollowers || "",
      brandPlanText: currentBrandPlanText,
      structuredPlan: brandPlanProject?.structuredPlan || null,
    };
  };

  const getCurrentLogoBrandContext = () => {
    const parsedLogo = parseNaturalLogoPrompt({
      prompt,
      brandName: creativeTone,
      style: selectedPlatform,
      industry: logoIndustry,
      symbol: logoSymbol,
      colors: logoColors,
      avoid: logoAvoid,
    });
    const strategy = logoCreativeBrief?.brandStrategy || {};
    const primaryConcept = logoCreativeBrief?.concepts?.[0] || {};

    return {
      parsedLogo,
      strategy,
      primaryConcept,
      brandName: parsedLogo.brandName || creativeTone || logoCreativeBrief?.brandName || "",
      industry: parsedLogo.industry || logoIndustry || logoCreativeBrief?.category || "",
      style: parsedLogo.style || selectedPlatform || primaryConcept.style || "",
      colors: parsedLogo.colors || logoColors || primaryConcept.palette || strategy.suggestedColorDirection || "",
      symbol: parsedLogo.symbol || logoSymbol || primaryConcept.symbol || "",
      visualDirection: strategy.suggestedVisualDirection || primaryConcept.whyFits || logoCreativeBrief?.visualTerritory || "",
    };
  };

  const startWorkspaceFromCurrentLogo = async () => {
    const session = await requireMembershipOrTrial("save_logo_project");
    if (!session) return;

    const context = getCurrentLogoBrandContext();
    const generatedBrandPlan = activeToolKey === "brand" ? stripLogoProjectMetadata(result) : "";

    setWorkspaceDraft({
      ...getDefaultWorkspaceDraft(),
      name: context.brandName || workspaceDraft.name || "New Brand",
      description: generatedBrandPlan || context.strategy.coreMessage || workspaceDraft.description || `${context.brandName || "This brand"} is a ${context.industry || "modern"} brand ready for launch.`,
      logoDirection: [
        generatedBrandPlan ? "Generated brand plan is saved in the description." : "",
        context.visualDirection,
        context.symbol ? `Symbol: ${context.symbol}` : "",
        context.colors ? `Colors: ${context.colors}` : "",
      ].filter(Boolean).join("\n"),
      tone: context.style || "Modern",
      style: context.style || "",
      audience: context.strategy.targetCustomer || "",
      offer: context.strategy.coreMessage || generatedBrandPlan || "",
      differentiator: context.strategy.positioning || workspaceDraft.differentiator || "",
      competitors: context.strategy.competitorCategory || "",
      launchGoal: workspaceDraft.launchGoal || "Launch the brand with a strategy, visual identity direction, roadmap, logo concepts, first captions, and hashtags.",
      logoImage,
    });
    setPage("workspace");
    notify("success", "Concept prepared", "Review the generated concept, then save it to the active brand workspace.");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const buildGrowthRoadmapFromCurrentLogo = async () => {
    const session = await requireMembershipOrTrial("generate");
    if (!session) return;

    const context = getCurrentLogoBrandContext();
    const generatedBrandPlan = activeToolKey === "brand" ? stripLogoProjectMetadata(result) : "";
    const roadmapPrompt = `Create a practical 30-day launch and growth roadmap for this brand.

Brand name: ${context.brandName || "The brand"}
Industry: ${context.industry || "Use the brand idea"}
Positioning: ${context.strategy.positioning || "modern, clear, trustworthy"}
Target customer: ${context.strategy.targetCustomer || "ideal customers for this business"}
Core message: ${context.strategy.coreMessage || prompt}
Brand plan context: ${generatedBrandPlan || "Use the current brand plan and generator context."}
Visual direction: ${context.visualDirection || "use the brand plan's identity direction"}
Goal: build awareness, publish consistently, and turn the new brand identity into social content, website messaging, and first customer interest.

Include weekly priorities, post types, posting frequency, what to post, simple CTAs, and what to measure.`;

    setActiveToolKey("growth");
    setSelectedPlatform(context.industry || "Multi-platform");
    setCreativeTone(context.brandName || "");
    setLogoIndustry("");
    setLogoSymbol("");
    setLogoColors("");
    setLogoAvoid("");
    setPrompt(roadmapPrompt);
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setPage("studio");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const getSystemPrompt = () => {
    const activePlan = activeBrand ? getWorkspacePlan(activeBrand) : null;
    const activeDNA = activeBrand ? getBrandDNA(activePlan, activeBrand) : null;
    const workspaceContext = activeBrand
      ? `
Current Brand Workspace:
Brand name: ${activeBrand.name}
Logo direction: ${activeBrand.logoDirection}
Description: ${activeBrand.description}
Audience: ${activeBrand.audience}
Audience pain/desire: ${activeBrand.audiencePain || "Not provided"}
Core offer: ${activeBrand.offer || "Not provided"}
Differentiator: ${activeBrand.differentiator || "Not provided"}
Competitors/references: ${activeBrand.competitors || "Not provided"}
Brand tone: ${activeBrand.tone}
Visual style: ${activeBrand.style}
Primary channels: ${activeBrand.channels || "Not provided"}
Growth platform: ${activeBrand.growthPlatform || "Not provided"}
Current followers: ${activeBrand.currentFollowers || "Not provided"}
Target followers: ${activeBrand.targetFollowers || "Not provided"}
Weekly time available: ${activeBrand.weeklyTime || "Not provided"}
Launch goal: ${activeBrand.launchGoal}
Brand readiness score: ${getBrandReadinessScore(activeBrand)}%
Brand DNA:
Audience: ${activeDNA.audience}
Positioning: ${activeDNA.positioning}
Personality: ${activeDNA.personality}
Archetype: ${activeDNA.archetype}
Tone: ${activeDNA.tone}
Visual direction: ${activeDNA.visualDirection}
Colors: ${activeDNA.colors}
Typography: ${activeDNA.typographyDirection}
Differentiators: ${activeDNA.keyDifferentiators.join("; ")}
Customer emotions: ${activeDNA.customerEmotions.join(", ")}
Business goals: ${activeDNA.businessGoals.join("; ")}
`
      : "";

    if (activeTool.key === "captions") {
      return `
You are BrandThat's caption generator for a paid Brand Workspace.

User platform:
${selectedPlatform || "General social media"}

User post/topic description:
${prompt}

Caption goal:
${captionGoal || "Awareness"}

Task:
Generate exactly 8 candidate captions based on the active Brand Workspace and the user's post description. The server will editorially select or rewrite the best 5 approved captions before returning results.

Format:
Return ONLY a numbered list from 1 to 8.
Do not add headings.
Do not explain anything.
Do not mention Brandthat.ai unless the user specifically asks for that brand.

Rules:
- Exactly 8 candidate captions.
- Every caption must relate directly to the user's post/topic and the active brand context when provided.
- Make them platform-aware for ${selectedPlatform || "the selected platform"}.
- Use these distinct candidate formats in order. Begin each line with the caption copy only:
  1. Punchy: one short, specific line built around the scene.
  2. Story: a small moment or before/after from the post context.
  3. Benefit: one practical outcome the audience wants, without unsupported claims.
  4. Conversational: natural, human, and specific to the audience.
  5. Educational: teach one safe detail without inventing facts, schedules, or proof.
  6. Product: make the actual offer or service tangible.
  7. Community: connect to the local, niche, or audience community when relevant.
  8. Direct CTA: ask for one clear next action.
- Tune all candidates toward this selected goal: ${captionGoal || "Awareness"}.
- Make the goal visible through the CTA, angle, or framing without repeating the word "${captionGoal || "Awareness"}".
- If the goal is Conversion, at least 4 of 8 candidates must include a concrete conversion action, with varied soft CTA, direct CTA, benefit CTA, objection-handling, and offer framing. Do not invent discounts, scarcity, guarantees, stock status, delivery promises, or product facts.
- If the goal is Awareness, prioritize distinct brand memory, category clarity, and one concrete scene detail over direct selling.
- If the goal is Education, make each teaching point safe, specific, and non-claimy; do not ask generic engagement questions.
- If the goal is Engagement, use specific prompts tied to the scene or audience tension, not generic questions.
- If the goal is Launch, make the newness clear without fake scarcity or false availability claims.
- If the goal is Community, connect to the actual audience, place, niche, or shared ritual.
- Use the exact post description as the scene. Include concrete nouns from the post when useful.
- Use the brand thesis, audience, positioning, voice, primary platform, and goal from the active Brand Workspace.
- Avoid repeating the same opening phrase or sentence structure.
- Do not use clichés such as "green companion", "world where", "elevate your space", "bring the outdoors in", "exciting news", or "new arrivals alert".
- Do not ask generic engagement questions unless the selected goal is Engagement or Community and the question is specific to the post.
- If the brand is local, service-based, product-based, or subscription-based, make that visible where useful.
- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, or availability claims unless the user explicitly supplied that evidence.
- For plant care, pet care, health, finance, legal, or technical setup, do not provide exact instructions, schedules, frequencies, diagnoses, claims, or guarantees unless the user supplied those details.
- Do not say plants thrive in low light, limited light, indirect light, or any specific care condition unless the user's current input or saved workspace gives that verified inventory/care detail.
- Do not describe the monthly delivery as featuring specific plant types, easy-care options, current inventory, availability, or ordering status unless the user's current input explicitly says that.
- Avoid "effortless", "stress-free", "foolproof", "green oasis", "fresh air", and "order today" unless the current input supplies evidence for that exact claim.
- Use safer alternatives such as "designed with apartment living in mind", "simple guidance included", "explore this month's plant direction", and "learn more".
- For plant watering, do not give an exact watering frequency unless the plant species, lighting, soil, pot, season, or explicit care instructions are provided. Say watering needs vary and point to the included care card instead.
- Even when a plant species is supplied, do not claim air purification, improved air quality, mood improvement, pet safety, non-toxicity, guaranteed growth, or health benefits as fact unless verified product information was supplied by the user.
- Safe plant phrasing example: "Snake plants are a popular low-maintenance choice for apartment greenery."
- Prefer non-quantified lifestyle language when mentioning benefits.
- Do not invent reviews, sales results, guarantees, product features, or fulfillment promises.
- Avoid repetitive openings such as "Exciting news" and "New arrivals alert."
- Avoid cheesy filler.
- Keep each caption copy-ready.
- Do not use phrases like "houseplant buddy", "plant journey", "green friend", or "no green thumb required" unless the user supplied those exact words.
${workspaceContext}
`;
    }

    if (activeTool.key === "hashtags") {
      return `
You are BrandThat's hashtag generator for a paid Brand Workspace.

User platform:
${selectedPlatform || "General social media"}

User topic/post description:
${prompt}

Task:
Generate exactly 50 highly relevant hashtags based on the active Brand Workspace and the user's topic.

Format:
Return ONE clean copy-ready block only.
Do not create categories.
Do not add headings.
Do not number anything.
Do not explain anything.
Do not mention Brandthat.ai.

Output example format:
#tagone #tagtwo #tagthree #tagfour

Rules:
- Exactly 50 hashtags.
- Every hashtag must relate to the user's topic/post.
- Use platform-aware hashtags for ${selectedPlatform || "the selected platform"}.
- Mix broad, niche, community, and discovery hashtags naturally in one block.
- Avoid random spam tags.
- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, availability, or exact-care claims.
- Avoid repeated hashtags.
- Keep the output easy to copy and paste.
${workspaceContext}
`;
    }

    if (["hooks", "bios", "email", "strategy", "brand", "audit", "campaign", "growth"].includes(activeTool.key)) {
      const toolInstructions = {
        hooks: "Generate exactly 10 short-form video hooks. Make them scroll-stopping, specific, and usable as on-screen text for the selected platform.",
        bios: "Generate exactly 10 polished bio options. Make them clear, concise, profile-ready, and specific to the user's brand or idea.",
        email: "Generate exactly 10 complete email options. Each option must include a subject line, short preview text, concise body copy, and a clear CTA. Make the emails accurate to the user's request and ready to send after light editing.",
        strategy: "Generate exactly 10 practical social strategy ideas. Each option should be specific, actionable, and useful for the selected platform or campaign.",
        brand: "Create one complete guided brand plan from the user's idea. Section 1 clarifies the brand name and one-line idea. Section 2 positioning. Section 3 target customer. Section 4 core offer. Section 5 brand personality. Section 6 visual identity direction. Section 7 moodboard direction. Section 8 typography system. Section 9 color system. Section 10 practical launch roadmap and workspace next steps.",
        audit: "Create a premium brand audit. Include strengths, weaknesses, positioning gaps, audience clarity, offer clarity, trust gaps, content gaps, visual identity opportunities, and a prioritized action plan.",
        campaign: "Create a complete campaign system. Include campaign promise, audience angle, creative direction, hooks, captions, email ideas, CTA options, and a 14-day content calendar.",
        growth: "Create a detailed follower-growth roadmap. If the user says 100K followers, build a 30/60/90-day plan with posting frequency, best posting windows, content pillars, weekly schedule, daily engagement routine, collaboration ideas, milestone targets, metrics to track, and what to post on each platform."
      };

      return `
You are Brandthat.ai, a premium AI brand workspace.

Generator:
${activeTool.title}

Selected type/platform:
${selectedPlatform || "Best fit for the user's request"}

User request:
${prompt}

${workspaceContext}

Task:
${toolInstructions[activeTool.key]}

Format:
Return ONLY a numbered list from 1 to 10.
Do not add a long intro.
Do not add closing notes.
Do not mention Brandthat.ai unless the user specifically asks for that brand.

Rules:
- Exactly 10 sections or results.
- Every result must directly relate to what the user typed.
- Make each result copy-ready, practical, and strategically useful.
- Use the Brand DNA as the source of truth when a workspace exists.
- Make recommendations like a senior creative director: decisive, specific, and tailored to this business.
- Add a concise "Why this works" line under major recommendations when the tool is strategic, brand, audit, campaign, or growth.
- Replace vague advice with concrete channels, cadence, content types, proof points, KPIs, costs, or completion criteria.
- Avoid generic filler and cheesy phrasing.
- Do not invent health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, availability, or exact-care claims unless the user supplied those details.
- For plant watering or care advice, never invent universal schedules; say needs vary by plant, light, soil, pot, and season unless the user provided exact care facts.
- For plant-related output, avoid unsupported air-quality, mood, health-benefit, pet-safety, non-toxic, purification, or guaranteed-growth claims even when the user mentions a specific plant species.
- Keep the output fast, clean, and easy to scan.
- If generating emails, make the email content specific, accurate, and complete enough to use.
- If auditing or building a campaign, give direct recommendations and next actions, not vague advice.
- If creating a growth roadmap, make the schedule realistic, specific, and organized by daily, weekly, 30-day, 60-day, and 90-day actions.
- If creating a brand plan, build one coherent brand system. Do not give 10 unrelated brand ideas.
- Do not use Markdown bold markers like **text**.
- Do not use decorative symbols, asterisks, emoji, or spammy formatting.
`;
    }

    return `
You are Brandthat.ai, a premium AI brand workspace for creators, founders, businesses, and agencies.

The user selected this generator:
${activeTool.title}

What this generator must do:
${activeTool.promptGuide}

Selected platform/style/type:
${selectedPlatform}

${workspaceContext}

Rules:
- Match the selected generator exactly.
- Make the output specific to the user's request and brand workspace.
- Use Brand DNA when present. Do not contradict user-edited audience, tone, colors, typography, positioning, or business goals.
- Use clear headings and spacing.
- Give multiple useful options when appropriate.
- Format output in clean sections.
- Make the output easy to copy and use immediately.
- Avoid fluff.
- Avoid generic recommendations such as "post consistently", "build trust", "use premium typography", or "use social media" unless followed by specific actions, examples, cadence, and measurable outcomes.
- Avoid saying "as an AI."
- Do not use Markdown bold markers like **text**.
- Do not use decorative symbols, asterisks, emoji, or spammy formatting.
- Be modern, premium, practical, and brand-aware.
`;
  };

  const createLogoImage = async (overrides = {}) => {
    const promptValue = overrides.prompt ?? prompt;
    const brandNameValue = overrides.creativeTone ?? creativeTone;
    const styleValue = overrides.selectedPlatform ?? selectedPlatform;
    const industryValue = overrides.logoIndustry ?? logoIndustry;
    const symbolValue = overrides.logoSymbol ?? logoSymbol;
    const colorsValue = overrides.logoColors ?? logoColors;
    const avoidValue = overrides.logoAvoid ?? logoAvoid;
    const rawMemory = overrides.generationMemory || logoGenerationMemory || {};
    const logoContext = buildAuthoritativeLogoContext({
      promptValue,
      brandNameValue,
      styleValue,
      industryValue,
      symbolValue,
      colorsValue,
      avoidValue,
      activeBrand,
      memory: rawMemory,
      explicitMemoryProvided: Boolean(overrides.generationMemory),
    });
    const parsedLogo = logoContext.parsedLogo;
    const structuredLogo = logoContext.structuredContext || {};
    const generationMemoryValue = logoContext.generationMemory;
    const validationIssues = buildLogoContextValidationIssues(structuredLogo);
    if (validationIssues.length) {
      const message = validationIssues.join(" ");
      setLogoGenerationError(message);
      notify("error", "Logo brief needs review", message);
      throw new Error(message);
    }

    const enhancedLogoPrompt = `
Create a high-quality professional logo.

Natural user request:
${parsedLogo.originalPrompt || promptValue}

Brand name / words to include:
${parsedLogo.brandName || "Use the brand name, initials, tagline, or required words from the user's request if provided."}

Industry or niche:
${parsedLogo.industry}

Logo style direction:
${parsedLogo.style}

Symbol, mascot, or icon request:
${parsedLogo.symbol}

Color direction:
${parsedLogo.colors}

Mood:
${parsedLogo.mood}

Interpreted design direction:
${parsedLogo.interpretation?.summary || "Use the request wording to infer typography, spacing, composition, color maturity, and icon restraint."}

Typography direction:
${parsedLogo.typography}

Layout preference:
${parsedLogo.layout}

Avoid:
${parsedLogo.avoid}

Structured Brand Workspace source of truth:
Brand ID: ${structuredLogo.brandId || "none"}
Brand: ${structuredLogo.brandName || parsedLogo.brandName || "not provided"}
Business: ${structuredLogo.business || "not provided"}
Category: ${structuredLogo.category || parsedLogo.industry}
Audience: ${structuredLogo.audience || "not provided"}
Positioning: ${structuredLogo.positioning || "not provided"}
Voice/personality: ${[structuredLogo.voice, structuredLogo.personality].filter(Boolean).join(", ") || parsedLogo.mood}
Mark type: ${structuredLogo.markType || parsedLogo.layout}
Brand feel: ${structuredLogo.brandFeel || parsedLogo.style}
Palette: ${structuredLogo.colors || parsedLogo.colors}
Typography: ${structuredLogo.typography || parsedLogo.typography}
Symbol direction: ${structuredLogo.symbol || parsedLogo.symbol}
Use cases: ${structuredLogo.useCases || "website header, social profile, brand workspace"}
Quality targets: ${structuredLogo.qualityTargets || "readable at small size, distinct silhouette"}

Brand workspace context:
${logoContext.shouldUseWorkspaceContext ? buildBrandPrompt(activeBrand) : "No saved workspace context is being used. The current user request is the only brand authority."}

Refinement context:
${generationMemoryValue?.refinementMode === "designer-iteration" ? "This is a conversational refinement, not a fresh restart." : "This is a first-pass or broad generation."}
${generationMemoryValue?.refinementInstruction ? `User refinement: ${generationMemoryValue.refinementInstruction}` : ""}
${generationMemoryValue?.lastSuccessfulDirection ? `Preserve successful prior direction: Style ${generationMemoryValue.lastSuccessfulDirection.style || "current"}; Symbol ${generationMemoryValue.lastSuccessfulDirection.symbol || "current"}; Typography ${generationMemoryValue.lastSuccessfulDirection.typography || "current"}; Palette ${generationMemoryValue.lastSuccessfulDirection.palette || "current"}; Layout ${generationMemoryValue.lastSuccessfulDirection.layout || "current"}.` : ""}
${logoContext.resetReason ? "Previous logo memory was ignored because this appears to be a fresh or different brand request." : ""}

Requirements:
- Generate three meaningfully different logo directions: 1. wordmark-led, 2. symbol plus wordmark, 3. compact avatar or badge.
- Each direction must include rationale, black/white usage logic, square/avatar usage, horizontal usage, and small-size readability guidance.
- Generate a polished logo concept suitable for a real business.
- If a Brand Workspace source of truth exists, treat its structured fields as more authoritative than the editable natural-language brief.
- Treat the editable natural user request as supplemental context only when it does not conflict with the structured Brand Workspace.
- Brand name fidelity is mandatory. Use only this current brand name if provided: ${parsedLogo.brandName || "not provided"}.
- Industry fidelity is mandatory. The design must visually match this current industry/niche: ${parsedLogo.industry}.
- Do not reuse prior brand names, prior ranch/real-estate/luxury context, or any saved workspace context unless it is explicitly shown above.
- Use the extracted brand context above to understand the meaning of the words, not just the literal text.
- Adapt to any requested style: luxury, minimal, mascot, character, emblem, badge, monogram, wordmark, lettermark, icon, vintage, retro, tech, AI, fashion, ranch, real estate, restaurant, fitness, beauty, ecommerce, startup, creator brand, photography, construction, wellness, hospitality, or local service business.
- If the user asks for a specific style, industry, animal, object, letter, color palette, era, mood, or reference direction, prioritize that request.
- If key details are missing, make tasteful brand-strategy assumptions and keep them coherent.
- During refinements, preserve the original brand name, industry, strongest typography, palette logic, spacing, and brand personality unless the user explicitly asked to change them.
- During refinements, improve only the requested area: typography, symbol, palette, layout, simplicity, or premium feel.
- Do not make random drastic changes during a refinement. Make it feel like the same designer improved the same concept.
- Prioritize strong composition, clean typography, scalability, contrast, and memorability.
- The logo should work as a website logo, favicon, social profile image, business card mark, and brand identity anchor.
- Avoid clutter, low-quality clipart, muddy details, and messy text.
- Avoid misspelled text.
- If text is included, keep it minimal, clean, and highly legible.
- Make it feel premium, professional, and commercially usable.
`;

    const requestPayload = {
      brandName: parsedLogo.brandName || brandNameValue || activeBrand?.name || "",
      logoStyle: parsedLogo.style || styleValue || "",
      logoIndustry: parsedLogo.industry,
      logoSymbol: parsedLogo.symbol,
      logoColors: parsedLogo.colors,
      logoAvoid: parsedLogo.avoid,
      userPrompt: promptValue,
      parsedLogo,
      generationMemory: generationMemoryValue,
      contextReset: logoContext.resetReason,
      structuredLogo,
      brandStrategy: getBrandStrategyContextForLogo(),
      conceptCount: 3,
      logoPrompt: enhancedLogoPrompt
    };

    let data;
    const authorizedHeaders = overrides.authHeaders || await getAuthorizedHeaders("generate");
    if (!authorizedHeaders) {
      throw new Error("Create your BrandThat account to try the full product.");
    }

    try {
      data = await fetchJsonWithTimeout("/.netlify/functions/logo-image", {
        method: "POST",
        headers: authorizedHeaders,
        body: JSON.stringify(requestPayload)
      }, {
        timeoutMs: 55000,
        errorMessage: "Logo generation failed.",
        timeoutMessage: "AI logo generation is temporarily unavailable.\nError code: LOGO_IMAGE_CLIENT_TIMEOUT"
      });
    } catch (error) {
      if (error?.data?.fallback) {
        error.fallback = buildLogoFallbackOption(error.data.fallback, requestPayload, error);
      } else if (error?.status !== 429) {
        error.fallback = buildLogoFallbackOption({}, requestPayload, {
          ...error,
          code: error?.code || "LOGO_IMAGE_CLIENT_TIMEOUT",
        });
      }
      throw error;
    }

    if (!data.image) {
      const error = new Error("AI logo generation is temporarily unavailable.\nError code: LOGO_IMAGE_EMPTY_RESPONSE");
      error.code = "LOGO_IMAGE_EMPTY_RESPONSE";
      error.fallback = buildLogoFallbackOption({}, requestPayload, error);
      throw error;
    }

    return {
      image: data.image,
      source: data.source || "openai",
      note: data.note || "",
      vectorImage: data.vectorImage || data.svg || data.image,
      svg: data.svg || "",
      transparentSvg: data.transparentSvg || data.svg || "",
      variations: Array.isArray(data.variations) ? data.variations : [],
      creativeBrief: data.creativeBrief || null,
      generationMemory: data.generationMemory || null,
      layers: Array.isArray(data.layers) ? data.layers : [],
    };
  };

  const generate = async (overrideUser = null, logoOverrides = {}) => {
    const generationStartedAt = Date.now();
    const currentUser = overrideUser || user;
    const promptValue = logoOverrides.prompt ?? prompt;
    const brandNameValue = logoOverrides.creativeTone ?? creativeTone;
    const styleValue = logoOverrides.selectedPlatform ?? selectedPlatform;
    const industryValue = logoOverrides.logoIndustry ?? logoIndustry;
    const symbolValue = logoOverrides.logoSymbol ?? logoSymbol;
    const colorsValue = logoOverrides.logoColors ?? logoColors;
    const avoidValue = logoOverrides.logoAvoid ?? logoAvoid;
    const logoContext = activeTool.key === "logo"
      ? buildAuthoritativeLogoContext({
          promptValue,
          brandNameValue,
          styleValue,
          industryValue,
          symbolValue,
          colorsValue,
          avoidValue,
          activeBrand,
          memory: logoOverrides.generationMemory || logoGenerationMemory || {},
          explicitMemoryProvided: Boolean(logoOverrides.generationMemory),
        })
      : null;
    const parsedLogo = logoContext?.parsedLogo || null;
    const logoValidationIssues = activeTool.key === "logo" ? buildLogoContextValidationIssues(logoContext?.structuredContext || {}) : [];
    const hasLogoFields = activeTool.key === "logo" && [brandNameValue, industryValue, styleValue, symbolValue, colorsValue, avoidValue, promptValue].some((value) => String(value || "").trim());

    if (!promptValue.trim() && !hasLogoFields) {
      notify("error", "Add a prompt first", `Tell Brandthat what you want the ${activeTool.title} to create.`);
      return;
    }

    if (activeTool.key === "logo" && logoValidationIssues.length) {
      const message = logoValidationIssues.join(" ");
      setLogoGenerationError(message);
      notify("error", "Logo brief needs review", message);
      return;
    }

    const authSession = await requireMembershipOrTrial("generate");
    if (!authSession) return;
    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authSession.access_token}`,
    };

    const trialLimitsBypassed = isMember;

    setLoading(true);
    setGenerationSlow(false);
    setGenerationError("");
    setLogoGenerationError("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoFallbackOption(null);
    if (activeTool.key === "logo" && logoContext?.resetReason) {
      setLogoGenerationMemory({});
    }

    const slowGenerationTimer = window.setTimeout(() => {
      setGenerationSlow(true);
    }, activeTool.key === "captions" ? 10000 : 16000);

    try {
      if (activeTool.key === "logo") {
        const logoResult = await createLogoImage({ ...logoOverrides, authHeaders });
        const logoTitle = parsedLogo?.brandName || brandNameValue || promptValue.split(/\s+/).slice(0, 4).join(" ") || "Brandthat Logo";
        const logoEntry = {
          id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          title: logoTitle,
          image: logoResult.image,
          source: logoResult.source || "openai",
          vectorImage: logoResult.vectorImage || logoResult.image,
          svg: logoResult.svg || "",
          transparentSvg: logoResult.transparentSvg || "",
          variations: logoResult.variations || [],
          creativeBrief: logoResult.creativeBrief || null,
          generationMemory: logoResult.generationMemory || null,
          prompt: promptValue,
          brandName: parsedLogo?.brandName || brandNameValue,
          style: parsedLogo?.style || styleValue,
          industry: parsedLogo?.industry || industryValue,
          symbol: parsedLogo?.symbol || symbolValue,
          colors: parsedLogo?.colors || colorsValue,
          avoid: parsedLogo?.avoid || avoidValue,
          createdAt: new Date().toISOString(),
        };

        if (parsedLogo?.brandName && (!creativeTone || logoOverrides.creativeTone)) setCreativeTone(parsedLogo.brandName);
        if (parsedLogo?.style && (!selectedPlatform || logoOverrides.selectedPlatform)) setSelectedPlatform(parsedLogo.style);
        if (parsedLogo?.industry && (!logoIndustry || logoOverrides.logoIndustry)) setLogoIndustry(parsedLogo.industry);
        if (parsedLogo?.symbol && (!logoSymbol || logoOverrides.logoSymbol)) setLogoSymbol(parsedLogo.symbol);
        if (parsedLogo?.colors && (!logoColors || logoOverrides.logoColors)) setLogoColors(parsedLogo.colors);

        setLogoImage(logoResult.image);
        setLogoImageSource(logoResult.source || "openai");
        setLogoVectorImage(logoResult.vectorImage || logoResult.image);
        setLogoSvg(logoResult.svg || "");
        setLogoTransparentSvg(logoResult.transparentSvg || logoResult.svg || "");
        setLogoVariations(logoResult.variations || []);
        setLogoCreativeBrief(logoResult.creativeBrief || null);
        if (logoResult.generationMemory) setLogoGenerationMemory(logoResult.generationMemory);
        setRecentLogoResults((prev) => [logoEntry, ...prev.filter((item) => item.image !== logoEntry.image)].slice(0, 8));
        setResult(
          `${logoResult.source === "instant-svg" ? "Editable vector logo created." : "AI logo image created."}\n\nBrand direction used:\nBrand name: ${parsedLogo?.brandName || "Inferred from request"}\nIndustry: ${parsedLogo?.industry || "Inferred from request"}\nStyle: ${parsedLogo?.style || "Inferred from request"}\nSymbol or mascot: ${parsedLogo?.symbol || "Inferred from request"}\nColors: ${parsedLogo?.colors || "Inferred from request"}\nTypography: ${parsedLogo?.typography || "Inferred from request"}\nLayout: ${parsedLogo?.layout || "Inferred from request"}\nAvoid: ${parsedLogo?.avoid || "Generic logo issues"}\nNotes: ${promptValue}\n\n${logoResult.note ? `${logoResult.note}\n\n` : ""}Download the logo, open it full size, save it to a workspace, refine it, or generate another version.`
        );
        trackBrandthatEvent("logo_generated", { source: logoResult.source || "unknown", plan: isLogoTestingUnlocked ? "tester" : userPlan });
      } else if (activeTool.key === "brand") {
        const brandPlanPayload = getBrandPlanRequestPayload(promptValue);
        let data;

        try {
          data = await fetchJsonWithTimeout("/.netlify/functions/brand-plan", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(brandPlanPayload)
          }, {
            timeoutMs: 20000,
            errorMessage: "Brand plan generation failed.",
            timeoutMessage: "Brand plan generation took too long. BrandThat created a structured fallback plan instead."
          });
        } catch (error) {
          if (error?.status === 429) throw error;
          console.warn("Brand plan function unavailable, using client fallback:", error);
          data = createClientBrandPlanFallback(brandPlanPayload);
        }

        brandthatDevLog("raw brand-plan response", data);

        const structuredPlan = data.plan ? normalizeBrandPlan(data.plan, brandPlanPayload) : null;
        brandthatDevLog("normalized brand-plan response", structuredPlan);
        if (structuredPlan) applyStructuredBrandPlanToDraft(structuredPlan);

        const project = structuredPlan
          ? {
              structuredPlan,
              brandName: structuredPlan.brandName,
              industry: structuredPlan.logoContext?.industry || structuredPlan.workspaceContext?.industry || "",
              strategy: structuredPlan,
              logoContext: structuredPlan.logoContext || {},
              source: data.source || "brand-plan",
            }
          : null;

        const cleanPlanText = cleanGeneratedText(data.text || "No brand plan generated.");
        setResult(cleanGeneratedText(encodeLogoProjectContent(cleanPlanText, project)));
        if (structuredPlan) {
          await createWorkspaceFromBrandPlan(structuredPlan, cleanPlanText, authSession);
          setPage("workspace");
          notify("success", "Brand headquarters created", `${structuredPlan.brandName || "Your brand"} is ready to build from.`);
        }
        trackBrandthatEvent("brand_plan_generated", { source: data.source || "unknown", plan: userPlan });
      } else {
        const generationPrompt = `${getSystemPrompt()}

User request:
${promptValue}`;
        let data = await fetchJsonWithTimeout("/.netlify/functions/generate", {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            prompt: generationPrompt,
            tool: activeTool.key,
            brandId: activeBrand?.id || ""
          })
        }, {
          timeoutMs: activeTool.key === "captions" ? 45000 : 20000,
          errorMessage: "Generation failed.",
          timeoutCode: activeTool.key === "captions" ? "CAPTION_REVIEW_CLIENT_TIMEOUT" : "GENERATION_CLIENT_TIMEOUT",
          timeoutMessage: activeTool.key === "captions"
            ? "Caption review took too long. Try again, or add a little more detail."
            : "Generation took too long. Please try again with a shorter request."
        });

        if (data?.ok === false) {
          const error = new Error(data.message || data.error || "Generation failed.");
          error.code = data.code || "";
          throw error;
        }
        if (activeTool.key === "captions" && data.notice) {
          notify("info", "Caption review complete", data.notice);
        }
        let cleanText = makeOutputMoreSpecific(getTextGenerationResponseText(data, activeTool.key), activeBrand || workspaceDraft);
        const qualityIssues = activeTool.key === "captions" ? [] : getOutputQualityIssues(cleanText, activeBrand || workspaceDraft);
        if (qualityIssues.length) {
          const retryPrompt = buildQualityRetryPrompt({
            basePrompt: generationPrompt,
            firstOutput: cleanText,
            issues: qualityIssues,
            brand: activeBrand || workspaceDraft,
          });
          data = await fetchJsonWithTimeout("/.netlify/functions/generate", {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              prompt: retryPrompt,
              tool: activeTool.key,
              brandId: activeBrand?.id || "",
              retry: "quality"
            })
          }, {
            timeoutMs: 20000,
            errorMessage: "Generation quality retry failed.",
            timeoutMessage: "The quality retry took too long. Please try again with a shorter request."
          });
          if (data?.ok === false) {
            const error = new Error(data.message || data.error || "Generation failed.");
            error.code = data.code || "";
            throw error;
          }
          cleanText = makeOutputMoreSpecific(getTextGenerationResponseText(data, activeTool.key), activeBrand || workspaceDraft);
        }
        if (!cleanText) {
          throw new Error("BrandThat did not receive a usable response. Please try again.");
        }
        setResult(cleanText);
        trackBrandthatEvent("text_generated", { tool: activeTool.key, plan: userPlan });
      }

      if (!trialLimitsBypassed) incrementTrialGenerationUse();
    } catch (error) {
      console.error("Brandthat generation request failed:", error);
      handleAppError("Generation failed", error, "The AI request could not complete. Please adjust your prompt or try again.");
      if (activeTool.key === "logo") {
        setLogoGenerationError(error?.message || "Logo generation failed. Please try again with a clearer brand name and direction.");
        setLogoFallbackOption(error?.fallback || null);
        setResult("");
        setLogoImage("");
        setLogoImageSource("");
        setLogoVectorImage("");
        setLogoSvg("");
        setLogoTransparentSvg("");
        setLogoVariations([]);
        setLogoCreativeBrief(null);
      } else {
        setResult("");
        setGenerationError(error?.message || "Something went wrong. Please try again.");
      }
    }

    window.clearTimeout(slowGenerationTimer);
    const minimumLoadingMs = activeTool.key === "logo" ? 700 : 0;
    const remainingLoadingMs = Math.max(0, minimumLoadingMs - (Date.now() - generationStartedAt));
    if (remainingLoadingMs) {
      await new Promise((resolve) => setTimeout(resolve, remainingLoadingMs));
    }
    setGenerationSlow(false);
    setLoading(false);
  };

  useEffect(() => {
    if (!pendingBrandPlanPrompt || activeToolKey !== "brand" || prompt !== pendingBrandPlanPrompt || loading) return;

    const timer = window.setTimeout(() => {
      setPendingBrandPlanPrompt("");
      generate();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [pendingBrandPlanPrompt, activeToolKey, prompt, loading]);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const temporary = document.createElement("textarea");
      temporary.value = text;
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand("copy");
      document.body.removeChild(temporary);
    }
    trackBrandthatEvent("copy_to_clipboard", { tool: activeTool.key, characters: String(text || "").length });
  };

  const shareOutput = async (text) => {
    const shareText = `Created with Brandthat.ai:\n\n${text}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Brandthat.ai", text: shareText, url: "https://brandthat.ai" });
        return;
      } catch {
        copyToClipboard(shareText);
        return;
      }
    }
    copyToClipboard(shareText);
  };

  const clearGenerator = () => {
    setPrompt("");
    setSelectedPlatform("");
    setCreativeTone("");
    setLogoIndustry("");
    setLogoSymbol("");
    setLogoColors("");
    setLogoAvoid("");
    setResult("");
    setLogoImage("");
    setLogoImageSource("");
    setLogoVectorImage("");
    setLogoSvg("");
    setLogoTransparentSvg("");
    setLogoVariations([]);
    setLogoCreativeBrief(null);
    setLogoFallbackOption(null);
    setLogoGenerationError("");
    setGenerationError("");
  };

  const restoreRecentLogo = (entry) => {
    if (!entry?.image) return;
    const project = getLogoProjectFromEntry(entry);
    setActiveToolKey("logo");
    setCreativeTone(project.brandName || entry.title || "");
    setSelectedPlatform(project.style || "");
    setLogoIndustry(project.industry || "");
    setLogoSymbol(project.symbol || "");
    setLogoColors(project.colors || "");
    setLogoAvoid(project.avoid || "");
    setPrompt(project.prompt || "");
    setLogoImage(entry.image);
    setLogoImageSource(project.source || "openai");
    setLogoVectorImage(project.vectorImage || entry.image);
    setLogoSvg(project.svg || "");
    setLogoTransparentSvg(project.transparentSvg || project.svg || "");
    setLogoVariations(project.variations || []);
    setLogoCreativeBrief(project.creativeBrief || null);
    setLogoFallbackOption(null);
    setLogoGenerationMemory(project.generationMemory || {});
    setResult(
      `${project.source === "instant-svg" ? "Editable vector logo restored." : "AI logo image restored."}\n\nBrand direction used:\nBrand name: ${project.brandName || entry.title || "Not provided"}\nIndustry: ${project.industry || "Not provided"}\nStyle: ${project.style || "Not provided"}\nSymbol or mascot: ${project.symbol || "Not provided"}\nColors: ${project.colors || "Not provided"}\nAvoid: ${project.avoid || "Not provided"}\nNotes: ${project.prompt || "Not provided"}`
    );
  };

  const useLogoFallbackOption = () => {
    if (!logoFallbackOption?.image) return;
    setLogoImage(logoFallbackOption.image);
    setLogoImageSource(logoFallbackOption.source || "instant-svg");
    setLogoVectorImage(logoFallbackOption.vectorImage || logoFallbackOption.image);
    setLogoSvg(logoFallbackOption.svg || "");
    setLogoTransparentSvg(logoFallbackOption.transparentSvg || logoFallbackOption.svg || "");
    setLogoVariations((Array.isArray(logoFallbackOption.variations) ? logoFallbackOption.variations : []).slice(0, 1));
    setLogoCreativeBrief(logoFallbackOption.creativeBrief || null);
    if (logoFallbackOption.generationMemory) setLogoGenerationMemory(logoFallbackOption.generationMemory);
    setLogoGenerationError("");
    setLogoFallbackOption(null);
    setResult("Editable vector logo created.\n\nAI logo generation was unavailable, so you chose to use the instant editable vector fallback.");
    trackBrandthatEvent("logo_instant_vector_selected", {
      code: logoFallbackOption.errorCode || "",
      requestId: logoFallbackOption.requestId || "",
    });
  };

  const continueSavedLogo = (entry) => {
    if (!entry?.image) {
      notify("error", "No logo selected", "Choose a saved logo concept with an image first.");
      return;
    }

    restoreRecentLogo(entry);
    setPage("logo");
    window.history.pushState({}, "", "/");
    notify("success", "Logo project restored", "Your saved direction and refinement context are ready.");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const subscribe = () => {
    const email = subscribeEmail.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubscribeMessage("Enter a valid email to create your BrandThat account.");
      return;
    }

    setAuthEmail(email);
    setAuthMode("signup");
    setAuthMessage("Create a password and verify your email before building a Brand Plan.");
    setShowAuth(true);
    setSubscribeMessage("Almost there. Create your account to continue.");
    setSubscribeEmail("");
  };

  const scrollToSection = (sectionId, block = "start") => {
    let attempts = 0;
    const scroll = () => {
      const target = document.getElementById(sectionId);
      if (target) {
        target.scrollIntoView({ behavior: attempts === 0 ? "auto" : "smooth", block });
        return;
      }
      attempts += 1;
      if (attempts < 12) window.requestAnimationFrame(scroll);
    };
    window.requestAnimationFrame(scroll);
  };

  const navigateHomeSection = (sectionId, block = "start") => {
    setPage("home");
    window.history.pushState({}, "", `/#${sectionId}`);
    scrollToSection(sectionId, block);
  };

  useEffect(() => {
    if (page !== "home") return;
    const sectionId = window.location.hash.replace("#", "");
    if (!sectionId) return;
    scrollToSection(sectionId, sectionId === "brandthat-membership" ? "center" : "start");
  }, [page]);

  const isLoggedInApplicationPage = authStatus === "logged_in" && ["workspace", "studio", "logo"].includes(page);

  return (
    <div className="app">
      <style>{css}</style>
      <style>{futureThemeCss}</style>

      {!isLoggedInApplicationPage && <nav className="nav">
        <button className="brand" onClick={() => { setActiveToolKey("brand"); setPage("home"); window.history.pushState({}, "", "/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Brandthat</button>

        <div className="navLinks">
          <button onClick={() => navigateHomeSection("brandthat-product")}>Product</button>
          <button onClick={() => { setActiveToolKey("brand"); setPage("examples"); window.history.pushState({}, "", "/examples"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Examples</button>
          <button onClick={() => navigateHomeSection("brandthat-membership", "center")}>Pricing</button>
        </div>

        <div className="navActions">
          <button className="navPrimaryCta" onClick={() => { trackBrandthatEvent("hero_cta_click", { cta: "nav_preview_my_brand" }); navigateHomeSection("brandthat-builder"); }}>Preview My Brand</button>
          {authStatus === "logged_in" ? (
            <div className="accountMenu">
              <span>{user.email || "Account"}</span>
              <button onClick={() => openProtectedPage("workspace", "workspace")}>Workspace</button>
              <button onClick={logOut}>Log out</button>
            </div>
          ) : authStatus === "email_not_verified" ? (
            <button className="accountBtn" onClick={() => openAuth("login", "Check your email to verify your account before continuing.")}>Verify email</button>
          ) : (
            <button className="accountBtn" onClick={() => openAuth("login")}>{authLoading ? "Loading..." : "Sign In"}</button>
          )}
        </div>
      </nav>}

      {appNotice && (
        <div className={`appNotice ${appNotice.type || "info"}`}>
          <button aria-label="Close notification" onClick={() => setAppNotice(null)}>×</button>
          <strong>{appNotice.title}</strong>
          {appNotice.message && <span>{appNotice.message}</span>}
        </div>
      )}

      {checkoutResumePrompt && authStatus === "logged_in" && !membershipLoading && normalizePlan(userPlan) !== MEMBER_PLAN && (
        <div className="checkoutResumeBanner" role="status" aria-live="polite">
          <div>
            <strong>Ready for membership checkout</strong>
            <span>Continue to Stripe’s secure checkout to start BrandThat for $9.99/month.</span>
          </div>
          <button
            type="button"
            onClick={() => startMembershipCheckout({ source: "pending_membership_resume" })}
            disabled={isCheckoutBusy}
            aria-busy={isCheckoutBusy}
          >
            {isCheckoutBusy ? "Opening secure checkout..." : "Continue to Secure Checkout"}
          </button>
        </div>
      )}

      {page === "home" && (
        <BrandBirthHomepage
          workspaceDraft={workspaceDraft}
          setWorkspaceDraft={setWorkspaceDraft}
          autoSaveStatus={autoSaveStatus}
          buildGuidedBrandPlan={buildGuidedBrandPlan}
          loading={loading && activeToolKey === "brand"}
          startCheckout={startMembershipCheckout}
          openAuth={openAuth}
          user={user}
          userPlan={userPlan}
          authStatus={authStatus}
          checkoutStatus={checkoutStatus}
          checkoutError={checkoutError}
          membershipLoading={membershipLoading}
          membershipLookupFailed={membershipLookupFailed}
        />
      )}

      {page === "examples" && (
        <BrandExamplesPage
          startCheckout={startMembershipCheckout}
          openAuth={openAuth}
          user={user}
          userPlan={userPlan}
          authStatus={authStatus}
          checkoutStatus={checkoutStatus}
          checkoutError={checkoutError}
          membershipLoading={membershipLoading}
          membershipLookupFailed={membershipLookupFailed}
          setPage={setPage}
        />
      )}

      {page === "workspace" && (
        <LoggedInAppShell
          activeBrand={activeBrand}
          brandWorkspaces={brandWorkspaces}
          user={user}
          userPlan={userPlan}
          activeSection={workspaceSection}
          appMenuOpen={appMenuOpen}
          setAppMenuOpen={setAppMenuOpen}
          createMenuOpen={createMenuOpen}
          setCreateMenuOpen={setCreateMenuOpen}
          navigateWorkspaceSection={navigateWorkspaceSection}
          selectBrand={selectBrand}
          selectTool={openToolFromApp}
          logOut={logOut}
        >
          <WorkspaceSectionView
            section={workspaceSection}
            activeBrand={activeBrand}
            brandWorkspaces={brandWorkspaces}
            workspaceLoading={workspaceLoading}
            workspaceDraft={workspaceDraft}
            setWorkspaceDraft={setWorkspaceDraft}
            createWorkspace={createWorkspace}
            workspaceCreating={workspaceCreating}
            autoSaveStatus={autoSaveStatus}
            selectBrand={selectBrand}
            deleteBrand={deleteBrand}
            duplicateBrand={duplicateBrand}
            downloadBrandKit={downloadBrandKit}
            setPage={setPage}
            selectTool={openToolFromApp}
            navigateWorkspaceSection={navigateWorkspaceSection}
            remixOutput={remixOutput}
            copyToClipboard={copyToClipboard}
            updateActiveBrand={updateActiveBrand}
            regenerateWorkspaceSection={regenerateWorkspaceSection}
            recentGenerations={getRecentGenerations()}
            favoriteIds={favoriteIds}
            toggleFavorite={toggleFavorite}
            deleteSavedAsset={deleteSavedAsset}
            setSavedLogoAsBrandProfile={setSavedLogoAsBrandProfile}
            continueSavedLogo={continueSavedLogo}
            brandMemoryPilot={brandMemoryPilot}
            runBrandMemoryAction={runBrandMemoryAction}
            refreshActiveBrandMemory={refreshActiveBrandMemory}
            retryBrandMemoryStatus={() => setBrandMemoryStatusNonce((value) => value + 1)}
            workspaceTourDismissed={workspaceTourDismissed}
            dismissWorkspaceTour={() => {
              localStorage.setItem(WORKSPACE_TOUR_DISMISSED_KEY, "true");
              setWorkspaceTourDismissed(true);
            }}
          />
        </LoggedInAppShell>
      )}

      {seoPages[page] && (
        <SEOPage
          seoPage={seoPages[page]}
          activeTool={activeTool}
          prompt={prompt}
          setPrompt={setPrompt}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          creativeTone={creativeTone}
          setCreativeTone={setCreativeTone}
          logoIndustry={logoIndustry}
          setLogoIndustry={setLogoIndustry}
          logoSymbol={logoSymbol}
          setLogoSymbol={setLogoSymbol}
          logoColors={logoColors}
          setLogoColors={setLogoColors}
          logoAvoid={logoAvoid}
          setLogoAvoid={setLogoAvoid}
          captionGoal={captionGoal}
          setCaptionGoal={setCaptionGoal}
          generate={generate}
          loading={loading}
          result={result}
          generationError={generationError}
          logoGenerationError={logoGenerationError}
          logoImage={logoImage}
          setLogoImage={setLogoImage}
          logoImageSource={logoImageSource}
          logoVectorImage={logoVectorImage}
          setLogoVectorImage={setLogoVectorImage}
          logoSvg={logoSvg}
          setLogoSvg={setLogoSvg}
          logoTransparentSvg={logoTransparentSvg}
          logoVariations={logoVariations}
          logoCreativeBrief={logoCreativeBrief}
          logoFallbackOption={logoFallbackOption}
          logoGenerationMemory={logoGenerationMemory}
          logoEditor={logoEditor}
          setLogoEditor={setLogoEditor}
          recentLogoResults={recentLogoResults}
          restoreRecentLogo={restoreRecentLogo}
          user={user}
          userPlan={userPlan}
          brandWorkspacesCount={brandWorkspaces.length}
          isLogoTestingUnlocked={isLogoTestingUnlocked}
          trialRemaining={trialRemaining}
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
          saveCurrentOutput={saveCurrentOutput}
          saveGeneratedAsset={saveGeneratedAsset}
          saveCurrentLogoConcept={saveCurrentLogoConcept}
          setLogoAsBrandProfile={setLogoAsBrandProfile}
          onUseLogoFallback={useLogoFallbackOption}
          onStartWorkspace={startWorkspaceFromCurrentLogo}
          onBuildGrowthRoadmap={buildGrowthRoadmapFromCurrentLogo}
          brandMemoryPilot={brandMemoryPilot}
          onRefreshBrandMemory={refreshActiveBrandMemory}
          onRetryBrandMemoryStatus={() => setBrandMemoryStatusNonce((value) => value + 1)}
          rememberRejectedLogoDirection={rememberRejectedLogoDirection}
          openSeoPage={openSeoPage}
        />
      )}

      {page === "features" && (
        <section className="pageSection">
          <div className="tinyTag">TOOLS</div>
          <h1 className="pageTitle">Choose exactly what you want Brandthat to create.</h1>
          {authLoading ? <ToolGridSkeleton /> : <ToolGrid activeToolKey={activeToolKey} selectTool={selectTool} />}
        </section>
      )}

      {(page === "studio" || page === "logo") && (
        <LoggedInAppShell
          activeBrand={activeBrand}
          brandWorkspaces={brandWorkspaces}
          user={user}
          userPlan={userPlan}
          activeSection="tools"
          appMenuOpen={appMenuOpen}
          setAppMenuOpen={setAppMenuOpen}
          createMenuOpen={createMenuOpen}
          setCreateMenuOpen={setCreateMenuOpen}
          navigateWorkspaceSection={navigateWorkspaceSection}
          selectBrand={selectBrand}
          selectTool={openToolFromApp}
          logOut={logOut}
        >
        <section className="appContentSection" id="brandthat-generator">
          <div className="tinyTag">{activeTool.label}</div>
          <h1 className="pageTitle">{activeTool.title}</h1>
          <p className="pageLead">{getToolSubline(activeTool.key)}</p>

          {activeBrand && (
            <div className="activeBrandBar">
              <strong>Active Brand:</strong> {activeBrand.name}
              {getPrimaryLogoImage(activeBrand) && <img className="activeBrandLogo" src={getPrimaryLogoImage(activeBrand)} alt={`${activeBrand.name} logo`} />}
              <span>{getBrandReadinessScore(activeBrand)}% ready</span>
              <button onClick={() => openProtectedPage("workspace", "workspace")}>View Workspace</button>
            </div>
          )}

          <LogoGenerationErrorBoundary resetKey={`${activeToolKey}-${loading}-${logoImage}-${logoGenerationError}`}>
            <GeneratorCard
            activeTool={activeTool}
            prompt={prompt}
            setPrompt={setPrompt}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            creativeTone={creativeTone}
            setCreativeTone={setCreativeTone}
            logoIndustry={logoIndustry}
            setLogoIndustry={setLogoIndustry}
            logoSymbol={logoSymbol}
            setLogoSymbol={setLogoSymbol}
            logoColors={logoColors}
            setLogoColors={setLogoColors}
            logoAvoid={logoAvoid}
            setLogoAvoid={setLogoAvoid}
            captionGoal={captionGoal}
            setCaptionGoal={setCaptionGoal}
            generate={generate}
            loading={loading}
            generationSlow={generationSlow}
            result={result}
            generationError={generationError}
            logoGenerationError={logoGenerationError}
            logoImage={logoImage}
            setLogoImage={setLogoImage}
            logoImageSource={logoImageSource}
            logoVectorImage={logoVectorImage}
            setLogoVectorImage={setLogoVectorImage}
            logoSvg={logoSvg}
            setLogoSvg={setLogoSvg}
            logoTransparentSvg={logoTransparentSvg}
            logoVariations={logoVariations}
            logoCreativeBrief={logoCreativeBrief}
            logoFallbackOption={logoFallbackOption}
            logoGenerationMemory={logoGenerationMemory}
            logoEditor={logoEditor}
            setLogoEditor={setLogoEditor}
            recentLogoResults={recentLogoResults}
            restoreRecentLogo={restoreRecentLogo}
            user={user}
            userPlan={userPlan}
            brandWorkspacesCount={brandWorkspaces.length}
            isLogoTestingUnlocked={isLogoTestingUnlocked}
            trialRemaining={trialRemaining}
            copyToClipboard={copyToClipboard}
            shareOutput={shareOutput}
            clearGenerator={clearGenerator}
            saveCurrentOutput={saveCurrentOutput}
            saveGeneratedAsset={saveGeneratedAsset}
            saveCurrentLogoConcept={saveCurrentLogoConcept}
            setLogoAsBrandProfile={setLogoAsBrandProfile}
            onUseLogoFallback={useLogoFallbackOption}
            onStartWorkspace={startWorkspaceFromCurrentLogo}
            onBuildGrowthRoadmap={buildGrowthRoadmapFromCurrentLogo}
            brandMemoryPilot={brandMemoryPilot}
            onRefreshBrandMemory={refreshActiveBrandMemory}
          onRetryBrandMemoryStatus={() => setBrandMemoryStatusNonce((value) => value + 1)}
            rememberRejectedLogoDirection={rememberRejectedLogoDirection}
            toggleFavorite={toggleFavorite}
            remixOutput={remixOutput}
            activeBrand={activeBrand}
            onBackToTools={() => navigateWorkspaceSection("tools")}
            onViewSavedAssets={() => navigateWorkspaceSection("assets")}
            />
          </LogoGenerationErrorBoundary>
        </section>
        </LoggedInAppShell>
      )}

      {["about", "contact", "privacy", "terms", "cancellation", "refund"].includes(page) && (
        <InfoPage page={page} setPage={setPage} />
      )}

      {!isLoggedInApplicationPage && <footer className="footerSubscribe completeFooter">
        <div>
          <div className="tinyTag">BRANDTHAT</div>
          <h2>Type the name. Tell us what it means. Build around it.</h2>
          <p>BrandThat helps early founders turn rough ideas into brand strategy, identity direction, content systems, and launch roadmaps.</p>
        </div>
        <div className="footerForm">
          <div className="footerLinks">
            {[
              ["About", "about"],
              ["Contact / Support", "contact"],
              ["Privacy Policy", "privacy"],
              ["Terms of Service", "terms"],
              ["Cancellation Policy", "cancellation"],
              ["Refund Policy", "refund"],
            ].map(([label, target]) => (
              <button key={target} onClick={() => { setPage(target); window.history.pushState({}, "", `/${target}`); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{label}</button>
            ))}
            {authStatus === "logged_in" ? (
              <>
                <button onClick={() => openProtectedPage("workspace", "workspace")}>Workspace</button>
                <button onClick={logOut}>Log Out</button>
              </>
            ) : (
              <button onClick={() => openAuth("login")}>Sign In</button>
            )}
          </div>
          {authStatus === "logged_in" ? (
            <button className="btn dark" onClick={() => openProtectedPage("workspace", "workspace")}>Open Workspace</button>
          ) : (
            <>
              <input placeholder="Email address" value={subscribeEmail} onChange={(e) => setSubscribeEmail(e.target.value)} />
              <button className="btn dark" onClick={subscribe}>Create Account</button>
              {subscribeMessage && <span>{subscribeMessage}</span>}
            </>
          )}
        </div>
      </footer>}

            {showAuth && (
        <div className="modal">
          <div className="signupBox authBoxClean">
            <div className="authSwitch">
              <button
                className={authMode === "login" ? "active" : ""}
                onClick={() => { setAuthMode("login"); setAuthMessage(""); }}
              >
                Log in
              </button>
              <button
                className={authMode === "signup" ? "active" : ""}
                onClick={() => { setAuthMode("signup"); setAuthMessage(""); }}
              >
                Create account
              </button>
            </div>

            <div className="tinyTag">{authMode === "signup" ? "NEW ACCOUNT" : "WELCOME BACK"}</div>
            <h2>{authMode === "signup" ? "Create your account." : "Welcome back."}</h2>
            <p>
              {authMode === "signup"
                ? "Create your BrandThat account to try the full product. Verify your email before using the tools."
                : "Log in with the email and password you used when creating your Brandthat account."}
            </p>

            <input
              placeholder="Email address"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              placeholder={authMode === "signup" ? "Create a password" : "Password"}
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
            />

            <button className="btn dark full" onClick={authMode === "signup" ? signUp : logIn}>
              {loading ? "Please wait..." : authMode === "signup" ? "Create account" : "Log in"}
            </button>

            <button className="btn light full" onClick={sendMagicLink}>
              Send magic login link
            </button>

            <button className="btn light full" onClick={resendConfirmation}>
              Resend confirmation email
            </button>

            {authMode === "login" ? (
              <button className="btn light full" onClick={() => { setAuthMode("signup"); setAuthMessage(""); }}>
                New here? Create an account
              </button>
            ) : (
              <button className="btn light full" onClick={() => { setAuthMode("login"); setAuthMessage(""); }}>
                Already have an account? Log in
              </button>
            )}

            {authMessage && <div className="verifyNote authMessageBox">{authMessage}</div>}

            <button className="btn light full" onClick={() => { setShowAuth(false); setPendingAuthAction(null); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function getSystemCardText(item) {
  const copy = {
    "AI Logo Generator": "Create the first visual anchor for your brand.",
    "Brand Identity": "Save the brand name, voice, logo direction, and growth goal.",
    "Social Content": "Generate captions, hooks, hashtags, and bios.",
    "Launch Assets": "Build emails, announcements, offers, and campaign copy.",
    "Brand Voice": "Keep every output aligned to the same tone.",
    "Marketing System": "Turn your idea into a repeatable content engine.",
    "Brand Audit": "Find positioning, offer, trust, content, and launch gaps.",
    "Campaign Builder": "Create campaign angles, posts, emails, hooks, and CTAs.",
    "Brand Readiness": "Score how complete your workspace is before you generate.",
    "Growth Roadmap": "Turn goals like 100K followers into a weekly action plan.",
  };

  return copy[item] || "Build your brand faster with AI.";
}

function MembershipCta({
  user,
  userPlan,
  authStatus,
  checkoutStatus,
  checkoutError,
  startCheckout,
  className = "",
  loggedOutLabel = "Create Account",
  verifiedLabel = "Start Membership",
  source = "membership_cta",
  membershipLoading = false,
  membershipLookupFailed = false,
}) {
  const cta = getMembershipCtaState({ user, userPlan, authStatus, checkoutStatus, loggedOutLabel, verifiedLabel, membershipLoading, membershipLookupFailed });
  const handleClick = () => {
    if (cta.nextAction === "recover") {
      window.location.reload();
      return;
    }
    startCheckout?.({ source });
  };

  return (
    <div className="membershipCtaWrap">
      <button
        className={className || "btn dark"}
        type="button"
        onClick={handleClick}
        disabled={cta.disabled}
        aria-busy={cta.busy}
      >
        {cta.label}
      </button>
      <div className="checkoutStatusMessage" role="status" aria-live="polite">
        {cta.statusMessage}
        {checkoutError && !cta.busy && cta.nextAction !== "workspace" ? checkoutError : ""}
      </div>
    </div>
  );
}

function BrandBuilderFlow({ workspaceDraft, setWorkspaceDraft, autoSaveStatus, buildGuidedBrandPlan, loading, startCheckout, user, userPlan, authStatus, checkoutStatus, checkoutError, membershipLoading = false, membershipLookupFailed = false }) {
  const [preview, setPreview] = useState(null);
  const [previewState, setPreviewState] = useState("idle");
  const canPreview = Boolean((workspaceDraft.name || "").trim() && (workspaceDraft.description || "").trim());

  const updatePreviewDraft = (patch = {}, options = {}) => {
    const nextPatch = { ...patch };
    if (options.clearExampleContext || Object.prototype.hasOwnProperty.call(patch, "name") || Object.prototype.hasOwnProperty.call(patch, "description")) {
      nextPatch.exampleContext = "";
    }
    setWorkspaceDraft({ ...workspaceDraft, ...nextPatch });
    setPreview(null);
    setPreviewState("idle");
  };

  const generatePreview = () => {
    if (!canPreview) { setPreviewState("missing"); return; }
    setPreviewState("loading");
    trackBrandthatEvent("builder_started", { source: "homepage_preview" });
    window.setTimeout(() => {
      setPreview(buildPreviewFromDraft(workspaceDraft));
      setPreviewState("ready");
      trackBrandthatEvent("preview_success", { source: "homepage_preview" });
    }, 450);
  };

  const unlockWorkspace = ({ source = "preview_unlock" } = {}) => {
    trackBrandthatEvent("account_creation_started", { source });
    startCheckout?.({ source });
  };

  return (
    <section className="brandBuilderCard previewBuilderCard" id="brandthat-preview-form">
      <div className="builderTop"><div><h2>Preview your brand direction.</h2><p>Enter the basics. The preview is local and limited; the full Brand Workspace requires an account and active membership.</p></div><span>{autoSaveStatus}</span></div>
      <label className="builderField full"><span>Brand name</span><input placeholder="Northline Goods" value={workspaceDraft.name} onChange={(e) => updatePreviewDraft({ name: e.target.value }, { clearExampleContext: true })} /></label>
      <label className="builderField full"><span>What does the business represent or build?</span><textarea placeholder="Weatherproof everyday carry for creators who move between studio, gym, travel, and late-night work." value={workspaceDraft.description} onChange={(e) => updatePreviewDraft({ description: e.target.value }, { clearExampleContext: true })} /></label>
      <details className="builderContextFields">
        <summary>Optional context for a sharper preview</summary>
        <div className="builderContextGrid">
          <label className="builderField"><span>Audience</span><input placeholder="Creators, founders, photographers" value={workspaceDraft.audience || ""} onChange={(e) => updatePreviewDraft({ audience: e.target.value, exampleContext: "" })} /></label>
          <label className="builderField"><span>Style/personality</span><input placeholder="Quietly premium, durable, useful" value={workspaceDraft.style || ""} onChange={(e) => updatePreviewDraft({ style: e.target.value, exampleContext: "" })} /></label>
          <label className="builderField full"><span>Industry or market</span><input placeholder="Carry goods, local service, software, hospitality" value={workspaceDraft.industry || workspaceDraft.locationMarket || ""} onChange={(e) => updatePreviewDraft({ industry: e.target.value, locationMarket: e.target.value, exampleContext: "" })} /></label>
        </div>
      </details>
      <div className="builderActions previewActions"><button className="btn dark" onClick={generatePreview}>{previewState === "loading" ? "Creating preview..." : "Generate Free Preview"}</button><MembershipCta className="btn light" user={user} userPlan={userPlan} authStatus={authStatus} checkoutStatus={checkoutStatus} checkoutError={checkoutError} startCheckout={unlockWorkspace} loggedOutLabel="Unlock Complete Workspace" verifiedLabel="Unlock Complete Workspace" source="preview_unlock_top" membershipLoading={membershipLoading} membershipLookupFailed={membershipLookupFailed} /></div>
      {previewState === "missing" && <div className="friendlyState warning"><strong>Add a name and idea first.</strong><span>BrandThat needs both fields to create a useful preview.</span></div>}
      {previewState === "loading" && <div className="friendlyState"><strong>Preview generation in progress.</strong><span>Creating thesis, audience, voice, positioning, and visual direction.</span></div>}
      {preview && <div className="previewResult" aria-live="polite">
        <div className="previewIntro">
          <span>Free Preview</span>
          <strong>A focused snapshot, not the complete workspace.</strong>
          <p>This preview shows the first strategic direction BrandThat can build from your visible draft. Membership unlocks the saved workspace, connected generators, logo concepts, roadmap, exports, and saved assets.</p>
        </div>
        <div><span>Brand thesis</span><p>{preview.thesis}</p></div>
        <div><span>Audience</span><p>{preview.audience}</p></div>
        <div><span>Three voice traits</span><p>{preview.traits.slice(0, 3).join(" · ")}</p></div>
        <div><span>Positioning direction</span><p>{preview.positioning}</p></div>
        <div><span>Visual direction</span><p>{preview.visualDirection}</p><div className="previewSwatches">{preview.colors.map((color) => <i key={color} style={{ background: color }} />)}</div></div>
        <div className="unlockCallout"><strong>Unlock the Complete Workspace</strong><p>After membership, your draft becomes a saved Brand Workspace with expanded strategy, brand voice, visual identity, Content Tools, logo generation, 90-day roadmap, Brand Book export, and persistent saved assets.</p><MembershipCta user={user} userPlan={userPlan} authStatus={authStatus} checkoutStatus={checkoutStatus} checkoutError={checkoutError} startCheckout={unlockWorkspace} loggedOutLabel="Unlock the Complete Workspace" verifiedLabel="Unlock the Complete Workspace" source="preview_unlock_result" membershipLoading={membershipLoading} membershipLookupFailed={membershipLookupFailed} /></div>
      </div>}
      <p className="builderFinePrint">The free preview avoids expensive generation and does not save a full workspace. Complete generation remains behind authentication, email verification, Stripe checkout, and existing server-side validation.</p>
    </section>
  );
}
function SkeletonBlock({ className = "" }) {
  return <div className={`skeletonBlock ${className}`} aria-hidden="true" />;
}

function TermTooltip({ term, children }) {
  const definitions = {
    positioning: "The specific place your brand should own in the customer's mind.",
    archetype: "A simple personality pattern that keeps brand behavior consistent.",
    "brand voice": "How the brand sounds in captions, emails, website copy, and sales messages.",
    "value proposition": "The clear reason a customer should choose this offer now.",
    "visual direction": "The rules for how the brand should look across logo, color, type, imagery, and layouts.",
    "typography system": "The headline and body type choices that make the brand readable and recognizable.",
  };
  return (
    <span className="termTooltip" tabIndex="0">
      {children || term}
      <span role="tooltip">{definitions[String(term || "").toLowerCase()] || "A branding term used to guide more consistent decisions."}</span>
    </span>
  );
}

function WorkspaceSkeleton() {
  return (
    <section className="brandDashboard brandDashboardSkeleton" aria-label="Loading saved Brand Workspace">
      <div className="brandDashboardHero">
        <SkeletonBlock className="skeletonMark" />
        <div className="skeletonHeroCopy">
          <SkeletonBlock className="short" />
          <SkeletonBlock className="title" />
          <SkeletonBlock />
          <SkeletonBlock className="medium" />
        </div>
      </div>
      <div className="brandSummaryDashboard">
        {Array.from({ length: 8 }).map((_, index) => <SkeletonBlock key={index} />)}
      </div>
      <div className="dashboardGrid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="dashboardPanel" key={index}>
            <SkeletonBlock className="short" />
            <SkeletonBlock />
            <SkeletonBlock className="medium" />
          </div>
        ))}
      </div>
    </section>
  );
}

function ToolGridSkeleton() {
  return (
    <div className="toolGridSkeleton" aria-label="Loading tools">
      {Array.from({ length: 6 }).map((_, index) => <SkeletonBlock key={index} />)}
    </div>
  );
}

function WorkspaceCreator({ workspaceDraft, setWorkspaceDraft, createWorkspace, autoSaveStatus, workspaceCreating = false }) {
  const nameMissing = !cleanGeneratedText(workspaceDraft.name || "");
  const descriptionMissing = !cleanGeneratedText(workspaceDraft.description || "");
  const goalMissing = !cleanGeneratedText(workspaceDraft.targetFollowers || workspaceDraft.launchGoal || "");

  return (
    <div className="workspaceCard">
      <div className="tinyTag">START HERE</div>
      <h2>Create a Brand Workspace</h2>
      <p>Save the basics once, then every tool can reuse the same brand name, voice, logo, and growth goal.</p>
      <span className="autoSavePill">{autoSaveStatus}</span>
      <div className="workspaceGrid">
        <label className="workspaceFieldLabel" htmlFor="workspace-brand-name">
          <span>Brand name</span>
          <input
            id="workspace-brand-name"
            placeholder="Stone & Stem"
            value={workspaceDraft.name}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, name: e.target.value })}
            aria-invalid={nameMissing}
            aria-describedby="workspace-brand-name-help"
          />
          <small id="workspace-brand-name-help">{nameMissing ? "Required to create a workspace." : "This name appears in your strategy, generators, and saved assets."}</small>
        </label>
        <label className="workspaceFieldLabel">
          <span>Brand voice</span>
          <select
            value={workspaceDraft.tone}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, tone: e.target.value })}
          >
            {tones.map((tone) => <option key={tone}>{tone}</option>)}
          </select>
        </label>
      </div>

      <label className="workspaceFieldLabel full" htmlFor="workspace-brand-description">
        <span>Business description</span>
        <textarea
          id="workspace-brand-description"
          placeholder="A local subscription service delivering beginner-friendly houseplants to apartment renters."
          value={workspaceDraft.description}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, description: e.target.value })}
          aria-invalid={descriptionMissing}
          aria-describedby="workspace-brand-description-help"
        />
        <small id="workspace-brand-description-help">{descriptionMissing ? "Required so BrandThat can build useful strategy and tools." : "Use your own visible business description. Internal prompts are never saved here."}</small>
      </label>

      <div className="workspaceGrid">
        <label className="workspaceFieldLabel" htmlFor="workspace-growth-platform">
          <span>Primary growth platform</span>
          <select
            id="workspace-growth-platform"
            value={workspaceDraft.growthPlatform || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, growthPlatform: e.target.value })}
          >
            <option value="">Select a platform</option>
            <option value="Instagram">Instagram</option>
            <option value="TikTok">TikTok</option>
            <option value="YouTube Shorts">YouTube Shorts</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Facebook">Facebook</option>
            <option value="Pinterest">Pinterest</option>
            <option value="Multi-platform">Multi-platform</option>
          </select>
        </label>
        <label className="workspaceFieldLabel" htmlFor="workspace-main-goal">
          <span>Main goal</span>
          <input
            id="workspace-main-goal"
            placeholder="Reach 1,000 local subscribers"
            value={workspaceDraft.targetFollowers || workspaceDraft.launchGoal}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, targetFollowers: e.target.value, launchGoal: e.target.value })}
            aria-invalid={goalMissing}
            aria-describedby="workspace-main-goal-help"
          />
          <small id="workspace-main-goal-help">{goalMissing ? "Add a goal when you know it. You can still create the workspace." : "This guides roadmap and generator recommendations."}</small>
        </label>
      </div>

      <label className="workspaceFieldLabel full" htmlFor="workspace-logo-direction">
        <span>Logo direction</span>
        <textarea
          id="workspace-logo-direction"
          placeholder="Simple botanical wordmark with a subtle stone-and-leaf symbol, calm green palette, readable at small sizes."
          value={workspaceDraft.logoDirection}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, logoDirection: e.target.value })}
        />
      </label>

      <details className="advancedWorkspaceFields">
        <summary>Advanced context</summary>

        <div className="workspaceGrid">
          <label className="workspaceFieldLabel"><span>Audience or ideal customer</span><textarea placeholder="Apartment renters and first-time plant owners." value={workspaceDraft.audience} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, audience: e.target.value })} /></label>
          <label className="workspaceFieldLabel"><span>Audience pain or desire</span><textarea placeholder="They want a greener home without complicated plant maintenance." value={workspaceDraft.audiencePain || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, audiencePain: e.target.value })} /></label>
        </div>

        <div className="workspaceGrid">
          <label className="workspaceFieldLabel"><span>Core offer</span><textarea placeholder="Beginner-friendly houseplant subscriptions with simple care guidance." value={workspaceDraft.offer || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, offer: e.target.value })} /></label>
          <label className="workspaceFieldLabel"><span>Differentiator</span><textarea placeholder="Local delivery paired with confidence-building care cards." value={workspaceDraft.differentiator || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, differentiator: e.target.value })} /></label>
        </div>

        <div className="workspaceGrid">
          <label className="workspaceFieldLabel"><span>Current followers</span><input placeholder="1,250" value={workspaceDraft.currentFollowers || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, currentFollowers: e.target.value })} /></label>
          <label className="workspaceFieldLabel"><span>Weekly time available</span><input placeholder="5 hours/week" value={workspaceDraft.weeklyTime || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, weeklyTime: e.target.value })} /></label>
        </div>

        <div className="workspaceGrid">
          <label className="workspaceFieldLabel"><span>Competitors or references</span><input placeholder="Local nurseries, plant shops, apartment lifestyle brands" value={workspaceDraft.competitors || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, competitors: e.target.value })} /></label>
          <label className="workspaceFieldLabel"><span>Primary channels</span><input placeholder="Instagram, website, email" value={workspaceDraft.channels || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, channels: e.target.value })} /></label>
        </div>

        <div className="workspaceGrid">
          <label className="workspaceFieldLabel"><span>Price positioning</span><input placeholder="Approachable, premium, value-led, or undecided" value={workspaceDraft.pricePositioning || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, pricePositioning: e.target.value })} /></label>
          <label className="workspaceFieldLabel"><span>Desired feeling</span><input placeholder="Calm confidence and friendly support" value={workspaceDraft.desiredFeeling || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, desiredFeeling: e.target.value })} /></label>
        </div>

        <div className="workspaceGrid">
          <label className="workspaceFieldLabel"><span>Location or market</span><input placeholder="Local city, online-first, regional, or national" value={workspaceDraft.locationMarket || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, locationMarket: e.target.value })} /></label>
          <label className="workspaceFieldLabel"><span>Business goal</span><input placeholder="Reach 1,000 local subscribers in the first year" value={workspaceDraft.businessGoal || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, businessGoal: e.target.value })} /></label>
        </div>

        <div className="workspaceGrid">
          <label className="workspaceFieldLabel"><span>Monthly revenue goal</span><input placeholder="10000" value={workspaceDraft.monthlyRevenueGoal || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, monthlyRevenueGoal: e.target.value })} /></label>
          <label className="workspaceFieldLabel"><span>Average price</span><input placeholder="49" value={workspaceDraft.averagePrice || ""} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, averagePrice: e.target.value })} /></label>
        </div>
      </details>

      <button className="btn dark full" type="button" onClick={createWorkspace} disabled={workspaceCreating} aria-busy={workspaceCreating}>
        {workspaceCreating ? "Creating workspace..." : "Create Brand Workspace"}
      </button>
    </div>
  );
}

function RegenerationControls({ label, value, copyToClipboard, regenerateWorkspaceSection }) {
  const current = typeof value === "string" ? value : JSON.stringify(value || {}, null, 2);
  const actions = ["Regenerate", "Make More Premium", "Make More Bold", "Make More Minimal", "Make More Playful", "Edit Manually"];
  return (
    <div className="regenerationControls">
      {actions.map((action) => (
        <button
          key={action}
          onClick={() => action === "Edit Manually"
            ? copyToClipboard(`Edit this ${label} section manually.\n\nCurrent section:\n${current}`)
            : regenerateWorkspaceSection?.(label, value, action)}
        >
          {action}
        </button>
      ))}
    </div>
  );
}

function BrandSummaryDashboard({ brand, plan }) {
  const dna = getBrandDNA(plan, brand);
  const readiness = getBrandReadinessScore(brand);
  return (
    <div className="brandSummaryDashboard">
      <div>
        <span>Brand Summary</span>
        <h3>{brand.name}</h3>
        <p>{getBrandFieldPreview(plan.positioning || dna.positioning)}</p>
      </div>
      <div className="summaryMetric"><small>Audience</small><strong>{getBrandFieldPreview(dna.audience)}</strong></div>
      <div className="summaryMetric"><small>Primary emotion</small><strong>{dna.customerEmotions[0] || "confidence"}</strong></div>
      <div className="summaryMetric"><small>Personality</small><strong>{dna.personality}</strong></div>
      <div className="summaryMetric"><small>Differentiator</small><strong>{getBrandFieldPreview(dna.keyDifferentiators[0] || plan.competitiveDifferentiation)}</strong></div>
      <div className="summaryMetric"><small>Colors</small><strong>{dna.colors}</strong></div>
      <div className="summaryMetric"><small>Typography</small><strong>{dna.typographyDirection}</strong></div>
      <div className="summaryScore"><strong>{readiness}%</strong><span>complete</span></div>
    </div>
  );
}

function ScorecardPanel({ scorecard }) {
  return (
    <div className="scorecardPanel">
      <div className="scoreHero"><strong>{scorecard.overall}</strong><span>overall positioning score</span></div>
      <div className="scoreRows">
        {Object.entries(scorecard.scores || {}).map(([label, score]) => (
          <div className="scoreRow" key={label}>
            <span>{label}</span>
            <div><i style={{ width: `${score}%` }} /></div>
            <strong>{score}</strong>
          </div>
        ))}
      </div>
      <div className="scoreImprovements">
        {(scorecard.improvements || []).map((item) => <p key={item}>{item}</p>)}
      </div>
    </div>
  );
}

const appSections = [
  ["overview", "Overview"],
  ["strategy", "Brand Strategy"],
  ["identity", "Visual Identity"],
  ["tools", "Content Tools"],
  ["roadmap", "Launch Roadmap"],
  ["assets", "Saved Assets"],
  ["settings", "Settings"],
];

const primaryToolKeys = ["captions", "hashtags", "hooks", "bios", "email", "logo"];
const secondaryToolKeys = ["strategy", "brand", "audit", "campaign", "growth"];
const captionStyleLabels = [
  "Punchy",
  "Story",
  "Benefit",
  "Conversational",
  "Educational",
];

function getAppToolTitle(tool = {}) {
  return String(tool.title || tool.shortTitle || "Tool").replace(/^Free\s+/i, "");
}

function getToolPurpose(toolKey) {
  const purposes = {
    captions: "Create platform-ready captions from the active brand context.",
    hashtags: "Build clean hashtag sets for discovery and local relevance.",
    hooks: "Write opening lines for Reels, TikTok, Shorts, and launch videos.",
    bios: "Shape concise social bios that match the brand voice.",
    email: "Draft launch, welcome, promo, and nurture emails.",
    logo: "Generate logo concepts from the strategy and identity direction.",
    strategy: "Plan the strongest platform moves for the brand.",
    brand: "Regenerate or expand the complete guided brand plan.",
    audit: "Find the five highest-impact improvements.",
    campaign: "Turn the brand direction into a focused campaign.",
    growth: "Create a deeper execution roadmap.",
  };
  return purposes[toolKey] || "Create a connected brand asset.";
}

function getSavedToolCount(brand, toolKey) {
  if (!brand?.saved) return 0;
  const key = toolKey === "logo" ? "logos" : toolKey;
  return Array.isArray(brand.saved[key]) ? brand.saved[key].length : 0;
}

function getRecentBrandAssets(brand, limit = 5) {
  if (!brand?.saved) return [];
  return Object.entries(brand.saved)
    .flatMap(([bucket, items]) => Array.isArray(items) ? items.map((item) => ({ ...item, bucket })) : [])
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, limit);
}

function getCompletionChecklist(brand) {
  return getBrandCompletionChecklist(brand);
}

function LoggedInAppShell({
  activeBrand,
  brandWorkspaces = [],
  user,
  userPlan,
  activeSection,
  appMenuOpen,
  setAppMenuOpen,
  createMenuOpen,
  setCreateMenuOpen,
  navigateWorkspaceSection,
  selectBrand,
  selectTool,
  logOut,
  children,
}) {
  const toolButtons = [...primaryToolKeys, ...secondaryToolKeys].map((key) => toolMap[key]).filter(Boolean);
  const isMember = normalizePlan(userPlan) === MEMBER_PLAN;

  useEffect(() => {
    if (!createMenuOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setCreateMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [createMenuOpen, setCreateMenuOpen]);

  return (
    <div className="loggedInApp">
      <aside className={appMenuOpen ? "appSidebar open" : "appSidebar"} aria-label="Brand workspace navigation">
        <div className="appSidebarTop">
          <button className="appBrandButton" onClick={() => navigateWorkspaceSection("overview")}>Brandthat</button>
          <label className="brandSwitcher">
            <span>Active brand</span>
            <select value={activeBrand?.id || ""} onChange={(event) => selectBrand?.(event.target.value)}>
              {brandWorkspaces.length === 0 ? <option value="">No brand yet</option> : null}
              {brandWorkspaces.map((brand) => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </label>
        </div>

        <nav className="appSectionNav">
          {appSections.map(([key, label]) => (
            <button
              key={key}
              className={activeSection === key ? "active" : ""}
              onClick={() => navigateWorkspaceSection(key)}
              aria-current={activeSection === key ? "page" : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="appSidebarBottom">
          <span>{isMember ? "Membership active" : "Membership required"}</span>
          <strong>{user?.email || "Account"}</strong>
          <button onClick={logOut}>Log Out</button>
        </div>
      </aside>

      <div className="appShellBody">
        <header className="appHeader">
          <button className="mobileAppMenu" onClick={() => setAppMenuOpen(!appMenuOpen)} aria-expanded={appMenuOpen}>
            Menu
          </button>
          <div>
            <span>{activeBrand?.name || "Brand Workspace"}</span>
            <strong>{activeSection === "tools" ? "Content Tools" : appSections.find(([key]) => key === activeSection)?.[1] || "Workspace"}</strong>
          </div>
          <div className="createMenuWrap">
            <button className="btn dark appCreateButton" onClick={() => setCreateMenuOpen(!createMenuOpen)} aria-expanded={createMenuOpen}>Create</button>
            {createMenuOpen && (
              <div className="createMenu" role="menu">
                <div className="createMenuContext">Creating for {activeBrand?.name || "the active brand"}</div>
                {toolButtons.map((tool) => (
                  <button key={tool.key} onClick={() => selectTool(tool.key)} role="menuitem">
                    <strong>{getAppToolTitle(tool)}</strong>
                    <span>{getToolPurpose(tool.key)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>
        <main className="appMain" tabIndex="-1">
          {children}
        </main>
      </div>
    </div>
  );
}

function WorkspaceToolGrid({ brand, selectTool, compact = false }) {
  const renderTool = (toolKey) => {
    const tool = toolMap[toolKey];
    if (!tool) return null;
    const count = getSavedToolCount(brand, toolKey);
    return (
      <article className="appToolCard" key={toolKey}>
        <div>
          <span>{count ? `${count} saved` : "Ready"}</span>
          <strong>{getAppToolTitle(tool)}</strong>
          <p>{getToolPurpose(toolKey)}</p>
        </div>
        <button onClick={() => selectTool(toolKey)}>Open</button>
      </article>
    );
  };

  return (
    <div className={compact ? "workspaceTools compact" : "workspaceTools"}>
      <div className="appCardHeader">
        <div>
          <span>Quick Tools</span>
          <h2>Create from this brand context.</h2>
        </div>
      </div>
      <div className="toolCardGrid">{primaryToolKeys.map(renderTool)}</div>
      {!compact && (
        <details className="moreTools" open>
          <summary>More Tools</summary>
          <div className="toolCardGrid secondaryTools">{secondaryToolKeys.map(renderTool)}</div>
        </details>
      )}
    </div>
  );
}

function CompactRecentAssetsPreview({ brand, recentGenerations = [], navigateWorkspaceSection }) {
  if (!brand) return null;
  const recent = (recentGenerations.length ? recentGenerations : getRecentBrandAssets(brand, 3)).slice(0, 3);

  return (
    <section className="appPanel compactAssetsPreview">
      <div className="appCardHeader">
        <div>
          <span>Recent assets</span>
          <h2>Latest saved work.</h2>
        </div>
        <button onClick={() => navigateWorkspaceSection("assets")}>View All Saved Assets</button>
      </div>
      {recent.length ? (
        <div className="compactAssetList">
          {recent.map((item) => (
            <button key={item.id} onClick={() => navigateWorkspaceSection("assets")}>
              <strong>{item.title || item.assetLabel || item.bucketLabel || "Saved asset"}</strong>
              <span>{item.assetLabel || item.bucketLabel || item.bucket || brand.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="emptyActionState">
          <p>No saved assets yet. Create your first asset from the active brand context, then manage the full library in Saved Assets.</p>
          <button onClick={() => navigateWorkspaceSection("tools")}>Create Your First Asset</button>
        </div>
      )}
    </section>
  );
}

function WorkspaceWelcomePanel({ brand, navigateWorkspaceSection, selectTool, dismissWorkspaceTour }) {
  if (!brand) return null;
  return (
    <section className="appPanel workspaceWelcomePanel" aria-label="Welcome to your Brand Workspace">
      <div>
        <span>Welcome to your Brand Workspace</span>
        <h2>Your strategy, identity, content tools, and roadmap all share {brand.name} context.</h2>
        <p>Use the left navigation to move between Overview, Brand Strategy, Visual Identity, Content Tools, Launch Roadmap, Saved Assets, and Settings. Start with Content Tools when you want captions, hashtags, hooks, bios, emails, campaigns, or social strategy from the active brand.</p>
      </div>
      <div className="welcomeActions">
        <button className="btn dark" onClick={() => navigateWorkspaceSection("tools")}>Open Content Tools</button>
        <button className="btn light" onClick={() => selectTool("logo")}>Generate Logo Concepts</button>
        <button className="textLinkButton" onClick={dismissWorkspaceTour}>Dismiss tour</button>
      </div>
    </section>
  );
}

function WorkspaceOverview({ brand, navigateWorkspaceSection, selectTool, recentGenerations = [], workspaceTourDismissed = true, dismissWorkspaceTour = () => {} }) {
  if (!brand) {
    return (
      <section className="appContentSection">
        <div className="tinyTag">WORKSPACE</div>
        <h1 className="pageTitle">Create your first brand workspace.</h1>
        <p className="pageLead">Once a brand exists, this screen becomes a short dashboard for strategy, tools, saved assets, and roadmap progress.</p>
      </section>
    );
  }
  const plan = getWorkspacePlan(brand);
  const checklist = getCompletionChecklist(brand);
  const completion = getBrandCompletion(brand);
  const missing = checklist.filter((item) => !item.complete);
  const recent = recentGenerations.length ? recentGenerations : getRecentBrandAssets(brand);
  const nextAction = getBrandNextActions(brand)[0] || "Create the first content asset from the active brand context.";
  const roadmapItems = getExpandedRoadmap(plan, brand);

  return (
    <section className="appContentSection workspaceOverview">
      <div className="overviewHero">
        <div>
          <div className="tinyTag">OVERVIEW</div>
          <h1>{brand.name}</h1>
          <p>{brand.description}</p>
          <div className="overviewMeta">
            <span>{completion.percent}% ready</span>
            <span>{completion.completeCount} of {completion.total} complete</span>
            <span>{brand.launchGoal || "Goal not set"}</span>
            <span>Membership active</span>
          </div>
        </div>
        <div className="nextActionCard">
          <span>Next best action</span>
          <strong>{nextAction}</strong>
          <button onClick={() => navigateWorkspaceSection("tools")}>Create Content</button>
        </div>
      </div>

      {!workspaceTourDismissed && <WorkspaceWelcomePanel brand={brand} navigateWorkspaceSection={navigateWorkspaceSection} selectTool={selectTool} dismissWorkspaceTour={dismissWorkspaceTour} />}
      <CompletionPanel brand={brand} navigateWorkspaceSection={navigateWorkspaceSection} selectTool={selectTool} />
      <WorkspaceToolGrid brand={brand} selectTool={selectTool} compact />

      <div className="overviewGrid">
        <div className="appPanel">
          <span>Recent Generations</span>
          {recent.length ? recent.slice(0, 4).map((item) => (
            <button className="recentAssetRow" key={item.id} onClick={() => navigateWorkspaceSection("assets")}>
              <strong>{item.title || item.bucket}</strong>
              <small>{item.bucket || item.brandName}</small>
            </button>
          )) : <div className="emptyActionState"><p>No saved content yet. Create your first asset from the active brand and it will appear here.</p><button onClick={() => navigateWorkspaceSection("tools")}>Create Your First Asset</button></div>}
        </div>
        <div className="appPanel">
          <span>Roadmap Progress</span>
          {roadmapItems.length ? roadmapItems.slice(0, 3).map((item) => (
            <div className="roadmapMiniRow" key={item.phase}>
              <strong>{item.phase}</strong>
              <p>{item.priority}</p>
            </div>
          )) : <p>No roadmap activity yet. Open your first 30 days to start the launch checklist.</p>}
          <button onClick={() => navigateWorkspaceSection("roadmap")}>{roadmapItems.length ? "Open Roadmap" : "Open Your First 30 Days"}</button>
        </div>
        <div className="appPanel">
          <span>Missing Brand Elements</span>
          {missing.slice(0, 5).map((item) => (
            <button key={item.key} onClick={() => item.tool ? selectTool(item.tool) : navigateWorkspaceSection(item.section)}>
              {item.missingLabel || item.label} — {item.action}
            </button>
          ))}
          {!missing.length && <p>Core brand elements are complete. Keep building assets and refining the roadmap.</p>}
        </div>
      </div>
    </section>
  );
}

function CompletionPanel({ brand, navigateWorkspaceSection, selectTool }) {
  const [open, setOpen] = useState(false);
  const { checklist, completeCount, total, percent } = getBrandCompletion(brand);

  return (
    <section className="completionPanel">
      <button className="completionTop" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>Brand completion</span>
        <strong>{percent}%</strong>
        <small>{completeCount} of {total} complete. Open to see what raises the score.</small>
      </button>
      {open && (
        <div className="completionChecklist">
          {checklist.map((item) => (
            <button key={item.key} className={item.complete ? "complete" : ""} onClick={() => item.tool ? selectTool(item.tool) : navigateWorkspaceSection(item.section)}>
              <span>{item.complete ? "Done" : "Missing"}</span>
              <strong>{item.complete ? item.completeLabel : item.missingLabel}</strong>
              <small>{item.key === "logo" && !item.complete ? "A saved logo concept counts after you set it as the primary logo." : item.action}</small>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function WorkspaceIdentity({ brand, setPage, navigateWorkspaceSection, selectTool }) {
  if (!brand) return <WorkspaceEmptyState navigateWorkspaceSection={navigateWorkspaceSection} />;
  const plan = getWorkspacePlan(brand);
  const primaryLogoImage = getPrimaryLogoImage(brand);
  const savedLogos = (brand.saved?.logos || []).filter((item) => item.image).slice(0, 6);
  const palette = getIdentityPalette(brand, plan);
  const typography = getIdentityTypography(brand, plan);
  const moodboard = getMoodboardTiles(brand, plan);
  const logoDefaults = getLogoRecommendations(brand, plan);
  const logoBrief = buildWorkspaceLogoBrief(brand, plan);
  return (
    <section className="appContentSection">
      <div className="tinyTag">VISUAL IDENTITY</div>
      <h1 className="pageTitle">{brand.name} identity direction.</h1>
      <p className="pageLead">Your logo, palette, typography, moodboard, and saved concepts all come from the active Brand Workspace context.</p>
      <div className="visualIdentityBoard">
        <div className="identityBoardHero"><div className="identityPrimaryMark">{primaryLogoImage ? <img src={primaryLogoImage} alt={(brand.name || "Brand") + " primary logo"} /> : <span>{getInitialsFromBrandName(brand.name)}</span>}</div><div><span>Logo Direction</span><h2>{primaryLogoImage ? "Primary logo selected" : "Ready for logo concepts"}</h2><p>{brand.logoDirection || plan.logoDirection || logoDefaults.symbolDirection}</p><button className="btn dark" onClick={() => selectTool("logo")}>Generate Logo Concepts</button></div></div>
        <div className="identityPalettePanel"><div className="appCardHeader"><div><span>Color Palette</span><h2>Editable starting system.</h2></div></div><div className="identityPaletteGrid">{palette.map((color) => <div className="identitySwatchCard" key={color.name}><div className="identitySwatch" style={{ background: color.hex, color: getContrastTextColor(color.hex) }}><strong>{color.role}</strong></div><b>{color.name}</b><span>{color.hex}</span><small>{getRgbLabel(color.hex)}</small><button onClick={() => navigator.clipboard?.writeText(color.hex)}>Copy HEX</button></div>)}</div><p className="identityRationale">{plan.colorSystem || "Palette generated from the brand category, personality, and visual direction. Check contrast before final production use."}</p></div>
        <div className="identityTypePanel"><span>Typography</span><div className="typeSpecimen headlineSpecimen">{brand.name}</div><p className="bodySpecimen">{brand.description || plan.brandThesis}</p><div className="typePairingGrid"><div><strong>Headline / Wordmark</strong><span>{typography.headline}</span></div><div><strong>Body / UI</strong><span>{typography.supporting}</span></div><div><strong>Source</strong><span>{typography.source}</span></div></div><p>{plan.typographySystem || typography.note}</p></div>
        <div className="identityMoodboardPanel"><span>Moodboard Direction</span><div className="moodboardTileGrid">{moodboard.map(([title, copy]) => <article key={title}><strong>{title}</strong><p>{copy}</p></article>)}</div><p>{plan.moodboardDirection || brand.style || "Use these as honest direction tiles until custom photography or generated references are supplied."}</p></div>
        <div className="identityLogoSpecPanel"><span>Logo System</span><div className="logoSpecGrid"><div><strong>Mark type</strong><p>{logoDefaults.markType.join(", ")}</p></div><div><strong>Brand feel</strong><p>{logoDefaults.brandFeel.join(", ")}</p></div><div><strong>Use cases</strong><p>{logoDefaults.useCases.join(", ")}</p></div><div><strong>Quality target</strong><p>{logoDefaults.qualityTargets.join(", ")}</p></div></div><details><summary>Logo brief generated from this workspace</summary><p>{logoBrief}</p></details></div>
      </div>
      {savedLogos.length > 0 && <div className="identityLogoStrip">{savedLogos.map((logo) => <img key={logo.id} src={logo.image} alt={logo.title || "Saved logo concept"} />)}</div>}
    </section>
  );
}

function WorkspaceRoadmap({ brand, navigateWorkspaceSection }) {
  if (!brand) return <WorkspaceEmptyState navigateWorkspaceSection={navigateWorkspaceSection} />;
  const plan = getWorkspacePlan(brand);
  const roadmap = getExpandedRoadmap(plan, brand);
  return (
    <section className="appContentSection">
      <div className="tinyTag">LAUNCH ROADMAP</div>
      <h1 className="pageTitle">The next 90 days.</h1>
      <div className="roadmapPhaseList">
        {roadmap.map((item) => (
          <div className="roadmapPhaseCard" key={item.phase}>
            <strong>{item.phase}</strong>
            <h3>{item.priority}</h3>
            <ul>{item.tasks.map((action) => <li key={action}>{action}</li>)}</ul>
            <p><b>Tools:</b> {item.recommendedTools.join(", ")}</p>
            <p><b>KPIs:</b> {item.kpis.join(", ")}</p>
            <p><b>Completion:</b> {item.completionCriteria}</p>
            <small>{item.status}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkspaceEmptyState({ navigateWorkspaceSection }) {
  return (
    <section className="appContentSection">
      <div className="tinyTag">NEW BRAND</div>
      <h1 className="pageTitle">Create a brand workspace first.</h1>
      <p className="pageLead">Your tools, strategy, roadmap, and saved assets will connect to the active brand.</p>
      <button className="btn dark" onClick={() => navigateWorkspaceSection("settings")}>New Brand</button>
    </section>
  );
}

function WorkspaceSectionView(props) {
  const {
    section,
    activeBrand,
    brandWorkspaces,
    workspaceLoading,
    workspaceDraft,
    setWorkspaceDraft,
    createWorkspace,
    workspaceCreating,
    autoSaveStatus,
    selectBrand,
    deleteBrand,
    duplicateBrand,
    downloadBrandKit,
    setPage,
    selectTool,
    navigateWorkspaceSection,
    remixOutput,
    copyToClipboard,
    updateActiveBrand,
    regenerateWorkspaceSection,
    recentGenerations,
    favoriteIds,
    toggleFavorite,
    deleteSavedAsset,
    setSavedLogoAsBrandProfile,
    continueSavedLogo,
    brandMemoryPilot,
    runBrandMemoryAction,
    refreshActiveBrandMemory,
    retryBrandMemoryStatus,
    workspaceTourDismissed,
    dismissWorkspaceTour,
  } = props;

  if (workspaceLoading && !activeBrand) return <WorkspaceSkeleton />;

  if (section === "strategy" && activeBrand) {
    return (
      <BrandDashboard
        brand={activeBrand}
        setPage={setPage}
        downloadBrandKit={downloadBrandKit}
        remixOutput={remixOutput}
        copyToClipboard={copyToClipboard}
        updateActiveBrand={updateActiveBrand}
        regenerateWorkspaceSection={regenerateWorkspaceSection}
        autoSaveStatus={autoSaveStatus}
      />
    );
  }

  if (section === "identity") return <WorkspaceIdentity brand={activeBrand} setPage={setPage} navigateWorkspaceSection={navigateWorkspaceSection} selectTool={selectTool} />;
  if (section === "tools") {
    return (
      <section className="appContentSection">
        <div className="tinyTag">CONTENT TOOLS</div>
        <h1 className="pageTitle">Create from one connected brand.</h1>
        <p className="pageLead">Every generator uses the active workspace context so captions, hashtags, bios, emails, roadmaps, and logo concepts stay aligned.</p>
        <WorkspaceToolGrid brand={activeBrand} selectTool={selectTool} />
        <CompactRecentAssetsPreview brand={activeBrand} recentGenerations={recentGenerations} navigateWorkspaceSection={navigateWorkspaceSection} />
      </section>
    );
  }
  if (section === "roadmap") return <WorkspaceRoadmap brand={activeBrand} navigateWorkspaceSection={navigateWorkspaceSection} />;
  if (section === "assets" && activeBrand) return <SavedAssets brand={activeBrand} recentGenerations={recentGenerations} favoriteIds={favoriteIds} toggleFavorite={toggleFavorite} deleteSavedAsset={deleteSavedAsset} remixOutput={remixOutput} copyToClipboard={copyToClipboard} setSavedLogoAsBrandProfile={setSavedLogoAsBrandProfile} continueSavedLogo={continueSavedLogo} />;
  if (section === "settings") {
    return (
      <section className="appContentSection settingsGrid">
        <div>
          <div className="tinyTag">SETTINGS</div>
          <h1 className="pageTitle">Manage your brands.</h1>
          <p className="pageLead">Create a new workspace, switch active brands, duplicate a direction, or export the current brand book.</p>
        </div>
        <details className="newBrandPanel">
          <summary>New Brand</summary>
          <WorkspaceCreator workspaceDraft={workspaceDraft} setWorkspaceDraft={setWorkspaceDraft} createWorkspace={createWorkspace} autoSaveStatus={autoSaveStatus} workspaceCreating={workspaceCreating} />
        </details>
        <WorkspaceLibrary brandWorkspaces={brandWorkspaces} activeBrand={activeBrand} workspaceLoading={workspaceLoading} selectBrand={selectBrand} deleteBrand={deleteBrand} duplicateBrand={duplicateBrand} downloadBrandKit={downloadBrandKit} setPage={setPage} />
        <BrandMemorySettings
          activeBrand={activeBrand}
          brandMemoryPilot={brandMemoryPilot}
          runBrandMemoryAction={runBrandMemoryAction}
          refreshActiveBrandMemory={refreshActiveBrandMemory}
          retryBrandMemoryStatus={retryBrandMemoryStatus}
        />
      </section>
    );
  }

  return <WorkspaceOverview brand={activeBrand} navigateWorkspaceSection={navigateWorkspaceSection} selectTool={selectTool} recentGenerations={recentGenerations} workspaceTourDismissed={workspaceTourDismissed} dismissWorkspaceTour={dismissWorkspaceTour} />;
}

function BrandDashboard({ brand, setPage, downloadBrandKit, remixOutput, copyToClipboard, updateActiveBrand, regenerateWorkspaceSection, autoSaveStatus = "Saved" }) {
  const plan = getWorkspacePlan(brand);
  brandthatDevLog("rendered workspace data", { brand, plan });
  const savedLogos = (brand.saved?.logos || []).filter((item) => item.image).slice(0, 3);
  const roadmapItems = normalizeRoadmapItems(plan.launchRoadmap90Days || plan.launchRoadmap || plan.launchRoadmap30Days);
  const expandedRoadmap = getExpandedRoadmap(plan, brand);
  const nextActions = getBrandNextActions(brand);
  const insightCards = getBrandInsightCards(brand);
  const platformPlan = Array.isArray(plan.platformStrategy) && plan.platformStrategy.length ? plan.platformStrategy : getSocialPlatformRecommendations(brand);
  const contentIdeas = Array.isArray(plan.first20ContentIdeas) && plan.first20ContentIdeas.length ? plan.first20ContentIdeas : getBrandPlanDefaults({ brandName: brand.name, idea: brand.description, industry: plan.workspaceContext?.industry, opportunity: plan.coreOpportunity }).first20ContentIdeas;
  const dna = getBrandDNA(plan, brand);
  const whyThisWorks = getWhyThisWorks(plan, brand);
  const customerPsychology = getCustomerPsychology(plan, brand);
  const realityCheck = getRealityCheck(plan, brand);
  const competitorPositioning = getCompetitorPositioning(plan, brand);
  const scorecard = getPositioningScorecard(plan, brand);
  const namingEvaluations = getNamingEvaluations(plan, brand);
  const checklist = getLaunchChecklist(plan, brand);
  const revenuePlan = getRevenuePlan(plan, brand);
  const directorNotes = getCreativeDirectorNotes(plan, brand);
  const improvementAudit = getBrandImprovementAudit(plan, brand);
  const primaryLogoImage = getPrimaryLogoImage(brand);
  const identityCards = [
    ["Core Opportunity", plan.coreOpportunity || "Generate a core strategic opportunity."],
    ["Brand Thesis", plan.brandThesis || "Generate a brand thesis."],
    ["Positioning", plan.positioning || brand.differentiator || "Clarify what makes this brand different."],
    ["Audience", plan.targetAudience || brand.audience || "Define the customer this brand is built for."],
    ["Customer Motivation", plan.customerMotivation || "Clarify what makes the customer act now."],
    ["Competitive Difference", plan.competitiveDifferentiation || "Clarify how the brand will avoid generic category claims."],
    ["Messaging Direction", plan.messagingDirection || "Define the message structure before content is created."],
    ["Moodboard Direction", plan.moodboardDirection || brand.style || "Create an editorial moodboard direction."],
    ["Typography Direction", plan.typographySystem || "Define the wordmark and supporting type system."],
    ["Color Direction", plan.colorSystem || "Choose a primary palette and accent system."],
    ["Voice", plan.brandVoice || brand.tone || "Define how this brand should sound."],
    ["Taglines", Array.isArray(plan.taglineIdeas) ? plan.taglineIdeas.join(" / ") : "Generate tagline ideas from the brand plan."],
  ];

  return (
    <section className="brandDashboard">
      <div className="brandDashboardHero">
        <div className="brandDashboardMark">
          {primaryLogoImage ? (
            <img src={primaryLogoImage} alt={`${brand.name} brand mark`} />
          ) : (
            <span>{getInitialsFromBrandName(brand.name)}</span>
          )}
        </div>

        <div>
          <div className="tinyTag">BRAND HEADQUARTERS</div>
          <h2>{brand.name}</h2>
          <p>{getBrandFieldPreview(plan.brandSummary || brand.description, "This workspace is ready for a clear brand summary, visual direction, roadmap, and logo concepts.")}</p>
          <div className="dashboardActions">
            <button className="btn dark" onClick={() => setPage("logo")}>Generate Logo Concepts</button>
            <button className="btn light" onClick={downloadBrandKit}>Export Brand Book PDF</button>
            <span className="workspaceSaveStatus">{autoSaveStatus}</span>
          </div>
        </div>
      </div>

      <BrandSummaryDashboard brand={brand} plan={plan} />

      <div className="dashboardGrid">
        <div className="dashboardPanel wideDashboardPanel">
          <span>Brand DNA</span>
          <div className="dashboardIdentityGrid dnaGrid">
            <div><strong>Audience</strong><p>{dna.audience}</p></div>
            <div><strong><TermTooltip term="positioning">Positioning</TermTooltip></strong><p>{dna.positioning}</p></div>
            <div><strong><TermTooltip term="archetype">Archetype</TermTooltip></strong><p>{dna.archetype}</p></div>
            <div><strong>Tone</strong><p>{dna.tone}</p></div>
            <div><strong><TermTooltip term="visual direction">Visual Direction</TermTooltip></strong><p>{dna.visualDirection}</p></div>
            <div><strong>Business Goals</strong><p>{dna.businessGoals.join(" / ")}</p></div>
          </div>
          <RegenerationControls label="Brand DNA" value={dna} copyToClipboard={copyToClipboard} regenerateWorkspaceSection={regenerateWorkspaceSection} />
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Brand System</span>
          <div className="dashboardIdentityGrid">
            {identityCards.map(([label, value]) => (
              <div key={label}>
                <strong>{label === "Positioning" ? <TermTooltip term="positioning">{label}</TermTooltip> : label === "Typography Direction" ? <TermTooltip term="typography system">{label}</TermTooltip> : label === "Voice" ? <TermTooltip term="brand voice">{label}</TermTooltip> : label}</strong>
                <p>{getBrandFieldPreview(value)}</p>
              </div>
            ))}
          </div>
          <div className="whyThisWorksGrid">
            {Object.entries(whyThisWorks).slice(0, 6).map(([label, value]) => (
              <div key={label}>
                <strong>Why {label} works</strong>
                <p>{value}</p>
              </div>
            ))}
          </div>
          <RegenerationControls label="Brand System" value={identityCards.map(([label, value]) => `${label}: ${value}`).join("\n")} copyToClipboard={copyToClipboard} regenerateWorkspaceSection={regenerateWorkspaceSection} />
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>90-Day Launch Roadmap</span>
          <div className="roadmapPhaseList">
            {expandedRoadmap.map((item) => (
              <div className="roadmapPhaseCard" key={item.phase}>
                <strong>{item.phase}</strong>
                <h3>{item.priority}</h3>
                <ul>{item.tasks.map((action) => <li key={action}>{action}</li>)}</ul>
                <p><b>Tools:</b> {item.recommendedTools.join(", ")}</p>
                <p><b>Estimated costs:</b> {item.estimatedCosts}</p>
                <p><b>KPIs:</b> {item.kpis.join(", ")}</p>
                <p><b>Completion:</b> {item.completionCriteria}</p>
                <small>{item.status}</small>
              </div>
            ))}
          </div>
          <RegenerationControls label="90-Day Roadmap" value={expandedRoadmap} copyToClipboard={copyToClipboard} regenerateWorkspaceSection={regenerateWorkspaceSection} />
        </div>

        <div className="dashboardPanel">
          <span>Next Best Action</span>
          <div className="dashboardActionList">
            {nextActions.map((item) => <button key={item} onClick={() => copyToClipboard(item)}>{item}</button>)}
          </div>
        </div>

        <div className="dashboardPanel">
          <span>Creative Director Notes</span>
          <div className="directorNotes">
            <p><b>Critique:</b> {directorNotes.critique}</p>
            <p><b>Strongest:</b> {directorNotes.strongestElement}</p>
            <p><b>Weakest:</b> {directorNotes.weakestElement}</p>
            <p><b>Improve next:</b> {directorNotes.improvement}</p>
            <textarea
              placeholder="Add your own creative direction notes..."
              value={directorNotes.userNotes || ""}
              onChange={(event) => updateActiveBrand?.({ creativeDirectorNotes: { ...directorNotes, userNotes: event.target.value } })}
            />
          </div>
        </div>

        <div className="dashboardPanel">
          <span>Reality Check</span>
          <div className="realityCheckList">
            {Object.entries(realityCheck).map(([label, value]) => (
              <p key={label}><b>{label.replace(/([A-Z])/g, " $1").trim()}:</b> {value}</p>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Improve My Brand</span>
          <div className="improvementAuditGrid">
            {improvementAudit.map((item, index) => (
              <div className="improvementAuditCard" key={item.title}>
                <small>Priority {index + 1}</small>
                <strong>{item.title}</strong>
                <p>{item.reason}</p>
                <button onClick={() => updateActiveBrand?.(item.apply)}>Apply recommendation</button>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Customer Psychology</span>
          <div className="psychologyGrid">
            <div><strong>Desires</strong><ul>{customerPsychology.desires.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><strong>Fears</strong><ul>{customerPsychology.fears.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><strong>Objections</strong><ul>{customerPsychology.objections.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><strong>Buying Triggers</strong><ul>{customerPsychology.buyingTriggers.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><strong>Identity</strong><p>{customerPsychology.identityTheyWant}</p></div>
            <div><strong>Why They Choose It</strong><p>{customerPsychology.choiceReason}</p></div>
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Competitor Positioning</span>
          <div className="competitorGrid">
            {competitorPositioning.map((item) => (
              <div className="competitorCard" key={item.name}>
                <strong>{item.name}</strong>
                <p><b>Positioning:</b> {item.positioning}</p>
                <p><b>Tone:</b> {item.tone}</p>
                <p><b>Visual style:</b> {item.visualStyle}</p>
                <p><b>Pricing perception:</b> {item.pricingPerception}</p>
                <p><b>Strength:</b> {item.strengths}</p>
                <p><b>Weakness:</b> {item.weaknesses}</p>
                <p><b>Opportunity:</b> {item.opportunity}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Positioning Scorecard</span>
          <ScorecardPanel scorecard={scorecard} />
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Naming Evaluation</span>
          <div className="namingGrid">
            {namingEvaluations.map((item) => (
              <div className="namingCard" key={item.name}>
                <strong>{item.name}</strong>
                <b>{item.overall}/100</b>
                {Object.entries(item.scores).map(([label, score]) => (
                  <p key={label}><span>{label}</span><em>{score}</em></p>
                ))}
                <small>{item.note}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Brand Intelligence</span>
          <div className="brandInsightGrid">
            {insightCards.map((card) => (
              <div className="brandInsightCard" key={card.label}>
                <small>{card.label}</small>
                <strong>{card.title}</strong>
                <p>{card.copy}</p>
                <button onClick={() => copyToClipboard(card.action)}>{card.action}</button>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Platform Strategy</span>
          <div className="socialSetupGrid">
            {platformPlan.map((item) => (
              <div className="socialSetupCard" key={item.platform}>
                <strong>{item.platform}</strong>
                <p>{item.strategy || item.setup}</p>
                <p>{item.launchPlan || item.content}</p>
                <button onClick={() => copyToClipboard(`${item.platform}\n\nStrategy: ${item.strategy || item.setup}\n\nLaunch plan: ${item.launchPlan || item.content}\n\nIdeas: ${(item.postingIdeas || [item.firstMove]).filter(Boolean).join("; ")}`)}>
                  {(item.postingIdeas || [item.firstMove]).filter(Boolean).slice(0, 3).join(" / ")}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Business Launch Checklist</span>
          <div className="launchChecklistGrid">
            {checklist.map((item, index) => (
              <label key={`${item.label}-${index}`} className={item.complete ? "launchChecklistItem complete" : "launchChecklistItem"}>
                <input
                  type="checkbox"
                  checked={Boolean(item.complete)}
                  onChange={(event) => {
                    const nextChecklist = checklist.map((current, currentIndex) => currentIndex === index ? { ...current, complete: event.target.checked } : current);
                    updateActiveBrand?.({ launchChecklist: nextChecklist });
                  }}
                />
                <span><strong>{item.label}</strong><small>{item.why}</small></span>
              </label>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Revenue Planning</span>
          <div className="revenuePlanner">
            <label>
              <small>Monthly revenue goal</small>
              <input value={brand.monthlyRevenueGoal || ""} placeholder="10000" onChange={(event) => updateActiveBrand?.({ monthlyRevenueGoal: event.target.value })} />
            </label>
            <label>
              <small>Average product or service price</small>
              <input value={brand.averagePrice || ""} placeholder="49" onChange={(event) => updateActiveBrand?.({ averagePrice: event.target.value })} />
            </label>
            <div>
              <strong>{revenuePlan.salesNeeded ? `${revenuePlan.salesNeeded.toLocaleString()} sales/month` : "Add numbers to calculate sales needed"}</strong>
              {revenuePlan.assumptions.map((item) => <p key={item}>{item}</p>)}
              <ul>{revenuePlan.acquisitionPlan.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>First 20 Content Ideas</span>
          <div className="contentIdeaGrid">
            {contentIdeas.slice(0, 20).map((item, index) => (
              <button key={`${item}-${index}`} onClick={() => copyToClipboard(item)}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <span>{item}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="dashboardPanel wideDashboardPanel">
          <span>Saved Logo Concepts</span>
          {savedLogos.length ? (
            <div className="dashboardLogoStrip">
              {savedLogos.map((logo) => (
                <button key={logo.id} onClick={() => remixOutput(logo)}>
                  <img src={logo.image} alt={logo.title || "Saved logo concept"} />
                  <strong>{logo.title || "Logo Concept"}</strong>
                </button>
              ))}
            </div>
          ) : (
            <div className="dashboardEmptyLogo">
              <p>No logo concepts saved yet. Generate visual concepts after the brand thesis, identity direction, moodboard, typography, and colors are set.</p>
              <button className="btn light" onClick={() => setPage("logo")}>Create First Logo Concept</button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function WorkspaceLibrary({ brandWorkspaces, activeBrand, workspaceLoading = false, selectBrand, deleteBrand, duplicateBrand, downloadBrandKit, setPage }) {
  return (
    <div className="workspaceCard">
      <div className="tinyTag">MY BRANDS</div>
      <h2>Saved Brand Workspaces</h2>
      <p>Each workspace keeps its own logos, captions, hooks, bios, favorites, and launch assets.</p>

      {workspaceLoading ? (
        <div className="brandList">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="brandRow brandRowSkeleton" key={index}>
              <SkeletonBlock className="medium" />
            </div>
          ))}
        </div>
      ) : brandWorkspaces.length === 0 ? (
        <div className="emptyState">No brands yet. Create your first workspace.</div>
      ) : (
        <div className="brandList">
          {brandWorkspaces.map((brand) => (
            <div className={activeBrand?.id === brand.id ? "brandRow activeBrandRow" : "brandRow"} key={brand.id}>
              <button onClick={() => selectBrand(brand.id)}>
                {getPrimaryLogoImage(brand) && <img className="brandRowLogo" src={getPrimaryLogoImage(brand)} alt={`${brand.name} logo`} />}
                <strong>{brand.name}</strong>
                <span>{getBrandReadinessScore(brand)}% ready • {brand.tone} • {getWorkspaceGoalLine(brand)}</span>
              </button>
              <div className="brandRowActions">
                <button onClick={() => duplicateBrand(brand.id)}>Duplicate</button>
                <button className="miniDanger" onClick={() => deleteBrand(brand.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeBrand && (
        <div className="brandReadinessPanel">
          <div className="brandReadinessTop">
            <div>
              <span>Active workspace</span>
              <strong>{activeBrand.name}</strong>
            </div>
            <strong>{getBrandReadinessScore(activeBrand)}%</strong>
          </div>
          <div className="workspaceSnapshot">
            {getWorkspaceSnapshot(activeBrand).map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <p>{getWorkspaceNextStep(activeBrand)}</p>
        </div>
      )}

      <div className="workspaceActions">
        <button className="btn light" onClick={() => setPage("features")}>Open Tools</button>
        <button className="btn dark" onClick={downloadBrandKit}>Export Brand Book PDF</button>
      </div>
    </div>
  );
}

function BrandMemorySettings({ activeBrand, brandMemoryPilot, runBrandMemoryAction, refreshActiveBrandMemory, retryBrandMemoryStatus }) {
  const [memoryState, setMemoryState] = useState({ loading: false, error: "", data: null });
  const [editingId, setEditingId] = useState("");
  const [editingText, setEditingText] = useState("");
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const loadMemoryControls = useCallback(async () => {
    if (!activeBrand?.id || !brandMemoryPilot?.active || !runBrandMemoryAction) return;
    setMemoryState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await runBrandMemoryAction("list", {}, { errorMessage: "Brand memory controls could not be loaded." });
      setMemoryState({ loading: false, error: "", data });
    } catch (error) {
      setMemoryState({ loading: false, error: error?.message || "Brand memory controls could not be loaded.", data: null });
    }
  }, [activeBrand?.id, brandMemoryPilot?.active, runBrandMemoryAction]);

  useEffect(() => {
    loadMemoryControls();
  }, [loadMemoryControls]);

  if (!activeBrand) return null;

  const activeMemories = (memoryState.data?.memories || []).filter((memory) => memory.status === "active");
  const categories = memoryState.data?.categories || {};
  const statusLabel = brandMemoryPilot?.loading
    ? "Checking brand memory..."
    : brandMemoryPilot?.active
      ? memoryState.data?.disabled
        ? "Memory disabled for this workspace"
        : "Brand memory active"
      : brandMemoryPilot?.unavailable
        ? "Brand memory unavailable"
        : "Private pilot unavailable";

  const runAndReload = async (action, payload = {}, options = {}) => {
    await runBrandMemoryAction(action, payload, options);
    await loadMemoryControls();
  };

  const startEdit = (memory) => {
    setEditingId(memory.id);
    setEditingText(memory.fact || "");
  };

  const saveEdit = async (memory) => {
    await runAndReload("update", {
      memoryId: memory.id,
      title: memory.title,
      content: editingText,
      importance: 4,
      metadata: { source: "user_correction", corrected_at: new Date().toISOString() },
    }, { errorMessage: "Brand memory could not be corrected." });
    setEditingId("");
    setEditingText("");
  };

  return (
    <section className="brandMemorySettings">
      <div className="memorySettingsHeader">
        <div>
          <div className="tinyTag">BRAND MEMORY</div>
          <h2>Memory for {activeBrand.name}</h2>
          <p>Brand DNA stays the source of truth. Memory adds approved facts from saved work and corrections, but never overrides confirmed workspace fields.</p>
        </div>
        <strong>{statusLabel}</strong>
      </div>

      {brandMemoryPilot?.loading ? (
        <div className="emptyState">Checking brand memory...</div>
      ) : !brandMemoryPilot?.active ? (
        <div className="memoryUnavailablePanel">
          <p>{brandMemoryPilot?.message || "Brand memory controls are available only for approved private pilot accounts."}</p>
          {brandMemoryPilot?.unavailable && <button onClick={retryBrandMemoryStatus}>Retry memory status</button>}
        </div>
      ) : (
        <>
          <div className="memoryControlGrid">
            <div>
              <span>Active memories</span>
              <strong>{memoryState.data?.activeCount || 0}</strong>
              <small>{memoryState.data?.lastRefreshedAt ? `Last refreshed ${new Date(memoryState.data.lastRefreshedAt).toLocaleString()}` : "No refresh recorded yet"}</small>
            </div>
            <div>
              <span>Categories</span>
              <strong>{Object.keys(categories).length || 0}</strong>
              <small>{Object.entries(categories).map(([key, count]) => `${key.replace(/_/g, " ")} (${count})`).join(", ") || "No active categories yet"}</small>
            </div>
          </div>
          <div className="memorySettingsActions">
            <button onClick={async () => { await refreshActiveBrandMemory?.(); await loadMemoryControls(); }}>Rebuild memory</button>
            <button onClick={() => runAndReload(memoryState.data?.disabled ? "enable_workspace" : "disable_workspace")}>{memoryState.data?.disabled ? "Enable memory for this workspace" : "Disable memory for this workspace"}</button>
            <button className="miniDanger" onClick={() => setBulkConfirm(true)}>Forget all workspace memory</button>
          </div>
          {bulkConfirm && (
            <div className="memoryDeleteConfirm" role="alert">
              <p>This forgets active semantic memories for {activeBrand.name}. Your workspace, saved assets, and Brand DNA stay intact.</p>
              <button className="miniDanger" onClick={async () => { await runAndReload("delete_workspace", { confirm: "DELETE_WORKSPACE_MEMORY" }); setBulkConfirm(false); }}>Confirm forget all</button>
              <button onClick={() => setBulkConfirm(false)}>Cancel</button>
            </div>
          )}
          {memoryState.error && <div className="memoryUnavailablePanel" role="alert">{memoryState.error}</div>}
          {memoryState.loading ? <div className="emptyState">Loading remembered facts...</div> : null}
          <div className="memoryFactList">
            {activeMemories.length ? activeMemories.map((memory) => (
              <article className="memoryFactCard" key={memory.id}>
                <div>
                  <span>{String(memory.memoryType || "memory").replace(/_/g, " ")}</span>
                  <strong>{memory.title}</strong>
                  <small>Source: {String(memory.sourceType || "unknown").replace(/_/g, " ")}{memory.sourceGenerator ? ` · ${memory.sourceGenerator}` : ""}</small>
                </div>
                {editingId === memory.id ? (
                  <label>
                    <span>Remembered fact</span>
                    <textarea value={editingText} onChange={(event) => setEditingText(event.target.value)} />
                  </label>
                ) : (
                  <p>{memory.fact}</p>
                )}
                <div className="memoryFactMeta">
                  <small>Confidence {Math.round(Number(memory.confidence || 0) * 100)}%</small>
                  <small>Version {memory.contentVersion}</small>
                  <small>{memory.lastConfirmedAt ? `Confirmed ${new Date(memory.lastConfirmedAt).toLocaleDateString()}` : "Not confirmed yet"}</small>
                </div>
                <div className="assetCardActions">
                  {editingId === memory.id ? (
                    <>
                      <button onClick={() => saveEdit(memory)}>Save correction</button>
                      <button onClick={() => { setEditingId(""); setEditingText(""); }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(memory)}>Edit or correct</button>
                  )}
                  <button className="miniDanger" onClick={() => runAndReload("forget", { memoryId: memory.id }, { errorMessage: "Brand memory could not be forgotten." })}>Forget</button>
                </div>
              </article>
            )) : (
              <div className="emptyState">No active memories yet. Saved and approved work helps BrandThat learn this workspace after you refresh memory.</div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function SavedAssets({ brand, recentGenerations = [], favoriteIds = {}, toggleFavorite, deleteSavedAsset, remixOutput, copyToClipboard, setSavedLogoAsBrandProfile, continueSavedLogo }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const currentLogoAssetId = getPrimaryLogoAssetId(brand);
  const bucketLabels = {
    logos: "Logos",
    captions: "Captions",
    hooks: "Hooks",
    bios: "Bios",
    hashtags: "Hashtags",
    email: "Emails",
    strategy: "Strategies",
    brand: "Brand Plans",
    audit: "Audits",
    campaign: "Campaigns",
    growth: "Roadmaps",
  };
  const allAssets = Object.entries(bucketLabels)
    .flatMap(([bucket, label]) => (brand.saved?.[bucket] || []).map((item) => ({
      ...item,
      bucket,
      bucketLabel: label,
      assetLabel: item.assetType === "caption_collection" || item.isCollection ? "Caption Collection" : bucket === "captions" ? "Caption" : label,
      brandName: brand.name,
      isFavorite: Boolean(favoriteIds[item.id] || item.favorite),
    })));
  const counts = allAssets.reduce((acc, item) => {
    acc[item.bucket] = (acc[item.bucket] || 0) + 1;
    if (item.isFavorite) acc.favorites = (acc.favorites || 0) + 1;
    return acc;
  }, { all: allAssets.length, favorites: 0 });
  const normalizedSearch = search.trim().toLowerCase();
  const filteredAssets = allAssets
    .filter((item) => {
      if (filter === "favorites" && !item.isFavorite) return false;
      if (filter !== "all" && filter !== "favorites" && item.bucket !== filter) return false;
      if (!normalizedSearch) return true;
      return `${item.title} ${item.content} ${item.bucketLabel} ${item.brandName}`.toLowerCase().includes(normalizedSearch);
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return sortOrder === "oldest" ? aTime - bTime : bTime - aTime;
    });
  const filters = [
    ["all", "All"],
    ["logos", "Logos"],
    ["captions", "Captions"],
    ["hooks", "Hooks"],
    ["bios", "Bios"],
    ["hashtags", "Hashtags"],
    ["email", "Emails"],
    ["strategy", "Strategies"],
    ["audit", "Audits"],
    ["campaign", "Campaigns"],
    ["growth", "Roadmaps"],
    ["favorites", "Favorites"],
  ];
  const visibleRecent = recentGenerations.length ? recentGenerations : allAssets.slice(0, 5);

  const renderAssetCard = (item) => (
    <article className={item.image ? "assetLibraryCard logoAsset" : "assetLibraryCard"} key={item.id}>
      {item.image && (
        <button className="assetImageButton" onClick={() => openGeneratedImage(item.image)}>
          <img src={item.image} alt={item.title || `${item.bucketLabel} asset`} />
        </button>
      )}
      <div className="assetCardMeta">
        <span>{item.assetLabel || item.bucketLabel}</span>
        <small>{item.brandName} · {new Date(item.createdAt || Date.now()).toLocaleDateString()}</small>
      </div>
      <strong>{item.title || item.bucketLabel}</strong>
      {item.content && <p>{item.content.split("\n").filter(Boolean).slice(0, 3).join(" ").slice(0, 220)}{item.content.length > 220 ? "..." : ""}</p>}
      <details>
        <summary>Open details</summary>
        <pre>{item.content || item.title}</pre>
      </details>
      <div className="assetCardActions">
        <button onClick={() => toggleFavorite(item.id)}>{item.isFavorite ? "Favorited" : "Favorite"}</button>
        {item.content && <button onClick={() => copyToClipboard(item.content)}>Copy</button>}
        {item.bucket === "logos" && item.image && (
          <button onClick={() => setSavedLogoAsBrandProfile(item)} disabled={item.id === currentLogoAssetId}>
            {item.id === currentLogoAssetId ? "Current Logo ✓" : "Set Logo"}
          </button>
        )}
        {item.bucket === "logos" && item.image && <button onClick={() => continueSavedLogo(item)}>Refine</button>}
        <button onClick={() => remixOutput(item)}>Remix</button>
        <button className="miniDanger" onClick={() => deleteSavedAsset?.(item.id)}>Delete</button>
      </div>
    </article>
  );

  return (
    <section className="savedAssets assetLibrary">
      <div className="assetLibraryHero">
        <div>
          <div className="tinyTag">SAVED ASSETS</div>
          <h2>{brand.name} asset library</h2>
          <p>Search, filter, favorite, copy, remix, and manage the strongest outputs attached to this workspace.</p>
        </div>
        <strong>{allAssets.length} saved</strong>
      </div>

      <div className="assetControls">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search saved assets..." />
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          {filters.map(([key, label]) => (
            <option key={key} value={key}>{label} ({counts[key] || 0})</option>
          ))}
        </select>
        <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      <div className="assetCountRow">
        {Object.entries(bucketLabels).filter(([key]) => counts[key]).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}>{label}: {counts[key]}</button>
        ))}
        {counts.favorites ? <button onClick={() => setFilter("favorites")}>Favorites: {counts.favorites}</button> : null}
      </div>

      <div className="recentPanel assetRecentPanel">
        <div>
          <h3>Recent Generations</h3>
          <p>The newest saved outputs for this brand.</p>
        </div>
        <div className="recentList">
          {visibleRecent.length === 0 ? (
            <span>No recent generations yet. Open Content Tools and save the first caption, hashtag set, or logo concept.</span>
          ) : (
            visibleRecent.slice(0, 5).map((item) => (
              <button key={item.id} onClick={() => remixOutput(item)}>
                <strong>{item.title}</strong>
                <span>{item.bucketLabel || item.brandName || brand.name}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {filteredAssets.length ? (
        <div className="assetLibraryGrid">
          {filteredAssets.map(renderAssetCard)}
        </div>
      ) : (
        <div className="emptyState assetEmptyState">
          {search || filter !== "all"
            ? "No saved assets match this search or filter."
            : "No saved assets yet. Generate a caption, hashtag set, bio, email, roadmap, or logo concept to start building this brand library."}
        </div>
      )}
    </section>
  );
}

function HomepageSEOContent({ openSeoPage }) {
  return (
    <section className="seoHomeSection">
      <div className="tinyTag">GUIDED BRAND WORKSPACE</div>
      <h2>Brandthat.ai helps creators and small businesses turn rough ideas into brand plans, visual direction, roadmaps, and launch assets.</h2>
      <p>
        Start with the idea, clarify the strategy, shape the identity direction, then create captions, hashtags, roadmaps, and logo concepts from the same brand foundation.
      </p>
      <div className="seoInternalLinks">
        <button onClick={() => openSeoPage("seo-brand")}>Brand Plan Generator</button>
        <button onClick={() => openSeoPage("seo-growth")}>Growth Roadmap Generator</button>
        <button onClick={() => openSeoPage("seo-logo")}>Logo Concepts</button>
        <button onClick={() => openSeoPage("seo-instagram")}>Instagram Caption Generator</button>
        <button onClick={() => openSeoPage("seo-hashtag")}>Free Hashtag Generator</button>
      </div>
      <div className="seoTextGrid simpleSeoGrid">
        <div>
          <h3>Idea-first brand building</h3>
          <p>Turn a sentence, business idea, or rough concept into positioning, audience clarity, tone, and a practical next-step plan.</p>
        </div>
        <div>
          <h3>Visual direction with context</h3>
          <p>Moodboard, typography, color, and logo concepts work better once the brand strategy is clear.</p>
        </div>
        <div>
          <h3>A workspace when it matters</h3>
          <p>Save the brand plan, logo concepts, copy, roadmap, and future iterations in one project.</p>
        </div>
      </div>
    </section>
  );
}



function navigateToPage(setPage, page, path = "/") {
  setPage(page);
  window.history.pushState({}, "", path);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function BrandExamplesPage({ startCheckout, user, userPlan, authStatus, checkoutStatus, checkoutError, membershipLoading = false, membershipLookupFailed = false, setPage }) {
  const examples = [
    {
      id: "northline-example",
      type: "Physical product / apparel",
      name: "Northline Goods",
      description: "Weatherproof everyday carry for creators who move between studio, gym, travel, and late-night work.",
      thesis: "Northline Goods makes durable carry feel calm, useful, and design-aware for people whose days move across work, travel, and outdoor time.",
      audience: "Creators, photographers, founders, and operators who want dependable gear without looking overly tactical.",
      positioning: "Premium carry goods for people whose day does not fit one category.",
      voice: "Useful. Durable. Quietly premium.",
      visual: "Black technical fabric, warm neutrals, muted sage, compact typography, and real material detail.",
      colors: ["#11110f", "#fffdf8", "#d7c5ad", "#747863"],
      launch: "Creator commute stories, first-drop waitlist, product-page testing, and email sequence.",
      image: "/brandthat-assets/northline-brand-world.jpg",
      smallImage: "/brandthat-assets/northline-brand-world-small.jpg",
      alt: "Northline Goods tote bag, cap, apparel, packaging, bottle, and stationery photographed in a studio",
    },
    {
      id: "hearthline-example",
      type: "Local service business",
      name: "Hearthline Studio",
      description: "Affordable local interior styling for first-time homeowners.",
      thesis: "Hearthline Studio gives first-time homeowners an approachable way to make a room feel finished without the cost or overwhelm of full-service design.",
      audience: "Local homeowners, apartment owners, and young families who have taste but need a practical plan, shopping guidance, and confidence.",
      positioning: "Editorial taste translated into affordable, step-by-step room decisions for real homes.",
      voice: "Warm. Practical. Reassuring.",
      visual: "Warm plaster, muted clay, olive, soft charcoal, natural light, room notes, and before/after framing.",
      colors: ["#312b25", "#f5eadc", "#b98463", "#7a8065"],
      launch: "Google Business Profile, before/after reels, local partner referrals, consultation package, and neighborhood proof.",
      demoLabel: "Clearly labeled demo visualization: service one-sheet, room palette, booking card, and Instagram before/after plan.",
    },
    {
      id: "signaldesk-example",
      type: "Software / online business",
      name: "SignalDesk",
      description: "Software for creators managing sponsorships and invoices.",
      thesis: "SignalDesk gives creators a calmer operating layer for sponsorships, deliverables, invoices, and campaign memory.",
      audience: "Independent creators, small talent managers, and creator teams who need sponsorship work organized without adopting enterprise media tools.",
      positioning: "A calm creator workspace for keeping sponsorship revenue, deliverables, invoices, and campaign memory in one place.",
      voice: "Clear. Composed. Operator-minded.",
      visual: "Crisp monochrome, cool graphite, soft blue-gray, precise status accents, interface crops, and compact product language.",
      colors: ["#111317", "#f7f8f5", "#6d7f91", "#a9c6c7"],
      launch: "Founder-led LinkedIn, creator education threads, template lead magnet, waitlist, demo clips, and invoice workflow examples.",
      demoLabel: "Clearly labeled demo visualization: sponsorship pipeline, invoice status card, creator dashboard, and launch email.",
      dark: true,
    },
  ];

  return (
    <main className="examplesPage">
      <section className="examplesHero compactHero">
        <span className="examplesKicker">Example brand builds</span>
        <h1>Three ways to BrandThat.</h1>
        <p>These are demo examples, not customer projects. They show how the same system can shape different kinds of early business ideas.</p>
        <div className="examplesActions">
          <button className="birthCta" onClick={() => navigateToPage(setPage, "home", "/")}>Preview My Brand</button>
          <MembershipCta className="birthSecondary" user={user} userPlan={userPlan} authStatus={authStatus} checkoutStatus={checkoutStatus} checkoutError={checkoutError} startCheckout={startCheckout} loggedOutLabel="Unlock Workspace - $9.99/mo" verifiedLabel="Unlock Workspace - $9.99/mo" source="examples_unlock" membershipLoading={membershipLoading} membershipLookupFailed={membershipLookupFailed} />
        </div>
      </section>
      <section className="exampleBrandGrid" aria-label="BrandThat example categories">
        {examples.map((example, index) => (
          <article className={`exampleBrandCard editorial ${index % 2 ? "reverse" : ""}`} id={example.id} key={example.id}>
            {example.image ? (
              <figure className="exampleBrandMedia"><picture><source media="(max-width: 720px)" srcSet={example.smallImage} /><img src={example.image} alt={example.alt} loading="lazy" width="1800" height="1200" /></picture></figure>
            ) : (
              <div className={`exampleBrandMedia textExamplePanel demoVisualization ${example.dark ? "darkPanel" : ""}`}>
                <span>Demo visualization</span>
                <strong>{example.name}</strong>
                <p>{example.demoLabel}</p>
                <div className="demoColorRow">{example.colors.map((color) => <i key={color} style={{ background: color }} />)}</div>
                <ul><li>{example.voice}</li><li>{example.launch}</li></ul>
              </div>
            )}
            <div className="exampleBrandCopy">
              <span>{example.type}</span>
              <h2>{example.name}</h2>
              <p>{example.description}</p>
              <div className="exampleDetails">
                <div><strong>Brand thesis</strong><span>{example.thesis}</span></div>
                <div><strong>Audience</strong><span>{example.audience}</span></div>
                <div><strong>Positioning</strong><span>{example.positioning}</span></div>
                <div><strong>Voice</strong><span>{example.voice}</span></div>
                <div><strong>Visual direction</strong><span>{example.visual}</span></div>
                <div><strong>Color palette</strong><span>{example.colors.join(" · ")}</span></div>
                <div><strong>Launch direction</strong><span>{example.launch}</span></div>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function NorthlineInputPanel({ onExample }) {
  return <div className="northlineInputPanel"><div className="inputPanelHeader"><span>Start with two details</span><strong>Example</strong></div><div className="inputRows"><div className="inputRow"><span>Brand name</span><strong>Northline Goods</strong></div><div className="inputRow large"><span>What does it represent?</span><p>Weatherproof everyday carry for creators who move between studio, gym, travel, and late-night work.</p></div></div><div className="agentSteps" aria-label="BrandThat generation steps"><span>Analyzes the idea</span><span>Defines audience</span><span>Builds identity direction</span><span>Creates launch roadmap</span></div><button className="inputAction" onClick={onExample}>Use this example</button></div>;
}

function NorthlineOutputPreview({ priority = false }) {
  const outputs = [["Logo", "NORTHLINE GOODS"], ["Handle", "@northline.goods"], ["Voice", "Useful. Durable. Quietly premium."], ["Roadmap", "First carry-system launch"]];
  return <div className="northlineOutputPreview" aria-label="BrandThat output preview for Northline Goods"><figure className="previewImageFrame"><picture><source media="(max-width: 720px)" srcSet="/brandthat-assets/northline-digital-system-small.jpg" /><img src="/brandthat-assets/northline-digital-system.jpg" alt="Northline Goods website, Instagram, brand guidelines, caption examples, and launch roadmap" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} width="1800" height="1200" /></picture></figure><div className="outputTray">{outputs.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div>;
}

function BrandDemoWalkthrough({ onExample }) {
  const stages = [["01", "Input", "Northline Goods: weatherproof everyday carry for creative days."], ["02", "Analysis", "BrandThat identifies a gap between technical bags and polished daily work gear."], ["03", "Strategy", "Thesis, audience, positioning, voice, and differentiator appear together."], ["04", "Identity", "Color, typography, visual direction, and logo concepts follow the strategy."], ["05", "Content", "Captions, bios, handles, and platform direction inherit the same Brand DNA."], ["06", "Roadmap", "A 90-day launch plan turns the direction into concrete next actions."], ["07", "Workspace", "The brand stays saved as a living workspace for future edits and generators."]];
  return <section className="productWalkthrough" id="northline-demo"><div className="sectionHeader compact"><span>Product demonstration</span><h2>One brand context powers the whole workspace.</h2><p>Every tool uses the same brand context, so your strategy, visuals, content, and roadmap stay connected.</p><button className="textLinkButton inlineAction" onClick={onExample}>Use this example</button></div><div className="walkthroughGrid"><NorthlineOutputPreview /><div className="walkthroughSteps">{stages.map(([num, title, copy]) => <article key={title}><span>{num}</span><strong>{title}</strong><p>{copy}</p></article>)}</div></div></section>;
}

function WhatYouReceiveSection() {
  const items = [["Strategy", "Brand thesis, target audience, positioning, differentiator, and customer motivation."], ["Identity direction", "Moodboard notes, visual direction, typography, color system, and logo guidance."], ["Content system", "Brand voice, captions, bios, hashtags, platform direction, and content ideas."], ["Launch roadmap", "30/60/90-day actions, priorities, and next steps saved inside the workspace."]];
  return <section className="receiveSection" id="receive-section"><div className="sectionHeader compact"><span>What customers receive</span><h2>A connected brand plan, not disconnected prompts.</h2></div><div className="receiveGrid">{items.map(([title, copy]) => <article key={title}><strong>{title}</strong><p>{copy}</p></article>)}</div></section>;
}

function CompleteExampleSection() {
  return <section className="completeExample" id="complete-example"><div className="worldCopy"><span>Complete example</span><h2>Northline Goods becomes a full brand world.</h2><p>The mockups are demo examples of brand direction, not physical deliverables. BrandThat produces the strategy, content, identity direction, roadmap, saved workspace, and logo concepts that guide this kind of execution.</p><div className="worldList"><div><strong>Merchandise</strong><span>Heavyweight tee, embroidered cap, utility pouch, and launch tote direction.</span></div><div><strong>Packaging</strong><span>Shipping box, hang tag, customer insert, and product-card direction.</span></div><div><strong>Digital</strong><span>Website direction, social profile, captions, handles, and campaign guidance.</span></div></div></div><figure className="brandWorldPhoto"><picture><source media="(max-width: 720px)" srcSet="/brandthat-assets/northline-brand-world-small.jpg" /><img src="/brandthat-assets/northline-brand-world.jpg" alt="Northline Goods tote bag, apparel, cap, pouch, packaging, water bottle, and stationery photographed in warm light" loading="lazy" width="1800" height="1200" /></picture></figure></section>;
}

function HowItWorksSection() {
  const steps = [["Describe", "Enter the brand name, rough idea, and optional audience/style context."], ["Preview", "See a limited brand direction before deciding whether to unlock the full workspace."], ["Unlock", "Create an account and start the $9.99/month membership when you want the complete system."], ["Build", "Use the saved workspace and connected generators to keep shaping the brand."]];
  return <section className="howSection"><div className="sectionHeader compact"><span>How BrandThat works</span><h2>Fast enough for an idea. Structured enough for launch.</h2></div><div className="howGrid">{steps.map(([t,c], i)=><article key={t}><span>{String(i+1).padStart(2,"0")}</span><strong>{t}</strong><p>{c}</p></article>)}</div></section>;
}

function PricingSection({ startCheckout, user, userPlan, authStatus, checkoutStatus, checkoutError, membershipLoading = false, membershipLookupFailed = false }) {
  return <section className="pricingSection" id="brandthat-membership"><div><span>Membership and pricing</span><h2>$9.99/month — cancel anytime.</h2><p>Monthly access unlocks the complete BrandThat workspace and connected generators while your subscription is active.</p><p className="policyNote">You can create a free preview before checkout. The complete workspace requires an account, email verification, and active membership.</p></div><div className="priceStatement"><span>BrandThat Membership</span><strong>$9.99/mo</strong><ul><li>Complete strategy and expanded audience/positioning</li><li>Brand voice, identity direction, and logo concepts</li><li>Platform/content direction and 90-day launch roadmap</li><li>Saved workspace and connected generators</li></ul><MembershipCta user={user} userPlan={userPlan} authStatus={authStatus} checkoutStatus={checkoutStatus} checkoutError={checkoutError} startCheckout={startCheckout} source="pricing_membership" membershipLoading={membershipLoading} membershipLookupFailed={membershipLookupFailed} /><a href="/cancellation">Cancellation information</a></div></section>;
}

function TrustSection() {
  return <section className="trustSection" id="policies"><div className="sectionHeader compact"><span>Trust and product boundaries</span><h2>Know exactly what BrandThat creates.</h2></div><div className="boundaryGrid"><article><strong>Included</strong><ul><li>AI-generated brand strategy</li><li>Audience and positioning direction</li><li>Brand voice and messaging</li><li>Visual and identity direction</li><li>Logo concepts</li><li>Content direction and launch roadmap</li></ul></article><article><strong>Not automatically included</strong><ul><li>Trademark registration or legal clearance</li><li>Guaranteed social-handle availability</li><li>Human-designed custom identity work</li><li>Printed merchandise or packaging</li><li>A completed hosted website</li></ul></article><article><strong>Customer protection</strong><p>BrandThat uses account authentication and Stripe checkout for paid access. Generated results should be reviewed before use in legal, trademark, advertising, or financial decisions.</p></article></div></section>;
}

function FAQSection() {
  const faqs = [["What does BrandThat create?", "A connected brand plan: strategy, audience, positioning, voice, identity direction, logo concepts, content direction, roadmap, and workspace."], ["Is BrandThat using AI?", "Yes. BrandThat uses AI to draft brand strategy and creative direction from the details you provide."], ["Do I need a business name already?", "No. You can start with a working name or rough idea and refine it later."], ["Can I edit my results?", "Workspace fields and saved project details are editable in the current app."], ["Can I create more than one brand?", "BrandThat supports saved brand workspaces for signed-in members. Membership terms may apply to high-volume generation."], ["What logo files do I receive?", "The logo flow supports generated logo concepts and downloadable SVG/transparent preview assets where available."], ["Can I use the output commercially?", "BrandThat provides AI-generated drafts and direction. Review outputs before commercial use and get professional advice for legal, trademark, or regulated claims."], ["Does BrandThat check trademarks?", "No. Trademark clearance requires separate legal verification."], ["Does BrandThat guarantee available domains or handles?", "No. Handle/domain availability is not guaranteed unless separately checked."], ["What happens if I cancel?", "Paid tools require an active membership. You can cancel anytime through the billing flow when customer billing is available."], ["Is the $9.99 charge monthly?", "Yes. The checkout function validates a recurring monthly $9.99 USD Stripe price."], ["How do I contact support?", `Email ${PUBLIC_SUPPORT_EMAIL} for BrandThat support.`]];
  return <section className="faqSection"><div className="sectionHeader compact"><span>FAQ</span><h2>Clear answers before checkout.</h2></div><div className="faqList">{faqs.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></section>;
}

function BrandBirthHomepage({ workspaceDraft, setWorkspaceDraft, autoSaveStatus, buildGuidedBrandPlan, loading, startCheckout, user, userPlan, authStatus, checkoutStatus, checkoutError, membershipLoading = false, membershipLookupFailed = false }) {
  const scrollSection = (sectionId) => {
    window.history.replaceState({}, "", `/#${sectionId}`);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const seedExampleBrand = () => { setWorkspaceDraft({ ...workspaceDraft, name: "Northline Goods", description: "Weatherproof everyday carry for creators who move between studio, gym, travel, and late-night work.", audience: "Creators, founders, photographers, designers, and operators", style: "Quietly premium, durable, useful", industry: "physical goods and apparel", exampleContext: "" }); trackBrandthatEvent("example_selection", { example: "northline_goods" }); setTimeout(() => scrollSection("brandthat-builder"), 80); };
  const scrollToBuilder = () => { trackBrandthatEvent("hero_cta_click", { cta: "preview_my_brand" }); scrollSection("brandthat-builder"); };
  return <div className="birthPage" id="brandthat-product"><section className="birthHero" id="product-demo"><div className="birthHeroCopy"><h1>One idea. An entire brand.</h1><p>Start with your brand name and rough idea. BrandThat uses AI to preview the strategy, identity direction, content system, and roadmap you can build around.</p><div className="birthHeroActions"><button className="birthCta" onClick={scrollToBuilder}>Preview My Brand</button><button className="textLinkButton" onClick={() => scrollSection("northline-demo")}>See a complete example</button></div><p className="heroSupport">No checkout required for the first preview.</p></div><BirthHeroVisual /></section><BrandDemoWalkthrough onExample={seedExampleBrand} /><WhatYouReceiveSection /><CompleteExampleSection /><HowItWorksSection /><PricingSection startCheckout={startCheckout} user={user} userPlan={userPlan} authStatus={authStatus} checkoutStatus={checkoutStatus} checkoutError={checkoutError} membershipLoading={membershipLoading} membershipLookupFailed={membershipLookupFailed} /><TrustSection /><FAQSection /><section className="birthBuilder" id="brandthat-builder"><div><span>Final CTA</span><h2>Bring the idea. Preview the direction.</h2><p>Generate a limited preview first. Create an account and unlock the full workspace when you want the complete plan.</p></div><BrandBuilderFlow workspaceDraft={workspaceDraft} setWorkspaceDraft={setWorkspaceDraft} autoSaveStatus={autoSaveStatus} buildGuidedBrandPlan={buildGuidedBrandPlan} loading={loading} startCheckout={startCheckout} user={user} userPlan={userPlan} authStatus={authStatus} checkoutStatus={checkoutStatus} checkoutError={checkoutError} membershipLoading={membershipLoading} membershipLookupFailed={membershipLookupFailed} /></section></div>;
}

function BirthHeroVisual() {
  return <div className="birthHeroVisual" aria-label="Idea becoming a brand"><NorthlineOutputPreview priority /></div>;
}

function InfoPage({ page, setPage }) {
  const pages = {
    about: {
      title: "About BrandThat",
      eyebrow: "ABOUT",
      body: "BrandThat exists for people with early ideas who need clarity before they can launch. The product helps founders, creators, local businesses, and online operators shape strategy, identity direction, content direction, and next steps from a rough brand name and idea.",
      notes: ["BrandThat is a software product, not a human agency.", "Outputs are AI-generated drafts designed to help users make better brand decisions."],
    },
    contact: {
      title: "Contact and Support",
      eyebrow: "SUPPORT",
      body: `For BrandThat account, billing, or product questions, contact ${PUBLIC_SUPPORT_EMAIL}. Do not send passwords, full payment card numbers, or sensitive personal information through email.`,
      notes: ["Include the email address on your BrandThat account when asking about billing or access.", "BrandThat will never ask you to send a full card number by email."],
    },
    privacy: {
      title: "Privacy Policy",
      eyebrow: "PRIVACY",
      body: "BrandThat uses account, authentication, checkout, and generation systems to provide the service. The product uses submitted brand details to generate previews, strategy, identity direction, content direction, roadmap, and workspace output.",
      notes: ["Current integrations include Supabase authentication/database, Stripe checkout, Netlify functions, and local product analytics events.", "Do not send passwords, full payment details, or sensitive regulated information inside brand prompts."],
    },
    terms: {
      title: "Terms of Service",
      eyebrow: "TERMS",
      body: "BrandThat provides software-generated brand strategy, identity direction, content direction, roadmap, saved workspace, and logo concepts. Paid tools require an account, email verification, and active membership.",
      notes: ["BrandThat does not automatically provide legal clearance, trademark registration, physical merchandise, or a completed hosted website.", "Generated outputs should be reviewed before use in legal, trademark, financial, health, or regulated claims."],
    },
    cancellation: {
      title: "Cancellation Policy",
      eyebrow: "CANCELLATION",
      body: "BrandThat is offered as a $9.99/month membership. You can cancel anytime through the billing flow when customer billing is available, or contact support for help with account access.",
      notes: ["Paid tools require an active membership.", `For billing help, contact ${PUBLIC_SUPPORT_EMAIL}.`],
    },
    refund: {
      title: "Refund Policy",
      eyebrow: "REFUNDS",
      body: "Refund requests are reviewed through support. Include the email address on your BrandThat account and a short explanation of the issue.",
      notes: [`For refund or billing questions, contact ${PUBLIC_SUPPORT_EMAIL}.`, "Do not include full card numbers or sensitive payment details in support messages."],
    },
  };
  const content = pages[page] || pages.about;
  return (
    <main className="infoPage">
      <span>{content.eyebrow}</span>
      <h1>{content.title}</h1>
      <p>{content.body}</p>
      <div className="infoNotes">
        {content.notes.map((note) => <article key={note}>{note}</article>)}
      </div>
      <button className="birthCta" onClick={() => { setPage("home"); window.history.pushState({}, "", "/"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to BrandThat</button>
    </main>
  );
}

function BrandOperatingSection({ selectTool, openSeoPage }) {
  const rows = [
    ["Brand Plan", "Define the thesis, audience, offer, voice, visual direction, and roadmap before generating assets.", () => selectTool("brand")],
    ["Logo Studio", "Create logo concepts, refine them, download assets, and save the strongest direction to a workspace.", () => openSeoPage("seo-logo")],
    ["Content System", "Generate captions, hooks, hashtags, bios, emails, campaigns, audits, and growth plans from the same brand context.", () => selectTool("campaign")],
  ];

  return (
    <section className="operatingSection">
      <div className="operatingIntro">
        <div className="tinyTag">THE WORKFLOW</div>
        <h2>Everything stays connected.</h2>
        <p>BrandThat is organized like a modern creative command center: one idea becomes a plan, the plan becomes assets, and the assets live in a workspace you can keep improving.</p>
      </div>
      <div className="operatingGrid">
        {rows.map(([title, copy, action], index) => (
          <button key={title} onClick={action}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{title}</strong>
            <p>{copy}</p>
          </button>
        ))}
      </div>
    </section>
  );
}

function MembershipBand({ startCheckout, user, userPlan, authStatus, checkoutStatus, checkoutError, membershipLoading = false, membershipLookupFailed = false }) {
  return (
    <section className="membershipBand" id="brandthat-membership">
      <div>
        <div className="tinyTag">BRANDTHAT MEMBERSHIP</div>
        <h2>Build your brand for $9.99/month.</h2>
        <p>Monthly membership unlocks the full BrandThat workspace, brand strategy, generators, launch roadmap, and logo concepts while your subscription is active.</p>
        <div className="membershipValueGrid">
          {["Monthly membership", "Full workspace access", "Generators unlocked", "Logo concepts after strategy"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>
      <div className="membershipPanel">
        <span>Included in your membership</span>
        <ul>
          <li>Brand strategy, audience insights, positioning, and personality</li>
          <li>Moodboard, typography system, color system, voice, and taglines</li>
          <li>Platform-by-platform marketing strategy and content direction</li>
          <li>90-day launch roadmap with next best actions</li>
          <li>Saved workspace and logo concepts generated from the completed strategy</li>
        </ul>
        <MembershipCta className="btn dark full" user={user} userPlan={userPlan} authStatus={authStatus} checkoutStatus={checkoutStatus} checkoutError={checkoutError} startCheckout={startCheckout} verifiedLabel="Start Membership - $9.99/mo" source="membership_band" membershipLoading={membershipLoading} membershipLookupFailed={membershipLookupFailed} />
      </div>
    </section>
  );
}

function SEOPage({
  seoPage,
  activeTool,
  prompt,
  setPrompt,
  selectedPlatform,
  setSelectedPlatform,
  creativeTone,
  setCreativeTone,
  logoIndustry,
  setLogoIndustry,
  logoSymbol,
  setLogoSymbol,
  logoColors,
  setLogoColors,
  logoAvoid,
  setLogoAvoid,
  captionGoal = "Awareness",
  setCaptionGoal = () => {},
  generate,
  loading,
  result,
  generationError = "",
  logoGenerationError,
  logoImage,
  setLogoImage,
  logoImageSource,
  logoVectorImage,
  setLogoVectorImage,
  logoSvg,
  setLogoSvg,
  logoTransparentSvg,
  logoVariations,
  logoCreativeBrief,
  logoFallbackOption,
  logoGenerationMemory,
  logoEditor,
  setLogoEditor,
  recentLogoResults,
  restoreRecentLogo,
  user,
  userPlan,
  brandWorkspacesCount,
  isLogoTestingUnlocked,
  trialRemaining,
  copyToClipboard,
  shareOutput,
  clearGenerator,
  saveCurrentOutput,
  saveGeneratedAsset = () => {},
  saveCurrentLogoConcept = () => {},
  setLogoAsBrandProfile,
  onUseLogoFallback = () => {},
  onStartWorkspace,
  onBuildGrowthRoadmap,
  rememberRejectedLogoDirection,
  toggleFavorite,
  remixOutput,
  openSeoPage
}) {
  return (
    <section className="pageSection seoPage">
      <div className="tinyTag">{seoPage.eyebrow}</div>
      <h1 className="pageTitle">{seoPage.h1}</h1>
      <p className="pageLead">{seoPage.intro}</p>

      <div id="brandthat-generator">
        <LogoGenerationErrorBoundary resetKey={`${activeTool.key}-${loading}-${logoImage}-${logoGenerationError}`}>
          <GeneratorCard
          activeTool={activeTool}
          prompt={prompt}
          setPrompt={setPrompt}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          creativeTone={creativeTone}
          setCreativeTone={setCreativeTone}
          logoIndustry={logoIndustry}
          setLogoIndustry={setLogoIndustry}
            logoSymbol={logoSymbol}
            setLogoSymbol={setLogoSymbol}
            logoColors={logoColors}
            setLogoColors={setLogoColors}
            logoAvoid={logoAvoid}
            setLogoAvoid={setLogoAvoid}
            captionGoal={captionGoal}
            setCaptionGoal={setCaptionGoal}
          generate={generate}
          loading={loading}
          generationSlow={generationSlow}
          result={result}
          generationError={generationError}
          logoGenerationError={logoGenerationError}
          logoImage={logoImage}
          setLogoImage={setLogoImage}
          logoImageSource={logoImageSource}
          logoVectorImage={logoVectorImage}
          setLogoVectorImage={setLogoVectorImage}
          logoSvg={logoSvg}
          setLogoSvg={setLogoSvg}
          logoTransparentSvg={logoTransparentSvg}
          logoVariations={logoVariations}
          logoCreativeBrief={logoCreativeBrief}
          logoFallbackOption={logoFallbackOption}
          logoGenerationMemory={logoGenerationMemory}
          logoEditor={logoEditor}
          setLogoEditor={setLogoEditor}
          recentLogoResults={recentLogoResults}
          restoreRecentLogo={restoreRecentLogo}
          user={user}
          userPlan={userPlan}
          brandWorkspacesCount={brandWorkspacesCount}
          isLogoTestingUnlocked={isLogoTestingUnlocked}
          trialRemaining={trialRemaining}
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
            clearGenerator={clearGenerator}
            saveCurrentOutput={saveCurrentOutput}
            saveGeneratedAsset={saveGeneratedAsset}
            saveCurrentLogoConcept={saveCurrentLogoConcept}
            setLogoAsBrandProfile={setLogoAsBrandProfile}
          onUseLogoFallback={onUseLogoFallback}
          onStartWorkspace={onStartWorkspace}
          onBuildGrowthRoadmap={onBuildGrowthRoadmap}
          rememberRejectedLogoDirection={rememberRejectedLogoDirection}
          toggleFavorite={toggleFavorite}
          remixOutput={remixOutput}
          />
        </LogoGenerationErrorBoundary>
      </div>

      <div className="seoArticle">
        <div className="seoArticleBlock">
          <h2>How it works</h2>
          <p>Describe what you want to create, choose a platform or style, select a tone, and Brandthat.ai generates a polished output you can copy, save, share, or build into your brand workspace.</p>
        </div>

        <BrandEverywherePanel
          toolKey={seoPage.toolKey}
          setPrompt={setPrompt}
          setSelectedPlatform={setSelectedPlatform}
          setCreativeTone={setCreativeTone}
        />

        <div className="seoArticleBlock seoUseCases">
          <h2>Built for real brand moments</h2>
          <div className="useCaseGrid">
            {getUseCases(seoPage.toolKey).map((item) => (
              <div className="useCaseCard" key={item.title}>
                <span>{item.kicker}</span>
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="seoArticleBlock faqCompact">
          <h2>Quick answers</h2>
          <div className="faqGrid">
            {seoPage.faqs.map(([question, answer]) => (
              <div className="faqCard" key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="seoArticleBlock">
          <h2>Explore more Brandthat.ai tools</h2>
          <div className="seoInternalLinks">
            <button onClick={() => openSeoPage("seo-logo")}>Logo Concepts</button>
            <button onClick={() => openSeoPage("seo-instagram")}>Instagram Caption Generator</button>
            <button onClick={() => openSeoPage("seo-tiktok")}>TikTok Hook Generator</button>
            <button onClick={() => openSeoPage("seo-bio")}>Brand Bio Generator</button>
          </div>
        </div>
      </div>
    </section>
  );
}


function BrandEverywherePanel({ toolKey, setPrompt, setSelectedPlatform, setCreativeTone }) {
  const isLogo = toolKey === "logo";

  const applyBrandSystemPrompt = () => {
    const nextPrompt = isLogo
      ? "Create a complete logo direction for a new brand. Include a clean primary logo, a simple icon mark, a favicon-ready version, social profile use, website header use, packaging/business card use, and a premium visual identity direction that can scale across every brand touchpoint."
      : "Create brand-ready content that can be used across a website, social profile, launch post, email announcement, and brand workspace. Keep the output polished, practical, and easy to copy.";

    setPrompt(nextPrompt);
    setSelectedPlatform(isLogo ? "Complete brand identity system" : "Multi-platform brand system");
    setCreativeTone("Premium, clear, modern, versatile");
    document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const touchpoints = isLogo
    ? [
        ["01", "Logo mark", "Create the first visual anchor for the brand."],
        ["02", "Website", "Use the identity across headers, landing pages, and CTAs."],
        ["03", "Social", "Turn the mark into a profile image, launch post, and content system."],
        ["04", "Brand kit", "Save colors, tone, direction, captions, hooks, and bios in one workspace."],
      ]
    : [
        ["01", "Generate", "Create polished brand content from one prompt."],
        ["02", "Save", "Store it inside the active Brand Workspace."],
        ["03", "Reuse", "Turn one asset into posts, hooks, emails, and launch copy."],
        ["04", "Export", "Build a simple brand kit users can keep and share."],
      ];

  return (
    <div className="seoArticleBlock brandEverywhereBlock">
      <div className="brandEverywhereHero">
        <div>
          <div className="tinyTag">BRAND SYSTEM</div>
          <h2>From first logo to full brand presence.</h2>
          <p>
            Start with one strong visual direction, then carry it into your website,
            social profiles, launch content, and saved Brand Workspace.
          </p>
          <button className="btn dark" onClick={applyBrandSystemPrompt}>
            Build a full brand direction
          </button>
        </div>

        <div className="brandMockupStack" aria-label="Brand identity preview">
          <div className="mockBrowser">
            <div className="mockBrowserTop"><span></span><span></span><span></span></div>
            <div className="mockBrowserNav">
              <strong>Brand</strong>
              <small>Home · Shop · About</small>
            </div>
            <div className="mockHeroLine"></div>
            <div className="mockHeroLine short"></div>
            <div className="mockButton"></div>
          </div>

          <div className="mockSocialCard">
            <div className="mockAvatar">B</div>
            <div>
              <strong>Profile-ready</strong>
              <span>Logo · Bio · Hooks · Captions</span>
            </div>
          </div>

          <div className="mockKitCard">
            <span>Brand Kit</span>
            <div className="mockSwatches"><i></i><i></i><i></i></div>
          </div>
        </div>
      </div>

      <div className="brandTouchpointGrid">
        {touchpoints.map(([number, title, copy]) => (
          <div className="brandTouchpoint" key={title}>
            <span>{number}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCreativeDirections(toolKey) {
  const directions = {
    logo: [
      {
        initials: "LM",
        title: "Luxury Minimal",
        copy: "Clean typography, restraint, high-end spacing, premium neutral palette.",
        style: "Luxury minimal wordmark with optional simple icon",
        tone: "Premium, elegant, restrained",
        prompt: "Create a luxury minimal logo for a premium brand. Use clean typography, strong spacing, a simple memorable mark, and a neutral high-end visual direction. Make it work as a website logo, social icon, and favicon."
      },
      {
        initials: "VM",
        title: "Vintage Mascot",
        copy: "Character-driven, badge-ready, packaging-friendly, nostalgic but polished.",
        style: "Vintage mascot logo with badge composition",
        tone: "Warm, memorable, crafted",
        prompt: "Create a vintage mascot logo for a brand. Use a memorable character mark, badge-ready composition, premium typography, and a polished packaging-ready feel. Keep it clean, not cartoonish."
      },
      {
        initials: "TM",
        title: "Tech Monogram",
        copy: "Sharp lettermark, strong favicon use, modern SaaS/product identity.",
        style: "Modern tech monogram and clean wordmark",
        tone: "Modern, sharp, trustworthy",
        prompt: "Create a modern tech monogram logo with a clean wordmark. Make it simple, scalable, favicon-ready, and suitable for an AI, SaaS, or startup brand."
      },
      {
        initials: "BB",
        title: "Boutique Brand",
        copy: "Editorial, refined, soft luxury for lifestyle, beauty, ranch, or hospitality.",
        style: "Boutique editorial brand mark",
        tone: "Elegant, warm, premium",
        prompt: "Create an elegant boutique logo for a premium lifestyle brand. Use refined typography, subtle symbolism, warm neutral direction, and a polished high-end feel."
      }
    ],
    captions: [
      {
        initials: "SR",
        title: "Story Reveal",
        copy: "A polished caption that makes a launch, moment, or transformation feel intentional.",
        style: "Instagram launch caption",
        tone: "Premium, clear, story-driven",
        prompt: "Write a polished Instagram caption for a brand reveal. Make it concise, premium, story-driven, and include a soft call to action."
      },
      {
        initials: "CT",
        title: "Clean CTA",
        copy: "Short, direct, conversion-focused copy that still feels brand-safe.",
        style: "Short social caption",
        tone: "Direct, modern, confident",
        prompt: "Write short social captions with clear calls to action. Keep them modern, confident, and easy to use."
      },
      {
        initials: "BT",
        title: "Behind the Brand",
        copy: "Human, founder-led, and trust-building without sounding cheesy.",
        style: "Founder caption",
        tone: "Authentic, premium, warm",
        prompt: "Write founder-style captions that explain the story behind a brand or product. Make them natural, polished, and trust-building."
      },
      {
        initials: "VL",
        title: "Viral Light",
        copy: "Hooky and shareable, but still tasteful and premium.",
        style: "Viral social caption",
        tone: "Witty, sharp, not cheesy",
        prompt: "Write engaging captions that feel hooky and shareable without sounding cheap or overly clickbait."
      }
    ],
    hooks: [
      {
        initials: "POV",
        title: "POV Hook",
        copy: "Instantly places the viewer inside the transformation.",
        style: "POV short-form hook",
        tone: "Fast, visual, social-native",
        prompt: "Create short POV-style hooks for a video. Give 1-second, 3-second, and 5-second options that feel natural and scroll-stopping."
      },
      {
        initials: "BF",
        title: "Before / After",
        copy: "Built for transformation videos, redesigns, and reveal content.",
        style: "Before and after hook",
        tone: "Curious, premium, concise",
        prompt: "Create before-and-after hooks for a transformation video. Make them curiosity-driven, concise, and premium."
      },
      {
        initials: "MY",
        title: "Myth Breaker",
        copy: "Challenges a common assumption and earns the next few seconds.",
        style: "Myth-busting hook",
        tone: "Smart, direct, useful",
        prompt: "Create short hooks that challenge a common belief in the niche. Make them useful, direct, and designed to stop the scroll."
      },
      {
        initials: "FS",
        title: "Founder Story",
        copy: "A clean hook style for build-in-public and startup content.",
        style: "Founder story hook",
        tone: "Authentic, modern, ambitious",
        prompt: "Create founder-story hooks for a build-in-public video. Make them ambitious, human, and concise."
      }
    ],
    bios: [
      {
        initials: "IG",
        title: "Instagram Bio",
        copy: "Short, clear, personality-forward, built for profile conversion.",
        style: "Instagram bio",
        tone: "Clear, polished, modern",
        prompt: "Create Instagram bio options for a brand. Make them short, clear, conversion-focused, and modern."
      },
      {
        initials: "WEB",
        title: "Website Bio",
        copy: "More complete positioning for homepage, about section, or landing page.",
        style: "Website brand bio",
        tone: "Professional, premium, clear",
        prompt: "Create website bio options for a brand. Explain what it does, who it helps, and why it matters in a polished way."
      },
      {
        initials: "LI",
        title: "LinkedIn Bio",
        copy: "Professional, credible, and built for founders, teams, and services.",
        style: "LinkedIn bio",
        tone: "Professional, trustworthy, polished",
        prompt: "Create LinkedIn bio options for a founder, brand, or business. Make them credible, concise, and professional."
      },
      {
        initials: "CR",
        title: "Creator Bio",
        copy: "Personal brand energy with clarity, taste, and a strong hook.",
        style: "Creator profile bio",
        tone: "Human, confident, memorable",
        prompt: "Create creator bio options that feel memorable, clear, and premium. Include short versions and slightly more detailed versions."
      }
    ]
  };

  return directions[toolKey] || directions.logo;
}

function getUseCases(toolKey) {
  const useCases = {
    logo: [
      { kicker: "LAUNCH", title: "New brands", copy: "Create the first visual direction for a startup, product, studio, or creator brand." },
      { kicker: "REFRESH", title: "Rebrands", copy: "Explore cleaner marks, stronger typography, and more premium identity directions." },
      { kicker: "SOCIAL", title: "Profile-ready marks", copy: "Generate logo concepts that can work across websites, profile photos, favicons, and packaging." }
    ],
    captions: [
      { kicker: "POST", title: "Daily content", copy: "Turn moments, launches, products, and behind-the-scenes clips into polished captions." },
      { kicker: "BRAND", title: "Consistent voice", copy: "Keep captions aligned to the same tone as your workspace." },
      { kicker: "CTA", title: "Better conversion", copy: "Create short captions that give people a reason to click, follow, save, or buy." }
    ],
    hooks: [
      { kicker: "VIDEO", title: "Short-form starts", copy: "Create the first words people see before they decide to keep watching." },
      { kicker: "RETENTION", title: "More watch time", copy: "Test multiple hook angles for the same clip before posting." },
      { kicker: "REELS", title: "Cross-platform use", copy: "Use hooks for TikTok, Reels, Shorts, and Facebook Reels." }
    ],
    bios: [
      { kicker: "PROFILE", title: "Social bios", copy: "Make Instagram, TikTok, and X profiles clearer and more compelling." },
      { kicker: "WEBSITE", title: "About sections", copy: "Create polished website bios that explain what the brand does quickly." },
      { kicker: "FOUNDER", title: "Personal brands", copy: "Write bios that feel credible, human, and specific." }
    ]
  };

  return useCases[toolKey] || useCases.logo;
}

function ToolGrid({ activeToolKey, selectTool }) {
  return (
    <div className="toolGrid">
      {tools.map((tool) => (
        <button
          className={activeToolKey === tool.key ? "toolCard activeTool" : "toolCard"}
          key={tool.key}
          onClick={() => selectTool(tool.key)}
        >
          <div className="toolGlow"></div>
          <h3>{tool.title}</h3>
          <p>{tool.desc}</p>
          <span>Open {tool.shortTitle}</span>
        </button>
      ))}
    </div>
  );
}

const PREMIUM_SHOWCASE_CANDIDATES = [
  {
    key: "luxury-wordmark",
    industry: "luxury",
    visualType: "wordmark",
    composition: "typography-first",
    palette: "monochrome",
    name: "Wordmark",
    note: "Typography-led identity",
    quality: {
      typography: 9.5,
      originality: 9,
      restraint: 9.5,
      scalability: 9.5,
      premiumFeel: 9.4,
      antiClipart: 10,
    },
  },
  {
    key: "saas-abstract",
    industry: "modern SaaS",
    visualType: "abstract mark",
    composition: "offset-symbol",
    palette: "ink-neutral",
    name: "Symbol",
    note: "Abstract brand mark",
    quality: {
      typography: 8.8,
      originality: 9.2,
      restraint: 9.1,
      scalability: 9.5,
      premiumFeel: 9,
      antiClipart: 9.6,
    },
  },
  {
    key: "agency-system",
    industry: "creative agencies",
    visualType: "geometric system",
    composition: "system-grid",
    palette: "warm-neutral",
    name: "System",
    note: "Workspace-ready assets",
    quality: {
      typography: 8.8,
      originality: 9.1,
      restraint: 9,
      scalability: 9.2,
      premiumFeel: 9,
      antiClipart: 9.4,
    },
  },
  {
    key: "finance-monogram",
    industry: "finance",
    visualType: "monogram",
    composition: "quiet-emblem",
    palette: "charcoal-stone",
    name: "Monogram",
    note: "Trust-first mark",
    quality: {
      typography: 9,
      originality: 8.7,
      restraint: 9.2,
      scalability: 9.4,
      premiumFeel: 9,
      antiClipart: 9.3,
    },
  },
  {
    key: "architecture-grid",
    industry: "architecture",
    visualType: "minimal icon",
    composition: "architectural-grid",
    palette: "black-white",
    name: "Grid",
    note: "Spatial identity",
    quality: {
      typography: 8.7,
      originality: 8.9,
      restraint: 9.4,
      scalability: 9.1,
      premiumFeel: 9.1,
      antiClipart: 9.5,
    },
  },
  {
    key: "beauty-serif",
    industry: "beauty",
    visualType: "wordmark",
    composition: "editorial-lockup",
    palette: "soft-monochrome",
    name: "Editorial",
    note: "Refined brand system",
    quality: {
      typography: 9.4,
      originality: 8.9,
      restraint: 9.3,
      scalability: 9,
      premiumFeel: 9.5,
      antiClipart: 9.7,
    },
  },
];

function getShowcaseQualityScore(item) {
  const values = Object.values(item.quality || {});
  if (!values.length) return 0;
  const score = values.reduce((total, value) => total + value, 0) / values.length;
  return Math.round(score * 10) / 10;
}

function isPremiumShowcaseCandidate(item) {
  if (!item) return false;
  if (getShowcaseQualityScore(item) < 8.5) return false;

  const blockedTerms = [
    "clipart",
    "cartoon",
    "generic",
    "stock",
    "overgenerated",
    "cheap",
    "template",
    "random",
  ];

  const searchable = `${item.name || ""} ${item.note || ""} ${item.visualType || ""} ${item.composition || ""}`.toLowerCase();
  return !blockedTerms.some((term) => searchable.includes(term));
}

function getPremiumShowcaseItems(limit = 3) {
  const selected = [];
  const usedIndustries = new Set();
  const usedVisualTypes = new Set();
  const usedCompositions = new Set();
  const usedPalettes = new Set();

  PREMIUM_SHOWCASE_CANDIDATES
    .filter(isPremiumShowcaseCandidate)
    .sort((a, b) => getShowcaseQualityScore(b) - getShowcaseQualityScore(a))
    .forEach((item) => {
      if (selected.length >= limit) return;
      if (usedIndustries.has(item.industry)) return;
      if (usedVisualTypes.has(item.visualType)) return;
      if (usedCompositions.has(item.composition)) return;
      if (usedPalettes.has(item.palette)) return;

      selected.push(item);
      usedIndustries.add(item.industry);
      usedVisualTypes.add(item.visualType);
      usedCompositions.add(item.composition);
      usedPalettes.add(item.palette);
    });

  return selected;
}

function HeroProofPanel() {
  const samples = getPremiumShowcaseItems(3);

  return (
    <div className="heroProofPanel" aria-label="Brandthat output preview">
      <div className="proofMiniGrid">
        {samples.map((sample) => (
          <div className="miniLogoOutput" key={sample.key}>
            <div className={`miniMark ${sample.key}`}>
              <span></span>
              <i></i>
            </div>
            <div>
              <strong>{sample.name}</strong>
              <span>{sample.note}</span>
              <small>{sample.industry} / {sample.visualType}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="proofMetricRow">
        <div><strong>SVG</strong><span>Vector export</span></div>
        <div><strong>PNG</strong><span>Transparent file</span></div>
        <div><strong>CD</strong><span>Creative Director notes</span></div>
      </div>
    </div>
  );
}

function ConversionTrustBar() {
  const items = [
    ["Creators", "Fast social-ready brand starts"],
    ["Local businesses", "Logos, captions, and growth plans"],
    ["Agencies", "Reusable client workspace exports"],
    ["Launch teams", "From rough idea to full brand kit"],
  ];

  return (
    <section className="trustBar" aria-label="Who Brandthat is built for">
      {items.map(([title, copy]) => (
        <div className="trustPill" key={title}>
          <strong>{title}</strong>
          <span>{copy}</span>
        </div>
      ))}
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section className="beforeAfterSection">
      <div>
        <div className="tinyTag">BEFORE / AFTER</div>
        <h2>Turn a rough prompt into a premium direction.</h2>
      </div>
      <div className="beforeAfterGrid">
        <div className="beforeCard">
          <span>Before</span>
          <p>"I have a business idea, but I need it to look credible."</p>
        </div>
        <div className="afterCard">
          <span>After</span>
          <div className="afterPreviewGrid">
            <div className="afterMark">
              <span></span>
              <i></i>
            </div>
            <div>
              <strong>A refined identity system</strong>
              <p>Clear positioning, stronger typography, a focused visual direction, export-ready logo files, and launch assets that feel intentional.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreativeDirectorExplainer() {
  const steps = [
    ["Reads the idea", "Brandthat detects industry, style, audience, and what the words actually mean."],
    ["Builds directions", "It explores distinct logo concepts before showing the final direction."],
    ["Checks quality", "Weak spacing, generic icons, and poor brand fit get pushed down."],
    ["Saves the system", "Paid users can keep the logo, notes, captions, and exports in one workspace."],
  ];

  return (
    <section className="creativeDirectorExplainer">
      <div>
        <div className="tinyTag">CREATIVE DIRECTOR</div>
        <h2>It does more than make an image.</h2>
        <p className="sectionLead">Brandthat reviews every logo direction like a small brand studio: concept fit, typography, icon logic, color, spacing, and whether it can actually work in public.</p>
      </div>
      <div className="directorFlow">
        {steps.map(([title, copy]) => (
          <div className="directorStep" key={title}>
            <strong>{title}</strong>
            <span>{copy}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function GeneratorCard({
  activeTool,
  prompt,
  setPrompt,
  selectedPlatform,
  setSelectedPlatform,
  creativeTone,
  setCreativeTone,
  logoIndustry = "",
  setLogoIndustry = () => {},
  logoSymbol = "",
  setLogoSymbol = () => {},
  logoColors = "",
  setLogoColors = () => {},
  logoAvoid = "",
  setLogoAvoid = () => {},
  captionGoal = "Awareness",
  setCaptionGoal = () => {},
  generate,
  loading,
  generationSlow = false,
  result,
  generationError = "",
  logoGenerationError = "",
  logoImage,
  setLogoImage = () => {},
  logoImageSource = "",
  logoVectorImage = "",
  setLogoVectorImage = () => {},
  logoSvg = "",
  setLogoSvg = () => {},
  logoTransparentSvg = "",
  logoVariations = [],
  logoCreativeBrief = null,
  logoFallbackOption = null,
  logoGenerationMemory = {},
  logoEditor = {},
  setLogoEditor = () => {},
  recentLogoResults = [],
  showRecentLogos = true,
  restoreRecentLogo = () => {},
  user,
  userPlan,
  brandWorkspacesCount = 0,
  isLogoTestingUnlocked = false,
  trialRemaining = 0,
  copyToClipboard,
  shareOutput,
  clearGenerator,
  saveCurrentOutput,
  saveGeneratedAsset = () => {},
  saveCurrentLogoConcept = () => {},
  setLogoAsBrandProfile,
  onUseLogoFallback = () => {},
  onStartWorkspace = () => {},
  onBuildGrowthRoadmap = () => {},
  brandMemoryPilot = { active: false, unavailable: false, loading: false, refreshing: false, message: "", status: null },
  onRefreshBrandMemory = () => {},
  onRetryBrandMemoryStatus = () => {},
  rememberRejectedLogoDirection,
  toggleFavorite,
  remixOutput,
  activeBrand = null,
  onBackToTools = () => {},
  onViewSavedAssets = () => {}
}) {
  const resultCards = activeTool.key === "logo" ? [] : formatSmartResultCards(activeTool.key, result);
  const currentBucket = getSavedBucketKey(activeTool.key);
  const [savingResultKey, setSavingResultKey] = useState("");
  const [copiedResultKey, setCopiedResultKey] = useState("");
  const getSavedAsset = (content = "", image = "") => {
    const fingerprint = normalizeAssetContent(content || image);
    if (!fingerprint || !activeBrand?.saved?.[currentBucket]) return null;
    return activeBrand.saved[currentBucket].find((item) => normalizeAssetContent(item.content || item.image) === fingerprint) || null;
  };
  const isAssetSaved = (content = "", image = "") => Boolean(getSavedAsset(content, image));
  const currentOutputSaved = activeTool.key === "logo" ? isAssetSaved("", logoImage) : isAssetSaved(stripLogoProjectMetadata(result));
  const currentLogoAssetId = getPrimaryLogoAssetId(activeBrand);
  const currentLogoSavedAsset = activeTool.key === "logo" ? getSavedAsset("", logoImage) : null;
  const currentLogoIsPrimary = Boolean(currentLogoSavedAsset?.id && currentLogoSavedAsset.id === currentLogoAssetId);
  const logoSaveInProgress = savingResultKey === "logo-current";
  const logoPrimaryInProgress = savingResultKey === "logo-primary";
  const getIndividualResultTitle = (index) => {
    const singularLabels = {
      captions: "Caption",
      hooks: "Hook",
      bios: "Bio",
      hashtags: "Hashtag Set",
      email: "Email",
      strategy: "Strategy",
      audit: "Audit",
      campaign: "Campaign Idea",
      growth: "Roadmap Idea",
      brand: "Brand Plan Section",
    };
    return `${singularLabels[activeTool.key] || activeTool.shortTitle} ${index + 1} • ${new Date().toLocaleDateString()}`;
  };
  const getCollectionTitle = () => {
    const platformPrefix = selectedPlatform ? `${selectedPlatform} ` : "";
    const collectionLabels = {
      captions: "Captions",
      hooks: "Hooks",
      bios: "Bios",
      hashtags: "Hashtags",
      email: "Emails",
      strategy: "Strategy Ideas",
      audit: "Audit Notes",
      campaign: "Campaign Ideas",
      growth: "Roadmap",
      brand: "Brand Plan",
    };
    return `${platformPrefix}${collectionLabels[activeTool.key] || activeTool.shortTitle} — ${new Date().toLocaleDateString()}`;
  };
  const handleSaveResultItem = async (item, index, favorite = false) => {
    const key = `${activeTool.key}-${index}`;
    const savedAsset = getSavedAsset(item);
    if (savedAsset && !favorite) return;
    setSavingResultKey(key);
    try {
      if (savedAsset) {
        if (favorite && !savedAsset.favorite) {
          await toggleFavorite?.(savedAsset.id);
        }
        return;
      }
      await saveGeneratedAsset({
        contentOverride: item,
        titleOverride: getIndividualResultTitle(index),
        favorite,
      });
    } catch (error) {
      console.error("BrandThat individual asset save failed", {
        tool: activeTool.key,
        message: error?.message || "Unknown save error",
      });
    } finally {
      setSavingResultKey("");
    }
  };
  const handleCopyResultItem = async (item, index) => {
    const key = `${activeTool.key}-${index}`;
    try {
      await copyToClipboard(item);
      setCopiedResultKey(key);
      window.setTimeout(() => {
        setCopiedResultKey((current) => current === key ? "" : current);
      }, 1400);
    } catch (error) {
      console.error("BrandThat copy failed", {
        tool: activeTool.key,
        message: error?.message || "Clipboard unavailable",
      });
    }
  };
  const saveLogoConceptFromResult = async ({ favorite = false, setPrimary = false, image = "", content = "", title = "" } = {}) => {
    const conceptImage = image || logoImage;
    const savedAsset = getSavedAsset("", conceptImage);
    const key = setPrimary ? "logo-primary" : "logo-current";
    if (savedAsset && !setPrimary && !favorite) return savedAsset;

    setSavingResultKey(key);
    try {
      const savedEntry = savedAsset || await saveCurrentLogoConcept({
        imageOverride: conceptImage,
        contentOverride: content || result || "Logo concept generated from the active Brand Workspace.",
        favorite,
        titleOverride: title || "Logo Concept • " + new Date().toLocaleDateString(),
      });

      if (savedEntry?.id && favorite && !savedEntry.favorite) {
        await toggleFavorite?.(savedEntry.id);
      }

      if (savedEntry?.id && setPrimary) {
        await setLogoAsBrandProfile(savedEntry);
      }

      return savedEntry;
    } catch (error) {
      console.error("BrandThat logo concept save failed", {
        workspaceId: activeBrand?.id || "",
        message: error?.message || "Unknown logo save error",
      });
      return null;
    } finally {
      setSavingResultKey("");
    }
  };
  const saveLogoVariation = (variation, index, options = {}) => {
    const directionLabel = variation?.title || variation?.name || ["Wordmark-led Concept", "Symbol Plus Wordmark", "Compact Avatar Badge"][index] || "Logo Concept";
    return saveLogoConceptFromResult({
      ...options,
      image: variation?.imageUrl || variation?.image || variation?.svg || logoImage,
      content: [
        directionLabel,
        variation?.name !== directionLabel ? variation?.name : "",
        variation?.rationale || variation?.whyFits,
        variation?.composition && `Composition: ${variation.composition}`,
        variation?.symbol && `Symbol: ${variation.symbol}`,
        variation?.typography && `Typography: ${variation.typography}`,
        (variation?.paletteUsage || variation?.palette) && `Palette: ${variation.paletteUsage || variation.palette}`,
        variation?.primaryUseCases && `Use cases: ${variation.primaryUseCases}`,
      ].filter(Boolean).join("\n"),
      title: `${directionLabel} • ${new Date().toLocaleDateString()}`,
    });
  };

  const activeEntry = {
    id: `active-${activeTool.key}`,
    tool: activeTool.key,
    title: `${activeTool.shortTitle} Draft`,
    content: result,
    image: logoImage,
    createdAt: new Date().toISOString(),
  };

  const openLogoImage = async () => {
    try {
      await openGeneratedImage(logoImage);
    } catch {
      copyToClipboard(logoImage);
    }
  };

  const downloadLogoImage = async () => {
    try {
      await downloadGeneratedImage(logoImage, creativeTone || "brandthat-logo");
    } catch {
      copyToClipboard(logoImage);
    }
  };
  const editableLogo = applyLogoEditor(logoSvg || logoVectorImage, logoEditor);
  const editableTransparentLogo = applyLogoEditor(logoTransparentSvg || logoSvg || logoVectorImage, logoEditor);
  const editorFileName = creativeTone || "brandthat-logo";
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [logoExampleIndex, setLogoExampleIndex] = useState(0);
  const [logoPrefillBrandId, setLogoPrefillBrandId] = useState("");
  const logoWorkspacePlan = activeBrand ? getWorkspacePlan(activeBrand) : {};
  const logoWorkspaceBrief = activeBrand ? buildWorkspaceLogoBrief(activeBrand, logoWorkspacePlan) : "";
  const logoWorkspaceDefaults = activeBrand ? getLogoRecommendations(activeBrand, logoWorkspacePlan) : null;
  const logoWorkspacePalette = activeBrand ? getIdentityPalette(activeBrand, logoWorkspacePlan) : [];
  const recommendedLogoOptions = activeBrand && logoWorkspaceDefaults ? { "Mark Type": logoWorkspaceDefaults.markType, "Brand Feel": logoWorkspaceDefaults.brandFeel, "Use Case": logoWorkspaceDefaults.useCases, "Quality Target": logoWorkspaceDefaults.qualityTargets } : {};
  const structuredLogoContext = useMemo(
    () => getStructuredLogoContext({
      activeBrand,
      promptValue: prompt,
      brandNameValue: creativeTone,
      styleValue: selectedPlatform,
      industryValue: logoIndustry,
      symbolValue: logoSymbol,
      colorsValue: logoColors,
      avoidValue: logoAvoid,
    }),
    [activeBrand, prompt, creativeTone, selectedPlatform, logoIndustry, logoSymbol, logoColors, logoAvoid]
  );
  const parsedLogoPreview = useMemo(
    () => structuredLogoContext.parsedLogo,
    [structuredLogoContext]
  );
  const logoContextValidationIssues = buildLogoContextValidationIssues(structuredLogoContext);
  const logoContextIsValid = logoContextValidationIssues.length === 0;
  const restoreLogoFromBrandStrategy = () => {
    if (!activeBrand) return;
    const plan = getWorkspacePlan(activeBrand);
    const defaults = getLogoRecommendations(activeBrand, plan);
    const palette = getIdentityPalette(activeBrand, plan);
    setPrompt(buildWorkspaceLogoBrief(activeBrand, plan));
    setCreativeTone(activeBrand.name || "");
    setSelectedPlatform(defaults.brandFeel.join(", "));
    setLogoIndustry(getWorkspaceIndustry(activeBrand, plan));
    setLogoSymbol(defaults.symbolDirection);
    setLogoColors(palette.map((item) => item.name + " " + item.hex).join(", "));
    setLogoAvoid("misspelled brand name, generic category symbols, unrelated technology cues, tiny decorative details, unsupported claims");
    setLogoGenerationError("");
    setLogoPrefillBrandId(activeBrand.id || "");
  };
  const getCurrentLogoDirection = () => {
    const direction = logoCreativeBrief?.concepts?.[0] || logoVariations?.[0] || {};
    return {
      name: direction.name || "Current logo direction",
      brandName: parsedLogoPreview.brandName || creativeTone,
      industry: parsedLogoPreview.industry || logoIndustry,
      style: direction.style || direction.logoStyle || selectedPlatform || parsedLogoPreview.style,
      symbol: direction.symbol || logoSymbol || parsedLogoPreview.symbol,
      typography: direction.typography || parsedLogoPreview.typography,
      palette: direction.palette || logoColors || parsedLogoPreview.colors,
      layout: direction.layout || parsedLogoPreview.layout,
      whyFits: direction.whyFits || "This direction is tied to the current brand request.",
    };
  };
  const buildContinuityMemory = (intent = "Generate another concept from the same creative direction.", extra = {}) =>
    buildLogoRefinementMemory({
      existingMemory: { ...(logoGenerationMemory || {}), ...extra },
      currentDirection: getCurrentLogoDirection(),
      instruction: intent,
      parsedLogo: parsedLogoPreview,
    });
  const canonicalLogoDirections = useMemo(
    () => buildCanonicalLogoDirections({
      logoVariations,
      creativeBrief: logoCreativeBrief,
      logoImage,
    }),
    [logoVariations, logoCreativeBrief, logoImage]
  );
  const directorNotes = useMemo(() => {
    const primaryConcept = canonicalLogoDirections[0] || logoCreativeBrief?.concepts?.[0] || {};
    const typography = primaryConcept.typography || logoCreativeBrief?.typography || parsedLogoPreview.typography;
    const symbol = primaryConcept.symbol || parsedLogoPreview.symbol;
    const positioning = parsedLogoPreview.mood || logoCreativeBrief?.personality || logoCreativeBrief?.personalitySummary;

    return [
      ["Typography", typography || "Clean readable type with spacing tuned for a premium brand mark."],
      ["Symbol", symbol || "A restrained mark built around the strongest idea in the brand request."],
      ["Positioning", positioning || "Modern, scalable, and usable across web, social, and brand kit assets."],
    ].map(([label, copy]) => ({
      label,
      copy: String(copy || "").replace(/\s+/g, " ").replace(/; Creative Director:.*$/i, "").slice(0, 130),
    })).filter((note) => isMeaningfulDisplayText(note.copy));
  }, [canonicalLogoDirections, logoCreativeBrief, parsedLogoPreview]);
  const lightweightBrandKit = useMemo(
    () => buildLightweightBrandKit({
      parsedLogo: parsedLogoPreview,
      logoEditor,
      logoCreativeBrief,
      logoImage,
      activeBrand,
      workspacePlan: logoWorkspacePlan,
    }),
    [parsedLogoPreview, logoEditor, logoCreativeBrief, logoImage, activeBrand, logoWorkspacePlan]
  );
  const logoPromptPlaceholder = activeTool.key === "logo"
    ? logoWorkspaceBrief || "Describe the logo direction, brand name, audience, mood, symbols, colors, and where the logo must work."
    : getMainPromptPlaceholder(activeTool);
  const addLogoSuggestion = (suggestion) => {
    const cleanSuggestion = String(suggestion || "").trim();
    if (!cleanSuggestion) return;
    const currentPrompt = String(prompt || "").trim();
    const lowerPrompt = currentPrompt.toLowerCase();
    if (lowerPrompt.includes(cleanSuggestion.toLowerCase())) return;

    setPrompt(currentPrompt ? `${currentPrompt}, ${cleanSuggestion}` : `Create a ${cleanSuggestion} logo`);
  };
  const logoPromptSuggestionOptions = activeBrand && logoWorkspaceDefaults
    ? [
        ...(logoWorkspaceDefaults.brandFeel || []),
        ...(logoWorkspaceDefaults.markType || []),
        getWorkspaceIndustry(activeBrand, logoWorkspacePlan),
        logoWorkspaceDefaults.symbolDirection,
        ...(logoWorkspacePalette || []).map((color) => color.name),
      ].filter(Boolean).map((item) => String(item).replace(/\s+/g, " ").trim()).filter((item, index, list) => item && list.indexOf(item) === index).slice(0, 8)
    : logoPromptSuggestions;
  const logoBriefSections = [
    ["Mark Type", ["Wordmark", "Monogram", "Icon + wordmark", "Badge", "Social avatar"]],
    ["Brand Feel", ["Premium", "Minimal", "Bold", "Editorial", "Friendly", "Tech-forward"]],
    ["Use Case", ["Website header", "Instagram profile", "Business cards", "Packaging", "App icon"]],
    ["Quality Target", ["Readable at small size", "Distinct silhouette", "Print-ready", "No generic symbols"]],
  ];
  const logoQualityBars = [
    ["Typography", "Readable wordmark with professional spacing and hierarchy."],
    ["Symbol", "Simple mark that can survive as a favicon or social avatar."],
    ["System", "Works in black, white, full color, square, and horizontal layouts."],
  ];

  useEffect(() => {
    if (activeTool.key !== "logo" || !activeBrand?.id) return;
    const brandChanged = logoPrefillBrandId !== activeBrand.id;
    const promptLooksStale = !String(prompt || "").trim() || /Northline Goods|carry goods/i.test(prompt);
    if (!promptLooksStale && !brandChanged) return;
    if (promptLooksStale || brandChanged) setPrompt(logoWorkspaceBrief);
    if (brandChanged || !creativeTone || /Northline Goods|deserves attention now/i.test(creativeTone)) setCreativeTone(activeBrand.name || "");
    if (brandChanged || !selectedPlatform || /carry goods|Northline|AI startup|modern SaaS/i.test(selectedPlatform)) setSelectedPlatform(logoWorkspaceDefaults?.brandFeel?.join(", ") || activeBrand.tone || "");
    if (brandChanged || !logoIndustry || /carry goods|Northline|AI startup|modern SaaS|software|technology/i.test(logoIndustry)) setLogoIndustry(getWorkspaceIndustry(activeBrand, logoWorkspacePlan));
    if (brandChanged || !logoSymbol || /Northline|N mark|technology|startup/i.test(logoSymbol)) setLogoSymbol(logoWorkspaceDefaults?.symbolDirection || activeBrand.logoDirection || "");
    if (brandChanged || !logoColors || /black and warm-neutral|Northline|green, gray, tan/i.test(logoColors)) setLogoColors(logoWorkspacePalette.map((item) => item.name + " " + item.hex).join(", "));
    if (brandChanged || !logoAvoid) setLogoAvoid("misspelled brand name, generic category symbols, unrelated technology cues, tiny decorative details, unsupported claims");
    setLogoPrefillBrandId(activeBrand.id);
  }, [activeTool.key, activeBrand?.id, logoWorkspaceBrief]);

  const refineLogo = (instruction = refinementPrompt) => {
    const cleanInstruction = String(instruction || "").trim();
    if (!cleanInstruction) return;
    const changedAreas = classifyLogoRefinement(cleanInstruction);
    const currentDirection = getCurrentLogoDirection();

    const nextPrompt = `${prompt || parsedLogoPreview.originalPrompt || "Create a logo."}

Refinement request: ${cleanInstruction}
Designer iteration rules:
- Keep the original brand name: ${parsedLogoPreview.brandName || creativeTone || "the existing brand name"}.
- Keep the original industry/category: ${parsedLogoPreview.industry || logoIndustry || "the existing category"}.
- Preserve what is already working: ${[currentDirection.typography, currentDirection.palette, currentDirection.layout].filter(Boolean).join("; ") || "current typography, palette, spacing, and layout logic"}.
- Change only this requested area: ${changedAreas.length ? changedAreas.join(", ") : "the user-requested detail"}.
- Do not restart the concept unless the user explicitly asks for a totally different direction.`.trim();

    setPrompt(nextPrompt);
    setRefinementPrompt("");
    const refinementLower = cleanInstruction.toLowerCase();
    const refinementSymbol = refinementLower.includes("remove the icon") || refinementLower.includes("no icon")
      ? "no icon; typography-first wordmark"
      : logoSymbol;
    const refinedParsedLogo = parseNaturalLogoPrompt({
      prompt: nextPrompt,
      brandName: parsedLogoPreview.brandName || creativeTone,
      style: selectedPlatform,
      industry: logoIndustry,
      symbol: refinementSymbol,
      colors: extractColorsFromPrompt(cleanInstruction) || logoColors,
      avoid: logoAvoid,
    });
    generate(null, {
      prompt: nextPrompt,
      creativeTone: refinedParsedLogo.brandName || parsedLogoPreview.brandName || creativeTone,
      selectedPlatform: refinedParsedLogo.style || parsedLogoPreview.style || selectedPlatform,
      logoIndustry: refinedParsedLogo.industry || parsedLogoPreview.industry || logoIndustry,
      logoSymbol: refinedParsedLogo.symbol || parsedLogoPreview.symbol || logoSymbol,
      logoColors: refinedParsedLogo.colors || parsedLogoPreview.colors || logoColors,
      logoAvoid: refinedParsedLogo.avoid || parsedLogoPreview.avoid || logoAvoid,
      generationMemory: buildContinuityMemory(cleanInstruction, { changedAreas }),
    });
  };

  return (
    <div className={`generateCard toolResultsV2 ${activeTool.key}Generator`}>
      <div className="generatorAppCrumb">
        <button onClick={onBackToTools}>Back to Content Tools</button>
        {activeBrand && <span>Using {activeBrand.name} context</span>}
      </div>
      <div className="generateTop">
        <div>
          <div className="tinyTag">{activeTool.label}</div>
          <h2>{activeTool.title}</h2>
          <p className="toolSubline">{getToolSubline(activeTool.key)}</p>
        </div>
        {activeTool.key !== "logo" && (
          <div className="generatorMeta">
            {userPlan === "free" ? <span>Brand Plan required</span> : <span>Brand Plan unlocked{activeBrand ? ` · ${getBrandCompletion(activeBrand).percent}% ready` : ""}</span>}
          </div>
        )}
      </div>

      {activeBrand && activeTool.key !== "logo" && (
        <details className="brandContextPanel">
          <summary>Using {activeBrand.name} context</summary>
          <div>
            <p><b>Audience:</b> {activeBrand.audience || getWorkspacePlan(activeBrand).targetAudience || "Not set"}</p>
            <p><b>Voice:</b> {activeBrand.tone || getWorkspacePlan(activeBrand).brandVoice || "Not set"}</p>
            <p><b>Positioning:</b> {activeBrand.differentiator || getWorkspacePlan(activeBrand).positioning || "Not set"}</p>
            <p><b>Platform:</b> {activeBrand.growthPlatform || activeBrand.channels || selectedPlatform || "Not set"}</p>
            <p><b>Goal:</b> {activeBrand.launchGoal || "Not set"}</p>
          </div>
        </details>
      )}

      {activeTool.key === "captions" && activeBrand && (brandMemoryPilot.active || brandMemoryPilot.unavailable || brandMemoryPilot.loading) && (
        <div className="brandMemoryPilotBar" aria-live="polite">
          {brandMemoryPilot.loading ? (
            <span>Checking brand memory...</span>
          ) : brandMemoryPilot.active ? (
            <span>Brand memory active · {activeBrand.name}</span>
          ) : (
            <span>Brand memory unavailable</span>
          )}
          {brandMemoryPilot.loading ? null : brandMemoryPilot.active ? (
            <button type="button" onClick={onRefreshBrandMemory} disabled={brandMemoryPilot.refreshing}>
              {brandMemoryPilot.refreshing ? "Refreshing..." : "Refresh brand memory"}
            </button>
          ) : (
            <button type="button" onClick={onRetryBrandMemoryStatus}>
              Retry memory status
            </button>
          )}
          {brandMemoryPilot.message && <small>{brandMemoryPilot.message}</small>}
          {brandMemoryPilot.active && !brandMemoryPilot.message && <small>Saved and approved work helps BrandThat learn this brand over time.</small>}
        </div>
      )}

      {activeTool.key === "logo" ? (
        <>
          <div className="logoCreatorGuide">
            <div className="logoGuideIntro">
              <div>
                <div className="tinyTag">GUIDED LOGO CREATOR</div>
                <h3>Build the brief before you generate.</h3>
                <p>Choose the shape, personality, use case, and quality bar. BrandThat turns those choices into a cleaner logo direction, then lets you refine without losing the original idea.</p>
              </div>
              <span>$9.99/mo unlocks all concepts</span>
            </div>
            {activeBrand && <div className="recommendedFromStrategy">Recommended from your Brand Strategy</div>}
            <div className="logoGuideGrid">
              {logoBriefSections.map(([label, options]) => (
                <div className="logoGuideColumn" key={label}>
                  <strong>{label}</strong>
                  <div>{options.map((option) => { const selected = (recommendedLogoOptions[label] || []).includes(option); return <button key={option} className={selected ? "selectedLogoOption" : ""} aria-pressed={selected} onClick={() => addLogoSuggestion(option)}>{option}</button>; })}</div>
                </div>
              ))}
            </div>
            <div className="logoQualityGrid">
              {logoQualityBars.map(([label, copy]) => (
                <div key={label}>
                  <strong>{label}</strong>
                  <p>{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <label className="logoBriefLabel"><span>Editable logo brief</span><textarea
            className="mainPromptBox logoPromptFirstBox"
            placeholder={logoPromptPlaceholder}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          /></label>

          {prompt.trim() && (
            <div className="smartPromptSuggestions" aria-label="Logo prompt suggestions">
              {logoPromptSuggestionOptions.map((suggestion) => (
                <button key={suggestion} onClick={() => addLogoSuggestion(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          <details className="advancedLogoOptions">
            <summary>Advanced options</summary>
            <div className="generatorControls freeTypeControls logoAdvancedGrid">
              <label>
                <span>Brand name</span>
                <input
                  value={creativeTone}
                  onChange={(e) => setCreativeTone(e.target.value)}
                  placeholder={activeBrand?.name || parsedLogoPreview.brandName || "Optional if included above"}
                />
              </label>
              <label>
                <span>Style</span>
                <input
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  placeholder={activeBrand && logoWorkspaceDefaults ? logoWorkspaceDefaults.brandFeel.join(", ") : parsedLogoPreview.style || "Luxury, modern, bold, playful..."}
                />
              </label>
              <label>
                <span>Industry</span>
                <input
                  value={logoIndustry}
                  onChange={(e) => setLogoIndustry(e.target.value)}
                  placeholder={activeBrand ? getWorkspaceIndustry(activeBrand, logoWorkspacePlan) : parsedLogoPreview.industry || "Skincare, AI, real estate..."}
                />
              </label>
              <label>
                <span>Symbol</span>
                <input
                  value={logoSymbol}
                  onChange={(e) => setLogoSymbol(e.target.value)}
                  placeholder={parsedLogoPreview.symbol || "A symbol, monogram, mascot..."}
                />
              </label>
              <label>
                <span>Colors</span>
                <input
                  value={logoColors}
                  onChange={(e) => setLogoColors(e.target.value)}
                  placeholder={parsedLogoPreview.colors || "Black and gold, blue, cream..."}
                />
              </label>
              <label>
                <span>Avoid</span>
                <input
                  value={logoAvoid}
                  onChange={(e) => setLogoAvoid(e.target.value)}
                  placeholder="Tiny text, generic icons, cartoon look..."
                />
              </label>
            </div>
          </details>

          {prompt.trim() && (
            <div className="brandUnderstoodPanel">
              <div>
                <span>BrandThat understood</span>
                <strong>{parsedLogoPreview.brandName || "Brand name will be inferred"}</strong>
              </div>
              <p>
                {parsedLogoPreview.industry || "Industry will be inferred"} · {parsedLogoPreview.style || "best-fit style"} · {parsedLogoPreview.colors || "brand-fit colors"}
              </p>
              {activeBrand && (
                <div className="brandUnderstoodDetails">
                  <span><b>Business:</b> {structuredLogoContext.business || "Not provided"}</span>
                  <span><b>Audience:</b> {structuredLogoContext.audience || "Not provided"}</span>
                  <span><b>Mark:</b> {structuredLogoContext.markType}</span>
                  <span><b>Feel:</b> {structuredLogoContext.brandFeel}</span>
                  <span><b>Typography:</b> {structuredLogoContext.typography}</span>
                  <span><b>Symbol:</b> {structuredLogoContext.symbol}</span>
                  <span><b>Use cases:</b> {structuredLogoContext.useCases}</span>
                </div>
              )}
              {logoContextValidationIssues.length > 0 ? (
                <div className="logoValidationPanel" role="alert">
                  <strong>Review before generating</strong>
                  <ul>{logoContextValidationIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                  <button type="button" onClick={restoreLogoFromBrandStrategy}>Restore from Brand Strategy</button>
                </div>
              ) : (
                <small>{activeBrand ? "Structured workspace fields are locked as the source of truth. Edit Advanced options only if you want to change the logo direction." : "Wrong? Edit the prompt or open Advanced options before generating."}</small>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className={`generatorControls freeTypeControls ${activeTool.key !== "logo" && activeTool.key !== "captions" ? "singleControl" : ""}`}>
            <label>
              <span>{activeTool.platformLabel}</span>
              {(activeTool.key === "hashtags" || activeTool.key === "captions") ? (
                <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
                  <option value="">Choose social media</option>
                  {activeTool.platforms.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              ) : (
                <input
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  placeholder={getStylePlaceholder(activeTool.key)}
                />
              )}
            </label>
            {activeTool.key === "captions" && (
              <label>
                <span>Goal</span>
                <select value={captionGoal} onChange={(e) => setCaptionGoal(e.target.value)}>
                  {["Awareness", "Engagement", "Launch", "Conversion", "Education", "Community"].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <textarea
            className="mainPromptBox"
            placeholder={getMainPromptPlaceholder(activeTool)}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </>
      )}

      <div className="generatorButtons">
        <button className="btn dark" onClick={generate} disabled={loading || (activeTool.key === "logo" && !logoContextIsValid)}>
          {loading ? getLoadingText(activeTool.key) : getGenerateButtonText(activeTool.key, activeTool.shortTitle)}
        </button>
        <button className="btn light" onClick={clearGenerator} disabled={loading}>Clear</button>
      </div>

      {loading && (
        <div className={activeTool.key === "logo" ? "premiumLoading logoLoadingV3" : "premiumLoading"}>
          <div className="loadingPulse"></div>
          <div>
            <strong>{getLoadingText(activeTool.key)}</strong>
            <span>{getLoadingSubtext(activeTool.key)}</span>
            {activeTool.key === "logo" && (
              <div className="logoLoadingSteps">
                <span>Preparing brand prompt</span>
                <span>Creating three logo directions</span>
                <span>Finalizing logo previews</span>
              </div>
            )}
            {activeTool.key === "brand" && (
              <div className="logoLoadingSteps brandLoadingSteps">
                <span>Understanding your idea</span>
                <span>Defining your audience</span>
                <span>Building positioning</span>
                <span>Creating visual direction</span>
                <span>Building your roadmap</span>
                <span>Finalizing brand system</span>
              </div>
            )}
            {activeTool.key === "captions" && generationSlow && (
              <div className="logoLoadingSteps brandLoadingSteps">
                <span>Still reviewing captions for quality</span>
                <span>Checking grammar, facts, and brand fit</span>
                <span>Preparing the approved results</span>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTool.key === "logo" && logoGenerationError && !loading && (
        <div className="generatorErrorPanel" role="alert" aria-live="assertive">
          <strong>Logo generation did not finish.</strong>
          <span>{logoGenerationError}</span>
          <div className="generatorErrorActions">
            <button onClick={generate}>Retry AI Generation</button>
            {logoFallbackOption?.image && (
              <button onClick={onUseLogoFallback}>Use Instant Vector Instead</button>
            )}
          </div>
        </div>
      )}

      {activeTool.key !== "logo" && generationError && !loading && (
        <div className="generatorErrorPanel" role="alert" aria-live="assertive">
          <strong>Generation did not finish.</strong>
          <span>{generationError}</span>
          <button onClick={generate}>Retry</button>
        </div>
      )}

      {logoImage && (
        <>
          <div className="logoShowcase">
            <div className="logoFrame">
              <img src={logoImage} alt="Generated logo" />
            </div>

            <div className="brandPreviewCard">
              <div className="tinyTag">LOGO CONCEPT</div>
              <span className={logoImageSource === "instant-svg" ? "logoSourceBadge instant" : "logoSourceBadge"}>
                {logoImageSource === "instant-svg" ? "Editable vector" : "AI image"}
              </span>
              <h3>Concept generated</h3>
              <p>
                {logoImageSource === "instant-svg"
                  ? "A clean first concept, built from your active brand strategy and logo brief."
                  : "Review this direction, then save it as a logo concept or set it as the primary logo."}
              </p>

              <div className="creativeDirectorNotes">
                <div className="tinyTag">CREATIVE DIRECTOR NOTES</div>
                {directorNotes.map((note) => (
                  <div className="directorNoteRow" key={note.label}>
                    <strong>{note.label}</strong>
                    <span>{note.copy}</span>
                  </div>
                ))}
              </div>

              <div className="logoActionStack">
                <button onClick={() => saveLogoConceptFromResult()} disabled={currentOutputSaved || logoSaveInProgress}>
                  {logoSaveInProgress ? "Saving..." : currentOutputSaved ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save Logo Concept"}
                </button>
                <button onClick={() => saveLogoConceptFromResult({ setPrimary: true })} disabled={logoPrimaryInProgress || currentLogoIsPrimary}>
                  {currentLogoIsPrimary ? "Current Logo ✓" : logoPrimaryInProgress ? "Updating..." : "Set as Primary Logo"}
                </button>
                <button className="downloadLink" onClick={downloadLogoImage}>Download Preview</button>
                <button onClick={() => document.querySelector(".logoRefinePanel textarea")?.focus()}>Refine</button>
                <button onClick={onBuildGrowthRoadmap}>Build Roadmap</button>
                <details className="logoMoreActions">
                  <summary>More</summary>
                  <button onClick={openLogoImage}>Open Full Size</button>
                  {editableLogo && <button onClick={() => downloadGeneratedImage(editableLogo, `${editorFileName}-vector`)}>Download SVG</button>}
                  {editableTransparentLogo && <button onClick={() => downloadTransparentPng(editableTransparentLogo, editorFileName)}>Transparent PNG</button>}
                  <button onClick={() => saveLogoConceptFromResult({ favorite: true })}>Favorite</button>
                </details>
                <button onClick={() => {
                  const continuityPrompt = `${prompt || parsedLogoPreview.originalPrompt || "Create a logo."}

Generate another logo from the same creative direction. Preserve the strongest parts of the current brand identity, typography, color logic, and layout. Improve weak areas with cleaner spacing, better icon restraint, and a more premium finish.`.trim();
                  generate(null, {
                    prompt: continuityPrompt,
                    creativeTone: parsedLogoPreview.brandName || creativeTone,
                    selectedPlatform: parsedLogoPreview.style || selectedPlatform,
                    logoIndustry: parsedLogoPreview.industry || logoIndustry,
                    logoSymbol: parsedLogoPreview.symbol || logoSymbol,
                    logoColors: parsedLogoPreview.colors || logoColors,
                    logoAvoid: parsedLogoPreview.avoid || logoAvoid,
                    generationMemory: buildContinuityMemory("Generate another concept from the same creative direction. Preserve successful qualities and improve weak areas."),
                  });
                }}>Generate Another Version</button>
              </div>
            </div>
          </div>

          {canonicalLogoDirections.length > 0 && (
            <section className="logoConceptDirections" aria-label="Logo concept directions">
              <div>
                <div className="tinyTag">{canonicalLogoDirections.length >= 3 ? "THREE DIRECTIONS" : "ONE DIRECTION"}</div>
                <h3>{canonicalLogoDirections.length >= 3 ? "Choose the direction to keep building." : "Keep building this direction."}</h3>
              </div>
              <div className="logoConceptGrid">
                {canonicalLogoDirections.slice(0, 3).map((variation, index) => {
                  const conceptImage = variation?.imageUrl || variation?.image || variation?.svg || logoImage;
                  const directionLabel = variation?.title || variation?.name || "Logo direction";
                  const savedVariation = getSavedAsset("", conceptImage);
                  const conceptKey = `logo-variation-${variation?.id || index}`;
                  const isSavingVariation = savingResultKey === conceptKey;
                  return (
                    <article className="logoConceptCard" key={variation?.id || `${directionLabel}-${index}`}>
                      <div className="logoConceptPreview">
                        {conceptImage && <img src={conceptImage} alt={`${directionLabel} preview`} />}
                      </div>
                      <span>{variation?.type || "Logo direction"}</span>
                      <h4>{directionLabel}</h4>
                      <p>{variation?.rationale || variation?.whyFits || "Built from the active brand strategy, palette, typography, and logo brief."}</p>
                      <dl>
                        {variation?.symbol && <><dt>Symbol</dt><dd>{variation.symbol}</dd></>}
                        {variation?.typography && <><dt>Type</dt><dd>{variation.typography}</dd></>}
                        {(variation?.paletteUsage || variation?.palette) && <><dt>Palette</dt><dd>{variation.paletteUsage || variation.palette}</dd></>}
                        {variation?.primaryUseCases && <><dt>Use</dt><dd>{variation.primaryUseCases}</dd></>}
                      </dl>
                      <div className="logoConceptActions">
                        <button onClick={async () => { setSavingResultKey(conceptKey); await saveLogoVariation(variation, index); setSavingResultKey(""); }} disabled={Boolean(savedVariation) || isSavingVariation}>
                          {isSavingVariation ? "Saving..." : savedVariation ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save"}
                        </button>
                        <button onClick={() => saveLogoVariation(variation, index, { favorite: true })}>Favorite</button>
                        <button onClick={() => saveLogoVariation(variation, index, { setPrimary: true })}>Set Primary</button>
                        <button onClick={() => refineLogo(`Refine the ${directionLabel}. ${variation?.symbol ? `Preserve this symbol direction: ${variation.symbol}.` : ""} Improve small-size readability and keep the workspace palette.`)}>Refine</button>
                        {conceptImage && <button onClick={() => downloadGeneratedImage(conceptImage, `${editorFileName}-${directionLabel}`)}>Download</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          <BrandJourneyPanel
            brandName={parsedLogoPreview.brandName || creativeTone || logoCreativeBrief?.brandName}
            creativeBrief={logoCreativeBrief}
            isLoggedIn={Boolean(user?.id)}
            canSaveProject={userPlan !== "free"}
            onStartWorkspace={() => saveLogoConceptFromResult()}
            onBuildGrowthRoadmap={onBuildGrowthRoadmap}
          />

          <LightweightBrandKitPanel brandKit={lightweightBrandKit} />

          {editableLogo && (
            <div className="logoRefinePanel">
              <div>
                <div className="tinyTag">DESIGNER REFINEMENT</div>
                <h3>Tell Brandthat what to adjust</h3>
                <p>Use plain language. The brand, industry, and strongest parts of this concept stay attached.</p>
                <span className="refinementState">{getRefinementStateLabel(logoGenerationMemory)}</span>
              </div>
              <textarea
                value={refinementPrompt}
                onChange={(e) => setRefinementPrompt(e.target.value)}
                placeholder="Example: make the symbol clearer, use the workspace typography, improve the avatar, add a subtle accent color..."
              />
              <div className="logoRefineActions">
                <button onClick={() => refineLogo()} disabled={loading || !refinementPrompt.trim()}>Refine Logo</button>
                {["Clarify the symbol", "Improve small-size readability", "Use workspace typography", "Keep symbol, change type", "Keep type, change symbol", "Try workspace colors"].map((item) => (
                  <button key={item} onClick={() => refineLogo(item)} disabled={loading}>{item}</button>
                ))}
              </div>
            </div>
          )}

          {editableLogo && (
            <LogoCreativeDirectorPanel
              creativeBrief={logoCreativeBrief}
              logoVariations={canonicalLogoDirections}
              prompt={prompt}
              setPrompt={setPrompt}
              setSelectedPlatform={setSelectedPlatform}
              setCreativeTone={setCreativeTone}
              setLogoIndustry={setLogoIndustry}
              setLogoSymbol={setLogoSymbol}
              setLogoColors={setLogoColors}
              rememberRejectedLogoDirection={rememberRejectedLogoDirection}
              generate={generate}
              workspaceLogoContext={structuredLogoContext}
            />
          )}

          {editableLogo && (
            <LogoEditorPanel
              editableLogo={editableLogo}
              transparentLogo={editableTransparentLogo}
              logoVariations={logoVariations}
              logoEditor={logoEditor}
              setLogoEditor={setLogoEditor}
              setLogoImage={setLogoImage}
              setLogoVectorImage={setLogoVectorImage}
              setLogoSvg={setLogoSvg}
              brandName={creativeTone || "Brand"}
            />
          )}
        </>
      )}

      {showRecentLogos && activeTool.key === "logo" && recentLogoResults.length > 0 && (
        <details className="recentLogoStrip">
          <summary>Recent logos</summary>
          <div className="recentLogoGrid">
            {recentLogoResults.slice(0, 4).map((item) => (
              <div className="recentLogoCard" key={item.id}>
                <button className="recentLogoThumb" onClick={() => restoreRecentLogo(item)}>
                  <img src={item.image} alt={item.title || "Generated logo"} />
                </button>
                <strong>{item.title || "Logo concept"}</strong>
                <span>{item.source === "instant-svg" ? "Editable vector" : "AI image"}</span>
                <div>
                  <button onClick={() => restoreRecentLogo(item)}>Use</button>
                  <button onClick={() => openGeneratedImage(item.image)}>Open</button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {isSuccessfulGeneratorResult(activeTool.key, result) && activeTool.key === "hashtags" && (
        <div className="resultBox premiumResults simpleHashtagResult">
          <div className="resultTop">
            <span>50 COPY-READY HASHTAGS</span>
            <div className="resultActions">
              <button onClick={() => saveGeneratedAsset({ collection: true, titleOverride: getCollectionTitle() })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save Set"}</button>
              <button onClick={() => copyToClipboard(result)}>Copy Hashtags</button>
              <button onClick={() => remixOutput(activeEntry)}>Generate More</button>
              <button onClick={() => shareOutput(result)}>Share</button>
            </div>
          </div>

          <div className="hashtagSingleBox">
            <div className="tinyTag">READY TO COPY</div>
            <p>{result}</p>
          </div>
        </div>
      )}


      {isSuccessfulGeneratorResult(activeTool.key, result) && activeTool.key !== "hashtags" && activeTool.key !== "logo" && (
        <div className="resultBox premiumResults simpleCaptionResult">
          <div className="resultTop">
            <span>{getResultCountHeader(activeTool.key, result)}</span>
            <div className="resultActions">
              {activeTool.key === "brand" && <button onClick={onStartWorkspace}>Save Brand Plan</button>}
              {activeTool.key === "brand" && <button onClick={onBuildGrowthRoadmap}>Build Roadmap</button>}
              <button onClick={() => saveGeneratedAsset({ collection: true, titleOverride: getCollectionTitle() })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save All"}</button>
              <button onClick={() => copyToClipboard(result)}>Copy All</button>
              <button onClick={() => remixOutput(activeEntry)}>Generate More</button>
              <button onClick={() => shareOutput(result)}>Share</button>
            </div>
          </div>

            <div className="captionListBox">
            {parseTenOptions(result).map((item, index) => {
              const key = `${activeTool.key}-${index}`;
              const savedAsset = getSavedAsset(item);
              const isSaving = savingResultKey === key;
              const isCopied = copiedResultKey === key;
              return (
              <div className="captionOptionRow" key={`${item}-${index}`}> 
                <div className="captionNumber">{index + 1}</div>
                <div>
                  <span className="captionStyleLabel">{captionStyleLabels[index] || "Option"}</span>
                  <p>{item}</p>
                </div>
                <div className="captionRowActions">
                  <button onClick={() => handleSaveResultItem(item, index)} disabled={Boolean(savedAsset) || isSaving}>
                    {isSaving ? "Saving..." : savedAsset ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save"}
                  </button>
                  <button onClick={() => handleCopyResultItem(item, index)}>{isCopied ? "Copied" : "Copy"}</button>
                  <button onClick={() => handleSaveResultItem(item, index, true)} disabled={isSaving}>
                    {isSaving ? "Saving..." : savedAsset?.favorite ? "Favorited" : "Favorite"}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
          <div className="savedAssetLinkRow">
            <span>Saved outputs stay attached to {activeBrand?.name || "the active brand"}.</span>
            <button onClick={onViewSavedAssets}>View Saved Assets</button>
          </div>
        </div>
      )}

      {result && activeTool.key === "logo" && (
        <details className="logoGenerationDetails">
          <summary>Generation details</summary>
          <div>{result}</div>
        </details>
      )}
    </div>
  );
}

function BrandJourneyPanel({
  brandName = "",
  creativeBrief = null,
  isLoggedIn = false,
  canSaveProject = true,
  onStartWorkspace = () => {},
  onBuildGrowthRoadmap = () => {}
}) {
  const strategy = creativeBrief?.brandStrategy || {};
  const projectName = brandName || "this brand";
  const steps = [
    ["Strategy", strategy.positioning || "Brand direction created"],
    ["Logo", "Concept generated for review"],
    ["Brand Kit", "Workspace palette, typography, and avatar previews remain connected"],
    ["Roadmap", "Next step: save a concept or build launch content"],
  ];
  const saveLabel = !isLoggedIn
    ? "Create Account to Keep It"
    : canSaveProject
      ? "Save Logo Concept"
      : "Buy Brand Plan to Keep Building";
  const ownershipCopy = !isLoggedIn
    ? "This project is only on this screen right now. Create an account to try the workspace and keep the logo, strategy, kit, and roadmap together."
    : canSaveProject
      ? "Save this concept to the active workspace, then set the strongest direction as the primary logo when it is ready."
      : "Start the $9.99/month membership to keep saving, refining, exporting, and building this brand.";

  return (
    <section className="brandJourneyPanel">
      <div className="brandJourneyTop">
        <div>
          <div className="tinyTag">KEEP YOUR PROJECT</div>
          <h3>{`${projectName} is now more than a logo.`}</h3>
          <p>{ownershipCopy}</p>
        </div>
        <span>{isLoggedIn ? "Concept generated" : "Unsaved project"}</span>
      </div>
      <div className="brandJourneySteps">
        {steps.map(([label, copy], index) => (
          <div key={label}>
            <strong>{index + 1}. {label}</strong>
            <p>{copy}</p>
          </div>
        ))}
      </div>
      <div className="brandJourneyActions">
        <button className="btn dark" onClick={onStartWorkspace}>{saveLabel}</button>
        <button className="btn light" onClick={onBuildGrowthRoadmap}>Create 30-Day Roadmap</button>
      </div>
    </section>
  );
}

function LightweightBrandKitPanel({ brandKit }) {
  if (!brandKit) return null;

  const downloadAsset = (asset, label) => {
    if (!asset) return;
    downloadGeneratedImage(asset, `${brandKit.brandName}-${label}`);
  };

  return (
    <section className="lightBrandKit">
      <div className="lightBrandKitTop">
        <div>
          <div className="tinyTag">BRAND KIT</div>
          <h3>Brand identity system</h3>
        </div>
        <span>{brandKit.brandName}</span>
      </div>

      <div className="kitEditorialGrid">
        <div className="kitColorColumn">
          <span>Primary colors</span>
          <div className="kitSwatches">
            {brandKit.primaryColors.map((color) => (
              <i key={color} style={{ background: color }} title={color}></i>
            ))}
          </div>
          <small>{brandKit.primaryColors.join(" / ")}</small>
        </div>

        <div className="kitColorColumn">
          <span>Secondary colors</span>
          <div className="kitSwatches">
            {brandKit.secondaryColors.map((color) => (
              <i key={color} style={{ background: color }} title={color}></i>
            ))}
          </div>
          <small>{brandKit.secondaryColors.join(" / ")}</small>
        </div>

        <div className="kitTypeColumn">
          <span>Typography</span>
          <strong>{brandKit.typography.headline}</strong>
          <small>{brandKit.typography.supporting}</small>
          <p>{brandKit.typography.note}</p>
        </div>

        <div className="kitDirectionColumn">
          <span>Style direction</span>
          <p>{brandKit.styleDirection}</p>
        </div>
      </div>

      <div className="kitUsageRow">
        <div className="kitUsageExamples">
          {brandKit.logoUsage.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <div className="kitAssetPair">
          <div>
            <img src={brandKit.socialAvatar} alt={`${brandKit.brandName} social avatar preview`} />
            <button onClick={() => downloadAsset(brandKit.socialAvatar, "social-avatar")}>Social avatar</button>
          </div>
          <div>
            <img src={brandKit.monochrome} alt={`${brandKit.brandName} monochrome logo preview`} />
            <button onClick={() => downloadAsset(brandKit.monochrome, "monochrome")}>Monochrome</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function LogoCreativeDirectorPanel({
  creativeBrief,
  logoVariations = [],
  prompt = "",
  workspaceLogoContext = null,
  setPrompt,
  setSelectedPlatform,
  setCreativeTone,
  setLogoIndustry,
  setLogoSymbol,
  setLogoColors,
  rememberRejectedLogoDirection,
  generate,
}) {
  const seenDirections = new Set();
  const directions = logoVariations
    .filter((variation) => variation?.whyFits || variation?.rationale || variation?.symbol || variation?.typography)
    .filter((variation) => {
      const key = normalizeDirectionKey(variation?.title || variation?.name || variation?.id);
      if (!key || seenDirections.has(key)) return false;
      seenDirections.add(key);
      return true;
    })
    .slice(0, 3);

  if (!creativeBrief && directions.length === 0) return null;

  const regenerateWithInstruction = (instruction, direction = null) => {
    const isExplicitReject = /different icon|do not repeat|manual reject|avoid|remove/i.test(instruction);
    if (isExplicitReject) rememberRejectedLogoDirection?.(direction || creativeBrief?.concepts?.[0] || {}, instruction);
    const directionText = direction
      ? `Use this selected direction: ${direction.name}. Symbol/icon: ${direction.symbol}. Typography: ${direction.typography}. Palette: ${direction.palette}. Layout: ${direction.layout}. Why it fits: ${direction.whyFits}.`
      : "";
    const continuityText = "Preserve successful qualities from the current logo direction. Maintain the same brand identity and evolve the requested weak area instead of restarting.";
    const nextPrompt = `${prompt || ""}\n\n${instruction}\n${continuityText}\n${directionText}`.trim();
    const nextBrandName = creativeBrief?.brandName || "";
    const nextIndustry = creativeBrief?.category || "";
    const nextStyle = direction?.logoStyle || "";
    const nextSymbol = direction?.symbol || "";
    const nextColors = direction?.palette || "";

    setPrompt(nextPrompt);
    if (nextStyle) setSelectedPlatform(nextStyle);
    if (nextSymbol) setLogoSymbol(nextSymbol);
    if (nextColors) setLogoColors(nextColors);
    if (nextBrandName) setCreativeTone(nextBrandName);
    if (nextIndustry) setLogoIndustry(nextIndustry);
    generate(null, {
      prompt: nextPrompt,
      creativeTone: nextBrandName,
      logoIndustry: nextIndustry,
      selectedPlatform: nextStyle,
      logoSymbol: nextSymbol,
      logoColors: nextColors,
      generationMemory: {
        lastSuccessfulDirection: direction || creativeBrief?.concepts?.[0] || null,
        continuityIntent: instruction,
      },
    });
  };

  const summaryParts = [
    ["Brand", workspaceLogoContext?.brandName || creativeBrief?.brandName],
    ["Audience", workspaceLogoContext?.audience || creativeBrief?.targetAudience],
    ["Visual territory", workspaceLogoContext?.symbol || creativeBrief?.visualTerritory],
  ].filter(([, value]) => isMeaningfulDisplayText(value));
  const strategyPositioning = creativeBrief?.brandStrategy?.positioning;
  const strategyMessage = creativeBrief?.brandStrategy?.coreMessage;
  const strategyCustomer = creativeBrief?.brandStrategy?.targetCustomer;
  const strategyVisual = creativeBrief?.brandStrategy?.suggestedVisualDirection;
  const showBrandStrategyStrip = [
    strategyPositioning,
    strategyMessage,
    strategyCustomer,
    strategyVisual,
  ].some(isMeaningfulDisplayText);

  const refinements = [
    ["Clarify the symbol", "Regenerate this logo with a clearer symbol direction while preserving the active brand name, category, palette, and typography."],
    ["Improve small-size readability", "Regenerate this logo so the avatar and wordmark remain readable at small sizes without adding unrelated symbols."],
    ["Use the workspace typography", "Regenerate this logo with typography closer to the active Brand Workspace type direction."],
    ["Keep symbol, change type", "Keep the current symbol idea but explore a stronger wordmark treatment that still fits the active brand."],
    ["Keep type, change symbol", "Keep the current typography direction but try a more distinctive category-appropriate symbol."],
    ["Try workspace colors", "Regenerate this logo using the active Brand Workspace palette as the primary color system."],
  ];

  return (
    <div className="creativeDirectorPanel">
      <div className="creativeDirectorTop">
        <div>
          <div className="tinyTag">CREATIVE DIRECTOR</div>
          <h3>Why these directions fit</h3>
        </div>
        {creativeBrief && (
          <span>{creativeBrief.category} · {creativeBrief.personality}</span>
        )}
      </div>

      {summaryParts.length > 0 && (
        <p className="creativeDirectorSummary">
          {summaryParts.map(([label, value]) => `${label}: ${value}`).join(". ")}.
        </p>
      )}

      {showBrandStrategyStrip && (
        <div className="brandStrategyStrip">
          <span>Brand Strategy</span>
          {[strategyPositioning, strategyMessage].some(isMeaningfulDisplayText) && (
            <p>{[strategyPositioning, strategyMessage].filter(isMeaningfulDisplayText).join(". ")}</p>
          )}
          {[strategyCustomer, strategyVisual].some(isMeaningfulDisplayText) && (
            <small>{[
              isMeaningfulDisplayText(strategyCustomer) ? `Customer: ${strategyCustomer}` : "",
              isMeaningfulDisplayText(strategyVisual) ? `Visual: ${strategyVisual}` : "",
            ].filter(Boolean).join(". ")}</small>
          )}
        </div>
      )}

      <div className="creativeDirectorActions">
        {refinements.map(([label, instruction]) => (
          <button key={label} onClick={() => regenerateWithInstruction(instruction)}>{label}</button>
        ))}
      </div>

      {directions.length > 0 && (
        <div className="directionReasonGrid">
          {directions.map((direction) => (
            <div className="directionReasonCard" key={direction.id || direction.name}>
              <span>{direction.title || direction.name || "Logo direction"}</span>
              {isMeaningfulDisplayText(direction.composition || direction.layout) && <p><strong>Composition:</strong> {direction.composition || direction.layout}</p>}
              {isMeaningfulDisplayText(direction.symbol) && <p><strong>Symbol:</strong> {direction.symbol}</p>}
              {isMeaningfulDisplayText(direction.typography) && <p><strong>Type:</strong> {direction.typography}</p>}
              {isMeaningfulDisplayText(direction.paletteUsage || direction.palette) && <p><strong>Colors:</strong> {direction.paletteUsage || direction.palette}</p>}
              {isMeaningfulDisplayText(direction.primaryUseCases || direction.primaryUseCase) && <p><strong>Use:</strong> {direction.primaryUseCases || direction.primaryUseCase}</p>}
              {isMeaningfulDisplayText(direction.rationale || direction.whyFits) && <p>{direction.rationale || direction.whyFits}</p>}
              <button onClick={() => regenerateWithInstruction("Regenerate using this selected logo direction.", direction)}>Regenerate this direction</button>
              <button onClick={() => rememberRejectedLogoDirection?.(direction, "manual reject")}>Do not repeat</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LogoEditorPanel({
  editableLogo,
  transparentLogo,
  logoVariations = [],
  logoEditor,
  setLogoEditor,
  setLogoImage,
  setLogoVectorImage,
  setLogoSvg,
  brandName
}) {
  const updateEditor = (key, value) => {
    setLogoEditor({ ...logoEditor, [key]: value });
  };

  const useVariation = (variation) => {
    if (!variation?.image) return;
    setLogoImage(variation.image);
    setLogoVectorImage(variation.svg || variation.image);
    setLogoSvg(variation.svg || variation.image);
  };

  return (
    <details className="logoVariantPanel">
      <summary>Edit, export, and variations</summary>
      <div className="recentLogoHeader">
        <div>
          <div className="tinyTag">LOGO EDITOR</div>
          <h3>Fine-tune the vector version</h3>
        </div>
        <span>SVG and transparent PNG ready</span>
      </div>

      <div className="logoEditorGrid">
        <div className="logoEditorPreview">
          <img src={editableLogo} alt={`${brandName} editable vector logo`} />
        </div>
        <div className="logoEditorControls">
          <label>
            <span>Primary</span>
            <input type="color" value={logoEditor.ink || "#111111"} onChange={(e) => updateEditor("ink", e.target.value)} />
          </label>
          <label>
            <span>Background</span>
            <input type="color" value={logoEditor.paper || "#f5f5f5"} onChange={(e) => updateEditor("paper", e.target.value)} />
          </label>
          <label>
            <span>Accent</span>
            <input type="color" value={logoEditor.accent || "#111111"} onChange={(e) => updateEditor("accent", e.target.value)} />
          </label>
          <label>
            <span>Font</span>
            <select value={logoEditor.font || "Inter, Arial, Helvetica, sans-serif"} onChange={(e) => updateEditor("font", e.target.value)}>
              <option value="Inter, Arial, Helvetica, sans-serif">Modern Sans</option>
              <option value="Georgia, Times New Roman, serif">Editorial Serif</option>
              <option value="Arial Black, Arial, Helvetica, sans-serif">Bold Display</option>
              <option value="Trebuchet MS, Arial, sans-serif">Friendly Sans</option>
            </select>
          </label>
          <div className="logoEditorActions">
            <button onClick={() => setLogoImage(editableLogo)}>Use Edited Version</button>
            <button onClick={() => downloadGeneratedImage(editableLogo, `${brandName}-vector`)}>Download SVG</button>
            <button onClick={() => downloadTransparentPng(transparentLogo || editableLogo, brandName)}>Transparent PNG</button>
          </div>
        </div>
      </div>

      <div className="logoVariantGrid">
        {logoVariations.slice(0, 6).map((variation) => (
          <button className="logoVariantCard primary" key={variation.id || variation.name} onClick={() => useVariation(variation)}>
            <span>{variation.name || "Variation"}</span>
            <img src={variation.image} alt={`${brandName} ${variation.name || "variation"}`} />
          </button>
        ))}
      </div>
    </details>
  );
}

function getToolSubline(toolKey) {
  const lines = {
    logo: "Use the saved strategy, visual identity, palette, typography, and logo direction to create brand-fit concepts.",
    captions: "Choose a platform, describe the post, set a goal, and generate captions in the active brand voice.",
    hooks: "Describe the video format, audience tension, and opening angle to create short-form hooks.",
    bios: "Choose the platform or placement, then generate bios from the brand positioning and character constraints.",
    hashtags: "Choose a platform and describe the post so BrandThat can create discovery tags for the right industry and audience.",
    email: "Define the campaign purpose, recipient, and call to action to create complete email options.",
    strategy: "Create a platform-specific content plan with pillars, cadence, and next steps.",
    brand: "Turn a rough idea into positioning, names, voice, audience, and launch direction.",
    audit: "Audit a brand, offer, profile, or website and get specific improvements.",
    campaign: "Build a campaign with angles, posts, emails, hooks, CTAs, and a simple calendar.",
    growth: "Create a realistic follower roadmap with posting cadence, timing, content pillars, and weekly milestones."
  };
  return lines[toolKey] || "Create premium, ready-to-use brand assets in seconds.";
}

function getStylePlaceholder(toolKey) {
  const placeholders = {
    logo: "Logo style, industry, icon, colors, era, layout, or reference direction",
    captions: "Choose social media",
    hooks: "Video platform, content type, or hook style",
    bios: "Bio placement or profile type",
    hashtags: "Choose social media",
    email: "Email type or campaign goal",
    strategy: "Platform, campaign, or growth focus",
    brand: "Brand category, market, or business type",
    audit: "Website, offer, profile, positioning, launch plan, or full brand",
    campaign: "Launch, promo, brand reveal, content series, or lead magnet",
    growth: "Instagram, TikTok, YouTube Shorts, LinkedIn, or multi-platform"
  };
  return placeholders[toolKey] || "Style, format, or direction";
}

function getTonePlaceholder(toolKey) {
  const placeholders = {
    logo: "Brand name, initials, tagline, or must-use words",
    captions: "",
    hooks: "Hook energy or vibe",
    bios: "Voice and personality",
    hashtags: "",
    email: "Email tone",
    strategy: "Strategy tone or brand voice",
    brand: "Brand personality",
    audit: "Direct, premium, strategic, honest",
    campaign: "Energetic, premium, conversion-focused, social-native",
    growth: "Practical, ambitious, consistent, platform-native"
  };
  return placeholders[toolKey] || "Tone or voice";
}

function getMainPromptPlaceholder(activeTool) {
  if (activeTool.key === "logo") {
    return "Describe the logo direction, brand name, audience, mood, symbols, colors, and where the logo must work.";
  }
  if (activeTool.key === "captions") {
    return "Describe the post, video, product, brand moment, launch, or idea you need captions for. Example: A behind-the-scenes video of a luxury coffee shop opening day.";
  }
  if (activeTool.key === "hashtags") {
    return "Describe what you need hashtags for. Example: Sunset dinner at a California ranch with miniature cows, alpacas, and luxury countryside lifestyle content.";
  }
  return activeTool.placeholder;
}

function getGenerateButtonText(toolKey, shortTitle) {
  const labels = {
    logo: "Generate Logo Image",
    captions: "Generate 5 Captions",
    hooks: "Generate 10 Hooks",
    bios: "Generate 10 Bios",
    hashtags: "Generate 50 Hashtags",
    email: "Generate 10 Emails",
    strategy: "Generate 10 Strategy Ideas",
    brand: "Build Brand Plan",
    audit: "Audit Brand",
    campaign: "Build Campaign",
    growth: "Build Growth Roadmap"
  };
  return labels[toolKey] || `Generate ${shortTitle}`;
}

function getTenResultHeader(toolKey) {
  const headers = {
    captions: "5 COPY-READY CAPTIONS",
    hooks: "10 HOOK OPTIONS",
    bios: "10 BIO OPTIONS",
    email: "10 EMAIL OPTIONS",
    strategy: "10 STRATEGY IDEAS",
    brand: "GUIDED BRAND PLAN",
    audit: "BRAND AUDIT",
    campaign: "CAMPAIGN PLAN",
    growth: "GROWTH ROADMAP"
  };
  return headers[toolKey] || "10 GENERATED OPTIONS";
}

function getResultCountHeader(toolKey, result = "") {
  if (toolKey === "captions") {
    const count = parseTenOptions(result).filter(Boolean).length;
    return `${count || 0} COPY-READY CAPTION${count === 1 ? "" : "S"}`;
  }
  return getTenResultHeader(toolKey);
}

function getLoadingText(toolKey) {
  const loading = {
    logo: "Designing your logo concept...",
    captions: "Reviewing 5 captions...",
    hooks: "Generating 10 hooks...",
    bios: "Generating 10 bios...",
    hashtags: "Generating 50 hashtags...",
    email: "Generating 10 email options...",
    strategy: "Generating 10 strategy ideas...",
    brand: "Building your brand plan...",
    audit: "Auditing your brand...",
    campaign: "Building your campaign...",
    growth: "Building your growth roadmap..."
  };
  return loading[toolKey] || "Generating your brand asset...";
}

function getLoadingSubtext(toolKey) {
  const subtext = {
    logo: "Balancing style, clarity, scalability, and brand memorability.",
    captions: "Creating and reviewing captions. If fewer than five pass, BrandThat will show the approved count.",
    hooks: "Creating ten quick, platform-aware hook options.",
    bios: "Creating ten polished profile-ready bio options.",
    hashtags: "Creating one clean copy-ready hashtag block.",
    email: "Creating ten accurate emails with subject, preview, body, and CTA.",
    strategy: "Creating ten specific strategy moves you can use.",
    brand: "Turning the idea into strategy, identity direction, type, color, and launch steps.",
    audit: "Finding positioning, trust, offer, content, and conversion gaps.",
    campaign: "Creating angles, posts, emails, hooks, and launch actions.",
    growth: "Mapping posting cadence, timing, content pillars, and milestone targets."
  };
  return subtext[toolKey] || "Formatting your results into premium brand cards.";
}


function getLogoResultCards({ prompt, selectedPlatform, creativeTone, logoImage }) {
  const style = selectedPlatform?.trim() || "Best-fit visual direction";
  const brandKeywords = creativeTone?.trim() || "Use the brand name, initials, tagline, or required words from the prompt if provided";
  const request = prompt?.trim() || "The user's logo request";

  return [
    {
      label: "CREATED",
      title: "Logo Created",
      featured: true,
      content: logoImage
        ? "Your logo image has been generated successfully. Download it, save it to a workspace, or remix the direction into another version."
        : "Your logo direction is ready. Generate the image to create a visual concept."
    },
    {
      label: "DIRECTION",
      title: "Brand Direction Used",
      content: `${request}\n\nStyle: ${style}\nBrand name / keywords: ${brandKeywords}`
    },
    {
      label: "USE",
      title: "Best Uses",
      content: "Website header, social profile image, favicon, business card, proposal cover, packaging direction, and brand kit starter asset."
    },
    {
      label: "NEXT",
      title: "Next Step",
      content: "Save this logo to your Brand Workspace, download the image, or click Remix to create a sharper variation with a more specific style direction."
    }
  ];
}

function formatSmartResultCards(toolKey, result) {
  if (!result) return [];

  const cleanLines = cleanGeneratedText(result)
    .split("\n")
    .map((line) => line.replace(/^[-•*\d.)\s]+/, "").replace(/:$/, "").trim())
    .filter(Boolean);

  const schema = getResultSchema(toolKey);
  const chunkSize = toolKey === "email" || toolKey === "strategy" ? 2 : 1;

  const cards = schema.map((item, index) => {
    const start = index * chunkSize;
    const content = cleanLines.slice(start, start + chunkSize).join("\n") || cleanLines[index] || result;
    return { ...item, content };
  }).filter((card) => card.content);

  return cards.slice(0, 8);
}

function getResultSchema(toolKey) {
  const schemas = {
    logo: [
      { label: "CONCEPT", title: "Logo Direction", featured: true },
      { label: "TYPE", title: "Typography / Mark" },
      { label: "COLOR", title: "Palette Direction" },
      { label: "USE", title: "Best Use Case" },
      { label: "SYSTEM", title: "Brand Identity Notes" },
      { label: "NEXT", title: "Next Iteration" }
    ],
    captions: [
      { label: "BEST", title: "Best Caption", featured: true },
      { label: "SHORT", title: "Short Caption" },
      { label: "PREMIUM", title: "Premium Caption" },
      { label: "CTA", title: "Call-To-Action Caption" },
      { label: "STORY", title: "Storytelling Caption" },
      { label: "VIRAL", title: "Viral Caption" }
    ],
    hooks: [
      { label: "1 SEC", title: "Instant Hook", featured: true },
      { label: "3 SEC", title: "Curiosity Hook" },
      { label: "5 SEC", title: "Retention Hook" },
      { label: "BOLD", title: "Bold Hook" },
      { label: "POV", title: "POV Hook" },
      { label: "PREMIUM", title: "Polished Hook" }
    ],
    bios: [
      { label: "IG", title: "Instagram Bio", featured: true },
      { label: "TIKTOK", title: "TikTok Bio" },
      { label: "SITE", title: "Website Bio" },
      { label: "LINKEDIN", title: "LinkedIn Bio" },
      { label: "SHORT", title: "Short Bio" },
      { label: "PREMIUM", title: "Premium Bio" }
    ],
    hashtags: [
      { label: "REACH", title: "Broad Reach", featured: true },
      { label: "NICHE", title: "Niche Specific" },
      { label: "COMMUNITY", title: "Audience + Community" },
      { label: "DISCOVERY", title: "Discovery / Viral Potential" },
      { label: "LOCAL", title: "Local / Contextual" },
      { label: "COPY", title: "All Hashtags" }
    ],
    email: [
      { label: "SUBJECT", title: "Subject Line", featured: true },
      { label: "PREVIEW", title: "Preview Text" },
      { label: "OPEN", title: "Opening" },
      { label: "BODY", title: "Body Copy" },
      { label: "CTA", title: "Call To Action" },
      { label: "SIGNOFF", title: "Sign-Off" }
    ],
    strategy: [
      { label: "PILLAR", title: "Content Pillar", featured: true },
      { label: "CADENCE", title: "Posting Cadence" },
      { label: "IDEA", title: "Content Idea" },
      { label: "GROWTH", title: "Growth Tactic" },
      { label: "HOOK", title: "Hook Direction" },
      { label: "NEXT", title: "Next Step" }
    ],
    brand: [
      { label: "NAME", title: "Brand Name", featured: true },
      { label: "POSITION", title: "Positioning" },
      { label: "TAGLINE", title: "Tagline" },
      { label: "AUDIENCE", title: "Audience" },
      { label: "VOICE", title: "Brand Voice" },
      { label: "LAUNCH", title: "Launch Direction" }
    ],
    audit: [
      { label: "SCORE", title: "Brand Health", featured: true },
      { label: "GAPS", title: "Positioning Gaps" },
      { label: "OFFER", title: "Offer Clarity" },
      { label: "TRUST", title: "Trust Builders" },
      { label: "CONTENT", title: "Content Opportunities" },
      { label: "NEXT", title: "Priority Actions" }
    ],
    campaign: [
      { label: "PROMISE", title: "Campaign Promise", featured: true },
      { label: "ANGLE", title: "Audience Angle" },
      { label: "POSTS", title: "Social Posts" },
      { label: "EMAIL", title: "Email Ideas" },
      { label: "CTA", title: "CTA Direction" },
      { label: "CALENDAR", title: "14-Day Calendar" }
    ],
    growth: [
      { label: "GOAL", title: "Follower Goal", featured: true },
      { label: "30 DAYS", title: "30-Day Plan" },
      { label: "60 DAYS", title: "60-Day Plan" },
      { label: "90 DAYS", title: "90-Day Plan" },
      { label: "CADENCE", title: "Posting Cadence" },
      { label: "METRICS", title: "Metrics To Track" }
    ]
  };
  return schemas[toolKey] || schemas.brand;
}

function isGenerationFailureText(value = "") {
  const text = cleanGeneratedText(value).toLowerCase();
  if (!text) return false;
  return /^(generation failed|something went wrong|request failed|brandthat could not|the ai request could not complete|generation did not finish)/i.test(text);
}

function getTextGenerationResponseText(data, toolKey = "") {
  if (!data) return "";
  if (toolKey === "captions") {
    const captionItems = [
      ...(Array.isArray(data.approvedCaptions) ? data.approvedCaptions : []),
      ...(Array.isArray(data.captions) ? data.captions : []),
      ...(Array.isArray(data.results) ? data.results : []),
    ]
      .map((item) => typeof item === "string" ? item : item?.caption || item?.copy || item?.text || "")
      .map(cleanGeneratedText)
      .filter(Boolean);

    if (captionItems.length) {
      return captionItems.slice(0, 5).map((item, index) => `${index + 1}. ${item}`).join("\n");
    }
  }
  return cleanGeneratedText(data.text || "");
}

function isSuccessfulGeneratorResult(toolKey, result) {
  if (!result || isGenerationFailureText(result)) return false;
  if (toolKey === "logo") return true;
  if (toolKey === "hashtags") {
    return cleanGeneratedText(result).split(/\s+/).filter((item) => item.startsWith("#")).length >= 5;
  }
  if (toolKey === "captions") {
    return parseTenOptions(result).filter(Boolean).length >= 1;
  }
  if (["captions", "hooks", "bios", "email", "strategy"].includes(toolKey)) {
    return parseTenOptions(result).filter(Boolean).length >= 10;
  }
  return cleanGeneratedText(result).length > 40;
}

function parseTenOptions(result) {
  if (!result) return [];

  const normalized = cleanGeneratedText(result).replace(/\r/g, "").trim();
  const matches = [...normalized.matchAll(/(?:^|\n)\s*(\d{1,2})[.)]\s+/g)];

  if (matches.length >= 2) {
    return matches.slice(0, 10).map((match, index) => {
      const start = match.index + match[0].length;
      const end = matches[index + 1]?.index ?? normalized.length;
      return cleanGeneratedText(normalized.slice(start, end));
    }).filter(Boolean);
  }

  const lines = normalized
    .split("\n")
    .map((line) => cleanGeneratedText(line.replace(/^[-•*\s]*(?:\d+[.)])?\s*/, "")))
    .filter(Boolean);

  if (lines.length >= 10) return lines.slice(0, 10);

  const sentenceSplit = normalized
    .split(/(?<=\.)\s+(?=[A-Z#"'])/)
    .map((line) => cleanGeneratedText(line.replace(/^[-•*\s]*(?:\d+[.)])?\s*/, "")))
    .filter(Boolean);

  return sentenceSplit.slice(0, 10).length ? sentenceSplit.slice(0, 10) : [normalized];
}

function getResultHeader(toolKey) {
  const headers = {
    logo: "LOGO + BRAND DIRECTION",
    captions: "5 COPY-READY CAPTIONS",
    hooks: "HOOK OPTIONS",
    bios: "BIO OPTIONS",
    hashtags: "50 COPY-READY HASHTAGS",
    email: "EMAIL COPY",
    strategy: "SOCIAL STRATEGY",
    brand: "GUIDED BRAND PLAN",
    audit: "BRAND AUDIT",
    campaign: "CAMPAIGN PLAN",
    growth: "GROWTH ROADMAP"
  };
  return headers[toolKey] || "BRANDTHAT AI OUTPUT";
}

const css = `
*{box-sizing:border-box}
body{margin:0}
.app{background:#fff;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#111;overflow-x:hidden}
.nav{max-width:1280px;margin:0 auto;padding:24px 6vw 8px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px;position:relative;z-index:5}
.brand{background:none;border:none;font-size:30px;font-weight:900;letter-spacing:-.06em;cursor:pointer;color:#111;text-align:left}
.navLinks{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;background:rgba(255,255,255,.72);border:1px solid rgba(0,0,0,.07);border-radius:999px;padding:6px;width:max-content;justify-self:center}
.navLinks button,.accountBtn{background:none;border:none;font-weight:800;cursor:pointer;color:#111;font-size:13px}
.navLinks button{padding:9px 12px;border-radius:999px}
.navLinks button:hover{background:#111;color:white}
.accountBtn{background:#111;color:white;padding:12px 18px;border-radius:999px}
.navActions{display:flex;align-items:center;gap:8px;justify-content:flex-end}
.navPrimaryCta{border:none;background:#ff5a3d;color:#111;border-radius:999px;padding:12px 16px;font-weight:950;cursor:pointer;font-size:13px}
.navPrimaryCta:hover{filter:brightness(.96);transform:translateY(-1px)}
.accountMenu{display:flex;align-items:center;gap:8px;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:6px 8px 6px 14px;max-width:360px}
.accountMenu span{font-size:12px;font-weight:800;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px}
.accountMenu button{border:none;background:#111;color:white;border-radius:999px;padding:9px 11px;font-weight:800;cursor:pointer;font-size:12px}
.accountMenu button:first-of-type{background:#f5f5f5;color:#111;border:1px solid rgba(0,0,0,.08)}
.hero{max-width:1280px;margin:0 auto;padding:38px 6vw 40px}
.logoHero{display:grid;grid-template-columns:.9fr 1.1fr;gap:34px;align-items:start}
.dreamHero{display:grid;grid-template-columns:.82fr 1.18fr;gap:42px;align-items:start;padding-top:44px;padding-bottom:60px}
.dreamHero .heroTop{position:sticky;top:24px}
.brandHero{padding-top:72px;padding-bottom:56px;display:grid;grid-template-columns:minmax(0,.86fr) minmax(440px,1.14fr);gap:44px;align-items:center}
.brandHero .heroTop{max-width:700px;margin:0}
.brandHero .lead{color:#4d4946}
.brandHero .heroCtas{justify-content:flex-start}
.heroCopy{text-align:left}
.heroPriceLine{margin:14px 0 0;color:#6a625d;font-size:14px;font-weight:850}
.heroAgentPreview{background:#111;color:white;border-radius:30px;padding:18px;box-shadow:0 34px 90px rgba(17,17,17,.16);display:grid;gap:12px;overflow:hidden}
.agentPromptBox{background:#fff;color:#111;border-radius:22px;padding:22px}
.agentPromptBox span{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;font-weight:950;color:#ff5a3d}
.agentPromptBox p{font-size:24px;line-height:1.2;letter-spacing:-.04em;margin:12px 0 0;font-weight:850}
.agentStepList{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.agentStepList div{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);border-radius:16px;padding:14px;display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:center;animation:demoRise .55s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--agent-step) * .08s)}
.agentStepList small{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#ff5a3d;color:#111;font-weight:950;font-size:11px}
.agentStepList span{font-size:13px;font-weight:850;color:rgba(255,255,255,.84)}
.agentOutputPreview{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:18px}
.agentOutputPreview strong{font-size:22px;letter-spacing:-.04em}
.agentOutputPreview p{color:rgba(255,255,255,.68);line-height:1.6;margin:8px 0 0;font-size:14px}
.journeyLine{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px;max-width:640px}
.journeyLine span{background:rgba(255,255,255,.74);border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;color:#555;box-shadow:0 10px 30px rgba(0,0,0,.035)}
.brandBuilderCard{position:relative;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:28px;box-shadow:0 24px 70px rgba(20,20,18,.07);overflow:hidden}
.brandBuilderCard:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#111,#ff5a3d,#111);pointer-events:none}
.brandBuilderCard>*{position:relative;z-index:1}
.builderTop{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:22px}
.builderTop h2{font-size:42px}
.builderTop p{color:#666;line-height:1.65;margin:12px 0 0;max-width:560px}
.builderTop>span{display:inline-flex;white-space:nowrap;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 12px;color:#111111;background:rgba(255,255,255,.78);font-size:12px;font-weight:900}
.builderSteps{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px}
.builderSteps div{background:#fafafa;border:1px solid rgba(0,0,0,.07);border-radius:12px;padding:15px;min-height:126px}
.builderSteps span{display:inline-flex;color:#111111;font-size:10px;font-weight:900;letter-spacing:1.5px;margin-bottom:12px}
.builderSteps strong{display:block;font-size:17px;letter-spacing:-.03em;margin-bottom:6px}
.builderSteps p{color:#666;font-size:13px;line-height:1.45;margin:0}
.builderGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.builderField{display:block;margin-top:14px}
.builderField.full{margin-top:0}
.builderField span{display:block;font-size:11px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;color:#111111;margin:0 0 8px 8px}
.builderField textarea{min-height:150px;margin-top:0;background:rgba(255,255,255,.82)}
.builderField input,.builderField select{margin-top:0;background:rgba(255,255,255,.82)}
.builderActions{display:grid;grid-template-columns:minmax(220px,.45fr) 1fr;gap:16px;align-items:center;margin-top:18px}
.builderActions .btn{width:100%}
.builderActions p{color:#666;line-height:1.55;margin:0;font-size:14px}
.heroTop{max-width:760px;margin-bottom:50px}
.eyebrow,.tinyTag{font-size:11px;font-weight:800;letter-spacing:2px;color:#111111;text-transform:uppercase;margin-bottom:12px}
h1{font-size:88px;line-height:.96;letter-spacing:-.045em;margin:0 0 24px;font-kerning:normal;text-rendering:optimizeLegibility}
.heroTitle{font-size:68px;line-height:.98;letter-spacing:-.045em;max-width:720px}
.heroTitle span{display:block}
.pageTitle{max-width:900px}
.pageLead{font-size:20px;line-height:1.6;color:#666;max-width:760px;margin:0 0 32px}
h2{font-size:44px;line-height:1;letter-spacing:-.05em;margin:0}
.toolCard h3,.featureCard h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin:0 0 12px}
.lead{font-size:20px;line-height:1.6;color:#666;max-width:620px}
.freeStrip{display:inline-flex;background:white;border:1px solid rgba(0,0,0,.08);padding:12px 16px;border-radius:999px;font-size:13px;font-weight:800;color:#111111;margin-top:8px}
.heroCtas{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}
.heroProofPanel{margin-top:20px;display:grid;gap:12px;max-width:620px}
.proofMiniGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.miniLogoOutput{background:white;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:14px;min-height:142px;display:flex;flex-direction:column;justify-content:space-between}
.miniLogoOutput strong{display:block;font-size:14px;letter-spacing:-.02em}
.miniLogoOutput span{display:block;color:#666;font-size:12px;line-height:1.35;margin-top:4px}
.miniLogoOutput small{display:block;color:#111111;font-size:10px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;margin-top:8px}
.miniMark{width:58px;height:58px;border-radius:16px;background:#111;color:white;display:grid;place-items:center;position:relative;overflow:hidden}
.miniMark span,.miniMark i,.afterMark span,.afterMark i{display:block;position:absolute}
.miniMark.luxury-wordmark span{width:34px;height:6px;background:white;border-radius:999px;top:20px;left:12px}
.miniMark.luxury-wordmark i{width:24px;height:6px;background:rgba(255,255,255,.55);border-radius:999px;top:32px;left:12px}
.miniMark.saas-abstract{background:#f5f5f5;border:1px solid rgba(0,0,0,.12)}
.miniMark.saas-abstract span{width:32px;height:32px;border:2px solid #111;border-radius:50% 50% 50% 12px;transform:rotate(-18deg)}
.miniMark.saas-abstract i{width:14px;height:14px;background:#111;border-radius:50%;right:12px;bottom:13px}
.miniMark.agency-system{background:#111111}
.miniMark.agency-system span{width:30px;height:30px;border:2px solid white;border-radius:8px;transform:rotate(45deg)}
.miniMark.agency-system i{width:20px;height:3px;background:rgba(255,255,255,.7);border-radius:999px;bottom:16px}
.miniMark.finance-monogram{background:#111}
.miniMark.finance-monogram span{width:28px;height:38px;border:2px solid white;border-radius:999px 999px 6px 6px}
.miniMark.finance-monogram i{width:22px;height:2px;background:rgba(255,255,255,.7);transform:rotate(-35deg)}
.miniMark.architecture-grid{background:#f5f5f5;border:1px solid rgba(0,0,0,.12)}
.miniMark.architecture-grid span{width:36px;height:36px;border-left:2px solid #111;border-bottom:2px solid #111;left:12px;bottom:12px}
.miniMark.architecture-grid i{width:34px;height:2px;background:#111;transform:rotate(-45deg)}
.miniMark.beauty-serif{background:#111}
.miniMark.beauty-serif span{width:40px;height:18px;border:2px solid white;border-left:none;border-right:none}
.miniMark.beauty-serif i{width:6px;height:36px;background:rgba(255,255,255,.85);border-radius:999px}
.proofMetricRow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.proofMetricRow div{background:#111;color:white;border-radius:14px;padding:12px 14px}
.proofMetricRow strong{display:block;font-size:16px}
.proofMetricRow span{display:block;color:rgba(255,255,255,.7);font-size:12px;margin-top:3px}
.trustBar{max-width:1280px;margin:0 auto;padding:0 6vw 34px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.trustPill{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:16px}
.trustPill strong{display:block;font-size:15px;margin-bottom:6px}
.trustPill span{display:block;color:#666;line-height:1.45;font-size:13px}
.freeToolsSection{max-width:1280px;margin:0 auto;padding:18px 6vw 42px;display:grid;grid-template-columns:.9fr 1.1fr;gap:24px;align-items:start}
.sectionLead{font-size:17px;line-height:1.7;color:#666;max-width:700px;margin:16px 0 0}
.freeToolCards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.freeToolCards button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:18px;text-align:left;color:#111;cursor:pointer;font-family:inherit;transition:.2s ease}
.freeToolCards button:hover{transform:translateY(-3px);border-color:#111;box-shadow:0 18px 42px rgba(0,0,0,.08)}
.freeToolCards strong{display:block;font-size:18px;letter-spacing:-.03em;margin-bottom:8px}
.freeToolCards span{display:block;color:#666;line-height:1.55;font-size:14px}
.productDemoSection{max-width:1280px;margin:0 auto;padding:10px 6vw 62px}
.demoIntro{text-align:center;max-width:760px;margin:0 auto 28px}
.demoIntro h2{font-size:44px}
.demoIntro p{color:#5f5a56;line-height:1.7;font-size:17px;margin:14px auto 0;max-width:690px}
.demoFrame{background:#111;color:white;border-radius:28px;padding:18px;box-shadow:0 32px 90px rgba(17,17,17,.18);overflow:hidden}
.demoBrowserBar{height:52px;border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.06);display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;padding:0 16px;margin-bottom:14px}
.demoBrowserBar span{width:14px;height:14px;border-radius:50%;background:#ff5a3d;box-shadow:18px 0 0 rgba(255,255,255,.28),36px 0 0 rgba(255,255,255,.12)}
.demoBrowserBar strong{font-size:13px;color:rgba(255,255,255,.82);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.demoBrowserBar small{font-size:12px;font-weight:900;color:#111;background:#fff;border-radius:999px;padding:8px 10px}
.demoFlow{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.demoStage{min-height:230px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:18px;padding:18px;display:flex;flex-direction:column;justify-content:space-between;animation:demoRise .7s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--stage-index) * .12s)}
.demoStage span,.demoWorkspaceReveal span{font-size:11px;letter-spacing:1.6px;text-transform:uppercase;font-weight:950;color:#ffb29f}
.demoStage h3{font-size:24px;line-height:1.05;letter-spacing:-.045em;margin:18px 0 10px}
.demoStage p{font-size:14px;line-height:1.55;color:rgba(255,255,255,.72);margin:0}
.demoWorkspaceReveal{margin-top:12px;background:#fff;color:#111;border-radius:22px;padding:20px;display:grid;grid-template-columns:96px 1fr;gap:18px;align-items:center;animation:demoSettle .8s .58s cubic-bezier(.2,.7,.2,1) both}
.demoWorkspaceMark{width:96px;height:96px;border-radius:24px;background:#ff5a3d;color:#111;display:grid;place-items:center;font-size:48px;font-weight:950;letter-spacing:-.08em}
.demoWorkspaceReveal h3{font-size:34px;line-height:1;letter-spacing:-.05em;margin:8px 0}
.demoWorkspaceReveal p{color:#5b5550;line-height:1.6;margin:0;max-width:760px}
.demoRoadmap{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:12px}
.demoRoadmap div{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px;min-height:90px;animation:roadmapFill .62s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(.82s + var(--roadmap-index) * .08s)}
.demoRoadmap small{display:block;color:#ffb29f;font-weight:950;margin-bottom:10px}
.demoRoadmap span{display:block;color:rgba(255,255,255,.82);font-size:13px;line-height:1.45;font-weight:800}
.caseStudySection{max-width:1280px;margin:0 auto;padding:34px 6vw 70px;display:grid;grid-template-columns:minmax(320px,.7fr) minmax(0,1.3fr);gap:34px;align-items:start}
.caseCopy{position:sticky;top:24px}
.caseCopy>span{display:block;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;font-weight:950;color:#ff5a3d;margin-bottom:14px}
.caseCopy p{color:#5f5a56;line-height:1.75;font-size:17px;max-width:450px}
.strategyCanvas,.roadmapCanvas,.workspaceCanvas{border-radius:30px;background:#f7f4f1;border:1px solid rgba(0,0,0,.08);padding:18px;box-shadow:0 28px 82px rgba(17,17,17,.06)}
.roughIdeaPanel,.strategyThesisPanel,.reasoningStack article,.platformMatrix article,.launchTimeline article,.workspaceProgressMock article{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:18px}
.roughIdeaPanel small,.strategyThesisPanel small,.workspaceHeaderMock small,.launchTimeline small{display:block;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:950;color:#ff5a3d;margin-bottom:10px}
.roughIdeaPanel p{font-size:22px;line-height:1.25;letter-spacing:-.04em;margin:0;font-weight:850;color:#111}
.strategyThesisPanel{margin-top:12px;background:#111;color:white}
.strategyThesisPanel h3{font-size:34px;line-height:1;letter-spacing:-.05em;margin:0}
.reasoningStack{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.reasoningStack strong,.platformMatrix strong,.workspaceProgressMock strong{display:block;font-size:16px;letter-spacing:-.03em;margin-bottom:8px}
.reasoningStack p,.platformMatrix p,.workspaceProgressMock p{color:#5f5a56;line-height:1.55;margin:0;font-size:13px}
.identityBoard{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:12px}.visualIdentityBoard{display:grid;gap:18px;margin-top:22px}.identityBoardHero,.identityPalettePanel,.identityTypePanel,.identityMoodboardPanel,.identityLogoSpecPanel{background:#11110f;color:#fffdf8;border-radius:24px;padding:24px;border:1px solid rgba(255,255,255,.08)}.identityBoardHero{display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:center}.identityPrimaryMark{aspect-ratio:1;border-radius:22px;background:#fffdf8;color:#11110f;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:950;overflow:hidden}.identityPrimaryMark img{width:100%;height:100%;object-fit:contain;padding:16px}.identityPaletteGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.identitySwatchCard{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:12px}.identitySwatch{height:112px;border-radius:12px;padding:12px;display:flex;align-items:flex-end}.identitySwatchCard b,.identitySwatchCard span,.identitySwatchCard small{display:block;margin-top:8px}.identitySwatchCard button,.identityLogoSpecPanel button{margin-top:10px;border:1px solid rgba(255,255,255,.18);background:#fffdf8;color:#11110f;border-radius:999px;padding:8px 10px;font-weight:850}.identityTypePanel .typeSpecimen{font-size:52px;letter-spacing:-.05em;line-height:.95;margin:14px 0}.bodySpecimen{font-size:18px;color:rgba(255,255,255,.72)}.typePairingGrid,.logoSpecGrid,.moodboardTileGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}.typePairingGrid div,.logoSpecGrid div,.moodboardTileGrid article{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:14px}.recommendedFromStrategy{display:inline-flex;margin-bottom:12px;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;color:#fff;background:rgba(255,255,255,.08)}.logoGuideColumn button.selectedLogoOption{background:#fffdf8;color:#11110f;box-shadow:0 0 0 2px rgba(255,255,255,.32)}.logoBriefLabel span{display:block;margin:0 0 8px 6px;font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#444}@media(max-width:820px){.identityBoardHero,.identityPaletteGrid,.typePairingGrid,.logoSpecGrid,.moodboardTileGrid{grid-template-columns:1fr}.identityPrimaryMark{width:150px}.identityTypePanel .typeSpecimen{font-size:40px}}
.brandUnderstoodDetails{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 14px;margin-top:12px;color:#4d4941}.brandUnderstoodDetails span{font-size:13px;line-height:1.35}.logoValidationPanel{margin-top:14px;border:1px solid #d18f72;background:#fff6ef;color:#3b2218;border-radius:14px;padding:14px}.logoValidationPanel ul{margin:8px 0 12px;padding-left:18px}.logoValidationPanel button{border:0;border-radius:999px;background:#11110f;color:#fffdf8;font-weight:850;padding:10px 14px}.generatorButtons .btn:disabled{opacity:.55;cursor:not-allowed}@media(max-width:820px){.brandUnderstoodDetails{grid-template-columns:1fr}}
.moodTile,.typeTile,.paletteTile{min-height:150px;border-radius:18px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;position:relative;font-weight:950;letter-spacing:-.03em}
.moodTile{background:#221916;color:#fff}
.moodTile.tall{background:linear-gradient(160deg,#2a201c,#8f4b36);min-height:210px;grid-row:span 2}
.moodTile.dark{background:#111;color:#f5eee7}
.moodTile.accent{background:#ff5a3d;color:#111}
.typeTile{background:white;border:1px solid rgba(0,0,0,.08);justify-content:center}
.typeTile strong{font-family:Georgia,serif;font-size:28px;line-height:1}
.typeTile span{color:#5f5a56;margin-top:8px;font-weight:800}
.paletteTile{background:white;border:1px solid rgba(0,0,0,.08);display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-content:end}
.paletteTile i{height:92px;border-radius:12px;background:#111}
.paletteTile i:nth-child(2){background:#f4eee5}.paletteTile i:nth-child(3){background:#8f4b36}.paletteTile i:nth-child(4){background:#ff5a3d}
.platformMatrix{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.launchTimeline{display:grid;gap:10px;margin-top:12px}
.launchTimeline article{display:grid;grid-template-columns:130px 1fr;gap:18px;align-items:start;animation:roadmapFill .55s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--timeline-step) * .08s)}
.launchTimeline p{margin:0;color:#3e3936;line-height:1.55;font-size:14px}
.workspaceCanvas{background:#111;color:white}
.workspaceHeaderMock{background:white;color:#111;border-radius:24px;padding:20px;display:grid;grid-template-columns:92px 1fr auto;gap:18px;align-items:center}
.workspaceBrandMark{width:92px;height:92px;border-radius:24px;background:#ff5a3d;display:grid;place-items:center;font-size:48px;font-weight:950;letter-spacing:-.08em}
.workspaceHeaderMock h3{font-size:42px;line-height:1;letter-spacing:-.06em;margin:0 0 4px}
.workspaceHeaderMock p{margin:0;color:#5f5a56}
.workspaceHeaderMock>span{background:#111;color:white;border-radius:999px;padding:10px 12px;font-size:12px;font-weight:950}
.workspaceModuleGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.workspaceModuleGrid span{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);border-radius:16px;padding:18px;font-size:15px;font-weight:900;color:rgba(255,255,255,.86)}
.workspaceProgressMock{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.workspaceProgressMock article{background:rgba(255,255,255,.95)}
.receivesSection{max-width:1280px;margin:0 auto;padding:28px 6vw 58px;display:grid;grid-template-columns:.72fr 1.28fr;gap:34px;align-items:start}
.receivesSection>div:first-child{position:sticky;top:24px}
.receivesSection p{color:#5f5a56;line-height:1.72;font-size:17px;max-width:520px}
.receivesList{border-top:1px solid rgba(0,0,0,.1)}
.receivesList article{display:grid;grid-template-columns:260px 1fr;gap:22px;padding:20px 0;border-bottom:1px solid rgba(0,0,0,.1)}
.receivesList strong{font-size:19px;letter-spacing:-.035em}
.receivesList p{margin:0;font-size:15px}
.exampleRoadmapSection{max-width:1280px;margin:0 auto;padding:26px 6vw 64px}
.roadmapIntro{display:flex;justify-content:space-between;gap:28px;align-items:end;margin-bottom:20px}
.roadmapIntro h2{max-width:620px}
.roadmapIntro p{color:#5f5a56;line-height:1.7;font-size:17px;max-width:430px;margin:0}
.exampleRoadmapGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.exampleRoadmapGrid article{background:#f7f4f1;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:22px;min-height:280px;display:flex;flex-direction:column;justify-content:space-between}
.exampleRoadmapGrid span{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:950;color:#ff5a3d}
.exampleRoadmapGrid h3{font-size:24px;line-height:1.15;letter-spacing:-.04em;margin:18px 0;color:#111}
.exampleRoadmapGrid p{color:#5f5a56;line-height:1.58;margin:0;font-size:14px}
.priorityStrip,.nextActions{margin-top:12px;background:#111;color:white;border-radius:18px;padding:18px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.priorityStrip strong,.nextActions strong{margin-right:8px}
.priorityStrip span,.nextActions span{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);border-radius:999px;padding:9px 11px;font-size:13px;font-weight:850;color:rgba(255,255,255,.86)}
.finalBuilderSection{max-width:1280px;margin:0 auto;padding:18px 6vw 70px;display:grid;grid-template-columns:.6fr 1.4fr;gap:30px;align-items:start}
.finalBuilderIntro{position:sticky;top:24px}
.finalBuilderIntro h2{font-size:56px}
.finalBuilderIntro p{color:#5f5a56;line-height:1.75;font-size:17px;max-width:440px}
@keyframes demoRise{0%{opacity:0;transform:translateY(18px)}100%{opacity:1;transform:translateY(0)}}
@keyframes demoSettle{0%{opacity:0;transform:translateY(16px) scale(.985)}100%{opacity:1;transform:translateY(0) scale(1)}}
@keyframes roadmapFill{0%{opacity:.35;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.demoStage,.demoWorkspaceReveal,.demoRoadmap div,.agentStepList div,.launchTimeline article{animation:none}.btn,.freeToolCards button,.operatingGrid button,.navPrimaryCta{transition:none}}
.operatingSection{max-width:1280px;margin:0 auto;padding:44px 6vw;display:grid;grid-template-columns:.8fr 1.2fr;gap:24px;align-items:start}
.operatingIntro{position:sticky;top:24px}
.operatingIntro p{color:#666;line-height:1.75;font-size:17px;max-width:560px}
.operatingGrid{display:grid;gap:12px}
.operatingGrid button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:22px;text-align:left;color:#111;cursor:pointer;font-family:inherit;display:grid;grid-template-columns:64px 1fr;gap:4px 18px;align-items:start;transition:.2s ease}
.operatingGrid button:hover{transform:translateY(-3px);box-shadow:0 20px 50px rgba(0,0,0,.08);border-color:#111}
.operatingGrid span{grid-row:1 / span 2;width:44px;height:44px;border-radius:50%;background:#111;color:white;display:grid;place-items:center;font-size:12px;font-weight:900}
.operatingGrid strong{font-size:24px;letter-spacing:-.04em}
.operatingGrid p{margin:6px 0 0;color:#666;line-height:1.6}
.membershipBand{max-width:1280px;margin:10px auto 36px;padding:36px 6vw;display:grid;grid-template-columns:1fr 420px;gap:24px;align-items:center}
.membershipBand>div:first-child{background:#111;color:white;border-radius:18px;padding:34px;min-height:300px;display:flex;flex-direction:column;justify-content:center}
.membershipBand .tinyTag{color:#ffffff}
.membershipBand h2{font-size:64px;letter-spacing:-.06em}
.membershipBand p{color:rgba(255,255,255,.74);font-size:18px;line-height:1.75;max-width:720px}
.membershipValueGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:24px;max-width:720px}
.membershipValueGrid span{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:10px 13px;color:white;font-size:13px;font-weight:900;background:rgba(255,255,255,.08)}
.membershipPanel{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:26px;box-shadow:0 24px 70px rgba(20,20,18,.08)}
.membershipPanel>span{display:block;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#111111;font-weight:900;margin-bottom:14px}
.membershipPanel ul{margin:0;padding-left:20px;color:#333;line-height:1.65}
.membershipPanel li{margin-bottom:10px}
.beforeAfterSection,.creativeDirectorExplainer{max-width:1280px;margin:0 auto;padding:42px 6vw;display:grid;grid-template-columns:.75fr 1.25fr;gap:24px;align-items:start}
.beforeAfterGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.beforeCard,.afterCard,.directorStep{background:white;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:22px}
.beforeCard span,.afterCard span{display:block;font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#111111;font-weight:900;margin-bottom:14px}
.beforeCard p{font-size:24px;line-height:1.35;letter-spacing:-.03em;margin:0;color:#111}
.afterPreviewGrid{display:grid;grid-template-columns:86px 1fr;gap:18px;align-items:center}
.afterMark{width:86px;height:86px;border-radius:24px;background:#111;color:white;display:grid;place-items:center;position:relative;overflow:hidden}
.afterMark span{width:46px;height:46px;border:2px solid white;border-radius:50% 50% 16px 50%;transform:rotate(-24deg)}
.afterMark i{width:54px;height:5px;background:rgba(255,255,255,.68);border-radius:999px;bottom:20px;left:16px}
.afterPreviewGrid strong{display:block;font-size:23px;letter-spacing:-.04em;margin-bottom:8px}
.afterPreviewGrid p{margin:0;color:#666;line-height:1.55}
.directorFlow{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.directorStep strong{display:block;font-size:18px;letter-spacing:-.03em;margin-bottom:8px}
.directorStep span{display:block;color:#666;line-height:1.55;font-size:14px}
.generateCard,.workspaceCard,.signupBox{background:white;border-radius:18px;padding:28px;border:1px solid rgba(0,0,0,.08);box-shadow:none}
.workspaceCard p{font-size:16px;line-height:1.7;color:#666}
.workspaceGrid,.workspaceLayout{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.workspaceActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
.brandList{display:flex;flex-direction:column;gap:12px;margin-top:20px}
.brandRow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:18px;padding:12px}
.brandRow button:first-child{border:none;background:transparent;text-align:left;cursor:pointer}
.brandRowLogo{width:42px;height:42px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,.08);background:white;margin-right:10px;float:left}
.brandRow strong{display:block}
.brandRow span{display:block;color:#666;margin-top:4px}
.activeBrandRow{border-color:#111}
.miniDanger{border:none;background:#111;color:white;border-radius:999px;padding:8px 10px;cursor:pointer;font-weight:800}
.emptyState{background:#fafafa;border:1px dashed rgba(0,0,0,.18);border-radius:18px;padding:18px;color:#666;margin-top:16px}
.brandDashboard{background:#111;color:white;border-radius:28px;padding:30px;margin:28px 0 30px;box-shadow:0 28px 80px rgba(0,0,0,.12)}
.brandDashboard .tinyTag{color:#ffffff}
.brandDashboardHero{display:grid;grid-template-columns:180px 1fr;gap:28px;align-items:center;padding-bottom:28px;border-bottom:1px solid rgba(255,255,255,.12)}
.brandDashboardMark{width:180px;aspect-ratio:1;border-radius:26px;background:#f5f5f5;color:#111;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(255,255,255,.12)}
.brandDashboardMark img{width:100%;height:100%;object-fit:contain;padding:18px}
.brandDashboardMark span{font-size:52px;font-weight:950;letter-spacing:-.08em}
.brandDashboardHero h2{font-size:58px;letter-spacing:-.06em;margin:0 0 12px}
.brandDashboardHero p{color:rgba(255,255,255,.72);font-size:18px;line-height:1.7;max-width:820px;margin:0}
.dashboardActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.brandDashboard .btn.light{background:white;color:#111}
.dashboardGrid{display:grid;grid-template-columns:1.3fr .7fr;gap:14px;margin-top:18px}
.dashboardPanel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:20px}
.wideDashboardPanel{grid-column:1 / -1}
.dashboardPanel>span{display:block;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffffff;font-weight:900;margin-bottom:14px}
.dashboardIdentityGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.dashboardIdentityGrid div{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px}
.dashboardIdentityGrid strong{display:block;font-size:14px;margin-bottom:7px}
.dashboardIdentityGrid p,.dashboardPanel p{color:rgba(255,255,255,.7);line-height:1.6;margin:0;font-size:14px}
.dashboardRoadmap{margin:0;padding-left:20px;color:rgba(255,255,255,.76)}
.dashboardRoadmap li{line-height:1.6;margin-bottom:10px}
.roadmapPhaseList{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.roadmapPhaseCard{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}
.roadmapPhaseCard strong{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:white;opacity:.72}
.roadmapPhaseCard h3{font-size:18px;line-height:1.1;letter-spacing:-.03em;margin:0}
.roadmapPhaseCard ul{margin:0;padding-left:18px;color:rgba(255,255,255,.72);line-height:1.5;font-size:13px}
.roadmapPhaseCard p{font-size:13px!important}
.roadmapPhaseCard small{margin-top:auto;display:inline-flex;width:max-content;background:white;color:#111;border-radius:999px;padding:7px 9px;font-size:11px;font-weight:900}
.dashboardActionList{display:flex;flex-direction:column;gap:9px}
.dashboardActionList button{background:white;color:#111;border:none;border-radius:14px;padding:12px 14px;font-weight:850;text-align:left;cursor:pointer;line-height:1.4}
.brandInsightGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.brandInsightCard{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px}
.brandInsightCard small{font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:white;font-weight:900;opacity:.68}
.brandInsightCard strong{font-size:18px;line-height:1.1}
.brandInsightCard button,.socialSetupCard button{margin-top:auto;background:white;color:#111;border:none;border-radius:14px;padding:11px 12px;font-size:13px;font-weight:900;text-align:left;line-height:1.35;cursor:pointer}
.dashboardLogoStrip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.dashboardLogoStrip button{background:white;color:#111;border:none;border-radius:16px;padding:12px;text-align:left;cursor:pointer}
.dashboardLogoStrip img{width:100%;aspect-ratio:1;object-fit:contain;border-radius:12px;background:#f5f5f5;border:1px solid rgba(0,0,0,.08);margin-bottom:10px}
.dashboardLogoStrip strong{font-size:14px}
.dashboardEmptyLogo{display:flex;align-items:center;justify-content:space-between;gap:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px}
.socialSetupGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.socialSetupCard{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:260px}
.socialSetupCard strong{font-size:20px;letter-spacing:-.03em}
.contentIdeaGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.contentIdeaGrid button{background:rgba(255,255,255,.06);color:white;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;text-align:left;cursor:pointer;display:flex;gap:10px;align-items:flex-start;min-height:112px;font-family:inherit}
.contentIdeaGrid small{font-size:11px;font-weight:900;opacity:.65}
.contentIdeaGrid span{font-size:13px;line-height:1.45;color:rgba(255,255,255,.78)}
.savedAssets{margin-top:46px}
.savedGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.savedBucket{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px}
.savedBucket h3{margin:0 0 12px}
.savedBucket p{color:#666}
.savedItem{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:12px;margin-top:10px}
.savedItem img{width:100%;border-radius:12px;margin-bottom:10px}
.savedItem button{margin-top:8px;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 10px;font-weight:800;cursor:pointer}
.conceptComparisonPanel{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:24px;margin:22px 0}
.comparisonHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:18px}
.comparisonHeader h3{font-size:28px;letter-spacing:-.04em;margin:0 0 6px}
.comparisonHeader p{color:#666;line-height:1.6;margin:0;max-width:680px}
.comparisonGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.comparisonCard{background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:16px;min-height:420px;display:flex;flex-direction:column;gap:14px}
.favoriteComparisonCard{background:white;border-color:#111;box-shadow:inset 0 0 0 1px #111}
.comparisonLabel{display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:28px}
.comparisonLabel span,.emptyComparisonCard span{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#111111;font-weight:900}
.comparisonLabel strong{background:#111;color:white;border-radius:999px;padding:6px 9px;font-size:11px;font-weight:900}
.comparisonImage{width:100%;aspect-ratio:1;background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.comparisonImage img{width:100%;height:100%;object-fit:contain;border-radius:10px}
.comparisonCopy{margin-top:auto}
.comparisonCopy h4{font-size:22px;letter-spacing:-.04em;margin:0 0 7px}
.comparisonCopy p,.emptyComparisonCard p{color:#666;line-height:1.55;margin:0}
.comparisonActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.comparisonActions button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:10px 12px;font-size:13px;font-weight:900;cursor:pointer;color:#111}
.comparisonActions button:first-child{background:#111;color:white}
.emptyComparisonCard{justify-content:center;align-items:flex-start;min-height:420px}
.logoLibraryPanel{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:22px;margin:22px 0}
.logoLibraryTop{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}
.logoLibraryTop h3{font-size:24px;letter-spacing:-.03em;margin:0 0 6px}
.logoLibraryTop p{color:#666;line-height:1.6;margin:0;max-width:620px}
.logoLibraryTop img{width:68px;height:68px;object-fit:cover;border:1px solid rgba(0,0,0,.08);border-radius:14px;background:#fafafa}
.logoLibraryGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.logoLibraryItem{background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:12px}
.activeLogoLibraryItem{border-color:#111;box-shadow:inset 0 0 0 1px #111}
.logoPreviewButton{width:100%;aspect-ratio:1;border:1px solid rgba(0,0,0,.06);border-radius:14px;background:white;padding:10px;cursor:pointer}
.logoPreviewButton img{width:100%;height:100%;object-fit:contain;border-radius:10px}
.logoLibraryItem strong{display:block;margin:10px 0;font-size:14px;line-height:1.3}
.logoLibraryItem div{display:flex;flex-wrap:wrap;gap:7px}
.logoLibraryItem div button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:7px 9px;font-size:12px;font-weight:800;cursor:pointer;color:#111}
.brandProjectTimeline{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:22px;margin:22px 0}
.timelineHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:14px}
.timelineHeader h3{font-size:24px;letter-spacing:-.03em;margin:0 0 6px}
.timelineHeader p{color:#666;line-height:1.6;margin:0;max-width:660px}
.timelineHeader span{display:inline-flex;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 11px;font-size:12px;font-weight:900;color:#111111;white-space:nowrap}
.timelineList{display:flex;flex-direction:column;gap:10px}
.timelineItem{display:grid;grid-template-columns:42px 84px 1fr auto;gap:14px;align-items:center;background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:16px;padding:12px}
.activeTimelineItem{border-color:#111;background:white;box-shadow:inset 0 0 0 1px #111}
.timelineRail{display:flex;align-items:center;justify-content:center}
.timelineRail span{width:28px;height:28px;border-radius:50%;background:#111;color:white;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900}
.timelineThumb{border:1px solid rgba(0,0,0,.08);background:white;border-radius:14px;padding:8px;aspect-ratio:1;cursor:pointer}
.timelineThumb img{width:100%;height:100%;object-fit:contain;border-radius:10px}
.timelineBody{min-width:0}
.timelineBody strong{display:block;font-size:16px;letter-spacing:-.02em;margin-bottom:4px}
.timelineBody span{display:block;color:#777;font-size:12px;font-weight:800;margin-bottom:5px}
.timelineBody p{color:#555;line-height:1.5;margin:0;font-size:13px}
.timelineActions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
.timelineActions button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 10px;font-size:12px;font-weight:900;cursor:pointer;color:#111}
.brandSystemSection{max-width:1280px;margin:0 auto;padding:40px 6vw 80px}
.systemGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px}
.systemCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:22px}
.systemCard span{font-weight:900;font-size:20px;letter-spacing:-.03em}
.systemCard p{color:#666;line-height:1.7}
.generateTop{display:flex;justify-content:space-between;gap:20px;margin-bottom:26px}
.offerBadge{background:white;border:1px solid rgba(0,0,0,.08);padding:14px 18px;border-radius:999px;font-size:13px;font-weight:700;height:fit-content}
.generatorMeta{display:flex;align-items:flex-start;justify-content:flex-end;min-width:120px;color:#777;font-size:12px;font-weight:800;text-align:right;line-height:1.4;padding-top:6px}
.generatorMeta span{max-width:150px}
.planIndicator,.planNotice,.verifyNote{margin-top:16px;font-size:13px;font-weight:700;color:#111111}
.activeBrandBar{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:14px 18px;margin-bottom:22px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.activeBrandLogo{width:38px;height:38px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,.08);background:#fafafa}
.activeBrandBar button{background:#111;color:white;border:none;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}
.brandReadinessPanel{background:#fafafa;color:#111;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:16px;margin-top:18px}
.brandReadinessTop{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
.brandReadinessTop>div{display:flex;flex-direction:column;gap:4px}
.brandReadinessPanel span{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#111111;font-weight:900}
.brandReadinessPanel strong{font-size:20px;letter-spacing:-.03em}
.brandReadinessTop>strong{font-size:32px;letter-spacing:-.05em}
.workspaceSnapshot{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}
.workspaceSnapshot div{background:white;border:1px solid rgba(0,0,0,.08);border-radius:12px;padding:12px;display:block;min-width:0}
.workspaceSnapshot span{display:block;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:#111111;font-weight:900}
.workspaceSnapshot strong{display:block;font-size:15px;letter-spacing:0;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.brandReadinessPanel p{color:#666;margin:10px 0 0;line-height:1.6}
textarea,input,select{width:100%;border-radius:24px;border:1px solid rgba(0,0,0,.08);padding:18px 20px;font-size:16px;background:#fafafa;font-family:inherit;margin-top:10px;color:#111}
textarea{height:170px;resize:none;line-height:1.6}
.workspaceFieldLabel span{display:block;font-size:11px;font-weight:900;letter-spacing:1.5px;color:#111111;text-transform:uppercase;margin:0 0 0 8px}
.advancedWorkspaceFields{margin:14px 0;border:1px solid rgba(0,0,0,.08);border-radius:14px;background:#fafafa;padding:14px}
.advancedWorkspaceFields summary{cursor:pointer;font-size:13px;font-weight:900;color:#111111;text-transform:uppercase;letter-spacing:1px}
.advancedWorkspaceFields[open]{background:white}
.generatorControls{display:grid;grid-template-columns:1fr 260px;gap:16px;margin-bottom:14px}
.hashtagsGenerator .generatorControls{grid-template-columns:1fr}
.generatorControls.singleControl{grid-template-columns:1fr}
.generatorControls label span{display:block;font-size:12px;font-weight:900;letter-spacing:1.4px;color:#111111;text-transform:uppercase;margin-left:8px}
.logoStudioFields{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-bottom:14px}
.logoStudioFields label span{display:block;font-size:12px;font-weight:900;letter-spacing:1.4px;color:#111111;text-transform:uppercase;margin-left:8px}
.logoStudioFields input,.logoStudioFields textarea{margin-top:10px}
.logoStudioNotes{grid-column:1 / -1}
.logoStudioNotes textarea{min-height:180px}
.generatorButtons{display:grid;grid-template-columns:1fr 130px;gap:12px;margin-top:16px}
.btn{border:none;border-radius:18px;padding:16px 24px;font-weight:800;cursor:pointer;font-size:15px;transition:.2s ease;display:inline-flex;align-items:center;justify-content:center}
.btn:hover{transform:translateY(-2px);opacity:.96}
.btn:disabled{cursor:not-allowed;opacity:.55;transform:none}
.btn.dark{background:#111;color:white}
.btn.light{background:white;color:#111;border:1px solid rgba(0,0,0,.08)}
.btn.full{width:100%;margin-top:18px}
.generatorFallback p{color:#666;line-height:1.7}
.generatorErrorPanel{margin-top:18px;border:1px solid rgba(180,0,0,.18);background:#fff7f7;border-radius:18px;padding:16px 18px;display:grid;gap:8px}
.generatorErrorPanel strong{font-size:15px}
.generatorErrorPanel span{color:#666;line-height:1.5}
.generatorErrorPanel button{width:max-content;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 12px;font-weight:850;cursor:pointer;color:#111}
.generatorErrorActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
.generatorErrorActions button:first-child{background:#111;color:white}
.whiteBtn{background:white;color:#111;border:none}
.logoImageBox{margin-top:26px;background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:28px;padding:22px;text-align:center}
.logoImageBox img{width:100%;max-width:420px;border-radius:22px;display:block;margin:0 auto}
.downloadLink{display:inline-flex;background:#111;color:white;text-decoration:none;padding:12px 16px;border-radius:999px;font-weight:800;margin-top:16px}
.resultMainActions{margin-top:18px}
.resultBox{margin-top:26px;background:#fafafa;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,.06)}
.resultTop{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.06)}
.resultTop span{font-size:12px;font-weight:800;letter-spacing:2px;color:#111111}
.resultActions{display:flex;gap:10px;flex-wrap:wrap}
.resultActions button,.resultTop button{background:white;border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:999px;font-weight:700;cursor:pointer;color:#111}
.resultContent{padding:24px;line-height:1.9;white-space:pre-wrap;font-size:15px}
.visualOutput{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:20px 20px 0}
.outputCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:14px;line-height:1.5;font-weight:650}
.offersSection,.pageSection{max-width:1280px;margin:0 auto;padding:40px 6vw 100px}
.offersTop{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:34px}
.toolGrid,.featureGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.toolCard,.featureCard{position:relative;overflow:hidden;background:white;padding:26px;border-radius:18px;border:1px solid rgba(0,0,0,.08);min-height:180px;transition:.25s ease;text-align:left;color:#111;font-family:inherit;cursor:pointer}
.toolCard:hover,.featureCard:hover,.activeTool{transform:translateY(-4px);box-shadow:0 18px 50px rgba(0,0,0,.08);border-color:rgba(0,0,0,.18)}
.toolCard span{position:relative;z-index:2;display:inline-flex;margin-top:16px;font-size:12px;font-weight:900;letter-spacing:.8px;color:#111111;text-transform:uppercase}
.toolGlow{position:absolute;top:-80px;right:-60px;width:180px;height:180px;background:radial-gradient(circle,#d9d9d9,transparent 70%);opacity:.8}
.toolCard p,.featureCard p{color:#666;line-height:1.7;position:relative;z-index:2}
.footerSubscribe{max-width:1280px;margin:0 auto;padding:60px 6vw 90px;border-top:1px solid rgba(0,0,0,.08);display:grid;grid-template-columns:1fr 420px;gap:40px;align-items:start}
.footerForm{background:white;border-radius:28px;padding:28px;border:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;gap:18px}
.footerSubscribe p,.footerForm span{color:#666;line-height:1.7}
.footerForm input{margin-top:0}
.footerForm .btn{margin-top:8px;width:100%}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;z-index:2000}
.signupBox{max-width:460px;width:100%}

.authBoxClean{max-width:500px}
.authSwitch{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f5f5f5;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:6px;margin-bottom:22px}
.authSwitch button{border:none;background:transparent;border-radius:999px;padding:12px 14px;font-weight:900;cursor:pointer;color:#666}
.authSwitch button.active{background:#111;color:white;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.authMessageBox{background:#fafafa;border:1px solid rgba(0,0,0,.12);border-radius:18px;padding:14px 16px;line-height:1.55}
.signupBox p{color:#666;line-height:1.7}
.seoHomeSection{max-width:1280px;margin:0 auto;padding:20px 6vw 100px}
.seoHomeSection h2{max-width:940px;margin-bottom:22px}
.seoHomeSection>p{font-size:19px;line-height:1.8;color:#666;max-width:900px}
.seoInternalLinks{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}
.seoInternalLinks button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:13px 16px;font-weight:800;cursor:pointer;color:#111}
.seoTextGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:32px}
.simpleSeoGrid{margin-top:24px}
.seoTextGrid div,.seoArticleBlock,.faqCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:28px;padding:26px}
.seoTextGrid h3,.faqCard h3{font-size:20px;margin:0 0 10px;letter-spacing:-.03em}
.seoTextGrid p,.seoArticle p,.faqCard p{color:#666;line-height:1.8}
.seoArticle{margin-top:56px;display:flex;flex-direction:column;gap:22px}
.seoArticleBlock h2{font-size:34px;margin-bottom:14px}
.brandEverywhereBlock{background:white;padding:34px;overflow:hidden}
.brandEverywhereHero{display:grid;grid-template-columns:1fr 440px;gap:34px;align-items:center}
.brandEverywhereHero h2{max-width:620px}
.brandEverywhereHero p{max-width:610px;color:#666;line-height:1.8;margin:18px 0 24px}
.brandMockupStack{position:relative;min-height:360px;background:linear-gradient(135deg,#f5f5f5,#fff);border:1px solid rgba(0,0,0,.08);border-radius:34px;padding:24px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)}
.mockBrowser{background:white;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.08)}
.mockBrowserTop{display:flex;gap:6px;margin-bottom:16px}
.mockBrowserTop span{width:8px;height:8px;border-radius:50%;background:#ddd}
.mockBrowserNav{display:flex;justify-content:space-between;gap:14px;align-items:center;border-bottom:1px solid rgba(0,0,0,.06);padding-bottom:14px;margin-bottom:20px}
.mockBrowserNav strong{font-size:22px;letter-spacing:-.05em}
.mockBrowserNav small{color:#777;font-weight:800}
.mockHeroLine{height:28px;width:80%;background:#111;border-radius:999px;margin-bottom:12px}
.mockHeroLine.short{width:54%;height:18px;background:#d9d9d9}
.mockButton{width:120px;height:38px;background:#111;border-radius:999px;margin-top:24px}
.mockSocialCard{position:absolute;left:38px;bottom:36px;background:#111;color:white;border-radius:24px;padding:16px 18px;display:flex;gap:12px;align-items:center;box-shadow:0 20px 50px rgba(0,0,0,.18)}
.mockAvatar{width:46px;height:46px;border-radius:50%;background:white;color:#111;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px}
.mockSocialCard span{display:block;color:rgba(255,255,255,.68);font-size:13px;margin-top:3px}
.mockKitCard{position:absolute;right:26px;bottom:26px;background:white;border:1px solid rgba(0,0,0,.08);border-radius:22px;padding:18px;width:150px;box-shadow:0 20px 50px rgba(0,0,0,.08)}
.mockKitCard span{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#111111;font-weight:900}
.mockSwatches{display:flex;gap:8px;margin-top:16px}
.mockSwatches i{width:26px;height:26px;border-radius:50%;background:#111;display:block}
.mockSwatches i:nth-child(2){background:#d9d9d9}.mockSwatches i:nth-child(3){background:#f5f5f5;border:1px solid rgba(0,0,0,.08)}
.brandTouchpointGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}
.brandTouchpoint{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:24px;padding:22px}
.brandTouchpoint span{font-size:11px;letter-spacing:2px;color:#111111;font-weight:900}
.brandTouchpoint h3{font-size:21px;margin:12px 0 8px;letter-spacing:-.04em}
.brandTouchpoint p{font-size:15px;color:#666;line-height:1.65;margin:0}
.creativeDirectionsBlock{padding:34px;background:#fff}
.creativeDirectionsTop{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:end;margin-bottom:24px}
.creativeDirectionsTop p{margin:0;color:#666;line-height:1.7}
.creativeDirectionGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.creativeDirectionCard{background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:22px;text-align:left;color:#111;cursor:pointer;display:flex;flex-direction:column;gap:12px;min-height:205px;transition:.2s ease;font-family:inherit}
.creativeDirectionCard:hover{transform:translateY(-3px);box-shadow:0 18px 44px rgba(0,0,0,.08);border-color:rgba(0,0,0,.18);background:#fff}
.cleanDirectionCard{position:relative;overflow:hidden}
.cleanDirectionCard:before{content:"";position:absolute;left:22px;right:22px;top:0;height:3px;background:#111;border-radius:0 0 999px 999px;opacity:.9}
.directionKicker{font-size:10px;line-height:1.4;letter-spacing:1.8px;text-transform:uppercase;color:#111111;font-weight:900;min-height:28px;display:block;padding-top:6px}
.creativeDirectionCard h3{font-size:22px;letter-spacing:-.05em;margin:4px 0 0}
.creativeDirectionCard p{font-size:14px;line-height:1.6;margin:0;color:#666}
.directionApply{margin-top:auto;display:inline-flex;width:max-content;border:1px solid rgba(0,0,0,.1);background:white;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;color:#111}
.useCaseGrid,.faqGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
.useCaseCard{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:22px;padding:20px}
.useCaseCard span{font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#111111;font-weight:900}
.useCaseCard h3{font-size:20px;margin:10px 0 8px;letter-spacing:-.03em}
.useCaseCard p{font-size:15px;margin:0;color:#666;line-height:1.65}
.faqCompact .faqGrid{grid-template-columns:repeat(3,1fr)}
.faqCompact .faqCard{background:#fafafa;box-shadow:none}

.toolResultsV2 .toolSubline{
  color:#666;
  line-height:1.6;
  margin-top:10px;
}

.exampleChips{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin:10px 0 18px;
}

.exampleChips button{
  background:#fff;
  border:1px solid rgba(0,0,0,.08);
  border-radius:999px;
  padding:11px 14px;
  font-weight:800;
  font-size:13px;
  cursor:pointer;
  color:#111;
}

.exampleChips button:hover{
  background:#111;
  color:white;
}


.freeTypeControls input{
  margin-top:10px;
  background:#fafafa;
}

.mainPromptBox{
  min-height:190px;
  font-size:17px;
}

.smartPromptSuggestions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 2px}
.smartPromptSuggestions button{background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 11px;color:#555;font-size:12px;font-weight:850;cursor:pointer;transition:.18s ease}
.smartPromptSuggestions button:hover{background:#111;color:white;border-color:#111;transform:translateY(-1px)}
.logoCreatorGuide{background:#111;color:white;border-radius:24px;padding:24px;margin-bottom:18px}
.logoGuideIntro{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;margin-bottom:20px}
.logoGuideIntro h3{font-size:32px;line-height:1;letter-spacing:-.04em;margin:0 0 10px}
.logoGuideIntro p{color:rgba(255,255,255,.72);line-height:1.65;margin:0;max-width:720px}
.logoGuideIntro>span{display:inline-flex;white-space:nowrap;border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;color:white;background:rgba(255,255,255,.08)}
.logoGuideGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.logoGuideColumn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px}
.logoGuideColumn strong{display:block;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:12px;color:rgba(255,255,255,.7)}
.logoGuideColumn div{display:flex;flex-wrap:wrap;gap:8px}
.logoGuideColumn button{background:white;color:#111;border:none;border-radius:999px;padding:8px 10px;font-size:12px;font-weight:900;cursor:pointer}
.logoQualityGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}
.logoQualityGrid div{border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px;background:rgba(255,255,255,.04)}
.logoQualityGrid strong{display:block;margin-bottom:6px}
.logoQualityGrid p{color:rgba(255,255,255,.7);line-height:1.5;font-size:13px;margin:0}

.toolResultsV2 textarea.mainPromptBox::placeholder,
.toolResultsV2 input::placeholder{
  color:#777;
}

.premiumLoading{
  margin-top:20px;
  background:#fafafa;
  border:1px solid rgba(0,0,0,.08);
  border-radius:22px;
  padding:18px;
  display:flex;
  gap:14px;
  align-items:center;
}

.premiumLoading span{
  display:block;
  color:#666;
  margin-top:4px;
  font-size:14px;
}

.loadingPulse{
  width:18px;
  height:18px;
  border-radius:50%;
  background:#111;
  animation:pulseBrandthat 1.2s infinite ease-in-out;
}

@keyframes pulseBrandthat{
  0%{transform:scale(.8);opacity:.45}
  50%{transform:scale(1.25);opacity:1}
  100%{transform:scale(.8);opacity:.45}
}


.logoLoadingV3{align-items:flex-start}
.logoLoadingSteps{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.logoLoadingSteps span{display:inline-flex!important;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 10px;color:#555!important;font-size:12px!important;font-weight:800}
.logoResultGrid{grid-template-columns:repeat(2,1fr)}
.logoResultGrid .premiumResultCard{min-height:150px}
.logoConceptDirections{margin-top:22px;background:#fffdf8;border:1px solid rgba(17,17,15,.1);border-radius:24px;padding:22px}
.logoConceptDirections h3{margin:4px 0 0;font-size:32px;letter-spacing:-.06em}
.logoConceptGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}
.logoConceptCard{display:grid;gap:12px;background:#f8f5ef;border:1px solid rgba(17,17,15,.1);border-radius:18px;padding:14px}
.logoConceptPreview{background:#fffdf8;border:1px solid rgba(17,17,15,.08);border-radius:14px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;overflow:hidden}
.logoConceptPreview img{width:100%;height:100%;object-fit:contain;padding:12px}
.logoConceptCard>span{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#806546;font-weight:900}
.logoConceptCard h4{margin:0;font-size:22px;letter-spacing:-.05em}
.logoConceptCard p,.logoConceptCard dd{margin:0;color:#5d554d;line-height:1.4}
.logoConceptCard dl{margin:0;display:grid;gap:6px}
.logoConceptCard dt{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#806546;font-weight:900}
.logoConceptActions{display:flex;gap:8px;flex-wrap:wrap}
.logoConceptActions button{border:1px solid rgba(17,17,15,.12);border-radius:999px;background:#fffdf8;color:#11110f;padding:8px 10px;font-weight:850}
.logoResultGrid .featuredResultCard{grid-row:span 1}
.logoShowcase{
  margin-top:34px;
  display:grid;
  grid-template-columns:minmax(420px,1.35fr) minmax(280px,.65fr);
  gap:24px;
  align-items:stretch;
  animation:logoReveal .52s cubic-bezier(.2,.7,.2,1) both;
  transform-origin:center top;
}

@keyframes logoReveal{
  0%{opacity:0;transform:translateY(18px) scale(.985)}
  100%{opacity:1;transform:translateY(0) scale(1)}
}

.logoFrame{
  background:linear-gradient(180deg,#fafafa,#f2f2f2);
  border:1px solid rgba(0,0,0,.08);
  border-radius:30px;
  min-height:620px;
  padding:44px;
  display:flex;
  align-items:center;
  justify-content:center;
  box-shadow:0 28px 90px rgba(0,0,0,.06);
}

.logoFrame img{
  width:100%;
  max-width:720px;
  max-height:720px;
  object-fit:contain;
  border-radius:18px;
  box-shadow:0 22px 70px rgba(0,0,0,.08);
  animation:logoImageSettle .7s .08s cubic-bezier(.2,.7,.2,1) both;
}

@keyframes logoImageSettle{
  0%{opacity:0;transform:scale(.94)}
  100%{opacity:1;transform:scale(1)}
}

.brandPreviewCard{
  background:#111;
  color:white;
  border-radius:30px;
  padding:34px;
  display:flex;
  flex-direction:column;
  justify-content:flex-start;
  box-shadow:0 28px 90px rgba(0,0,0,.12);
}

.brandPreviewCard .tinyTag{
  color:#ffffff;
}

.logoSourceBadge{
  display:inline-flex;
  width:max-content;
  border:1px solid rgba(255,255,255,.24);
  border-radius:999px;
  padding:8px 11px;
  color:white;
  font-size:12px;
  font-weight:900;
  margin-bottom:18px;
}

.logoSourceBadge.instant{
  background:#fff;
  color:#111;
}

.brandPreviewCard h3{
  font-size:36px;
  line-height:1;
  letter-spacing:-.04em;
  margin:0 0 14px;
}

.brandPreviewCard p{
  color:rgba(255,255,255,.72);
  line-height:1.7;
}

.creativeDirectorNotes{
  border-top:1px solid rgba(255,255,255,.12);
  border-bottom:1px solid rgba(255,255,255,.12);
  padding:18px 0;
  margin:22px 0 4px;
  display:flex;
  flex-direction:column;
  gap:14px;
}

.creativeDirectorNotes .tinyTag{
  color:#ffffff;
  margin-bottom:2px;
}

.directorNoteRow{
  display:grid;
  grid-template-columns:92px 1fr;
  gap:14px;
  align-items:start;
}

.directorNoteRow strong{
  font-size:12px;
  color:white;
  letter-spacing:.4px;
}

.directorNoteRow span{
  color:rgba(255,255,255,.7);
  line-height:1.55;
  font-size:14px;
}

@media(max-width:820px){
  .directorNoteRow{grid-template-columns:1fr;gap:4px}
  .logoFrame{padding:24px}
  .kitEditorialGrid,.kitUsageRow{grid-template-columns:1fr}
  .kitAssetPair{width:100%;justify-content:flex-start;flex-wrap:wrap}
  .lightBrandKitTop{flex-direction:column}
}

.brandPreviewCard .resultActions button{
  background:white;
  color:#111;
}

.lightBrandKit{
  margin-top:24px;
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:30px;
  padding:28px;
  box-shadow:0 24px 70px rgba(0,0,0,.04);
}

.lightBrandKitTop{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:18px;
  margin-bottom:24px;
}

.lightBrandKitTop h3{
  font-size:30px;
  letter-spacing:-.04em;
  margin:0;
}

.lightBrandKitTop>span{
  border:1px solid rgba(0,0,0,.08);
  border-radius:999px;
  padding:9px 12px;
  font-size:12px;
  font-weight:900;
  color:#555;
}

.kitEditorialGrid{
  display:grid;
  grid-template-columns:1fr 1fr 1.15fr 1.3fr;
  gap:16px;
}

.kitColorColumn,.kitTypeColumn,.kitDirectionColumn{
  border-top:1px solid rgba(0,0,0,.1);
  padding-top:16px;
  min-height:145px;
}

.kitColorColumn>span,.kitTypeColumn>span,.kitDirectionColumn>span{
  display:block;
  color:#111111;
  font-size:11px;
  font-weight:900;
  letter-spacing:1.6px;
  text-transform:uppercase;
  margin-bottom:12px;
}

.kitSwatches{
  display:flex;
  gap:9px;
  margin-bottom:14px;
}

.kitSwatches i{
  width:34px;
  height:34px;
  border-radius:50%;
  border:1px solid rgba(0,0,0,.1);
  display:block;
}

.kitColorColumn small,.kitTypeColumn small{
  color:#666;
  line-height:1.5;
}

.kitTypeColumn strong{
  display:block;
  font-size:20px;
  letter-spacing:-.03em;
  margin-bottom:4px;
}

.kitTypeColumn p,.kitDirectionColumn p{
  color:#666;
  line-height:1.65;
  margin:12px 0 0;
  font-size:14px;
}

.kitUsageRow{
  display:grid;
  grid-template-columns:1fr auto;
  gap:22px;
  align-items:end;
  margin-top:26px;
  border-top:1px solid rgba(0,0,0,.08);
  padding-top:22px;
}

.kitUsageExamples{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}

.kitUsageExamples span{
  background:#fafafa;
  border:1px solid rgba(0,0,0,.08);
  border-radius:999px;
  padding:10px 12px;
  font-size:13px;
  font-weight:800;
}

.kitAssetPair{
  display:flex;
  gap:14px;
}

.kitAssetPair div{
  width:122px;
  text-align:center;
}

.kitAssetPair img{
  width:86px;
  height:86px;
  object-fit:cover;
  border-radius:22px;
  border:1px solid rgba(0,0,0,.08);
  background:#fafafa;
  display:block;
  margin:0 auto 9px;
}

.kitAssetPair button{
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:999px;
  padding:8px 10px;
  font-size:12px;
  font-weight:900;
  cursor:pointer;
  color:#111;
}

@media(max-width:820px){
  .kitEditorialGrid,.kitUsageRow{grid-template-columns:1fr}
  .kitAssetPair{width:100%;justify-content:flex-start;flex-wrap:wrap}
  .lightBrandKitTop{flex-direction:column}
}

.logoActionStack{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:10px;
  margin-top:22px;
}

.logoActionStack button{
  background:white;
  color:#111;
  border:1px solid rgba(255,255,255,.2);
  border-radius:999px;
  padding:11px 15px;
  font-weight:900;
  cursor:pointer;
}

.logoActionStack .downloadLink{
  background:white;
  color:#111;
  border:none;
  text-decoration:none;
  margin-top:0;
}

.logoMoreActions{
  display:flex;
  flex-direction:column;
  gap:8px;
}

.logoMoreActions summary{
  cursor:pointer;
  background:rgba(255,255,255,.1);
  color:white;
  border:1px solid rgba(255,255,255,.2);
  border-radius:999px;
  padding:11px 15px;
  font-weight:900;
  width:max-content;
}

.logoMoreActions[open]{
  display:flex;
}

.logoMoreActions button{
  display:block;
  margin-top:8px;
}

.logoGenerationDetails{
  margin-top:18px;
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:22px;
  padding:16px 18px;
}

.logoGenerationDetails summary{
  cursor:pointer;
  font-weight:900;
}

.logoGenerationDetails div{
  margin-top:14px;
  color:#555;
  line-height:1.7;
  white-space:pre-wrap;
}

.creativeDirectorPanel,.logoVariantPanel,.recentLogoStrip{
  margin-top:20px;
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:24px;
  padding:20px;
}

.logoPromptFirstBox{
  min-height:230px;
}

.advancedLogoOptions{
  margin-top:14px;
  border:1px solid rgba(0,0,0,.08);
  border-radius:22px;
  background:#fafafa;
  padding:6px;
}

.advancedLogoOptions summary{
  cursor:pointer;
  padding:12px 14px;
  font-weight:900;
  color:#111;
}

.advancedLogoOptions[open] summary{
  border-bottom:1px solid rgba(0,0,0,.06);
  margin-bottom:12px;
}

.logoAdvancedGrid{
  grid-template-columns:repeat(2,1fr);
  padding:0 10px 10px;
}

.brandUnderstoodPanel{
  margin-top:14px;
  background:#111;
  color:white;
  border-radius:22px;
  padding:18px;
  display:grid;
  grid-template-columns:220px 1fr;
  gap:16px;
  align-items:center;
}

.brandUnderstoodPanel span{
  display:block;
  color:#ffffff;
  font-size:11px;
  letter-spacing:1.5px;
  text-transform:uppercase;
  font-weight:900;
  margin-bottom:7px;
}

.brandUnderstoodPanel strong{
  font-size:20px;
  letter-spacing:-.03em;
}

.brandUnderstoodPanel p{
  margin:0;
  color:rgba(255,255,255,.82);
  line-height:1.5;
  font-weight:800;
}

.brandUnderstoodPanel small{
  display:block;
  color:rgba(255,255,255,.58);
  margin-top:6px;
  font-weight:750;
}

.brandJourneyPanel{
  margin-top:20px;
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:26px;
  padding:22px;
}

.brandJourneyTop{
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:flex-start;
  margin-bottom:18px;
}

.brandJourneyTop h3{
  font-size:26px;
  line-height:1.05;
  letter-spacing:-.04em;
  margin:0;
}

.brandJourneyTop p{
  max-width:640px;
  margin:10px 0 0;
  color:#555;
  line-height:1.55;
  font-size:15px;
}

.brandJourneyTop>span{
  background:#111;
  border:1px solid #111;
  border-radius:999px;
  padding:9px 12px;
  font-size:12px;
  font-weight:900;
  color:white;
  white-space:nowrap;
}

.brandJourneySteps{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:12px;
}

.brandJourneySteps div{
  background:#fafafa;
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  padding:14px;
}

.brandJourneySteps strong{
  display:block;
  margin-bottom:8px;
}

.brandJourneySteps p{
  margin:0;
  color:#666;
  line-height:1.45;
  font-size:13px;
}

.brandJourneyActions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:16px;
}

.logoRefinePanel{
  margin-top:20px;
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:24px;
  padding:20px;
}

.logoRefinePanel h3{
  margin:0 0 8px;
  font-size:24px;
  letter-spacing:-.03em;
}

.logoRefinePanel p{
  color:#666;
  line-height:1.6;
  margin:0 0 14px;
}

.refinementState{
  display:inline-flex;
  margin-bottom:14px;
  border:1px solid rgba(0,0,0,.08);
  background:#fafafa;
  color:#555;
  border-radius:999px;
  padding:9px 12px;
  font-size:12px;
  font-weight:900;
}

.logoRefinePanel textarea{
  min-height:110px;
}

.logoRefineActions{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-top:12px;
}

.logoRefineActions button{
  border:1px solid rgba(0,0,0,.08);
  background:#fafafa;
  color:#111;
  border-radius:999px;
  padding:10px 13px;
  font-weight:900;
  cursor:pointer;
}

.logoRefineActions button:first-child{
  background:#111;
  color:white;
}

.creativeDirectorTop{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:flex-start;
  margin-bottom:10px;
}

.creativeDirectorTop h3{
  margin:0;
  font-size:24px;
  letter-spacing:-.03em;
}

.creativeDirectorTop span,.creativeDirectorSummary{
  color:#666;
  line-height:1.6;
  font-weight:750;
}

.brandStrategyStrip{
  margin-top:14px;
  background:#fafafa;
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  padding:16px;
}

.brandStrategyStrip span{
  display:block;
  font-size:11px;
  font-weight:900;
  letter-spacing:1.5px;
  color:#111111;
  text-transform:uppercase;
  margin-bottom:8px;
}

.brandStrategyStrip p{
  margin:0 0 8px;
  color:#111;
  font-weight:850;
  line-height:1.5;
}

.brandStrategyStrip small{
  color:#666;
  line-height:1.55;
  font-weight:750;
}

.creativeDirectorActions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin:16px 0;
}

.creativeDirectorActions button,.directionReasonCard button{
  border:1px solid rgba(0,0,0,.08);
  background:#fafafa;
  color:#111;
  border-radius:999px;
  padding:10px 13px;
  font-weight:900;
  cursor:pointer;
}

.directionReasonGrid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
}

.directionReasonCard{
  background:#fafafa;
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  padding:16px;
}

.directionReasonCard span{
  display:block;
  font-weight:900;
  letter-spacing:-.02em;
  margin-bottom:10px;
}

.directionReasonCard p{
  color:#555;
  line-height:1.55;
  margin:8px 0;
  font-size:14px;
}

.logoVariantPanel summary,.recentLogoStrip summary{
  cursor:pointer;
  font-weight:900;
  font-size:16px;
}

.logoVariantPanel[open] summary,.recentLogoStrip[open] summary{
  margin-bottom:16px;
}

.recentLogoHeader{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  margin-bottom:16px;
}

.recentLogoHeader h3{
  margin:0;
  font-size:24px;
  letter-spacing:-.03em;
}

.recentLogoHeader span{
  color:#666;
  font-weight:800;
  font-size:13px;
}

.logoVariantGrid,.recentLogoGrid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px;
}

.logoEditorGrid{
  display:grid;
  grid-template-columns:minmax(260px,.9fr) 1.1fr;
  gap:16px;
  margin-bottom:18px;
}

.logoEditorPreview{
  background:#f5f5f5;
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  min-height:280px;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
}

.logoEditorPreview img{
  width:100%;
  max-height:320px;
  object-fit:contain;
}

.logoEditorControls{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
  align-content:start;
}

.logoEditorControls label span{
  display:block;
  font-size:11px;
  font-weight:900;
  letter-spacing:1.4px;
  color:#111111;
  text-transform:uppercase;
  margin-left:8px;
}

.logoEditorControls input[type="color"]{
  height:58px;
  padding:8px;
}

.logoEditorActions{
  grid-column:1 / -1;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin-top:4px;
}

.logoEditorActions button{
  background:#111;
  color:white;
  border:none;
  border-radius:999px;
  padding:11px 14px;
  font-weight:900;
  cursor:pointer;
}

.logoVariantCard{
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  background:#fafafa;
  min-height:210px;
  padding:14px;
  cursor:pointer;
  text-align:left;
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  color:#111;
  font-family:inherit;
}

.logoVariantCard span,.recentLogoCard span{
  color:#111111;
  font-size:11px;
  font-weight:900;
  letter-spacing:1.4px;
  text-transform:uppercase;
}

.logoVariantCard img{
  width:100%;
  max-height:150px;
  object-fit:contain;
  margin:auto;
  border-radius:12px;
}

.logoVariantCard.iconOnly img{
  aspect-ratio:1;
  border-radius:50%;
  background:white;
  padding:12px;
}

.logoVariantCard.wordmark{
  background:#111;
  color:white;
}

.logoVariantCard.wordmark strong{
  font-size:30px;
  letter-spacing:-.05em;
  line-height:1;
}

.logoVariantCard.social div{
  width:132px;
  height:132px;
  border-radius:50%;
  overflow:hidden;
  background:white;
  margin:auto;
  border:1px solid rgba(0,0,0,.08);
  display:flex;
  align-items:center;
  justify-content:center;
}

.logoVariantCard.social img{
  width:118px;
  height:118px;
  object-fit:contain;
}

.recentLogoCard{
  background:#fafafa;
  border:1px solid rgba(0,0,0,.08);
  border-radius:18px;
  padding:12px;
}

.recentLogoThumb{
  border:1px solid rgba(0,0,0,.06);
  border-radius:14px;
  background:white;
  width:100%;
  aspect-ratio:1;
  padding:10px;
  cursor:pointer;
}

.recentLogoThumb img{
  width:100%;
  height:100%;
  object-fit:contain;
}

.recentLogoCard strong{
  display:block;
  margin:10px 0 4px;
}

.recentLogoCard div{
  display:flex;
  gap:7px;
  flex-wrap:wrap;
  margin-top:10px;
}

.recentLogoCard button:not(.recentLogoThumb){
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:999px;
  padding:8px 10px;
  font-weight:900;
  cursor:pointer;
}

.premiumResults{
  background:white;
}

.resultCardGrid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:16px;
  padding:22px;
}

.premiumResultCard{
  background:#fafafa;
  border:1px solid rgba(0,0,0,.08);
  border-radius:24px;
  padding:20px;
  min-height:170px;
}

.resultCardTop{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:14px;
}

.resultCardTop span{
  font-size:11px;
  letter-spacing:1.6px;
  font-weight:900;
  color:#111111;
}

.resultCardTop button{
  background:white;
  border:1px solid rgba(0,0,0,.08);
  border-radius:999px;
  padding:7px 10px;
  font-weight:800;
  cursor:pointer;
}

.premiumResultCard h3{
  font-size:22px;
  letter-spacing:-.03em;
  margin:0 0 10px;
}

.premiumResultCard p{
  color:#555;
  line-height:1.7;
  white-space:pre-wrap;
}

.fullOutputDetails{
  border-top:1px solid rgba(0,0,0,.08);
  padding:18px 22px;
}

.fullOutputDetails summary{
  font-weight:900;
  cursor:pointer;
}


.savedCloudNotice{background:#111;color:white;border-radius:22px;padding:16px 18px;margin-bottom:18px;line-height:1.6}
.savedCloudNotice strong{display:block;margin-bottom:4px}
.accountSaveBadge{display:inline-flex;align-items:center;gap:8px;background:#f2f2f2;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;color:#111111;margin-top:10px}

.appNotice{max-width:1180px;margin:18px auto 0;padding:16px 48px 16px 18px;border-radius:20px;border:1px solid rgba(0,0,0,.08);background:white;box-shadow:0 18px 45px rgba(0,0,0,.08);position:relative;display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.appNotice strong{font-size:15px}
.appNotice span{color:#666;line-height:1.5}
.appNotice button{position:absolute;right:14px;top:11px;border:none;background:transparent;font-size:22px;cursor:pointer;color:#111}
.appNotice.error,.appNotice.warning,.appNotice.success{border-color:rgba(0,0,0,.16);background:#fafafa}
.checkoutResumeBanner{max-width:1180px;margin:18px auto 0;padding:16px 18px;border-radius:20px;background:#111;color:white;display:flex;align-items:center;justify-content:space-between;gap:18px;box-shadow:0 18px 45px rgba(0,0,0,.14)}
.checkoutResumeBanner strong{display:block;font-size:15px;margin-bottom:4px}
.checkoutResumeBanner span{color:rgba(255,255,255,.72);line-height:1.45}
.checkoutResumeBanner button{border:1px solid #fff;background:#fff;color:#111;border-radius:999px;padding:12px 16px;font-weight:900;white-space:nowrap}
.checkoutResumeBanner button:disabled{opacity:.7;cursor:not-allowed}
@media(max-width:720px){.checkoutResumeBanner{margin:14px 16px 0;align-items:stretch;flex-direction:column}.checkoutResumeBanner button{width:100%}}
.autoSavePill{display:inline-flex;margin:-10px 0 16px;padding:9px 12px;border-radius:999px;background:#fafafa;border:1px solid rgba(0,0,0,.08);font-size:12px;font-weight:900;color:#111111}
.brandRowActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.brandRowActions button{border:none;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 10px;font-weight:800;cursor:pointer;color:#111}
.recentPanel,.favoritePanel{background:white;border:1px solid rgba(0,0,0,.08);border-radius:28px;padding:24px;margin:22px 0}
.recentPanel{display:grid;grid-template-columns:280px 1fr;gap:18px;align-items:start}
.recentPanel h3,.favoritePanel h3{margin:0 0 8px;font-size:24px;letter-spacing:-.03em}
.recentPanel p{color:#666;line-height:1.6;margin:0}
.recentList{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
.recentList button{background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:13px;text-align:left;cursor:pointer;color:#111}
.recentList strong{display:block;margin-bottom:5px}
.recentList span{font-size:13px;color:#666}
.compactSavedGrid{margin-top:12px}
.savedItem p{font-size:13px;line-height:1.6;color:#666;margin:8px 0 0}
.savedItemActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
.savedItemActions button{margin-top:0}
.toolResultsV2 .toolSubline{color:#666;line-height:1.6;margin-top:10px;max-width:540px}
.freeTypeControls input{margin-top:10px}
.mainPromptBox{min-height:190px}
.premiumLoading{margin-top:20px;background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:22px;padding:18px;display:flex;gap:14px;align-items:center}
.premiumLoading span{display:block;color:#666;margin-top:4px;font-size:14px}.loadingPulse{width:18px;height:18px;border-radius:50%;background:#111;animation:pulseBrandthat 1.2s infinite ease-in-out}
@keyframes pulseBrandthat{0%{transform:scale(.8);opacity:.45}50%{transform:scale(1.25);opacity:1}100%{transform:scale(.8);opacity:.45}}
.premiumResults{background:white}.resultCardGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:22px}.premiumResultCard{background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:20px;min-height:170px}.featuredResultCard{background:#111;color:white}.featuredResultCard p{color:rgba(255,255,255,.74)!important}.resultCardTop{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.resultCardTop span{font-size:11px;letter-spacing:1.6px;font-weight:900;color:#111111}.resultCardTop div{display:flex;gap:8px}.resultCardTop button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:7px 10px;font-weight:800;cursor:pointer}.premiumResultCard h3{font-size:22px;letter-spacing:-.03em;margin:0 0 10px}.premiumResultCard p{color:#555;line-height:1.7;white-space:pre-wrap}.fullOutputDetails{border-top:1px solid rgba(0,0,0,.08);padding:18px 22px}.fullOutputDetails summary{font-weight:900;cursor:pointer}


.simpleHashtagResult .resultTop{align-items:center}
.hashtagSingleBox{padding:30px;background:#111;color:white;border-radius:0 0 24px 24px}
.hashtagSingleBox .tinyTag{color:#ffffff;margin-bottom:14px}
.hashtagSingleBox p{font-size:22px;line-height:1.9;margin:0;white-space:pre-wrap;word-break:break-word;color:white}

.captionListBox{padding:22px;display:flex;flex-direction:column;gap:12px}
.captionOptionRow{display:grid;grid-template-columns:44px 1fr auto;gap:14px;align-items:start;background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:16px}
.captionNumber{width:34px;height:34px;border-radius:50%;background:#111;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
.captionOptionRow p{margin:4px 0 0;color:#333;line-height:1.65;font-size:15px;white-space:pre-wrap}
.captionOptionRow button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer;color:#111}

.birthPage{background:#f8f5ef;color:#111;overflow:hidden}
.birthPage h1,.birthPage h2,.birthPage h3{letter-spacing:-.065em}
.birthHero{min-height:calc(100vh - 84px);display:grid;grid-template-columns:minmax(0,.92fr) minmax(420px,1.08fr);gap:5vw;align-items:center;max-width:1480px;margin:0 auto;padding:72px 6vw 86px}
.birthHeroCopy h1{font-size:clamp(76px,10.4vw,166px);line-height:.82;margin:0 0 26px;max-width:860px}
.birthHeroCopy p{font-size:clamp(20px,2vw,31px);line-height:1.18;color:#3c3732;max-width:740px;margin:0}
.birthHeroActions{display:flex;align-items:center;gap:18px;margin-top:32px;flex-wrap:wrap}
.birthCta,.priceStatement button{border:none;background:#111;color:white;border-radius:999px;padding:17px 24px;font-size:15px;font-weight:950;cursor:pointer;box-shadow:0 18px 42px rgba(17,17,17,.16)}
.birthCta:hover,.priceStatement button:hover{transform:translateY(-2px);background:#ff5a3d;color:#111}
.birthHeroActions span{color:#6b625b;font-size:14px;font-weight:850}
.birthHeroVisual{min-height:660px;position:relative;border-radius:44px;background:#111;color:white;padding:28px;box-shadow:0 50px 130px rgba(17,17,17,.2);display:grid;grid-template-rows:auto 1fr auto;gap:20px;overflow:hidden}
.birthHeroVisual:before{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 22%,rgba(255,90,61,.28),transparent 26%),linear-gradient(145deg,rgba(255,255,255,.08),transparent 42%);pointer-events:none}
.founderNote{position:relative;z-index:1;border:none;background:#f8f5ef;color:#111;border-radius:28px;padding:24px;text-align:left;cursor:pointer;font-family:inherit}
.founderNote span,.birthOffer span,.priceStatement span{display:block;font-size:11px;letter-spacing:1.7px;text-transform:uppercase;font-weight:950;color:#ff5a3d;margin-bottom:12px}
.founderNote p{font-size:28px;line-height:1.12;letter-spacing:-.045em;font-weight:850;margin:0}
.thinkingColumn{position:relative;z-index:1;display:flex;flex-direction:column;justify-content:center;gap:12px;width:min(420px,78%);margin-left:auto}
.thinkingColumn span{border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.08);padding:13px 16px;color:rgba(255,255,255,.84);font-size:14px;font-weight:900;animation:birthStep .65s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--birth-step) * .11s)}
.brandSignal{position:relative;z-index:1;background:#ff5a3d;color:#111;border-radius:32px;padding:28px;min-height:210px;display:flex;flex-direction:column;justify-content:flex-end}
.brandSignal small{font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:1.7px}
.brandSignal strong{font-size:clamp(56px,7vw,104px);line-height:.82;letter-spacing:-.08em;margin-top:18px}
.brandSignal em{font-style:normal;font-size:18px;font-weight:850;margin-top:12px}
.originMoment{max-width:1480px;margin:0 auto;padding:88px 6vw 78px;display:grid;grid-template-columns:1.1fr .9fr;gap:5vw;align-items:end}
.originLine p{font-family:Georgia,serif;font-size:clamp(42px,6.3vw,102px);line-height:.98;letter-spacing:-.055em;margin:0;color:#111}
.originAnnotations{display:grid;gap:16px}
.originAnnotations article{border-top:1px solid rgba(17,17,17,.18);padding-top:18px}
.originAnnotations strong{display:block;font-size:24px;letter-spacing:-.045em;margin-bottom:8px}
.originAnnotations span{display:block;color:#5d554d;line-height:1.55;font-size:17px}
.brandAwakening{max-width:1480px;margin:0 auto;padding:84px 6vw;display:grid;grid-template-columns:.78fr 1.22fr;gap:5vw;align-items:center}
.awakeningCopy h2,.worldCopy h2,.launchSequence h2,.workspaceManifesto h2,.birthOffer h2,.birthBuilder h2{font-size:clamp(48px,6vw,98px);line-height:.88;margin:0}
.awakeningCopy p,.worldCopy p,.workspaceManifesto p,.birthOffer p,.birthBuilder p{font-size:20px;line-height:1.45;color:#514a43;max-width:640px}
.awakeningBoard{display:grid;grid-template-columns:1.2fr .8fr;gap:16px}
.thesisSpread,.voiceSpread,.identitySpread{background:#fff;border-radius:34px;padding:28px;min-height:260px;box-shadow:0 26px 70px rgba(17,17,17,.06)}
.thesisSpread{grid-column:1 / -1;background:#111;color:white;min-height:340px;display:flex;flex-direction:column;justify-content:space-between}
.thesisSpread span,.voiceSpread span,.identitySpread span{font-size:11px;letter-spacing:1.7px;text-transform:uppercase;font-weight:950;color:#ff5a3d}
.thesisSpread h3{font-size:clamp(34px,4.8vw,74px);line-height:.95;margin:42px 0 0;color:white}
.voiceSpread p{font-size:27px;line-height:1.1;letter-spacing:-.045em;margin:54px 0 0;font-weight:850}
.identitySpread{display:grid;gap:20px}
.typeSpec{font-family:Georgia,serif;font-size:38px;line-height:.95;margin-top:28px}
.typeSpec small{font-family:Inter,system-ui,sans-serif;font-size:16px;letter-spacing:0;color:#5b524a}
.colorRun{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:auto}
.colorRun i{height:72px;border-radius:16px;background:#111}.colorRun i:nth-child(2){background:#f8f5ef}.colorRun i:nth-child(3){background:#8b4c34}.colorRun i:nth-child(4){background:#ff5a3d}
.worldShowcase{max-width:1480px;margin:0 auto;padding:96px 6vw;display:grid;gap:36px}
.worldCopy{max-width:860px}
.brandWorldGrid{display:grid;grid-template-columns:1.35fr .75fr .9fr;grid-auto-rows:minmax(230px,auto);gap:18px}
.brandWorldGrid>div{border-radius:38px;overflow:hidden;position:relative;box-shadow:0 32px 90px rgba(17,17,17,.08)}
.canScene{grid-row:span 2;background:linear-gradient(155deg,#18120f,#7b422f);display:grid;place-items:center;min-height:720px}
.canMock{width:220px;height:500px;border-radius:92px;background:#f8f5ef;color:#111;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:56px 28px;box-shadow:44px 60px 70px rgba(0,0,0,.28);transform:rotate(-6deg)}
.canMock span{writing-mode:vertical-rl;font-size:60px;line-height:1;font-weight:950;letter-spacing:-.08em}.canMock small{text-transform:uppercase;letter-spacing:1.8px;font-weight:950}
.canShadow{position:absolute;width:300px;height:46px;border-radius:50%;background:rgba(0,0,0,.34);bottom:82px;filter:blur(14px)}
.socialLaunch{background:#fff;padding:24px;display:flex;flex-direction:column;justify-content:flex-end}
.socialPhoto{position:absolute;inset:0 0 42%;background:linear-gradient(140deg,#111 0 34%,#ff5a3d 34% 50%,#f8f5ef 50%);opacity:.95}
.socialLaunch strong,.shelfMoment strong{position:relative;font-size:28px;letter-spacing:-.055em}.socialLaunch p{position:relative;color:#5b524a;font-weight:800;line-height:1.35}
.shelfMoment{background:#111;color:white;padding:26px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;align-items:end}
.shelfMoment span{height:190px;border-radius:22px;background:#f8f5ef}.shelfMoment span:nth-child(2){background:#ff5a3d}.shelfMoment span:nth-child(3){background:#8b4c34}.shelfMoment span:nth-child(4){background:#f8f5ef}
.shelfMoment strong{grid-column:1 / -1;color:white}
.emailMoment{background:#f8f5ef;padding:30px;display:flex;flex-direction:column;justify-content:space-between}
.emailMoment small{font-size:12px;text-transform:uppercase;letter-spacing:1.8px;font-weight:950;color:#ff5a3d}.emailMoment p{font-size:34px;line-height:.98;letter-spacing:-.055em;font-weight:900;margin:0}.emailMoment button{align-self:flex-start;border:none;border-radius:999px;background:#111;color:white;padding:13px 16px;font-weight:950}
.shippingMoment{background:#ff5a3d;display:grid;place-items:center;color:#111}.shippingMoment span{font-size:58px;letter-spacing:-.08em;font-weight:950;border:3px solid #111;padding:48px 36px;transform:rotate(-5deg)}
.launchSequence{max-width:1480px;margin:0 auto;padding:96px 6vw}
.launchRail{display:grid;grid-template-columns:repeat(5,minmax(220px,1fr));gap:0;margin-top:42px;overflow-x:auto;padding-bottom:16px}
.launchRail article{min-height:360px;border-left:1px solid rgba(17,17,17,.2);padding:24px;display:flex;flex-direction:column;justify-content:space-between;animation:roadmapFill .58s cubic-bezier(.2,.7,.2,1) both;animation-delay:calc(var(--launch-step) * .09s)}
.launchRail span{font-size:13px;text-transform:uppercase;letter-spacing:1.7px;font-weight:950;color:#ff5a3d}.launchRail p{font-size:24px;line-height:1.08;letter-spacing:-.045em;font-weight:850;margin:0;color:#111}
.livingWorkspace{max-width:1480px;margin:0 auto;padding:92px 6vw;display:grid;grid-template-columns:.82fr 1.18fr;gap:5vw;align-items:center}
.brandHeadquarters{background:#111;color:white;border-radius:42px;padding:36px;min-height:520px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 45px 120px rgba(17,17,17,.16)}
.hqHeader{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}.hqHeader strong{font-size:clamp(54px,7vw,112px);letter-spacing:-.08em;line-height:.8}.hqHeader span{border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:10px 13px;font-weight:950;color:rgba(255,255,255,.78)}
.hqColumns{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.hqColumns div{border-top:1px solid rgba(255,255,255,.16);padding-top:18px}.hqColumns small{display:block;color:#ffb29f;text-transform:uppercase;letter-spacing:1.5px;font-weight:950;margin-bottom:10px}.hqColumns p{color:rgba(255,255,255,.74);line-height:1.45;margin:0}
.birthOffer{max-width:1480px;margin:0 auto;padding:90px 6vw;display:grid;grid-template-columns:1fr 420px;gap:5vw;align-items:center}
.priceStatement{background:#111;color:white;border-radius:36px;padding:34px}.priceStatement strong{display:block;font-size:96px;letter-spacing:-.08em;line-height:.9}.priceStatement p{color:rgba(255,255,255,.72);font-size:18px}.priceStatement button{background:#ff5a3d;color:#111;box-shadow:none;width:100%}
.birthBuilder{max-width:1480px;margin:0 auto;padding:90px 6vw 120px;display:grid;grid-template-columns:.78fr 1.22fr;gap:5vw;align-items:start}
.birthBuilder .brandBuilderCard{border-radius:34px;border:none;box-shadow:0 36px 100px rgba(17,17,17,.08)}
.birthBuilder .brandBuilderCard:before{background:#ff5a3d;height:6px}
@keyframes birthStep{0%{opacity:0;transform:translateX(22px)}100%{opacity:1;transform:translateX(0)}}
@media(prefers-reduced-motion:reduce){.thinkingColumn span,.launchRail article{animation:none}.birthCta,.priceStatement button{transition:none}}
@media(max-width:1100px){.birthHero,.originMoment,.brandAwakening,.livingWorkspace,.birthOffer,.birthBuilder{grid-template-columns:1fr}.birthHero{min-height:auto}.birthHeroVisual{min-height:560px}.awakeningBoard,.brandWorldGrid{grid-template-columns:1fr 1fr}.canScene{grid-column:1 / -1;min-height:560px}.hqColumns{grid-template-columns:1fr}.priceStatement{max-width:520px}}
@media(max-width:820px){.birthHero,.originMoment,.brandAwakening,.worldShowcase,.launchSequence,.livingWorkspace,.birthOffer,.birthBuilder{padding-left:20px;padding-right:20px}.birthHero{padding-top:48px;gap:32px}.birthHeroCopy h1{font-size:68px}.birthHeroCopy p{font-size:20px}.birthHeroVisual{min-height:520px;border-radius:28px;padding:16px}.founderNote{border-radius:22px;padding:18px}.founderNote p{font-size:21px}.thinkingColumn{width:100%}.brandSignal{border-radius:24px;padding:22px}.originLine p{font-size:46px}.originMoment,.brandAwakening,.worldShowcase,.launchSequence,.livingWorkspace,.birthOffer,.birthBuilder{padding-top:58px;padding-bottom:58px}.awakeningCopy h2,.worldCopy h2,.launchSequence h2,.workspaceManifesto h2,.birthOffer h2,.birthBuilder h2{font-size:46px}.awakeningBoard,.brandWorldGrid{grid-template-columns:1fr}.thesisSpread,.voiceSpread,.identitySpread{border-radius:24px;padding:22px;min-height:auto}.thesisSpread h3{font-size:35px}.canScene{min-height:520px}.canMock{width:170px;height:390px}.brandWorldGrid>div{border-radius:26px}.launchRail{grid-template-columns:repeat(5,260px)}.launchRail article{min-height:280px}.brandHeadquarters{border-radius:28px;padding:24px;min-height:auto;gap:54px}.hqHeader{flex-direction:column}.birthOffer{gap:24px}.priceStatement{border-radius:28px;padding:26px}.priceStatement strong{font-size:78px}.birthBuilder .brandBuilderCard{border-radius:24px}}

@media(max-width:1100px){.logoHero,.dreamHero,.brandHero,.workspaceLayout,.freeToolsSection,.operatingSection,.membershipBand,.beforeAfterSection,.creativeDirectorExplainer,.brandUnderstoodPanel,.caseStudySection,.receivesSection,.finalBuilderSection{grid-template-columns:1fr}.dreamHero .heroTop,.operatingIntro,.caseCopy,.receivesSection>div:first-child,.finalBuilderIntro{position:relative;top:auto}.builderSteps{grid-template-columns:repeat(2,1fr)}.toolGrid,.featureGrid,.seoTextGrid,.systemGrid,.savedGrid,.logoLibraryGrid,.logoVariantGrid,.recentLogoGrid,.trustBar,.comparisonGrid,.brandJourneySteps,.brandInsightGrid,.logoGuideGrid,.roadmapPhaseList,.contentIdeaGrid,.demoFlow,.demoRoadmap,.reasoningStack,.platformMatrix,.workspaceModuleGrid,.workspaceProgressMock{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}.membershipBand>div:first-child{min-height:auto}.membershipPanel{max-width:none}.brandHero .heroTop{max-width:760px}.brandHero .heroCtas{justify-content:flex-start}}
@media(max-width:820px){h1,.heroTitle{font-size:48px}h2{font-size:34px}.membershipBand h2{font-size:48px}.nav{grid-template-columns:1fr auto;gap:12px;padding:22px 20px 8px}.navLinks{grid-column:1 / -1;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:6px;width:100%;border-radius:14px}.navActions{grid-column:2;grid-row:1}.navPrimaryCta{display:none}.accountBtn,.accountMenu{grid-column:2;grid-row:1}.accountMenu{max-width:210px}.accountMenu span{display:none}.hero,.offersSection,.pageSection,.footerSubscribe,.seoHomeSection,.brandSystemSection,.freeToolsSection,.operatingSection,.membershipBand,.beforeAfterSection,.creativeDirectorExplainer,.trustBar,.productDemoSection,.caseStudySection,.receivesSection,.finalBuilderSection{padding-left:20px;padding-right:20px}.hero{padding-top:36px}.brandHero{gap:24px}.heroTop{margin-bottom:10px}.heroCopy{text-align:left}.brandBuilderCard{padding:22px;border-radius:16px}.builderTop,.logoGuideIntro,.roadmapIntro{flex-direction:column;align-items:flex-start}.builderGrid,.builderActions,.builderSteps{grid-template-columns:1fr}.toolGrid,.featureGrid,.workspaceGrid,.generatorButtons,.seoTextGrid,.creativeDirectionsTop,.creativeDirectionGrid,.brandEverywhereHero,.brandTouchpointGrid,.useCaseGrid,.faqGrid,.systemGrid,.savedGrid,.visualOutput,.logoShowcase,.resultCardGrid,.freeToolCards,.operatingGrid button,.logoLibraryGrid,.logoStudioFields,.logoVariantGrid,.recentLogoGrid,.logoEditorGrid,.logoEditorControls,.workspaceSnapshot,.directionReasonGrid,.proofMiniGrid,.proofMetricRow,.trustBar,.beforeAfterGrid,.directorFlow,.comparisonGrid,.brandJourneySteps,.brandDashboardHero,.dashboardGrid,.dashboardIdentityGrid,.dashboardLogoStrip,.brandInsightGrid,.socialSetupGrid,.logoGuideGrid,.logoQualityGrid,.logoConceptGrid,.membershipValueGrid,.roadmapPhaseList,.contentIdeaGrid,.demoFlow,.demoRoadmap,.reasoningStack,.identityBoard,.platformMatrix,.workspaceModuleGrid,.workspaceProgressMock,.receivesList article,.agentStepList{grid-template-columns:1fr}.operatingGrid span{grid-row:auto}.membershipBand>div:first-child,.membershipPanel{border-radius:16px;padding:22px}.brandDashboard{border-radius:22px;padding:22px}.brandDashboardMark{width:118px}.brandDashboardHero h2{font-size:40px}.dashboardEmptyLogo{flex-direction:column;align-items:flex-start}.offersTop,.generateTop,.logoLibraryTop,.recentLogoHeader,.creativeDirectorTop,.timelineHeader,.comparisonHeader,.brandJourneyTop,.screenHeader{flex-direction:column;align-items:flex-start}.brandUnderstoodPanel{grid-template-columns:1fr}.timelineItem{grid-template-columns:34px 68px 1fr}.timelineActions{grid-column:2 / -1;justify-content:flex-start}.comparisonCard,.emptyComparisonCard{min-height:auto}.resultTop{align-items:flex-start;flex-direction:column}.captionOptionRow{grid-template-columns:34px 1fr}.captionOptionRow button{grid-column:2}textarea{height:160px}.logoFrame{min-height:360px}.logoStudioNotes{grid-column:auto}.beforeCard p{font-size:20px}.afterPreviewGrid{grid-template-columns:1fr}.proofMiniGrid{grid-template-columns:repeat(3,1fr)}.agentPromptBox p{font-size:19px}.demoWorkspaceReveal,.workspaceHeaderMock,.launchTimeline article{grid-template-columns:1fr}.demoStage{min-height:auto}.moodTile.tall{min-height:160px;grid-row:auto}}
`;

const futureThemeCss = `
:root{--bt-ink:#11110f;--bt-muted:#625d55;--bt-paper:#fffdf8;--bt-soft:#f6f2ea;--bt-line:rgba(17,17,15,.12);--bt-sand:#d7c5ad;--bt-clay:#806546;--bt-sage:#747863;--bt-shadow:0 24px 70px rgba(35,28,19,.1)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bt-paper);color:var(--bt-ink);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input,textarea{font:inherit}button{cursor:pointer}button:focus-visible,a:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible{outline:2px solid var(--bt-clay);outline-offset:3px}.app{min-height:100vh;background:var(--bt-paper)!important;color:var(--bt-ink)!important}.nav{position:sticky;top:0;z-index:40;max-width:1440px;margin:0 auto;padding:14px clamp(18px,4vw,54px) 10px;background:rgba(255,253,248,.9);backdrop-filter:blur(16px);border-bottom:1px solid rgba(17,17,15,.06)}.navInner{display:flex;align-items:center;justify-content:space-between;gap:20px}.brand,.logoText{font-size:23px;font-weight:950;letter-spacing:-.07em;color:var(--bt-ink);border:0;background:transparent}.navLinks{display:flex;align-items:center;gap:3px;padding:4px;border:1px solid var(--bt-line);border-radius:999px;background:rgba(255,255,255,.72)}.navLinks button{border:0;background:transparent;border-radius:999px;padding:9px 14px;color:#302d28;font-weight:760;font-size:14px}.navLinks button:hover{background:#11110f;color:#fffdf8}.navActions,.authCluster{display:flex;align-items:center;gap:10px}.navPrimaryCta,.accountBtn,.authCluster button,.birthCta,.birthSecondary,.inputAction,.priceStatement button,.unlockCallout button,.btn.dark,.btn.light{display:inline-flex;align-items:center;justify-content:center;border:1px solid #11110f;border-radius:999px;padding:12px 18px;background:#11110f;color:#fffdf8;font-weight:850;letter-spacing:-.02em;text-decoration:none;transition:transform .18s ease,background .18s ease,color .18s ease,border-color .18s ease}.birthSecondary,.btn.light{background:#fffdf8;color:#11110f;border-color:var(--bt-line)}.navPrimaryCta:hover,.accountBtn:hover,.birthCta:hover,.inputAction:hover,.priceStatement button:hover,.unlockCallout button:hover,.btn.dark:hover{transform:translateY(-1px);background:#2a251f}.birthSecondary:hover,.btn.light:hover{background:#f0e8dc}.accountMenu{display:flex;align-items:center;gap:8px}.accountMenu span{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--bt-muted);font-weight:700;font-size:13px}
.birthPage{background:var(--bt-paper);overflow:hidden}.birthHero,.productWalkthrough,.receiveSection,.completeExample,.howSection,.pricingSection,.trustSection,.faqSection,.birthBuilder,.infoPage{width:min(1180px,calc(100% - 44px));margin:0 auto}.birthHero{display:grid;grid-template-columns:minmax(0,.9fr) minmax(420px,.88fr);gap:clamp(30px,5vw,76px);align-items:center;padding:54px 0 60px}.birthHeroCopy h1,.examplesHero h1{font-size:clamp(58px,9.5vw,132px);line-height:.87;letter-spacing:-.08em;margin:0 0 22px;font-weight:950;color:var(--bt-ink)}.birthHeroCopy>p,.examplesHero p{font-size:clamp(19px,1.75vw,25px);line-height:1.3;color:var(--bt-muted);max-width:690px;margin:0 0 24px;letter-spacing:-.03em}.birthHeroActions{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:18px}.textLinkButton{border:0;background:transparent;color:#11110f;text-decoration:underline;text-underline-offset:4px;font-weight:820;padding:10px}.heroSupport,.builderFinePrint,.policyNote{font-size:14px;color:var(--bt-muted);line-height:1.45;margin:0 0 20px}.birthHeroVisual:before{content:"";position:absolute;inset:-22px;background:linear-gradient(120deg,rgba(215,197,173,.35),rgba(255,253,248,0) 56%);border-radius:34px;z-index:0}.birthHeroVisual{position:relative;min-width:0}.birthHeroVisual>*{position:relative;z-index:1}.northlineInputPanel,.brandBuilderCard{background:#fffaf2;border:1px solid rgba(17,17,15,.1);border-radius:26px;padding:22px;box-shadow:var(--bt-shadow);display:grid;gap:16px}.inputPanelHeader,.builderTop{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.inputPanelHeader span,.builderTop>span,.sectionHeader>span,.worldCopy>span,.pricingSection>div>span,.exampleBrandCopy>span,.examplesKicker,.priceStatement span{display:block;color:var(--bt-clay);font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;margin-bottom:8px}.inputPanelHeader strong{font-size:16px;color:var(--bt-ink)}.inputRows{display:grid;gap:12px}.inputRow,.builderField{display:grid;gap:8px;padding:15px;border:1px solid rgba(17,17,15,.09);border-radius:16px;background:#fffdf8}.inputRow span,.builderField span,.outputTray span,.toolExample span,.roadmapLine span,.workspaceShelf span,.previewResult span{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#806546;font-weight:850}.inputRow strong{font-size:22px;letter-spacing:-.05em}.inputRow p,.builderField input,.builderField textarea{margin:0;color:#38332d;font-size:16px;line-height:1.4}.agentSteps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.agentSteps span{border-bottom:1px solid rgba(17,17,15,.1);padding:8px 0;color:#47413a;font-size:13px;font-weight:740}.northlineOutputPreview{display:grid;gap:14px}.previewImageFrame,.brandWorldPhoto,.brandHeadquarters picture,.exampleBrandMedia{display:block;overflow:hidden;border-radius:26px;background:#eee5d8;box-shadow:var(--bt-shadow);border:1px solid rgba(17,17,15,.08);margin:0;aspect-ratio:3/2}.previewImageFrame img,.brandWorldPhoto img,.brandHeadquarters img,.exampleBrandMedia img{display:block;width:100%;height:100%;object-fit:cover}.outputTray{display:grid;grid-template-columns:1fr 1fr;gap:10px}.outputTray div{background:#11110f;color:#fffdf8;border-radius:16px;padding:15px;min-height:96px}.outputTray span{color:#d7c5ad}.outputTray strong{display:block;color:#fffdf8;font-size:18px;line-height:1.15;letter-spacing:-.03em}.productWalkthrough,.receiveSection,.completeExample,.howSection,.pricingSection,.trustSection,.faqSection,.birthBuilder{padding:56px 0}.sectionHeader.compact{max-width:820px;margin-bottom:28px}.sectionHeader h2,.worldCopy h2,.pricingSection h2,.birthBuilder h2,.infoPage h1{font-size:clamp(42px,6vw,82px);line-height:.94;letter-spacing:-.07em;margin:0 0 14px;font-weight:950}.sectionHeader p,.worldCopy p,.pricingSection p,.birthBuilder p,.infoPage p{font-size:clamp(18px,1.8vw,23px);line-height:1.35;color:var(--bt-muted);letter-spacing:-.025em;margin:0}.walkthroughGrid,.completeExample,.pricingSection,.birthBuilder{display:grid;grid-template-columns:minmax(0,.92fr) minmax(420px,1fr);gap:36px;align-items:start}.walkthroughSteps,.receiveGrid,.howGrid,.boundaryGrid,.faqList,.infoNotes{display:grid;gap:12px}.walkthroughSteps article,.receiveGrid article,.howGrid article,.boundaryGrid article,.infoNotes article,.friendlyState{border-top:1px solid var(--bt-line);padding:14px 0}.walkthroughSteps span,.howGrid span{color:var(--bt-clay);font-size:12px;font-weight:900;letter-spacing:.08em}.walkthroughSteps strong,.receiveGrid strong,.howGrid strong,.boundaryGrid strong{display:block;font-size:20px;letter-spacing:-.04em;margin-bottom:6px}.walkthroughSteps p,.receiveGrid p,.howGrid p,.boundaryGrid p,.boundaryGrid li,.faqList p{color:var(--bt-muted);line-height:1.45;margin:0}.receiveGrid,.howGrid,.boundaryGrid{grid-template-columns:repeat(4,minmax(0,1fr))}.boundaryGrid{grid-template-columns:repeat(3,minmax(0,1fr))}.worldList{display:grid;gap:10px;margin-top:22px}.worldList div{display:grid;grid-template-columns:110px 1fr;gap:14px;border-top:1px solid var(--bt-line);padding-top:11px}.worldList span{color:var(--bt-muted);font-size:15px;line-height:1.35}.priceStatement{background:#11110f;color:#fffdf8;border-radius:26px;padding:26px;box-shadow:var(--bt-shadow)}.priceStatement strong{display:block;font-size:64px;letter-spacing:-.08em;line-height:.9;margin:6px 0 16px}.priceStatement p,.priceStatement li{color:rgba(255,253,248,.72);line-height:1.45}.priceStatement a{display:inline-block;color:#fffdf8;margin-top:14px;text-decoration:underline;text-underline-offset:4px}.priceStatement button{background:#fffdf8;color:#11110f;border-color:#fffdf8;width:100%;margin-top:14px}.builderContextGrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.builderField.full{grid-column:1/-1}.builderField{padding:0;background:transparent;border:0}.builderField input,.builderField textarea,.footerForm input{width:100%;border:1px solid rgba(17,17,15,.12);border-radius:14px;background:#fffdf8;padding:13px 14px}.builderField textarea{min-height:122px;resize:vertical}.builderActions{display:flex;gap:10px;flex-wrap:wrap}.previewResult{display:grid;grid-template-columns:1fr 1fr;gap:12px}.previewResult>div{background:#fffdf8;border:1px solid rgba(17,17,15,.1);border-radius:16px;padding:16px}.previewResult p{margin:6px 0 0;color:#39342e;line-height:1.42}.previewSwatches{display:flex;gap:8px;margin-top:10px}.previewSwatches i{width:38px;height:38px;border-radius:50%;border:1px solid rgba(17,17,15,.14)}.unlockCallout{grid-column:1/-1;background:#11110f!important;color:#fffdf8!important}.unlockCallout p{color:rgba(255,253,248,.72)!important}.unlockCallout button{margin-top:12px;background:#fffdf8;color:#11110f}.faqList details{border-top:1px solid var(--bt-line);padding:16px 0}.faqList summary{font-weight:850;font-size:18px;cursor:pointer}.examplesPage{background:var(--bt-paper);padding:54px clamp(22px,5vw,76px) 90px}.examplesHero{max-width:980px;margin:0 auto 48px}.exampleBrandGrid{display:grid;gap:54px;max-width:1180px;margin:0 auto}.exampleBrandCard.editorial{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(340px,.95fr);gap:34px;align-items:center}.exampleBrandCard.editorial.reverse{grid-template-columns:minmax(340px,.95fr) minmax(0,1.05fr)}.exampleBrandCard.editorial.reverse .exampleBrandMedia{order:2}.exampleBrandCopy h2{font-size:clamp(42px,6vw,82px);line-height:.92;letter-spacing:-.07em;margin:0 0 14px}.exampleBrandCopy p{font-size:21px;line-height:1.35;color:var(--bt-muted);letter-spacing:-.025em}.exampleDetails{display:grid;gap:10px;margin-top:20px}.exampleDetails div{display:grid;grid-template-columns:110px 1fr;gap:14px;border-top:1px solid var(--bt-line);padding-top:10px}.exampleDetails span{color:var(--bt-muted);font-size:15px}.textExamplePanel{padding:28px;box-shadow:none}.textExamplePanel strong{font-size:34px;letter-spacing:-.06em}.textExamplePanel li{color:var(--bt-muted);margin:10px 0;line-height:1.4}.darkPanel{background:#11110f;color:#fffdf8}.darkPanel li,.darkPanel p{color:rgba(255,253,248,.7)}.infoPage{padding:78px 0}.infoPage>span{color:var(--bt-clay);font-size:12px;text-transform:uppercase;letter-spacing:.1em;font-weight:900}.footerSubscribe.completeFooter{max-width:1180px;margin:0 auto;padding:50px 0 70px;border-top:1px solid var(--bt-line);display:grid;grid-template-columns:1fr 420px;gap:36px}.footerSubscribe h2{font-size:clamp(34px,4vw,56px);line-height:1;letter-spacing:-.06em}.footerSubscribe p,.footerForm span{color:var(--bt-muted);line-height:1.55}.footerLinks{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}.footerLinks button{border:0;background:transparent;text-align:left;padding:6px 0;color:#11110f;text-decoration:underline;text-underline-offset:3px;font-weight:750}
.builderContextFields{border:1px solid rgba(17,17,15,.1);border-radius:16px;background:#fffdf8;padding:12px 14px}.builderContextFields summary{cursor:pointer;font-weight:850;color:#2f2a25}.builderContextFields .builderContextGrid{margin-top:14px}
.loggedInApp{display:grid;grid-template-columns:292px minmax(0,1fr);min-height:100vh;background:#f8f5ef;border-top:1px solid rgba(17,17,15,.06)}.appSidebar{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:22px;border-right:1px solid rgba(17,17,15,.1);background:#fffdf8;z-index:20}.appBrandButton{border:0;background:transparent;text-align:left;font-size:25px;font-weight:950;letter-spacing:-.075em;color:#11110f;padding:0;margin-bottom:22px}.brandSwitcher{display:grid;gap:8px}.brandSwitcher span,.appSidebarBottom span,.appHeader span,.appCardHeader span,.appToolCard span,.appPanel>span,.completionTop span,.completionChecklist span,.identityOverviewGrid span,.generatorAppCrumb span,.brandContextPanel summary,.assetCardMeta span{font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900;color:#806546}.brandSwitcher select{width:100%;border:1px solid rgba(17,17,15,.12);border-radius:14px;background:#f8f5ef;padding:12px;font-weight:850;color:#11110f}.appSectionNav{display:grid;gap:6px;margin:28px 0}.appSectionNav button{border:0;background:transparent;border-radius:14px;padding:12px 13px;text-align:left;font-weight:850;color:#37322c}.appSectionNav button:hover,.appSectionNav button.active{background:#11110f;color:#fffdf8}.appSidebarBottom{display:grid;gap:8px;border-top:1px solid rgba(17,17,15,.1);padding-top:16px}.appSidebarBottom strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px;color:#5d554d}.appSidebarBottom button{border:1px solid rgba(17,17,15,.12);border-radius:999px;background:#f8f5ef;padding:10px 12px;font-weight:850;color:#11110f}.appShellBody{min-width:0;display:grid;grid-template-rows:auto 1fr}.appHeader{position:sticky;top:0;z-index:15;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 28px;background:rgba(248,245,239,.92);backdrop-filter:blur(14px);border-bottom:1px solid rgba(17,17,15,.08)}.appHeader strong{display:block;font-size:22px;letter-spacing:-.045em}.mobileAppMenu{display:none}.createMenuWrap{position:relative}.appCreateButton{min-width:104px}.createMenu{position:absolute;right:0;top:calc(100% + 8px);width:360px;max-height:70vh;overflow:auto;background:#fffdf8;border:1px solid rgba(17,17,15,.12);border-radius:20px;padding:10px;box-shadow:0 24px 70px rgba(35,28,19,.16);display:grid;gap:6px;z-index:30}.createMenuContext{padding:10px 12px;color:#806546;font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:900}.createMenu button{border:0;background:transparent;border-radius:14px;padding:12px;text-align:left;color:#11110f}.createMenu button:hover{background:#f1eadf}.createMenu strong{display:block;font-size:15px;margin-bottom:4px}.createMenu span{display:block;color:#6b625b;font-size:12px;line-height:1.35}.appMain{min-width:0;padding:28px;scroll-margin-top:120px}.appContentSection{max-width:1180px;margin:0 auto;padding:0 0 54px}.workspaceOverview .pageTitle,.overviewHero h1{font-size:clamp(46px,7vw,88px);line-height:.92;letter-spacing:-.075em;margin:0 0 14px}.overviewHero{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.62fr);gap:24px;align-items:stretch}.overviewHero>div:first-child,.nextActionCard,.appPanel,.completionPanel,.workspaceTools,.newBrandPanel{background:#fffdf8;border:1px solid rgba(17,17,15,.1);border-radius:24px;padding:24px;box-shadow:0 20px 58px rgba(35,28,19,.07)}.overviewHero p{font-size:20px;line-height:1.35;color:#5d554d;max-width:760px}.overviewMeta{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}.overviewMeta span{border:1px solid rgba(17,17,15,.1);border-radius:999px;padding:9px 12px;background:#f8f5ef;font-size:13px;font-weight:850;color:#37322c}.nextActionCard{display:flex;flex-direction:column;justify-content:space-between;gap:18px}.nextActionCard strong{font-size:28px;line-height:1.08;letter-spacing:-.055em}.nextActionCard button,.appPanel button,.appToolCard button,.completionChecklist button,.identityOverviewGrid button{align-self:flex-start;border:1px solid #11110f;border-radius:999px;background:#11110f;color:#fffdf8;padding:10px 14px;font-weight:850}.overviewActions{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.completionTop{width:100%;border:0;background:transparent;text-align:left;display:grid;grid-template-columns:auto auto 1fr;gap:16px;align-items:center;color:#11110f}.completionTop strong{font-size:44px;letter-spacing:-.075em}.completionTop small{color:#6b625b;font-weight:750}.completionChecklist{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}.completionChecklist button{display:grid;gap:4px;align-items:start;text-align:left;border-color:rgba(17,17,15,.12);background:#f8f5ef;color:#11110f;border-radius:16px}.completionChecklist button.complete{background:#11110f;color:#fffdf8}.completionChecklist button.complete span,.completionChecklist button.complete small{color:rgba(255,253,248,.68)}.completionChecklist small{color:#6b625b}.workspaceTools{margin-top:18px}.appCardHeader h2{font-size:32px;line-height:1;letter-spacing:-.06em;margin:6px 0 0}.toolCardGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:18px}.appToolCard{display:flex;flex-direction:column;justify-content:space-between;gap:18px;background:#f8f5ef;border:1px solid rgba(17,17,15,.1);border-radius:18px;padding:18px;min-height:178px}.appToolCard strong{display:block;font-size:22px;letter-spacing:-.05em;margin:8px 0}.appToolCard p{color:#5d554d;line-height:1.4;margin:0}.moreTools{margin-top:18px}.moreTools summary{font-weight:900;cursor:pointer}.overviewGrid,.identityOverviewGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.appPanel{box-shadow:none}.appPanel.wide{grid-column:span 2}.appPanel p{color:#5d554d;line-height:1.5}.recentAssetRow,.appPanel>button:not(.btn){display:block;width:100%;border:0;border-top:1px solid rgba(17,17,15,.1);border-radius:0;background:transparent;color:#11110f;text-align:left;padding:12px 0;margin:0}.recentAssetRow strong{display:block}.recentAssetRow small,.roadmapMiniRow p{color:#6b625b}.roadmapMiniRow{border-top:1px solid rgba(17,17,15,.1);padding:12px 0}.identityLogoStrip{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:18px}.identityLogoStrip img{width:100%;aspect-ratio:1;border-radius:20px;object-fit:contain;background:#fffdf8;border:1px solid rgba(17,17,15,.1);padding:18px}.settingsGrid{display:grid;gap:18px}.newBrandPanel summary{font-size:18px;font-weight:950;cursor:pointer}.newBrandPanel .workspaceCard{box-shadow:none;border:0;padding:18px 0 0}.generatorAppCrumb{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}.generatorAppCrumb button{border:1px solid rgba(17,17,15,.12);border-radius:999px;background:#fffdf8;padding:9px 12px;font-weight:850;color:#11110f}.brandContextPanel{border:1px solid rgba(17,17,15,.1);border-radius:18px;background:#fffdf8;padding:14px 16px;margin-bottom:18px}.brandContextPanel summary{cursor:pointer;color:#806546}.brandContextPanel div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}.brandContextPanel p{margin:0;color:#5d554d;line-height:1.45}.captionRowActions{display:flex;gap:8px;flex-wrap:wrap}.savedAssetLinkRow{border-top:1px solid rgba(17,17,15,.08);padding:14px 22px;display:flex;justify-content:space-between;gap:12px;align-items:center}.savedAssetLinkRow span{color:#6b625b;font-weight:760}.savedAssetLinkRow button{border:1px solid rgba(17,17,15,.12);border-radius:999px;background:#fffdf8;padding:9px 12px;font-weight:850;color:#11110f}.assetLibraryHero{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:18px}.assetLibraryHero h2{font-size:clamp(42px,6vw,80px);line-height:.94;letter-spacing:-.07em;margin:0 0 12px}.assetLibraryHero p{color:#5d554d;font-size:18px;line-height:1.4}.assetLibraryHero>strong{font-size:42px;letter-spacing:-.07em}.assetControls{display:grid;grid-template-columns:minmax(220px,1fr) 220px 180px;gap:10px;margin-bottom:12px}.assetControls input,.assetControls select{border:1px solid rgba(17,17,15,.12);border-radius:14px;background:#fffdf8;padding:12px 13px;font-weight:760;color:#11110f}.assetCountRow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.assetCountRow button{border:1px solid rgba(17,17,15,.12);border-radius:999px;background:#fffdf8;padding:8px 11px;font-weight:820;color:#11110f}.assetRecentPanel{margin:0 0 18px}.assetLibraryGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.assetLibraryCard{background:#fffdf8;border:1px solid rgba(17,17,15,.1);border-radius:22px;padding:18px;display:grid;gap:12px}.assetImageButton{border:0;background:#f8f5ef;border-radius:16px;padding:12px}.assetImageButton img{width:100%;aspect-ratio:1;object-fit:contain}.assetCardMeta{display:flex;justify-content:space-between;gap:10px}.assetCardMeta small{color:#6b625b}.assetLibraryCard>strong{font-size:20px;letter-spacing:-.045em}.assetLibraryCard p{color:#5d554d;line-height:1.45;margin:0}.assetLibraryCard details{border-top:1px solid rgba(17,17,15,.1);padding-top:10px}.assetLibraryCard summary{cursor:pointer;font-weight:850}.assetLibraryCard pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;color:#4d463f}.assetCardActions{display:flex;gap:8px;flex-wrap:wrap}.assetCardActions button{border:1px solid rgba(17,17,15,.12);border-radius:999px;background:#f8f5ef;color:#11110f;padding:8px 10px;font-weight:820}.assetCardActions .miniDanger{border-color:rgba(145,34,18,.25);color:#8d2718}
@media(max-width:1040px){.loggedInApp{grid-template-columns:1fr}.appSidebar{position:fixed;inset:0 auto 0 0;width:min(86vw,320px);height:100vh;top:0;transform:translateX(-105%);transition:transform .2s ease;box-shadow:20px 0 70px rgba(35,28,19,.16)}.appSidebar.open{transform:translateX(0)}.appHeader{top:0}.mobileAppMenu{display:inline-flex;border:1px solid rgba(17,17,15,.12);border-radius:999px;background:#fffdf8;padding:10px 12px;font-weight:850}.appMain{padding:20px}.overviewHero,.overviewGrid,.identityOverviewGrid{grid-template-columns:1fr}.appPanel.wide{grid-column:auto}.toolCardGrid,.completionChecklist{grid-template-columns:repeat(2,minmax(0,1fr))}.createMenu{right:-8px;width:min(88vw,360px)}}@media(max-width:680px){.appHeader{align-items:flex-start;padding:12px 16px}.appHeader strong{font-size:18px}.appMain{padding:16px}.overviewHero>div:first-child,.nextActionCard,.appPanel,.completionPanel,.workspaceTools,.newBrandPanel{border-radius:18px;padding:18px}.overviewHero p{font-size:17px}.overviewActions .btn{width:100%}.toolCardGrid,.completionChecklist,.brandContextPanel div{grid-template-columns:1fr}.completionTop{grid-template-columns:1fr;gap:5px}.captionOptionRow{grid-template-columns:34px 1fr}.captionRowActions{grid-column:2}.savedAssetLinkRow{flex-direction:column;align-items:flex-start}.savedAssetLinkRow button{width:100%}}
@media (prefers-reduced-motion:no-preference){.birthHeroVisual,.brandWorldPhoto,.exampleBrandMedia{animation:softReveal .55s ease both}@keyframes softReveal{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}}@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media(max-width:1050px){.birthHero,.walkthroughGrid,.completeExample,.pricingSection,.birthBuilder,.footerSubscribe.completeFooter{grid-template-columns:1fr}.birthHero{padding-top:42px}.birthHero .northlineInputPanel,.productWalkthrough .northlineOutputPreview{display:none}.birthHeroVisual{max-width:760px}.receiveGrid,.howGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.boundaryGrid{grid-template-columns:1fr}.exampleBrandCard.editorial,.exampleBrandCard.editorial.reverse{grid-template-columns:1fr}.exampleBrandCard.editorial.reverse .exampleBrandMedia{order:0}.priceStatement{max-width:520px}.navInner{align-items:flex-start}.navLinks{max-width:100%;overflow-x:auto}}
@media(max-width:720px){.nav{padding:10px 16px}.navInner{display:grid;grid-template-columns:1fr auto;gap:10px}.navLinks{grid-column:1/-1;width:100%;border-radius:14px;justify-content:flex-start}.navPrimaryCta{display:none}.accountMenu span{display:none}.birthHero,.productWalkthrough,.receiveSection,.completeExample,.howSection,.pricingSection,.trustSection,.faqSection,.birthBuilder,.infoPage{width:calc(100% - 32px)}.birthHero{padding:30px 0 34px;gap:20px}.birthHeroCopy h1,.examplesHero h1{font-size:clamp(50px,15vw,68px);letter-spacing:-.075em}.birthHeroCopy>p,.examplesHero p{font-size:18px;margin-bottom:18px}.heroSupport{margin-bottom:0}.birthHero .northlineInputPanel{display:none}.birthHeroActions,.builderActions{align-items:stretch;margin-bottom:12px}.birthCta,.birthSecondary,.textLinkButton,.btn.dark,.btn.light{width:100%}.northlineInputPanel,.brandBuilderCard{border-radius:22px;padding:18px}.agentSteps,.outputTray,.builderContextGrid,.previewResult,.receiveGrid,.howGrid{grid-template-columns:1fr}.productWalkthrough .northlineOutputPreview{display:none}.productWalkthrough,.receiveSection,.completeExample,.howSection,.pricingSection,.trustSection,.faqSection,.birthBuilder{padding:34px 0}.sectionHeader.compact{margin-bottom:18px}.sectionHeader h2,.worldCopy h2,.pricingSection h2,.birthBuilder h2,.infoPage h1{font-size:clamp(36px,10.8vw,52px);letter-spacing:-.065em}.sectionHeader p,.worldCopy p,.pricingSection p,.birthBuilder p,.infoPage p{font-size:17px}.walkthroughSteps{gap:4px}.walkthroughSteps article,.receiveGrid article,.howGrid article,.boundaryGrid article,.infoNotes article,.friendlyState{padding:10px 0}.walkthroughSteps strong,.receiveGrid strong,.howGrid strong,.boundaryGrid strong{font-size:18px}.walkthroughSteps p,.receiveGrid p,.howGrid p,.boundaryGrid p,.boundaryGrid li,.faqList p{font-size:14px}.worldList{margin-top:16px}.worldList div,.exampleDetails div{grid-template-columns:1fr;gap:5px}.previewImageFrame,.brandWorldPhoto,.exampleBrandMedia{border-radius:20px}.priceStatement{border-radius:22px;padding:20px}.priceStatement strong{font-size:48px}.faqList details{padding:11px 0}.faqList summary{font-size:16px}.builderField textarea{min-height:96px}.builderContextFields{padding:11px 12px}.examplesPage{padding:38px 16px 70px}.exampleBrandGrid{gap:44px}.footerSubscribe.completeFooter{width:calc(100% - 32px);padding:34px 0 42px;gap:18px}.footerSubscribe h2{font-size:34px}.footerLinks{grid-template-columns:1fr}.footerForm input,.footerForm button{width:100%}}
`;
