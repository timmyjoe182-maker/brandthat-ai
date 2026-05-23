import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";

const PLAN_COPY = {
  free: {
    name: "Free",
    badge: "Free Workspace",
    description: "Free caption and hashtag generators, 1 logo generation after signup, 1 Brand Workspace, and basic brand tools.",
  },
  starter: {
    name: "Starter",
    badge: "$10/mo",
    description: "Unlimited text generations, saved content history, brand workspaces, and 10 AI logo generations per month.",
  },
  pro: {
    name: "Pro",
    badge: "$20/mo",
    description: "Everything in Starter plus unlimited AI logo generations, full brand kits, and priority visual tools.",
  },
};

const tools = [
  {
    key: "logo",
    title: "AI Logo Generator",
    shortTitle: "Logos",
    desc: "Create premium logo images and modern identity directions.",
    label: "AI LOGO GENERATOR",
    platformLabel: "Logo style",
    platforms: ["Modern Minimal", "Luxury Wordmark", "Bold Monogram", "Editorial Serif", "Clean Tech", "Founder Brand", "Beauty / Wellness", "Restaurant / Hospitality", "Real Estate", "Social Media Icon"],
    placeholder: "Example: Create a black-and-white premium logo for Brandthat.ai, an AI creative studio for modern creators and brands.",
    promptGuide: "Create a modern logo image and brand identity direction. Include logo concept, typography, colors, usage notes, and visual identity guidance."
  },
  {
    key: "captions",
    title: "Free Caption Generator",
    shortTitle: "Captions",
    desc: "Choose a platform, describe the post, and get 10 clean caption options instantly.",
    label: "FREE CAPTION GENERATOR",
    platformLabel: "Social platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: A sunset ranch dinner with miniature cows, alpacas, and a calm luxury countryside feel.",
    promptGuide: "Generate exactly 10 useful social captions. The user chooses a social platform and describes the post. Return captions only, no long explanation. Make the captions copy-ready and relevant to what the user typed."
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
    title: "Free Hashtag Generator",
    shortTitle: "Hashtags",
    desc: "Choose a platform, describe what you need hashtagged, and get clean hashtag sets instantly.",
    label: "FREE HASHTAG GENERATOR",
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
    title: "Brand Creation Generator",
    shortTitle: "Brand Creation",
    desc: "Generate brand names, positioning, voice, and launch direction.",
    label: "BRAND CREATION GENERATOR",
    platformLabel: "Brand focus",
    platforms: ["New Business", "Creator Brand", "Product Brand", "Luxury Brand", "Local Business", "Agency / Studio", "Personal Brand", "Online Tool / SaaS"],
    placeholder: "Example: I want to create a premium AI tool that helps small businesses make content and branding faster.",
    promptGuide: "Help the user create a brand from a word, sentence, or paragraph. Include names, positioning, audience, tagline, voice, visual direction, offers, and launch direction."
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
    h1: "AI Logo Generator for Modern Brands, Startups, and Creators",
    intro: "Create premium AI logo images, brand identity directions, palettes, typography, and launch-ready visual systems from one brand idea.",
    examples: ["Create a premium black-and-white logo for a modern AI branding platform named Brandthat.ai. Use a clean wordmark, strong favicon-ready icon, and luxury technology feel.", "Design a circular vintage mascot logo for a coffee brand. Include a wolf icon, cream and black palette, premium typography, and packaging-ready composition.", "Create an elegant ranch lifestyle logo with refined typography, subtle animal-inspired mark, warm neutral colors, and a high-end boutique brand feeling."],
    faqs: [
      ["Does Brandthat.ai create actual logo images?", "Yes. Pro unlocks unlimited AI logo image generation, while free users get daily logo concept access."],
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
    eyebrow: "BRAND CREATION GENERATOR",
    h1: "Brand Creation Generator for Names, Positioning, Voice, and Launch Ideas",
    intro: "Turn a rough business idea into brand names, positioning, taglines, offer direction, voice, and a launch plan.",
    examples: ["Create brand names and positioning for a premium AI branding tool.", "Build a brand concept for a luxury ranch gifting business.", "Generate names, taglines, and launch angles for a local service business."],
    faqs: [
      ["Can it generate brand names?", "Yes. It can create names, taglines, positioning, voice, and launch direction."],
      ["Can I use it for a personal brand?", "Yes. It works for founders, creators, agencies, local businesses, and product brands."],
      ["Can I save the brand?", "Yes. You can turn the output into a Brand Workspace and build assets from there."]
    ]
  }
};

const toolMap = Object.fromEntries(tools.map((tool) => [tool.key, tool]));

const tones = [
  "Modern", "Professional", "Minimal", "Luxury", "Bold", "Playful", "Editorial", "Cinematic",
  "Premium", "Friendly", "Witty", "Elegant", "Direct", "Emotional", "High-end", "Viral"
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
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
  const match = Object.entries(seoPages).find(([, page]) => page.path === path);
  return match ? match[0] : "home";
}

function getInitialToolFromPath() {
  const path = window.location.pathname;
  const match = Object.values(seoPages).find((page) => page.path === path);
  return match?.toolKey || "logo";
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
      "seo-brand": "Brand Creation Generator | Brandthat.ai",
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
      "seo-brand": "Generate brand names, positioning, taglines, voice, offer direction, and launch ideas for creators, founders, and small businesses.",
    };

    return {
      title: titles[page] || `${seoPage.h1} | Brandthat.ai`,
      description: descriptions[page] || seoPage.intro,
      canonical: `https://brandthat.ai${seoPage.path}`,
    };
  }

  return {
    title: "Brandthat.ai | AI Logo Generator, Free Caption Generator & Brand Workspace",
    description: "Create AI logos, free captions, free hashtags, growth roadmaps, and brand workspaces. Brandthat.ai helps creators, startups, and small businesses build brands faster.",
    canonical: "https://brandthat.ai/",
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
      { "@type": "Offer", name: "Starter", price: "10", priceCurrency: "USD" },
      { "@type": "Offer", name: "Pro", price: "20", priceCurrency: "USD" }
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
    if (!response.ok) {
      throw new Error(text || "Request failed.");
    }

    return {};
  }
}

function cleanGeneratedText(text = "") {
  return String(text)
    .replace(/\*\*/g, "")
    .replace(/__+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  };
}

function getBrandReadinessScore(brand) {
  if (!brand) return 0;

  const fields = [
    "name",
    "description",
    "audience",
    "audiencePain",
    "offer",
    "differentiator",
    "tone",
    "style",
    "logoDirection",
    "channels",
    "launchGoal",
    "growthPlatform",
    "targetFollowers",
  ];

  const completed = fields.filter((field) => String(brand[field] || "").trim()).length;
  return Math.round((completed / fields.length) * 100);
}

export default function App() {
  const [page, setPage] = useState(getInitialPageFromPath());
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(localStorage.getItem("brandthat_plan") || "free");
  const [dailyFreeCount, setDailyFreeCount] = useState(getStoredNumber("brandthat_daily_count", 0));
  const [starterLogoCount, setStarterLogoCount] = useState(getStoredNumber("brandthat_starter_logo_count", 0));

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [pendingAuthAction, setPendingAuthAction] = useState(null);

  const [activeToolKey, setActiveToolKey] = useState(getInitialToolFromPath());
  const activeTool = toolMap[activeToolKey] || tools[0];
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [creativeTone, setCreativeTone] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [logoImage, setLogoImage] = useState("");
  const [loading, setLoading] = useState(false);

  const [brandWorkspaces, setBrandWorkspaces] = useState(() => safeParse("brandthat_brand_workspaces", []));
  const [activeBrandId, setActiveBrandId] = useState(localStorage.getItem("brandthat_active_brand_id") || "");
  const activeBrand = brandWorkspaces.find((brand) => brand.id === activeBrandId) || brandWorkspaces[0] || null;

  const [workspaceDraft, setWorkspaceDraft] = useState(() =>
    safeParse("brandthat_workspace_draft", getDefaultWorkspaceDraft())
  );

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [appNotice, setAppNotice] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("Draft ready");
  const [favoriteIds, setFavoriteIds] = useState(() => safeParse("brandthat_favorite_ids", {}));

  const dailyRemaining = Math.max(0, 1 - dailyFreeCount);
  const starterLogoRemaining = Math.max(0, 10 - starterLogoCount);
  const isFree = userPlan === "free";
  const isStarter = userPlan === "starter";
  const isPro = userPlan === "pro";


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
      content: "AI logo generator, free caption generator, free hashtag generator, brand workspace, brand kit generator, Instagram caption generator, TikTok hook generator, growth roadmap generator, brand bio generator",
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
    tone: row.tone || "Modern",
    style: row.style || "",
    launchGoal: row.launch_goal || "",
    saved: emptySavedBuckets(),
    createdAt: row.created_at || new Date().toISOString(),
  });

  const mapGenerationRow = (row) => ({
    id: row.id,
    tool: row.tool,
    title: row.title || `${row.tool || "Asset"} • ${new Date(row.created_at || Date.now()).toLocaleDateString()}`,
    content: row.content || "",
    image: row.image_url || "",
    favorite: Boolean(row.favorite),
    createdAt: row.created_at || new Date().toISOString(),
  });

  const loadSavedWorkspaceData = async (currentUser) => {
    if (!currentUser?.id) return;

    try {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("plan, daily_logo_uses, last_logo_use_date")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profile?.plan) {
        localStorage.setItem("brandthat_plan", profile.plan);
        setUserPlan(profile.plan);
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
        workspace.saved[bucket].push(mapGenerationRow(row));
      });

      if (workspaceList.length > 0) {
        setBrandWorkspaces(workspaceList);
        const existingActive = workspaceList.find((workspace) => workspace.id === activeBrandId);
        setActiveBrandId(existingActive?.id || workspaceList[0].id);
      }
    } catch (error) {
      console.warn("Could not load saved Brandthat workspaces:", error.message);
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

    const month = getMonthKey();
    const storedMonth = localStorage.getItem("brandthat_starter_logo_month");
    if (storedMonth !== month) {
      localStorage.setItem("brandthat_starter_logo_month", month);
      localStorage.setItem("brandthat_starter_logo_count", "0");
      setStarterLogoCount(0);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      const pendingPlan = localStorage.getItem("brandthat_pending_plan");
      if (pendingPlan === "starter" || pendingPlan === "pro") {
        localStorage.setItem("brandthat_plan", pendingPlan);
        setUserPlan(pendingPlan);
        localStorage.removeItem("brandthat_pending_plan");
      }
      window.history.replaceState({}, "", "/");
    }

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      const currentUser = data.session?.user || null;
      setUser(currentUser);
      if (currentUser) loadSavedWorkspaceData(currentUser);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        loadSavedWorkspaceData(currentUser);
      } else {
        setUserPlan("free");
      }
    });

    const onPop = () => {
      setPage(getInitialPageFromPath());
      setActiveToolKey(getInitialToolFromPath());
    };

    window.addEventListener("popstate", onPop);

    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("brandthat_brand_workspaces", JSON.stringify(brandWorkspaces));
  }, [brandWorkspaces]);

  useEffect(() => {
    localStorage.setItem("brandthat_favorite_ids", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    const draftHasContent = Object.values(workspaceDraft || {}).some((value) => String(value || "").trim());
    if (!draftHasContent) return;

    setAutoSaveStatus("Saving draft...");
    const timer = setTimeout(() => {
      localStorage.setItem("brandthat_workspace_draft", JSON.stringify(workspaceDraft));
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
    if (page === "home" && activeToolKey !== "logo") {
      setActiveToolKey("logo");
    }
  }, [page, activeToolKey]);

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

  const finishAuthSuccess = (loggedInUser) => {
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
    } else {
      notify("success", "Logged in", "Welcome back to your Brandthat workspace.");
    }
  };

  const signUp = async () => {
    const email = authEmail.trim().toLowerCase();

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
      setUserPlan("free");

      if (data?.session?.user) {
        finishAuthSuccess(data.session.user);
      } else {
        setAuthMode("login");
        setAuthMessage("Account created. Check your inbox and spam folder to confirm your email, then log in here. If no email arrives, check Supabase Auth email settings.");
      }
    } catch (error) {
      setAuthMessage("Something went wrong creating your account. Please try again.");
    }

    setLoading(false);
  };

  const logIn = async () => {
    const email = authEmail.trim().toLowerCase();

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

  const startCheckout = async (plan) => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || user;

    if (!currentUser?.email) {
      localStorage.setItem("brandthat_pending_plan", plan);
      openAuth("login", "Log in or create a free Brandthat account first, then continue to checkout.");
      return;
    }

    localStorage.setItem("brandthat_pending_plan", plan);
    setLoading(true);

    try {
      const response = await fetch("/.netlify/functions/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: currentUser.email })
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        notify("error", "Checkout could not start", data.error || "Please try again in a moment.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      handleAppError("Checkout failed", error, "Please try again in a moment.");
    }

    setLoading(false);
  };

  const createWorkspace = async () => {
    if (!workspaceDraft.name.trim()) {
      notify("error", "Add a brand name first", "Your workspace needs a name before it can be saved.");
      return;
    }

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

    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from("brand_workspaces")
          .insert({
            user_id: user.id,
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
        brand = mapWorkspaceRow(data);
      } catch (error) {
        notify("warning", "Workspace saved locally", `We could not save this to your account yet. ${error.message || ""}`);
      }
    }

    const next = [brand, ...brandWorkspaces.filter((item) => item.id !== brand.id)];
    setBrandWorkspaces(next);
    setActiveBrandId(brand.id);
    setPrompt(buildBrandPrompt(brand));
    setActiveToolKey("logo");
    setSelectedPlatform(brand.style || "");
    setCreativeTone(brand.tone || "");
    setResult("");
    setLogoImage("");
    setPage("logo");
    setWorkspaceDraft(getDefaultWorkspaceDraft());
    localStorage.removeItem("brandthat_workspace_draft");
    notify("success", "Workspace created", `${brand.name} is ready. Start generating brand assets.`);
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const selectBrand = (brandId) => {
    const brand = brandWorkspaces.find((item) => item.id === brandId);
    if (!brand) return;
    setActiveBrandId(brand.id);
    setPrompt(buildBrandPrompt(brand));
    setSelectedPlatform(brand.style || "");
    setCreativeTone(brand.tone || "");
    setResult("");
    setLogoImage("");
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

  const saveCurrentOutput = async () => {
    if (!activeBrand) {
      notify("error", "Create a Brand Workspace first", "Then you can save outputs, favorites, and brand kits to that workspace.");
      return;
    }

    if (!result && !logoImage) {
      notify("error", "Generate something first", "Once an output appears, you can save it to your workspace.");
      return;
    }

    const bucket = activeTool.key === "logo" ? "logos" : activeTool.key;
    let entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      tool: activeTool.key,
      title: `${activeTool.shortTitle} • ${new Date().toLocaleDateString()}`,
      content: result,
      image: logoImage,
      createdAt: new Date().toISOString(),
    };

    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from("saved_generations")
          .insert({
            user_id: user.id,
            workspace_id: activeBrand.id,
            tool: activeTool.key,
            title: entry.title,
            content: entry.content,
            image_url: entry.image,
          })
          .select("*")
          .single();

        if (error) throw error;
        entry = mapGenerationRow(data);
      } catch (error) {
        notify("warning", "Saved locally", `We could not save this to your account yet. ${error.message || ""}`);
      }
    }

    setBrandWorkspaces((prev) =>
      prev.map((brand) =>
        brand.id === activeBrand.id
          ? {
              ...brand,
              logoImage: activeTool.key === "logo" && logoImage ? logoImage : brand.logoImage,
              saved: {
                ...brand.saved,
                [bucket]: [entry, ...(brand.saved?.[bucket] || [])],
              },
            }
          : brand
      )
    );

    notify("success", "Saved to workspace", `${entry.title} was added to ${activeBrand.name}.`);
    return entry;
  };

  const setLogoAsBrandProfile = async () => {
    if (!activeBrand) {
      notify("error", "Create a Brand Workspace first", "Then you can set a generated logo as the brand profile image.");
      return;
    }

    if (!logoImage) {
      notify("error", "Generate a logo first", "Once a logo appears, you can set it as this workspace's brand image.");
      return;
    }

    setBrandWorkspaces((prev) =>
      prev.map((brand) =>
        brand.id === activeBrand.id
          ? { ...brand, logoImage }
          : brand
      )
    );

    if (user?.id) {
      try {
        const { error } = await supabase
          .from("brand_workspaces")
          .update({ logo_image_url: logoImage, updated_at: new Date().toISOString() })
          .eq("id", activeBrand.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } catch (error) {
        console.warn("Could not sync brand profile logo:", error.message);
      }
    }

    notify("success", "Brand logo updated", `${activeBrand.name} now uses this generated logo as its workspace image.`);
  };

  const buildWorkspaceKit = () => {
    if (!activeBrand) return "Create a Brand Workspace first.";

    const saved = activeBrand.saved || {};
    const captions = saved.captions?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved captions yet.";
    const hooks = saved.hooks?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved hooks yet.";
    const bios = saved.bios?.slice(0, 2).map((x) => x.content).join("\n\n") || "No saved bios yet.";

    return `BRANDTHAT.AI BRAND KIT

Brand Name:
${activeBrand.name}

Logo Direction:
${activeBrand.logoDirection || "Not added yet."}

Brand Description:
${activeBrand.description || "Not added yet."}

Audience:
${activeBrand.audience || "Not added yet."}

Audience Pain / Desire:
${activeBrand.audiencePain || "Not added yet."}

Core Offer:
${activeBrand.offer || "Not added yet."}

Differentiator:
${activeBrand.differentiator || "Not added yet."}

Competitors / References:
${activeBrand.competitors || "Not added yet."}

Brand Tone:
${activeBrand.tone}

Visual Style:
${activeBrand.style || "Not added yet."}

Primary Channels:
${activeBrand.channels || "Not added yet."}

Growth Platform:
${activeBrand.growthPlatform || "Not added yet."}

Current Followers:
${activeBrand.currentFollowers || "Not added yet."}

Target Followers:
${activeBrand.targetFollowers || "Not added yet."}

Weekly Time Available:
${activeBrand.weeklyTime || "Not added yet."}

Launch Goal:
${activeBrand.launchGoal || "Not added yet."}

Brand Readiness Score:
${getBrandReadinessScore(activeBrand)}%

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

  const downloadBrandKit = () => {
    const kit = buildWorkspaceKit();
    const blob = new Blob([kit], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const element = document.createElement("a");
    element.href = url;
    element.download = `${activeBrand?.name || "brandthat"}-brand-kit.txt`;
    element.click();
    URL.revokeObjectURL(url);
    notify("success", "Brand kit downloaded", "Your workspace export is ready.");
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
    };

    const newBrand = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      ...duplicateDraft,
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
    setPrompt(buildBrandPrompt(finalBrand));
    notify("success", "Workspace duplicated", `${finalBrand.name} is ready to edit.`);
  };

  const toggleFavorite = (entryId) => {
    if (!entryId) return;
    setFavoriteIds((prev) => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  const remixOutput = (entry) => {
    if (!entry) return;
    const tool = toolMap[entry.tool] || activeTool;
    setActiveToolKey(tool.key);
    setSelectedPlatform(activeBrand?.style || "");
    setCreativeTone(activeBrand?.tone || "");
    setPrompt(`Remix this ${tool.shortTitle || "brand asset"} into a stronger version:

${entry.content || "Use the saved logo direction and improve it."}`);
    setResult("");
    setLogoImage("");
    setPage(tool.key === "logo" ? "logo" : "studio");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth" }), 80);
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
    return `Brand name: ${brand.name}
Brand description: ${brand.description}
Audience: ${brand.audience}
Audience pain/desire: ${brand.audiencePain || "Not provided"}
Core offer: ${brand.offer || "Not provided"}
Differentiator: ${brand.differentiator || "Not provided"}
Competitors/references: ${brand.competitors || "Not provided"}
Brand tone: ${brand.tone}
Logo direction: ${brand.logoDirection}
Visual style: ${brand.style}
Primary channels: ${brand.channels || "Not provided"}
Growth platform: ${brand.growthPlatform || "Not provided"}
Current followers: ${brand.currentFollowers || "Not provided"}
Target followers: ${brand.targetFollowers || "Not provided"}
Weekly time available: ${brand.weeklyTime || "Not provided"}
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


  const incrementStarterLogoUse = () => {
    const month = getMonthKey();
    const storedMonth = localStorage.getItem("brandthat_starter_logo_month");
    let currentCount = starterLogoCount;

    if (storedMonth !== month) {
      currentCount = 0;
      localStorage.setItem("brandthat_starter_logo_month", month);
    }

    const newCount = currentCount + 1;
    localStorage.setItem("brandthat_starter_logo_count", String(newCount));
    setStarterLogoCount(newCount);
  };

  const selectTool = (toolKey) => {
    const nextTool = toolMap[toolKey] || tools[0];
    setActiveToolKey(nextTool.key);
    setSelectedPlatform("");
    setCreativeTone("");
    setPrompt("");
    setResult("");
    setLogoImage("");
    setPage(nextTool.key === "logo" ? "logo" : "studio");
    window.history.pushState({}, "", "/");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  const openSeoPage = (seoKey) => {
    const seoPage = seoPages[seoKey];
    if (!seoPage) return;
    const nextTool = toolMap[seoPage.toolKey] || tools[0];

    window.history.pushState({}, "", seoPage.path);
    setPage(seoKey);
    setActiveToolKey(nextTool.key);
    setSelectedPlatform("");
    setCreativeTone("");
    setPrompt("");
    setResult("");
    setLogoImage("");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const getSystemPrompt = () => {
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
`
      : "";

    if (activeTool.key === "captions") {
      return `
You are Brandthat.ai's free caption generator.

User platform:
${selectedPlatform || "General social media"}

User post/topic description:
${prompt}

Task:
Generate exactly 10 different captions based only on what the user wrote.

Format:
Return ONLY a numbered list from 1 to 10.
Do not add headings.
Do not explain anything.
Do not mention Brandthat.ai unless the user specifically asks for that brand.

Rules:
- Exactly 10 captions.
- Every caption must relate directly to the user's post/topic.
- Make them platform-aware for ${selectedPlatform || "the selected platform"}.
- Include a mix of short, polished, warm, clever, CTA, and storytelling styles.
- Avoid cheesy filler.
- Keep each caption copy-ready.
`;
    }

    if (activeTool.key === "hashtags") {
      return `
You are Brandthat.ai's free hashtag generator.

User platform:
${selectedPlatform || "General social media"}

User topic/post description:
${prompt}

Task:
Generate exactly 50 highly relevant hashtags based only on what the user wrote.

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
- Avoid repeated hashtags.
- Keep the output easy to copy and paste.
`;
    }

    if (["hooks", "bios", "email", "strategy", "brand", "audit", "campaign", "growth"].includes(activeTool.key)) {
      const toolInstructions = {
        hooks: "Generate exactly 10 short-form video hooks. Make them scroll-stopping, specific, and usable as on-screen text for the selected platform.",
        bios: "Generate exactly 10 polished bio options. Make them clear, concise, profile-ready, and specific to the user's brand or idea.",
        email: "Generate exactly 10 complete email options. Each option must include a subject line, short preview text, concise body copy, and a clear CTA. Make the emails accurate to the user's request and ready to send after light editing.",
        strategy: "Generate exactly 10 practical social strategy ideas. Each option should be specific, actionable, and useful for the selected platform or campaign.",
        brand: "Generate exactly 10 brand creation directions. Each option should include a brand name or concept, positioning, audience, and launch angle.",
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
- Exactly 10 results.
- Every result must directly relate to what the user typed.
- Make each result copy-ready, practical, and strategically useful.
- Avoid generic filler and cheesy phrasing.
- Keep the output fast, clean, and easy to scan.
- If generating emails, make the email content specific, accurate, and complete enough to use.
- If auditing or building a campaign, give direct recommendations and next actions, not vague advice.
- If creating a growth roadmap, make the schedule realistic, specific, and organized by daily, weekly, 30-day, 60-day, and 90-day actions.
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
- Use clear headings and spacing.
- Give multiple useful options when appropriate.
- Format output in clean sections.
- Make the output easy to copy and use immediately.
- Avoid fluff.
- Avoid saying "as an AI."
- Do not use Markdown bold markers like **text**.
- Do not use decorative symbols, asterisks, emoji, or spammy formatting.
- Be modern, premium, practical, and brand-aware.
`;
  };

  const createLogoImage = async () => {
    const enhancedLogoPrompt = `
Create a high-quality professional logo.

Brand/request:
${prompt}

Logo style direction:
${selectedPlatform || "Use the best style for the user's request."}

Tone / feeling:
${creativeTone || "Premium, clean, memorable, and brand-appropriate."}

Brand workspace context:
${activeBrand ? buildBrandPrompt(activeBrand) : "No saved workspace yet. Use the user's request as the full brand direction."}

Requirements:
- Generate a polished logo concept suitable for a real business.
- Adapt to any requested style: luxury, minimal, mascot, character, emblem, badge, monogram, wordmark, lettermark, icon, vintage, retro, tech, AI, fashion, ranch, real estate, restaurant, fitness, beauty, ecommerce, startup, creator brand, photography, construction, wellness, hospitality, or local service business.
- If the user asks for a specific style, industry, animal, object, letter, color palette, era, mood, or reference direction, prioritize that request.
- Prioritize strong composition, clean typography, scalability, contrast, and memorability.
- The logo should work as a website logo, favicon, social profile image, business card mark, and brand identity anchor.
- Avoid clutter, low-quality clipart, muddy details, and messy text.
- Avoid misspelled text.
- If text is included, keep it minimal, clean, and highly legible.
- Make it feel premium, professional, and commercially usable.
`;

    const response = await fetch("/.netlify/functions/logo-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: activeBrand?.name || "",
        logoPrompt: enhancedLogoPrompt
      })
    });

    const data = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(data.error || "Logo image generation failed.");
    }

    return data.image;
  };

  const generate = async (overrideUser = null) => {
    const currentUser = overrideUser || user;
    if (!prompt.trim()) {
      notify("error", "Add a prompt first", `Tell Brandthat what you want the ${activeTool.title} to create.`);
      return;
    }

    const isFreeSimpleTool = activeTool.key === "hashtags" || activeTool.key === "captions";

    if (!currentUser && !isFreeSimpleTool) {
      openAuth("login", "Log in or create a free account to generate and save your brand asset.", "generate");
      return;
    }

    if (activeTool.key !== "logo" && activeTool.key !== "hashtags" && activeTool.key !== "captions" && !activeBrand) {
      setPage("workspace");
      notify("warning", "Create a workspace first", "Text tools are stronger when they are connected to a saved brand workspace.");
      setResult("Create a Brand Workspace first so your saved captions, hooks, bios, and brand assets stay organized.");
      return;
    }

    if (activeTool.key === "logo" && isFree && dailyFreeCount >= 1) {
      setPage("pricing");
      notify("warning", "Free logo generation used", "Starter includes 10 logo generations/month. Pro unlocks unlimited logo generations.");
      setResult("Your free logo generation has been used. Upgrade to Starter for 10 logo generations/month or Pro for unlimited logo generations.");
      return;
    }

    if (activeTool.key === "logo" && isStarter && starterLogoCount >= 10) {
      setPage("pricing");
      notify("warning", "Starter logo limit reached", "Starter includes 10 logo generations/month. Upgrade to Pro for unlimited logo generations.");
      setResult("You have used your 10 Starter logo generations this month. Upgrade to Pro for unlimited AI logo generation.");
      return;
    }

    setLoading(true);
    setLogoImage("");

    try {
      if (activeTool.key === "logo") {
        const image = await createLogoImage();
        setLogoImage(image);
        setResult(
          `Your logo image has been generated.\n\nBrand direction used:\n${prompt}\n\nCreate or use a Brand Workspace if you want to save this logo into a full brand kit.`
        );
      } else {
        const response = await fetch("/.netlify/functions/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: `${getSystemPrompt()}

User request:
${prompt}`
          })
        });

        const data = await readJsonResponse(response);
        if (!response.ok) {
          throw new Error(data.error || "Generation failed.");
        }
        setResult(cleanGeneratedText(data.text || "No response generated."));
      }

      if (activeTool.key === "logo" && isFree) incrementDailyFreeUse();
      if (activeTool.key === "logo" && isStarter) incrementStarterLogoUse();
    } catch (error) {
      handleAppError("Generation failed", error, "The AI request could not complete. Please adjust your prompt or try again.");
      setResult(error.message || "Something went wrong. Please try again.");
    }

    setLoading(false);
  };

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
    setResult("");
    setLogoImage("");
  };

  const subscribe = () => {
    if (!subscribeEmail) {
      setSubscribeMessage("Please enter your email.");
      return;
    }
    localStorage.setItem("brandthat_newsletter", subscribeEmail);
    setSubscribeMessage("You're subscribed. Thank you.");
    setSubscribeEmail("");
  };

  return (
    <div className="app">
      <style>{css}</style>

      <nav className="nav">
        <button className="brand" onClick={() => { setActiveToolKey("logo"); setPage("home"); window.history.pushState({}, "", "/"); }}>Brandthat</button>

        <div className="navLinks">
          <button onClick={() => setPage("workspace")}>Workspace</button>
          <button onClick={() => openSeoPage("seo-logo")}>AI Logo Generator</button>
          <button onClick={() => setPage("features")}>Tools</button>
          <button onClick={() => setPage("pricing")}>Pricing</button>
        </div>

        {user ? (
          <button className="accountBtn" onClick={logOut}>Log out</button>
        ) : (
          <button className="accountBtn" onClick={() => openAuth("login")}>Log in</button>
        )}
      </nav>

      {appNotice && (
        <div className={`appNotice ${appNotice.type || "info"}`}>
          <button aria-label="Close notification" onClick={() => setAppNotice(null)}>×</button>
          <strong>{appNotice.title}</strong>
          {appNotice.message && <span>{appNotice.message}</span>}
        </div>
      )}

      {page === "home" && (
        <>
          <main className="hero logoHero">
            <div className="heroTop">
              <div className="eyebrow">AI LOGO GENERATOR + FREE BRAND TOOLS</div>
              <h1>Create a logo. Build the brand around it.</h1>
              <p className="lead">Start with a premium AI logo, then use free captions and hashtags to test your brand in public. When you are ready, save everything into a Brand Workspace.</p>
              
              <div className="heroCtas">
                <button className="btn dark" onClick={() => openSeoPage("seo-logo")}>Try AI Logo Generator</button>
                <button className="btn light" onClick={() => selectTool("captions")}>Free Caption Generator</button>
                <button className="btn light" onClick={() => selectTool("hashtags")}>Free Hashtag Generator</button>
              </div>
            </div>

            <GeneratorCard
              activeTool={activeToolKey === "logo" ? activeTool : toolMap.logo}
              prompt={prompt}
              setPrompt={setPrompt}
              selectedPlatform={selectedPlatform}
              setSelectedPlatform={setSelectedPlatform}
              creativeTone={creativeTone}
              setCreativeTone={setCreativeTone}
              generate={generate}
              loading={loading}
              result={result}
              logoImage={logoImage}
              user={user}
              userPlan={userPlan}
              dailyRemaining={dailyRemaining}
              starterLogoRemaining={starterLogoRemaining}
              copyToClipboard={copyToClipboard}
              shareOutput={shareOutput}
              clearGenerator={clearGenerator}
              saveCurrentOutput={saveCurrentOutput}
              setLogoAsBrandProfile={setLogoAsBrandProfile}
              toggleFavorite={toggleFavorite}
              remixOutput={remixOutput}
            />
          </main>

          <section className="freeToolsSection">
            <div>
              <div className="tinyTag">FREE TOOLS</div>
              <h2>Use the free tools first. Save the full brand when it starts working.</h2>
            </div>
            <div className="freeToolCards">
              <button onClick={() => selectTool("captions")}>
                <strong>Caption Generator</strong>
                <span>10 copy-ready captions for any platform.</span>
              </button>
              <button onClick={() => selectTool("hashtags")}>
                <strong>Hashtag Generator</strong>
                <span>50 relevant hashtags in one clean block.</span>
              </button>
              <button onClick={() => selectTool("growth")}>
                <strong>Growth Roadmap</strong>
                <span>Turn goals like 100K followers into a practical plan.</span>
              </button>
            </div>
          </section>

          <HomepageSEOContent openSeoPage={openSeoPage} />
        </>
      )}

      {page === "workspace" && (
        <section className="pageSection">
          <div className="tinyTag">SAVED BRAND WORKSPACES</div>
          <h1 className="pageTitle">Build and save your brands.</h1>
          <p className="pageLead">Create one or more brands, save generated captions/hooks/bios/logos, and export a simple brand kit. This is what turns Brandthat into your AI brand system.</p>

          <div className="workspaceLayout">
            <WorkspaceCreator
              workspaceDraft={workspaceDraft}
              setWorkspaceDraft={setWorkspaceDraft}
              createWorkspace={createWorkspace}
              autoSaveStatus={autoSaveStatus}
            />

            <WorkspaceLibrary
              brandWorkspaces={brandWorkspaces}
              activeBrand={activeBrand}
              selectBrand={selectBrand}
              deleteBrand={deleteBrand}
              duplicateBrand={duplicateBrand}
              downloadBrandKit={downloadBrandKit}
              setPage={setPage}
            />
          </div>

          {activeBrand && (
            <SavedAssets
              brand={activeBrand}
              recentGenerations={getRecentGenerations()}
              favoriteIds={favoriteIds}
              toggleFavorite={toggleFavorite}
              remixOutput={remixOutput}
              copyToClipboard={copyToClipboard}
            />
          )}
        </section>
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
          generate={generate}
          loading={loading}
          result={result}
          logoImage={logoImage}
          user={user}
          userPlan={userPlan}
          dailyRemaining={dailyRemaining}
          starterLogoRemaining={starterLogoRemaining}
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
              saveCurrentOutput={saveCurrentOutput}
              setLogoAsBrandProfile={setLogoAsBrandProfile}
              openSeoPage={openSeoPage}
        />
      )}

      {page === "features" && (
        <section className="pageSection">
          <div className="tinyTag">TOOLS</div>
          <h1 className="pageTitle">Choose exactly what you want Brandthat to create.</h1>
          <ToolGrid activeToolKey={activeToolKey} selectTool={selectTool} />
        </section>
      )}

      {page === "pricing" && (
        <section className="pageSection">
          <div className="tinyTag">PRICING</div>
          <h1 className="pageTitle">Build for free. Upgrade when your brand needs more.</h1>
          <p className="pageLead">Start free with simple hashtag creation and one logo generation after signup. Starter gives growing creators more brand building power with 10 logo generations per month. Pro is for users who want unlimited logo creation and the full brand workspace experience.</p>

          <div className="pricingGrid threePlans"><PriceCard
              name="FREE"
              price="$0"
              desc="Try Brandthat and create quick social assets."
              features={["Free caption generator", "Free hashtag generator", "1 AI logo generation after signup", "1 Brand Workspace", "Basic hooks/bios", "Basic brand kit export"]}
              onClick={() => setPage("workspace")}
            />
            <PriceCard
              name="STARTER"
              price="$10"
              desc="For creators and businesses building real brand assets every month."
              features={["10 AI logo generations per month", "Unlimited hooks/bios/email/strategy", "Saved workspaces and history", "Social strategy tools", "Downloadable brand kits", "Priority saved assets"]}
              onClick={() => startCheckout("starter")}
            />
            <PriceCard
              name="PRO"
              price="$20"
              featured
              desc="For power users who want unlimited brand and logo creation."
              features={["Unlimited AI logo generations", "Unlimited text tools", "Full saved Brand Workspaces", "Downloadable brand kits", "Priority logo generations", "Future premium visual tools"]}
              onClick={() => startCheckout("pro")}
            />
          </div>
        </section>
      )}

      {(page === "studio" || page === "logo") && (
        <section className="pageSection" id="brandthat-generator">
          <div className="tinyTag">{activeTool.label}</div>
          <h1 className="pageTitle">{activeTool.title}</h1>
          <p className="pageLead">{activeTool.desc} Select the type, describe what you need, and Brandthat will generate it around your active brand workspace.</p>

          {activeBrand && (
            <div className="activeBrandBar">
              <strong>Active Brand:</strong> {activeBrand.name}
              {activeBrand.logoImage && <img className="activeBrandLogo" src={activeBrand.logoImage} alt={`${activeBrand.name} logo`} />}
              <span>{getBrandReadinessScore(activeBrand)}% ready</span>
              <button onClick={() => setPage("workspace")}>View Workspace</button>
            </div>
          )}

          <GeneratorCard
            activeTool={activeTool}
            prompt={prompt}
            setPrompt={setPrompt}
            selectedPlatform={selectedPlatform}
            setSelectedPlatform={setSelectedPlatform}
            creativeTone={creativeTone}
            setCreativeTone={setCreativeTone}
            generate={generate}
            loading={loading}
            result={result}
            logoImage={logoImage}
            user={user}
            userPlan={userPlan}
            dailyRemaining={dailyRemaining}
            copyToClipboard={copyToClipboard}
            shareOutput={shareOutput}
            clearGenerator={clearGenerator}
            saveCurrentOutput={saveCurrentOutput}
            setLogoAsBrandProfile={setLogoAsBrandProfile}
            toggleFavorite={toggleFavorite}
            remixOutput={remixOutput}
          />
        </section>
      )}

      <footer className="footerSubscribe">
        <div>
          <div className="tinyTag">NEWSLETTER</div>
          <h2>Subscribe for Brandthat updates.</h2>
          <p>Get product news, AI content tips, launch updates, and new feature announcements.</p>
        </div>
        <div className="footerForm">
          <input placeholder="Enter your email" value={subscribeEmail} onChange={(e) => setSubscribeEmail(e.target.value)} />
          <button className="btn dark" onClick={subscribe}>Subscribe</button>
          {subscribeMessage && <span>{subscribeMessage}</span>}
        </div>
      </footer>

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
                ? "Create one account to save your workspaces, logo generations, captions, hooks, bios, and brand kits."
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

function WorkspaceCreator({ workspaceDraft, setWorkspaceDraft, createWorkspace, autoSaveStatus }) {
  return (
    <div className="workspaceCard">
      <div className="tinyTag">START HERE</div>
      <h2>Create a Brand Workspace</h2>
      <p>Save the basics once, then every tool can reuse the same brand name, voice, logo, and growth goal.</p>
      <span className="autoSavePill">{autoSaveStatus}</span>
      <div className="workspaceGrid">
        <input
          placeholder="Brand name"
          value={workspaceDraft.name}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, name: e.target.value })}
        />
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

      <textarea
        placeholder="Brand description. Example: A premium AI creative studio helping creators and businesses build logos, captions, and brand systems fast."
        value={workspaceDraft.description}
        onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, description: e.target.value })}
      />

      <div className="workspaceGrid">
        <select
          value={workspaceDraft.growthPlatform || ""}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, growthPlatform: e.target.value })}
        >
          <option value="">Primary growth platform</option>
          <option value="Instagram">Instagram</option>
          <option value="TikTok">TikTok</option>
          <option value="YouTube Shorts">YouTube Shorts</option>
          <option value="LinkedIn">LinkedIn</option>
          <option value="Facebook">Facebook</option>
          <option value="Pinterest">Pinterest</option>
          <option value="Multi-platform">Multi-platform</option>
        </select>
        <input
          placeholder="Main goal. Example: Reach 100K followers"
          value={workspaceDraft.targetFollowers || workspaceDraft.launchGoal}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, targetFollowers: e.target.value, launchGoal: e.target.value })}
        />
      </div>

      <textarea
        placeholder="Logo direction. Example: Black-and-white, modern B monogram, clean premium technology feel, works as favicon and social profile image."
        value={workspaceDraft.logoDirection}
        onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, logoDirection: e.target.value })}
      />

      <details className="advancedWorkspaceFields">
        <summary>Optional details for sharper AI results</summary>

        <div className="workspaceGrid">
          <textarea
            placeholder="Audience or ideal customer. Optional, but useful for sharper output."
            value={workspaceDraft.audience}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, audience: e.target.value })}
          />
          <textarea
            placeholder="Audience pain/desire. Example: Small businesses need better branding but do not have time or budget for a full agency."
            value={workspaceDraft.audiencePain || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, audiencePain: e.target.value })}
          />
        </div>

        <div className="workspaceGrid">
          <textarea
            placeholder="Core offer. Example: AI tools that create logos, captions, hooks, bios, campaigns, and brand kits."
            value={workspaceDraft.offer || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, offer: e.target.value })}
          />
          <textarea
            placeholder="Differentiator. Example: Logo-first brand building with saved workspaces and launch-ready content."
            value={workspaceDraft.differentiator || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, differentiator: e.target.value })}
          />
        </div>

        <div className="workspaceGrid">
          <input
            placeholder="Current followers. Example: 1,250"
            value={workspaceDraft.currentFollowers || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, currentFollowers: e.target.value })}
          />
          <input
            placeholder="Weekly time available. Example: 5 hours/week"
            value={workspaceDraft.weeklyTime || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, weeklyTime: e.target.value })}
          />
        </div>

        <div className="workspaceGrid">
          <input
            placeholder="Competitors or references. Example: Canva, Looka, Jasper, Tailor Brands."
            value={workspaceDraft.competitors || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, competitors: e.target.value })}
          />
          <input
            placeholder="Primary channels. Example: Instagram, TikTok, website, email."
            value={workspaceDraft.channels || ""}
            onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, channels: e.target.value })}
          />
        </div>
      </details>

      <button className="btn dark full" onClick={createWorkspace}>Create Brand Workspace</button>
    </div>
  );
}

function WorkspaceLibrary({ brandWorkspaces, activeBrand, selectBrand, deleteBrand, duplicateBrand, downloadBrandKit, setPage }) {
  return (
    <div className="workspaceCard">
      <div className="tinyTag">MY BRANDS</div>
      <h2>Saved Brand Workspaces</h2>
      <p>Each workspace keeps its own logos, captions, hooks, bios, favorites, and launch assets.</p>

      {brandWorkspaces.length === 0 ? (
        <div className="emptyState">No brands yet. Create your first workspace.</div>
      ) : (
        <div className="brandList">
          {brandWorkspaces.map((brand) => (
            <div className={activeBrand?.id === brand.id ? "brandRow activeBrandRow" : "brandRow"} key={brand.id}>
              <button onClick={() => selectBrand(brand.id)}>
                {brand.logoImage && <img className="brandRowLogo" src={brand.logoImage} alt={`${brand.name} logo`} />}
                <strong>{brand.name}</strong>
                <span>{getBrandReadinessScore(brand)}% ready • {brand.tone} • {brand.audience || "Audience not set"}</span>
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
          <div>
            <span>Brand Readiness</span>
            <strong>{getBrandReadinessScore(activeBrand)}%</strong>
          </div>
          <p>{activeBrand.differentiator || activeBrand.offer || activeBrand.description || "Add offer, audience, differentiator, channels, and launch details to make this workspace more powerful."}</p>
        </div>
      )}

      <div className="workspaceActions">
        <button className="btn light" onClick={() => setPage("features")}>Open Tools</button>
        <button className="btn dark" onClick={downloadBrandKit}>Download Brand Kit</button>
      </div>
    </div>
  );
}

function SavedAssets({ brand, recentGenerations = [], favoriteIds = {}, toggleFavorite, remixOutput, copyToClipboard }) {
  const buckets = [
    ["logos", "Saved Logos"],
    ["captions", "Saved Captions"],
    ["hooks", "Saved Hooks"],
    ["bios", "Saved Bios"],
    ["hashtags", "Saved Hashtags"],
    ["email", "Saved Emails"],
    ["strategy", "Saved Strategy"],
    ["brand", "Saved Brand Ideas"],
    ["audit", "Saved Audits"],
    ["campaign", "Saved Campaigns"],
    ["growth", "Saved Growth Roadmaps"],
  ];

  const favoriteItems = buckets
    .flatMap(([key]) => (brand.saved?.[key] || []).map((item) => ({ ...item, bucket: key })))
    .filter((item) => favoriteIds[item.id] || item.favorite);

  const renderItem = (item) => (
    <div className="savedItem" key={item.id}>
      {item.image && <img src={item.image} alt={item.title} />}
      <strong>{item.title}</strong>
      {item.content && <p>{item.content.split("\n").filter(Boolean).slice(0, 2).join(" ").slice(0, 140)}{item.content.length > 140 ? "..." : ""}</p>}
      <div className="savedItemActions">
        <button onClick={() => toggleFavorite(item.id)}>{favoriteIds[item.id] || item.favorite ? "Favorited" : "Favorite"}</button>
        {item.content && <button onClick={() => copyToClipboard(item.content)}>Copy</button>}
        <button onClick={() => remixOutput(item)}>Remix</button>
      </div>
    </div>
  );

  return (
    <section className="savedAssets">
      <div className="tinyTag">SAVED OUTPUTS</div>
      <h2>{brand.name} Brand Kit</h2>

      <div className="recentPanel">
        <div>
          <h3>Recent Generations</h3>
          <p>Your newest saved logos, captions, hooks, bios, and launch assets.</p>
        </div>
        <div className="recentList">
          {recentGenerations.length === 0 ? (
            <span>No recent generations yet.</span>
          ) : (
            recentGenerations.slice(0, 5).map((item) => (
              <button key={item.id} onClick={() => remixOutput(item)}>
                <strong>{item.title}</strong>
                <span>{item.brandName}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {favoriteItems.length > 0 && (
        <div className="favoritePanel">
          <h3>Favorites</h3>
          <div className="savedGrid compactSavedGrid">
            {favoriteItems.slice(0, 4).map(renderItem)}
          </div>
        </div>
      )}

      <div className="savedGrid">
        {buckets.map(([key, title]) => {
          const items = brand.saved?.[key] || [];
          return (
            <div className="savedBucket" key={key}>
              <h3>{title}</h3>
              {items.length === 0 ? (
                <p>No saved outputs yet.</p>
              ) : (
                items.slice(0, 3).map(renderItem)
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HomepageSEOContent({ openSeoPage }) {
  return (
    <section className="seoHomeSection">
      <div className="tinyTag">AI BRANDING TOOLS</div>
      <h2>Brandthat.ai helps creators and small businesses create logos, captions, hashtags, and brand kits faster.</h2>
      <p>
        Start with the AI Logo Generator, use the free caption and hashtag generators to publish faster, then save your strongest work into a Brand Workspace when you are ready to build a complete brand system.
      </p>
      <div className="seoInternalLinks">
        <button onClick={() => openSeoPage("seo-logo")}>AI Logo Generator</button>
        <button onClick={() => openSeoPage("seo-instagram")}>Instagram Caption Generator</button>
        <button onClick={() => openSeoPage("seo-hashtag")}>Free Hashtag Generator</button>
        <button onClick={() => openSeoPage("seo-growth")}>Growth Roadmap Generator</button>
        <button onClick={() => openSeoPage("seo-tiktok")}>TikTok Hook Generator</button>
        <button onClick={() => openSeoPage("seo-bio")}>Brand Bio Generator</button>
      </div>
      <div className="seoTextGrid simpleSeoGrid">
        <div>
          <h3>Logo-first brand building</h3>
          <p>Create a visual direction first, then build matching captions, bios, hashtags, hooks, emails, and launch copy around the same brand.</p>
        </div>
        <div>
          <h3>Free tools people can use immediately</h3>
          <p>The caption generator and hashtag generator help creators test ideas quickly before creating a saved workspace.</p>
        </div>
        <div>
          <h3>Simple workspace when it matters</h3>
          <p>Save the brand name, voice, logo, and growth goal so every future output feels more consistent.</p>
        </div>
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
  generate,
  loading,
  result,
  logoImage,
  user,
  userPlan,
  dailyRemaining,
  starterLogoRemaining,
  copyToClipboard,
  shareOutput,
  clearGenerator,
  saveCurrentOutput,
  setLogoAsBrandProfile,
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
        <GeneratorCard
          activeTool={activeTool}
          prompt={prompt}
          setPrompt={setPrompt}
          selectedPlatform={selectedPlatform}
          setSelectedPlatform={setSelectedPlatform}
          creativeTone={creativeTone}
          setCreativeTone={setCreativeTone}
          generate={generate}
          loading={loading}
          result={result}
          logoImage={logoImage}
          user={user}
          userPlan={userPlan}
          dailyRemaining={dailyRemaining}
          starterLogoRemaining={starterLogoRemaining}
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
          saveCurrentOutput={saveCurrentOutput}
          setLogoAsBrandProfile={setLogoAsBrandProfile}
          toggleFavorite={toggleFavorite}
          remixOutput={remixOutput}
        />
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
            <button onClick={() => openSeoPage("seo-logo")}>AI Logo Generator</button>
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

function GeneratorCard({
  activeTool,
  prompt,
  setPrompt,
  selectedPlatform,
  setSelectedPlatform,
  creativeTone,
  setCreativeTone,
  generate,
  loading,
  result,
  logoImage,
  user,
  userPlan,
  dailyRemaining,
  starterLogoRemaining,
  copyToClipboard,
  shareOutput,
  clearGenerator,
  saveCurrentOutput,
  setLogoAsBrandProfile,
  toggleFavorite,
  remixOutput
}) {
  const resultCards = activeTool.key === "logo"
    ? getLogoResultCards({ prompt, selectedPlatform, creativeTone, logoImage })
    : formatSmartResultCards(activeTool.key, result);

  const activeEntry = {
    id: `active-${activeTool.key}`,
    tool: activeTool.key,
    title: `${activeTool.shortTitle} Draft`,
    content: result,
    image: logoImage,
    createdAt: new Date().toISOString(),
  };

  return (
    <div className={`generateCard toolResultsV2 ${activeTool.key}Generator`}>
      <div className="generateTop">
        <div>
          <div className="tinyTag">{activeTool.label}</div>
          <h2>{activeTool.title}</h2>
          <p className="toolSubline">{getToolSubline(activeTool.key)}</p>
        </div>
        <div className="generatorMeta">
          {(activeTool.key === "hashtags" || activeTool.key === "captions") && <span>Free tool</span>}
          {activeTool.key === "logo" && userPlan === "starter" && <span>{starterLogoRemaining} starter logos remaining</span>}
          {activeTool.key === "logo" && userPlan === "free" && <span>Free logo preview</span>}
          {activeTool.key !== "logo" && activeTool.key !== "hashtags" && activeTool.key !== "captions" && <span>Workspace-ready</span>}
        </div>
      </div>

      <div className={`generatorControls freeTypeControls ${activeTool.key !== "logo" ? "singleControl" : ""}`}>
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

        {activeTool.key === "logo" && (
          <label>
            <span>Logo feeling</span>
            <input
              value={creativeTone}
              onChange={(e) => setCreativeTone(e.target.value)}
              placeholder={getTonePlaceholder(activeTool.key)}
            />
          </label>
        )}
      </div>

      <textarea
        className="mainPromptBox"
        placeholder={getMainPromptPlaceholder(activeTool)}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="generatorButtons">
        <button className="btn dark" onClick={generate}>
          {loading ? getLoadingText(activeTool.key) : getGenerateButtonText(activeTool.key, activeTool.shortTitle)}
        </button>
        <button className="btn light" onClick={clearGenerator}>Clear</button>
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
                <span>Designing logo concept</span>
                <span>Finalizing image</span>
              </div>
            )}
          </div>
        </div>
      )}

      {logoImage && (
        <div className="logoShowcase">
          <div className="logoFrame">
            <img src={logoImage} alt="Generated logo" />
          </div>

          <div className="brandPreviewCard">
            <div className="tinyTag">LOGO CONCEPT</div>
            <h3>Premium brand mark generated</h3>
            <p>Download the mark, save it to a workspace, or remix the prompt into a stronger direction.</p>

            <div className="resultActions">
              <a className="downloadLink" href={logoImage} download="brandthat-logo.png">Download Logo</a>
              <button onClick={saveCurrentOutput}>Save</button>
              <button onClick={setLogoAsBrandProfile}>Set as Brand Logo</button>
              <button onClick={() => remixOutput(activeEntry)}>Remix</button>
            </div>
          </div>
        </div>
      )}

      {result && activeTool.key === "hashtags" && (
        <div className="resultBox premiumResults simpleHashtagResult">
          <div className="resultTop">
            <span>50 COPY-READY HASHTAGS</span>
            <div className="resultActions">
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


      {result && activeTool.key !== "hashtags" && activeTool.key !== "logo" && (
        <div className="resultBox premiumResults simpleCaptionResult">
          <div className="resultTop">
            <span>{getTenResultHeader(activeTool.key)}</span>
            <div className="resultActions">
              <button onClick={() => copyToClipboard(result)}>Copy All</button>
              <button onClick={() => remixOutput(activeEntry)}>Generate More</button>
              <button onClick={() => shareOutput(result)}>Share</button>
            </div>
          </div>

          <div className="captionListBox">
            {parseTenOptions(result).map((item, index) => (
              <div className="captionOptionRow" key={`${item}-${index}`}>
                <div className="captionNumber">{index + 1}</div>
                <p>{item}</p>
                <button onClick={() => copyToClipboard(item)}>Copy</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && activeTool.key === "logo" && (
        <div className="resultBox premiumResults">
          <div className="resultTop">
            <span>{getResultHeader(activeTool.key)}</span>
            <div className="resultActions">
              <button onClick={saveCurrentOutput}>Save</button>
              <button onClick={() => copyToClipboard(result)}>Copy All</button>
              <button onClick={() => remixOutput(activeEntry)}>Remix</button>
              <button onClick={() => shareOutput(result)}>Share</button>
            </div>
          </div>

          <div className={`resultCardGrid ${activeTool.key}ResultGrid`}>
            {resultCards.map((card, index) => (
              <div className={`premiumResultCard ${card.featured ? "featuredResultCard" : ""}`} key={`${card.title}-${index}`}>
                <div className="resultCardTop">
                  <span>{card.label}</span>
                  <div>
                    <button onClick={() => copyToClipboard(card.content)}>Copy</button>
                    <button onClick={() => setPrompt(`Improve this ${activeTool.shortTitle}:

${card.content}`)}>Use</button>
                  </div>
                </div>
                <h3>{card.title}</h3>
                <p>{card.content}</p>
              </div>
            ))}
          </div>

          <details className="fullOutputDetails">
            <summary>View full raw output</summary>
            <div className="resultContent">{result}</div>
          </details>
        </div>
      )}
    </div>
  );
}

function getToolSubline(toolKey) {
  const lines = {
    logo: "Describe any logo direction and Brandthat will turn it into a premium visual concept.",
    captions: "Generate polished caption options formatted for social performance.",
    hooks: "Create short hooks built for retention, curiosity, and scroll-stopping openings.",
    bios: "Build clear bios for profiles, websites, founders, creators, and brands.",
    hashtags: "Choose a platform, describe your post, and get 50 relevant copy-ready hashtags. No login required.",
    email: "Write complete email copy with subject lines, preview text, and calls to action.",
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
    logo: "Brand feeling, mood, audience perception, or personality",
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
    return "Describe the logo you want. Include the brand name, what it does, symbols or letters you want, colors, style, audience, and anything it should avoid.";
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
    captions: "Generate 10 Captions",
    hooks: "Generate 10 Hooks",
    bios: "Generate 10 Bios",
    hashtags: "Generate 50 Hashtags",
    email: "Generate 10 Emails",
    strategy: "Generate 10 Strategy Ideas",
    brand: "Generate 10 Brand Directions",
    audit: "Audit Brand",
    campaign: "Build Campaign",
    growth: "Build Growth Roadmap"
  };
  return labels[toolKey] || `Generate ${shortTitle}`;
}

function getTenResultHeader(toolKey) {
  const headers = {
    captions: "10 COPY-READY CAPTIONS",
    hooks: "10 HOOK OPTIONS",
    bios: "10 BIO OPTIONS",
    email: "10 EMAIL OPTIONS",
    strategy: "10 STRATEGY IDEAS",
    brand: "10 BRAND DIRECTIONS",
    audit: "BRAND AUDIT",
    campaign: "CAMPAIGN PLAN",
    growth: "GROWTH ROADMAP"
  };
  return headers[toolKey] || "10 GENERATED OPTIONS";
}

function getLoadingText(toolKey) {
  const loading = {
    logo: "Designing your logo concept...",
    captions: "Generating 10 captions...",
    hooks: "Generating 10 hooks...",
    bios: "Generating 10 bios...",
    hashtags: "Generating 50 hashtags...",
    email: "Generating 10 email options...",
    strategy: "Generating 10 strategy ideas...",
    brand: "Generating 10 brand directions...",
    audit: "Auditing your brand...",
    campaign: "Building your campaign...",
    growth: "Building your growth roadmap..."
  };
  return loading[toolKey] || "Generating your brand asset...";
}

function getLoadingSubtext(toolKey) {
  const subtext = {
    logo: "Balancing style, clarity, scalability, and brand memorability.",
    captions: "Creating ten clean options for your selected platform.",
    hooks: "Creating ten quick, platform-aware hook options.",
    bios: "Creating ten polished profile-ready bio options.",
    hashtags: "Creating one clean copy-ready hashtag block.",
    email: "Creating ten accurate emails with subject, preview, body, and CTA.",
    strategy: "Creating ten specific strategy moves you can use.",
    brand: "Creating ten brand concepts with positioning and launch direction.",
    audit: "Finding positioning, trust, offer, content, and conversion gaps.",
    campaign: "Creating angles, posts, emails, hooks, and launch actions.",
    growth: "Mapping posting cadence, timing, content pillars, and milestone targets."
  };
  return subtext[toolKey] || "Formatting your results into premium brand cards.";
}


function getLogoResultCards({ prompt, selectedPlatform, creativeTone, logoImage }) {
  const style = selectedPlatform?.trim() || "Best-fit visual direction";
  const tone = creativeTone?.trim() || "Premium, clean, memorable, and brand-appropriate";
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
      content: `${request}\n\nStyle: ${style}\nTone: ${tone}`
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
    captions: "10 COPY-READY CAPTIONS",
    hooks: "HOOK OPTIONS",
    bios: "BIO OPTIONS",
    hashtags: "50 COPY-READY HASHTAGS",
    email: "EMAIL COPY",
    strategy: "SOCIAL STRATEGY",
    brand: "BRAND CREATION SYSTEM",
    audit: "BRAND AUDIT",
    campaign: "CAMPAIGN PLAN",
    growth: "GROWTH ROADMAP"
  };
  return headers[toolKey] || "BRANDTHAT AI OUTPUT";
}

function PriceCard({ name, price, desc, features, featured, onClick }) {
  return (
    <div className={featured ? "priceCard featuredPrice" : "priceCard"}>
      <span className="priceTag">{name}</span>
      <h2>{price}</h2>
      <div className={featured ? "priceSub white" : "priceSub"}>per month</div>
      <p>{desc}</p>
      <div className="priceFeatures">{features.map((feature) => <div key={feature}>✓ {feature}</div>)}</div>
      <button className={featured ? "btn whiteBtn full" : "btn dark full"} onClick={onClick}>{name === "FREE" ? "Start Free" : "Subscribe"}</button>
    </div>
  );
}

const css = `
*{box-sizing:border-box}
body{margin:0}
.app{background:#f6f4ef;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#111;overflow-x:hidden}
.nav{max-width:1280px;margin:0 auto;padding:28px 6vw 10px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px}
.brand{background:none;border:none;font-size:30px;font-weight:900;letter-spacing:-.06em;cursor:pointer;color:#111;text-align:left}
.navLinks{display:flex;gap:18px;flex-wrap:wrap;justify-content:center}
.navLinks button,.accountBtn{background:none;border:none;font-weight:700;cursor:pointer;color:#111;font-size:15px}
.accountBtn{background:#111;color:white;padding:12px 18px;border-radius:999px}
.hero{max-width:1280px;margin:0 auto;padding:38px 6vw 40px}
.logoHero{display:grid;grid-template-columns:.9fr 1.1fr;gap:34px;align-items:start}
.heroTop{max-width:760px;margin-bottom:50px}
.eyebrow,.tinyTag{font-size:11px;font-weight:800;letter-spacing:2px;color:#9b7b3f;text-transform:uppercase;margin-bottom:12px}
h1{font-size:88px;line-height:.96;letter-spacing:-.045em;margin:0 0 24px;font-kerning:normal;text-rendering:optimizeLegibility}
.pageTitle{max-width:900px}
.pageLead{font-size:20px;line-height:1.6;color:#666;max-width:760px;margin:0 0 32px}
h2{font-size:44px;line-height:1;letter-spacing:-.05em;margin:0}
.toolCard h3,.featureCard h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin:0 0 12px}
.lead{font-size:22px;line-height:1.7;color:#666;max-width:620px}
.freeStrip{display:inline-flex;background:white;border:1px solid rgba(0,0,0,.08);padding:12px 16px;border-radius:999px;font-size:13px;font-weight:800;color:#8a6b37;margin-top:8px}
.heroCtas{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
.freeToolsSection{max-width:1280px;margin:0 auto;padding:18px 6vw 54px;display:grid;grid-template-columns:.9fr 1.1fr;gap:24px;align-items:start}
.freeToolCards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.freeToolCards button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px;text-align:left;color:#111;cursor:pointer;font-family:inherit}
.freeToolCards strong{display:block;font-size:18px;letter-spacing:-.03em;margin-bottom:8px}
.freeToolCards span{display:block;color:#666;line-height:1.55;font-size:14px}
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
.savedAssets{margin-top:46px}
.savedGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.savedBucket{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px}
.savedBucket h3{margin:0 0 12px}
.savedBucket p{color:#666}
.savedItem{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:12px;margin-top:10px}
.savedItem img{width:100%;border-radius:12px;margin-bottom:10px}
.savedItem button{margin-top:8px;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 10px;font-weight:800;cursor:pointer}
.brandSystemSection{max-width:1280px;margin:0 auto;padding:40px 6vw 80px}
.systemGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px}
.systemCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:22px}
.systemCard span{font-weight:900;font-size:20px;letter-spacing:-.03em}
.systemCard p{color:#666;line-height:1.7}
.generateTop{display:flex;justify-content:space-between;gap:20px;margin-bottom:26px}
.offerBadge{background:white;border:1px solid rgba(0,0,0,.08);padding:14px 18px;border-radius:999px;font-size:13px;font-weight:700;height:fit-content}
.generatorMeta{display:flex;align-items:flex-start;justify-content:flex-end;min-width:120px;color:#777;font-size:12px;font-weight:800;text-align:right;line-height:1.4;padding-top:6px}
.generatorMeta span{max-width:150px}
.planIndicator,.planNotice,.verifyNote{margin-top:16px;font-size:13px;font-weight:700;color:#8a6b37}
.activeBrandBar{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:14px 18px;margin-bottom:22px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.activeBrandLogo{width:38px;height:38px;object-fit:cover;border-radius:12px;border:1px solid rgba(0,0,0,.08);background:#fafafa}
.activeBrandBar button{background:#111;color:white;border:none;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}
.brandReadinessPanel{background:#fafafa;color:#111;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:16px;margin-top:18px}
.brandReadinessPanel div{display:flex;justify-content:space-between;align-items:center;gap:14px}
.brandReadinessPanel span{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#8a6b37;font-weight:900}
.brandReadinessPanel strong{font-size:28px;letter-spacing:-.04em}
.brandReadinessPanel p{color:#666;margin:10px 0 0;line-height:1.6}
textarea,input,select{width:100%;border-radius:24px;border:1px solid rgba(0,0,0,.08);padding:18px 20px;font-size:16px;background:#fafafa;font-family:inherit;margin-top:10px;color:#111}
textarea{height:170px;resize:none;line-height:1.6}
.workspaceFieldLabel span{display:block;font-size:11px;font-weight:900;letter-spacing:1.5px;color:#8a6b37;text-transform:uppercase;margin:0 0 0 8px}
.advancedWorkspaceFields{margin:14px 0;border:1px solid rgba(0,0,0,.08);border-radius:14px;background:#fafafa;padding:14px}
.advancedWorkspaceFields summary{cursor:pointer;font-size:13px;font-weight:900;color:#8a6b37;text-transform:uppercase;letter-spacing:1px}
.advancedWorkspaceFields[open]{background:white}
.generatorControls{display:grid;grid-template-columns:1fr 260px;gap:16px;margin-bottom:14px}
.hashtagsGenerator .generatorControls{grid-template-columns:1fr}
.generatorControls.singleControl{grid-template-columns:1fr}
.generatorControls label span{display:block;font-size:12px;font-weight:900;letter-spacing:1.4px;color:#9b7b3f;text-transform:uppercase;margin-left:8px}
.generatorButtons{display:grid;grid-template-columns:1fr 130px;gap:12px;margin-top:16px}
.btn{border:none;border-radius:18px;padding:16px 24px;font-weight:800;cursor:pointer;font-size:15px;transition:.2s ease;display:inline-flex;align-items:center;justify-content:center}
.btn:hover{transform:translateY(-2px);opacity:.96}
.btn.dark{background:#111;color:white}
.btn.light{background:white;color:#111;border:1px solid rgba(0,0,0,.08)}
.btn.full{width:100%;margin-top:18px}
.whiteBtn{background:white;color:#111;border:none}
.logoImageBox{margin-top:26px;background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:28px;padding:22px;text-align:center}
.logoImageBox img{width:100%;max-width:420px;border-radius:22px;display:block;margin:0 auto}
.downloadLink{display:inline-flex;background:#111;color:white;text-decoration:none;padding:12px 16px;border-radius:999px;font-weight:800;margin-top:16px}
.resultMainActions{margin-top:18px}
.resultBox{margin-top:26px;background:#fafafa;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,.06)}
.resultTop{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.06)}
.resultTop span{font-size:12px;font-weight:800;letter-spacing:2px;color:#9b7b3f}
.resultActions{display:flex;gap:10px;flex-wrap:wrap}
.resultActions button,.resultTop button{background:white;border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:999px;font-weight:700;cursor:pointer;color:#111}
.resultContent{padding:24px;line-height:1.9;white-space:pre-wrap;font-size:15px}
.visualOutput{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;padding:20px 20px 0}
.outputCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:14px;line-height:1.5;font-weight:650}
.offersSection,.pageSection{max-width:1280px;margin:0 auto;padding:40px 6vw 100px}
.offersTop{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:34px}
.toolGrid,.featureGrid,.pricingGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.threePlans{grid-template-columns:repeat(3,1fr)}
.toolCard,.featureCard,.priceCard{position:relative;overflow:hidden;background:white;padding:26px;border-radius:28px;border:1px solid rgba(0,0,0,.08);min-height:180px;transition:.25s ease;text-align:left;color:#111;font-family:inherit;cursor:pointer}
.toolCard:hover,.featureCard:hover,.priceCard:hover,.activeTool{transform:translateY(-4px);box-shadow:0 18px 50px rgba(0,0,0,.08);border-color:rgba(0,0,0,.18)}
.toolCard span{position:relative;z-index:2;display:inline-flex;margin-top:16px;font-size:12px;font-weight:900;letter-spacing:.8px;color:#8a6b37;text-transform:uppercase}
.toolGlow{position:absolute;top:-80px;right:-60px;width:180px;height:180px;background:radial-gradient(circle,#f0dfb5,transparent 70%);opacity:.8}
.toolCard p,.featureCard p,.priceCard p{color:#666;line-height:1.7;position:relative;z-index:2}
.priceTag{font-size:11px;font-weight:800;letter-spacing:2px;color:#9b7b3f}
.priceSub{margin-top:-8px;margin-bottom:28px;font-size:15px;color:#777}
.priceSub.white{color:rgba(255,255,255,.7)}
.priceFeatures{display:flex;flex-direction:column;gap:14px;margin-top:30px}
.priceFeatures div{padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,.06);line-height:1.6;font-size:15px}
.featuredPrice{background:#111;color:white}
.featuredPrice p{color:rgba(255,255,255,.7)}
.featuredPrice .priceFeatures div{border-bottom:1px solid rgba(255,255,255,.08)}
.footerSubscribe{max-width:1280px;margin:0 auto;padding:60px 6vw 90px;border-top:1px solid rgba(0,0,0,.08);display:grid;grid-template-columns:1fr 420px;gap:40px;align-items:start}
.footerForm{background:white;border-radius:28px;padding:28px;border:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;gap:18px}
.footerSubscribe p,.footerForm span{color:#666;line-height:1.7}
.footerForm input{margin-top:0}
.footerForm .btn{margin-top:8px;width:100%}
.modal{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;z-index:2000}
.signupBox{max-width:460px;width:100%}

.authBoxClean{max-width:500px}
.authSwitch{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f6f4ef;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:6px;margin-bottom:22px}
.authSwitch button{border:none;background:transparent;border-radius:999px;padding:12px 14px;font-weight:900;cursor:pointer;color:#666}
.authSwitch button.active{background:#111;color:white;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.authMessageBox{background:#f8f2e6;border:1px solid rgba(155,123,63,.24);border-radius:18px;padding:14px 16px;line-height:1.55}
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
.brandMockupStack{position:relative;min-height:360px;background:linear-gradient(135deg,#f7f4ed,#fff);border:1px solid rgba(0,0,0,.08);border-radius:34px;padding:24px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)}
.mockBrowser{background:white;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:18px;box-shadow:0 24px 70px rgba(0,0,0,.08)}
.mockBrowserTop{display:flex;gap:6px;margin-bottom:16px}
.mockBrowserTop span{width:8px;height:8px;border-radius:50%;background:#ddd}
.mockBrowserNav{display:flex;justify-content:space-between;gap:14px;align-items:center;border-bottom:1px solid rgba(0,0,0,.06);padding-bottom:14px;margin-bottom:20px}
.mockBrowserNav strong{font-size:22px;letter-spacing:-.05em}
.mockBrowserNav small{color:#777;font-weight:800}
.mockHeroLine{height:28px;width:80%;background:#111;border-radius:999px;margin-bottom:12px}
.mockHeroLine.short{width:54%;height:18px;background:#d7c8a8}
.mockButton{width:120px;height:38px;background:#111;border-radius:999px;margin-top:24px}
.mockSocialCard{position:absolute;left:38px;bottom:36px;background:#111;color:white;border-radius:24px;padding:16px 18px;display:flex;gap:12px;align-items:center;box-shadow:0 20px 50px rgba(0,0,0,.18)}
.mockAvatar{width:46px;height:46px;border-radius:50%;background:white;color:#111;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:22px}
.mockSocialCard span{display:block;color:rgba(255,255,255,.68);font-size:13px;margin-top:3px}
.mockKitCard{position:absolute;right:26px;bottom:26px;background:white;border:1px solid rgba(0,0,0,.08);border-radius:22px;padding:18px;width:150px;box-shadow:0 20px 50px rgba(0,0,0,.08)}
.mockKitCard span{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#9b7b3f;font-weight:900}
.mockSwatches{display:flex;gap:8px;margin-top:16px}
.mockSwatches i{width:26px;height:26px;border-radius:50%;background:#111;display:block}
.mockSwatches i:nth-child(2){background:#d7c8a8}.mockSwatches i:nth-child(3){background:#f6f4ef;border:1px solid rgba(0,0,0,.08)}
.brandTouchpointGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:26px}
.brandTouchpoint{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:24px;padding:22px}
.brandTouchpoint span{font-size:11px;letter-spacing:2px;color:#9b7b3f;font-weight:900}
.brandTouchpoint h3{font-size:21px;margin:12px 0 8px;letter-spacing:-.04em}
.brandTouchpoint p{font-size:15px;color:#666;line-height:1.65;margin:0}
.creativeDirectionsBlock{padding:34px;background:#fff}
.creativeDirectionsTop{display:grid;grid-template-columns:1fr 360px;gap:24px;align-items:end;margin-bottom:24px}
.creativeDirectionsTop p{margin:0;color:#666;line-height:1.7}
.creativeDirectionGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.creativeDirectionCard{background:#fbfaf7;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:22px;text-align:left;color:#111;cursor:pointer;display:flex;flex-direction:column;gap:12px;min-height:205px;transition:.2s ease;font-family:inherit}
.creativeDirectionCard:hover{transform:translateY(-3px);box-shadow:0 18px 44px rgba(0,0,0,.08);border-color:rgba(0,0,0,.18);background:#fff}
.cleanDirectionCard{position:relative;overflow:hidden}
.cleanDirectionCard:before{content:"";position:absolute;left:22px;right:22px;top:0;height:3px;background:#111;border-radius:0 0 999px 999px;opacity:.9}
.directionKicker{font-size:10px;line-height:1.4;letter-spacing:1.8px;text-transform:uppercase;color:#9b7b3f;font-weight:900;min-height:28px;display:block;padding-top:6px}
.creativeDirectionCard h3{font-size:22px;letter-spacing:-.05em;margin:4px 0 0}
.creativeDirectionCard p{font-size:14px;line-height:1.6;margin:0;color:#666}
.directionApply{margin-top:auto;display:inline-flex;width:max-content;border:1px solid rgba(0,0,0,.1);background:white;border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;color:#111}
.useCaseGrid,.faqGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
.useCaseCard{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:22px;padding:20px}
.useCaseCard span{font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:#9b7b3f;font-weight:900}
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
.logoResultGrid .featuredResultCard{grid-row:span 1}
.logoShowcase{
  margin-top:28px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:20px;
  align-items:stretch;
}

.logoFrame{
  background:#f7f4ed;
  border:1px solid rgba(0,0,0,.08);
  border-radius:30px;
  padding:28px;
  display:flex;
  align-items:center;
  justify-content:center;
}

.logoFrame img{
  width:100%;
  max-width:420px;
  border-radius:22px;
  box-shadow:0 18px 50px rgba(0,0,0,.08);
}

.brandPreviewCard{
  background:#111;
  color:white;
  border-radius:30px;
  padding:30px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}

.brandPreviewCard .tinyTag{
  color:#d9bd77;
}

.brandPreviewCard h3{
  font-size:32px;
  letter-spacing:-.04em;
  margin:0 0 14px;
}

.brandPreviewCard p{
  color:rgba(255,255,255,.72);
  line-height:1.7;
}

.brandPreviewCard .resultActions button{
  background:white;
  color:#111;
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
  color:#9b7b3f;
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
.accountSaveBadge{display:inline-flex;align-items:center;gap:8px;background:#f0eadc;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 12px;font-size:12px;font-weight:900;color:#8a6b37;margin-top:10px}

.appNotice{max-width:1180px;margin:18px auto 0;padding:16px 48px 16px 18px;border-radius:20px;border:1px solid rgba(0,0,0,.08);background:white;box-shadow:0 18px 45px rgba(0,0,0,.08);position:relative;display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.appNotice strong{font-size:15px}
.appNotice span{color:#666;line-height:1.5}
.appNotice button{position:absolute;right:14px;top:11px;border:none;background:transparent;font-size:22px;cursor:pointer;color:#111}
.appNotice.error{border-color:rgba(180,0,0,.25);background:#fff7f7}
.appNotice.warning{border-color:rgba(180,120,0,.25);background:#fffaf0}
.appNotice.success{border-color:rgba(0,130,60,.22);background:#f4fff8}
.autoSavePill{display:inline-flex;margin:-10px 0 16px;padding:9px 12px;border-radius:999px;background:#fafafa;border:1px solid rgba(0,0,0,.08);font-size:12px;font-weight:900;color:#8a6b37}
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
.logoShowcase{margin-top:28px;display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch}.logoFrame{background:#f7f4ed;border:1px solid rgba(0,0,0,.08);border-radius:30px;padding:28px;display:flex;align-items:center;justify-content:center}.logoFrame img{width:100%;max-width:420px;border-radius:22px;box-shadow:0 18px 50px rgba(0,0,0,.08)}
.brandPreviewCard{background:#111;color:white;border-radius:30px;padding:30px;display:flex;flex-direction:column;justify-content:center}.brandPreviewCard .tinyTag{color:#d9bd77}.brandPreviewCard h3{font-size:32px;letter-spacing:-.04em;margin:0 0 14px}.brandPreviewCard p{color:rgba(255,255,255,.72);line-height:1.7}.brandPreviewCard .resultActions button{background:white;color:#111}
.premiumResults{background:white}.resultCardGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;padding:22px}.premiumResultCard{background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:20px;min-height:170px}.featuredResultCard{background:#111;color:white}.featuredResultCard p{color:rgba(255,255,255,.74)!important}.resultCardTop{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.resultCardTop span{font-size:11px;letter-spacing:1.6px;font-weight:900;color:#9b7b3f}.resultCardTop div{display:flex;gap:8px}.resultCardTop button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:7px 10px;font-weight:800;cursor:pointer}.premiumResultCard h3{font-size:22px;letter-spacing:-.03em;margin:0 0 10px}.premiumResultCard p{color:#555;line-height:1.7;white-space:pre-wrap}.fullOutputDetails{border-top:1px solid rgba(0,0,0,.08);padding:18px 22px}.fullOutputDetails summary{font-weight:900;cursor:pointer}


.simpleHashtagResult .resultTop{align-items:center}
.hashtagSingleBox{padding:30px;background:#111;color:white;border-radius:0 0 24px 24px}
.hashtagSingleBox .tinyTag{color:#d9bd77;margin-bottom:14px}
.hashtagSingleBox p{font-size:22px;line-height:1.9;margin:0;white-space:pre-wrap;word-break:break-word;color:white}

.captionListBox{padding:22px;display:flex;flex-direction:column;gap:12px}
.captionOptionRow{display:grid;grid-template-columns:44px 1fr auto;gap:14px;align-items:start;background:#fafafa;border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:16px}
.captionNumber{width:34px;height:34px;border-radius:50%;background:#111;color:white;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px}
.captionOptionRow p{margin:4px 0 0;color:#333;line-height:1.65;font-size:15px;white-space:pre-wrap}
.captionOptionRow button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer;color:#111}

@media(max-width:1100px){.logoHero,.workspaceLayout,.freeToolsSection{grid-template-columns:1fr}.toolGrid,.featureGrid,.pricingGrid,.seoTextGrid,.systemGrid,.savedGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}}
@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{grid-template-columns:1fr auto;gap:12px;padding:24px 20px 8px}.navLinks{grid-column:1 / -1;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:6px}.accountBtn{grid-column:2;grid-row:1}.hero,.offersSection,.pageSection,.footerSubscribe,.seoHomeSection,.brandSystemSection,.freeToolsSection{padding-left:20px;padding-right:20px}.hero{padding-top:28px}.toolGrid,.featureGrid,.pricingGrid,.workspaceGrid,.generatorButtons,.seoTextGrid,.creativeDirectionsTop,.creativeDirectionGrid,.brandEverywhereHero,.brandTouchpointGrid,.useCaseGrid,.faqGrid,.systemGrid,.savedGrid,.visualOutput,.logoShowcase,.resultCardGrid,.freeToolCards{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}.resultTop{align-items:flex-start;flex-direction:column}.captionOptionRow{grid-template-columns:34px 1fr}.captionOptionRow button{grid-column:2}textarea{height:160px}}
`;
