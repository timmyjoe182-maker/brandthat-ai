import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

const PLAN_COPY = {
  free: {
    name: "Free",
    badge: "Free Workspace",
    description: "1 Brand Workspace, daily AI logo concept, captions, hooks, bios, and basic exports.",
  },
  starter: {
    name: "Starter",
    badge: "$10/mo",
    description: "Unlimited text generations, saved content history, social strategy tools, and better export layouts.",
  },
  pro: {
    name: "Pro",
    badge: "$20/mo",
    description: "Everything in Starter plus unlimited AI logo image generations, full brand kits, and priority visual tools.",
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
    title: "Caption Generator",
    shortTitle: "Captions",
    desc: "Premium captions for Instagram, TikTok, LinkedIn, X, and more.",
    label: "CAPTION GENERATOR",
    platformLabel: "Platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: Write a caption for a video of our goats running to dinner at the ranch.",
    promptGuide: "Create premium social captions. Give short, polished, hook-driven, CTA, and brand storytelling options."
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
    desc: "Smart hashtag systems designed for reach.",
    label: "HASHTAG GENERATOR",
    platformLabel: "Platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: Mini cows, ranch life, goats, alpacas, luxury countryside content.",
    promptGuide: "Generate hashtag sets grouped by niche, broad reach, audience, location, and viral/reach potential."
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
  }
];

const seoPages = {
  "seo-logo": {
    path: "/ai-logo-generator",
    toolKey: "logo",
    eyebrow: "AI LOGO GENERATOR",
    h1: "AI Logo Generator for Modern Brands, Startups, and Creators",
    intro: "Create premium AI logo images, brand identity directions, palettes, typography, and launch-ready visual systems from one brand idea.",
    examples: ["Minimal black-and-white AI logo for a creative studio", "Luxury ranch brand logo with a premium serif wordmark", "Modern coffee shop logo with a clean icon and warm typography"],
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
    examples: ["Caption for a behind-the-scenes ranch dinner routine", "Luxury product launch caption", "Founder story caption for a startup announcement"],
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
    examples: ["POV: your logo finally looks like a real brand", "This is why your captions are not converting", "One small change made this Reel feel premium"],
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
    examples: ["Instagram bio for a luxury ranch brand", "LinkedIn bio for an AI startup founder", "Website bio for a premium local service brand"],
    faqs: [
      ["What makes a good brand bio?", "A good bio quickly explains who you help, what you offer, and why it matters."],
      ["Can it create multiple versions?", "Yes. It can create versions for different platforms and tones."],
      ["Can it help with personal brands?", "Yes. It works for founders, creators, and business profiles."]
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

export default function App() {
  const [page, setPage] = useState(getInitialPageFromPath());
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(localStorage.getItem("brandthat_plan") || "free");
  const [dailyFreeCount, setDailyFreeCount] = useState(getStoredNumber("brandthat_daily_count", 0));

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [activeToolKey, setActiveToolKey] = useState(getInitialToolFromPath());
  const activeTool = toolMap[activeToolKey] || tools[0];
  const [selectedPlatform, setSelectedPlatform] = useState(activeTool.platforms[0]);
  const [creativeTone, setCreativeTone] = useState("Modern");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [logoImage, setLogoImage] = useState("");
  const [loading, setLoading] = useState(false);

  const [brandWorkspaces, setBrandWorkspaces] = useState(() => safeParse("brandthat_brand_workspaces", []));
  const [activeBrandId, setActiveBrandId] = useState(localStorage.getItem("brandthat_active_brand_id") || "");
  const activeBrand = brandWorkspaces.find((brand) => brand.id === activeBrandId) || brandWorkspaces[0] || null;

  const [workspaceDraft, setWorkspaceDraft] = useState({
    name: "",
    logoDirection: "",
    description: "",
    audience: "",
    tone: "Modern",
    style: "Black-and-white, modern, premium",
    launchGoal: "",
  });

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const dailyRemaining = Math.max(0, 1 - dailyFreeCount);
  const isFree = userPlan === "free";
  const isStarter = userPlan === "starter";
  const isPro = userPlan === "pro";

  useEffect(() => {
    const today = getTodayKey();
    const storedDate = localStorage.getItem("brandthat_daily_date");

    if (storedDate !== today) {
      localStorage.setItem("brandthat_daily_date", today);
      localStorage.setItem("brandthat_daily_count", "0");
      setDailyFreeCount(0);
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
      setUser(data.session?.user || null);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
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
    if (activeBrand?.id) {
      localStorage.setItem("brandthat_active_brand_id", activeBrand.id);
    }
  }, [activeBrand?.id]);

  const openAuth = (mode = "signup", message = "") => {
    setAuthMode(mode);
    setAuthMessage(message);
    setShowAuth(true);
  };

  const signUp = async () => {
    if (!authEmail || !authPassword) {
      setAuthMessage("Please enter your email and create a password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: { emailRedirectTo: "https://brandthat.ai" }
    });

    if (error) {
      setAuthMessage(error.message);
      setLoading(false);
      return;
    }

    localStorage.setItem("brandthat_plan", "free");
    setUserPlan("free");
    setAuthMessage("Verification email sent. Please check your inbox.");
    setLoading(false);
  };

  const logIn = async () => {
    if (!authEmail || !authPassword) {
      setAuthMessage("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });

    if (error) {
      setAuthMessage(error.message);
      setLoading(false);
      return;
    }

    setShowAuth(false);
    setAuthEmail("");
    setAuthPassword("");
    setAuthMessage("");
    setLoading(false);
  };

  const logOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const startCheckout = async (plan) => {
    const { data } = await supabase.auth.getUser();
    const currentUser = data?.user || user;

    if (!currentUser?.email) {
      localStorage.setItem("brandthat_pending_plan", plan);
      openAuth("signup", "Create a free Brand Workspace first, then continue to checkout.");
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

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Checkout failed.");
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      alert("Checkout failed. Please try again.");
    }

    setLoading(false);
  };

  const createWorkspace = () => {
    if (!workspaceDraft.name.trim()) {
      alert("Add a brand name first.");
      return;
    }

    const brand = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      name: workspaceDraft.name.trim(),
      logoDirection: workspaceDraft.logoDirection.trim(),
      description: workspaceDraft.description.trim(),
      audience: workspaceDraft.audience.trim(),
      tone: workspaceDraft.tone,
      style: workspaceDraft.style.trim(),
      launchGoal: workspaceDraft.launchGoal.trim(),
      saved: {
        captions: [],
        hooks: [],
        bios: [],
        hashtags: [],
        email: [],
        strategy: [],
        brand: [],
        logos: [],
      },
      createdAt: new Date().toISOString(),
    };

    const next = [brand, ...brandWorkspaces];
    setBrandWorkspaces(next);
    setActiveBrandId(brand.id);
    setPrompt(buildBrandPrompt(brand));
    setActiveToolKey("logo");
    setSelectedPlatform("Modern Minimal");
    setCreativeTone(brand.tone || "Modern");
    setResult("");
    setLogoImage("");
    setPage("logo");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  const selectBrand = (brandId) => {
    const brand = brandWorkspaces.find((item) => item.id === brandId);
    if (!brand) return;
    setActiveBrandId(brand.id);
    setPrompt(buildBrandPrompt(brand));
    setCreativeTone(brand.tone || "Modern");
    setResult("");
    setLogoImage("");
  };

  const deleteBrand = (brandId) => {
    const next = brandWorkspaces.filter((brand) => brand.id !== brandId);
    setBrandWorkspaces(next);
    if (activeBrandId === brandId) {
      setActiveBrandId(next[0]?.id || "");
    }
  };

  const saveCurrentOutput = () => {
    if (!activeBrand) {
      alert("Create a Brand Workspace first.");
      return;
    }

    if (!result && !logoImage) {
      alert("Generate something first.");
      return;
    }

    const bucket = activeTool.key === "logo" ? "logos" : activeTool.key;
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      tool: activeTool.key,
      title: `${activeTool.shortTitle} • ${new Date().toLocaleDateString()}`,
      content: result,
      image: logoImage,
      createdAt: new Date().toISOString(),
    };

    setBrandWorkspaces((prev) =>
      prev.map((brand) =>
        brand.id === activeBrand.id
          ? {
              ...brand,
              saved: {
                ...brand.saved,
                [bucket]: [entry, ...(brand.saved?.[bucket] || [])],
              },
            }
          : brand
      )
    );
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

Brand Tone:
${activeBrand.tone}

Visual Style:
${activeBrand.style || "Not added yet."}

Launch Goal:
${activeBrand.launchGoal || "Not added yet."}

SAVED CAPTIONS:
${captions}

SAVED HOOKS:
${hooks}

SAVED BIOS:
${bios}

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
  };

  function buildBrandPrompt(brand) {
    return `Brand name: ${brand.name}
Brand description: ${brand.description}
Audience: ${brand.audience}
Brand tone: ${brand.tone}
Logo direction: ${brand.logoDirection}
Visual style: ${brand.style}
Launch goal: ${brand.launchGoal}`;
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
  };

  const selectTool = (toolKey) => {
    const nextTool = toolMap[toolKey] || tools[0];
    setActiveToolKey(nextTool.key);
    setSelectedPlatform(nextTool.platforms[0]);
    setPrompt(activeBrand ? buildBrandPrompt(activeBrand) : "");
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
    setSelectedPlatform(nextTool.platforms[0]);
    setPrompt(activeBrand ? buildBrandPrompt(activeBrand) : "");
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
Brand tone: ${activeBrand.tone}
Visual style: ${activeBrand.style}
Launch goal: ${activeBrand.launchGoal}
`
      : "";

    return `
You are Brandthat.ai, a premium AI brand workspace for creators, founders, businesses, and agencies.

The user selected this generator:
${activeTool.title}

What this generator must do:
${activeTool.promptGuide}

Selected platform/style/type:
${selectedPlatform}

Selected tone:
${creativeTone}

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
- Be modern, premium, practical, and brand-aware.
`;
  };

  const createLogoImage = async () => {
    const response = await fetch("/.netlify/functions/logo-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: activeBrand?.name || "",
        logoPrompt: `${selectedPlatform}. ${creativeTone}. ${prompt}`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Logo image generation failed.");
    }

    return data.image;
  };

  const generate = async () => {
    if (!prompt.trim()) {
      setResult(`Tell Brandthat what you want the ${activeTool.title} to create first.`);
      return;
    }

    if (!user) {
      openAuth("signup", "Start your free Brand Workspace to generate your first brand asset.");
      return;
    }

    if (!activeBrand) {
      setPage("workspace");
      setResult("Create a Brand Workspace first so your outputs can be saved to a brand.");
      return;
    }

    if (isFree && dailyFreeCount >= 1) {
      setPage("pricing");
      setResult("Your free daily brand generation has been used. Upgrade to keep building.");
      return;
    }

    if (activeTool.key === "logo" && isStarter) {
      setPage("pricing");
      setResult("AI logo image generation is included with Pro. Starter includes unlimited text generators and saved content history.");
      return;
    }

    setLoading(true);
    setLogoImage("");

    try {
      if (activeTool.key === "logo") {
        const image = await createLogoImage();
        setLogoImage(image);
        setResult(
          `Your logo image has been generated for ${activeBrand.name}.\n\nBrand direction used:\n${prompt}\n\nSave it to your workspace to build your brand kit.`
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

        const data = await response.json();
        setResult(data.text || "No response generated.");
      }

      if (isFree) incrementDailyFreeUse();
    } catch (error) {
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
    setPrompt(activeBrand ? buildBrandPrompt(activeBrand) : "");
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
        <button className="brand" onClick={() => { setPage("home"); window.history.pushState({}, "", "/"); }}>Brandthat</button>

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

      {page === "home" && (
        <>
          <main className="hero logoHero">
            <div className="heroTop">
              <div className="eyebrow">AI BRAND WORKSPACE</div>
              <h1>Build your brand with AI.</h1>
              <p className="lead">Start with a logo, save your brand direction, then create captions, hooks, bios, launch copy, and strategy around one real brand workspace.</p>
              <div className="freeStrip">
                {!user ? "Start your free Brand Workspace" : isFree ? `${dailyRemaining} free brand generation left today` : `${userPlan.toUpperCase()} workspace active`}
              </div>
              <div className="heroCtas">
                <button className="btn dark" onClick={() => setPage("workspace")}>Start Your Free Brand Workspace</button>
                <button className="btn light" onClick={() => openSeoPage("seo-logo")}>Try AI Logo Generator</button>
              </div>
            </div>

            <WorkspaceCreator
              workspaceDraft={workspaceDraft}
              setWorkspaceDraft={setWorkspaceDraft}
              createWorkspace={createWorkspace}
            />
          </main>

          <section className="brandSystemSection">
            <div className="tinyTag">BRAND WORKFLOW</div>
            <h2>Everything revolves around your brand workspace.</h2>
            <div className="systemGrid">
              {["AI Logo Generator", "Brand Identity", "Social Content", "Launch Assets", "Brand Voice", "Marketing System"].map((item) => (
                <div className="systemCard" key={item}>
                  <span>{item}</span>
                  <p>{getSystemCardText(item)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="offersSection">
            <div className="offersTop">
              <div>
                <div className="tinyTag">AVAILABLE TOOLS</div>
                <h2>Generate every asset your brand needs.</h2>
              </div>
              <div className="offerBadge">Click a tool to start</div>
            </div>

            <ToolGrid activeToolKey={activeToolKey} selectTool={selectTool} />
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
            />

            <WorkspaceLibrary
              brandWorkspaces={brandWorkspaces}
              activeBrand={activeBrand}
              selectBrand={selectBrand}
              deleteBrand={deleteBrand}
              downloadBrandKit={downloadBrandKit}
              setPage={setPage}
            />
          </div>

          {activeBrand && (
            <SavedAssets brand={activeBrand} copyToClipboard={copyToClipboard} />
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
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
          saveCurrentOutput={saveCurrentOutput}
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
          <p className="pageLead">The free plan gives users a real workspace and one daily brand generation. Starter unlocks unlimited text tools. Pro unlocks the full brand system, including unlimited AI logo image generation.</p>

          <div className="pricingGrid threePlans">
            <PriceCard
              name="FREE"
              price="$0"
              desc="Start building your first brand workspace."
              features={["1 Brand Workspace", "Daily AI Logo Concepts", "Caption Generator", "Hook Generator", "Brand Bio Generator", "Basic Exports"]}
              onClick={() => setPage("workspace")}
            />
            <PriceCard
              name="STARTER"
              price="$10"
              desc="Unlimited text generations and saved content history."
              features={["Unlimited text generations", "Unlimited captions/hooks/bios", "Saved content history", "Social strategy tools", "Better export layouts", "No unlimited logo generation"]}
              onClick={() => startCheckout("starter")}
            />
            <PriceCard
              name="PRO"
              price="$20"
              featured
              desc="The full Brandthat experience with unlimited AI logo images."
              features={["Unlimited AI logo generations", "Premium logo quality", "Transparent PNG exports", "Full Brand Kits", "Priority generations", "Future visual tools"]}
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
          <div className="signupBox">
            <div className="tinyTag">{authMode === "signup" ? "CREATE ACCOUNT" : "LOG IN"}</div>
            <h2>{authMode === "signup" ? "Start your Brand Workspace." : "Welcome back."}</h2>
            <p>{authMode === "signup" ? "Create your free workspace. Free accounts get one daily brand generation." : "Log in to continue using your Brandthat workspace."}</p>
            <input placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
            <input placeholder="Password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
            <button className="btn dark full" onClick={authMode === "signup" ? signUp : logIn}>{loading ? "Please wait..." : authMode === "signup" ? "Create workspace" : "Log in"}</button>
            <button className="btn light full" onClick={() => { setAuthMode(authMode === "signup" ? "login" : "signup"); setAuthMessage(""); }}>
              {authMode === "signup" ? "Already have an account? Log in" : "Create a new account"}
            </button>
            <button className="btn light full" onClick={() => setShowAuth(false)}>Cancel</button>
            {authMessage && <div className="verifyNote">{authMessage}</div>}
          </div>
        </div>
      )}

      <button className="chatButton" onClick={() => setChatOpen(!chatOpen)}>AI Assistant</button>
      {chatOpen && (
        <div className="chatWidget">
          <div className="chatHeader"><strong>Brandthat AI</strong><span>Need help getting started?</span></div>
          <div className="chatBody">
            <div className="chatBubble">Create a Brand Workspace first. Then generate and save logos, captions, hooks, bios, and launch content around that brand.</div>
            <div className="chatBubble light">Free: 1 daily generation<br />Starter: unlimited text tools<br />Pro: unlimited logo images + brand kits</div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSystemCardText(item) {
  const copy = {
    "AI Logo Generator": "Create the first visual anchor for your brand.",
    "Brand Identity": "Save tone, audience, visual style, and positioning.",
    "Social Content": "Generate captions, hooks, hashtags, and bios.",
    "Launch Assets": "Build emails, announcements, and go-to-market copy.",
    "Brand Voice": "Keep every output aligned to the same tone.",
    "Marketing System": "Turn your idea into a repeatable content engine.",
  };

  return copy[item] || "Build your brand faster with AI.";
}

function WorkspaceCreator({ workspaceDraft, setWorkspaceDraft, createWorkspace }) {
  return (
    <div className="workspaceCard">
      <div className="tinyTag">START HERE</div>
      <h2>Create a Brand Workspace</h2>
      <p>Save the brand name, logo direction, brand tone, audience, and launch goal. Every generator can then create content around the same brand.</p>

      <div className="workspaceGrid">
        <input
          placeholder="Brand name"
          value={workspaceDraft.name}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, name: e.target.value })}
        />
        <select
          value={workspaceDraft.tone}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, tone: e.target.value })}
        >
          {tones.map((tone) => <option key={tone}>{tone}</option>)}
        </select>
      </div>

      <textarea
        placeholder="Brand description. Example: A premium AI creative studio helping creators and businesses build logos, captions, and brand systems fast."
        value={workspaceDraft.description}
        onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, description: e.target.value })}
      />

      <textarea
        placeholder="Logo direction. Example: Black-and-white, modern B monogram, clean premium technology feel, works as favicon and social profile image."
        value={workspaceDraft.logoDirection}
        onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, logoDirection: e.target.value })}
      />

      <div className="workspaceGrid">
        <input
          placeholder="Audience"
          value={workspaceDraft.audience}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, audience: e.target.value })}
        />
        <input
          placeholder="Visual style"
          value={workspaceDraft.style}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, style: e.target.value })}
        />
      </div>

      <input
        placeholder="Launch goal"
        value={workspaceDraft.launchGoal}
        onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, launchGoal: e.target.value })}
      />

      <button className="btn dark full" onClick={createWorkspace}>Create Brand Workspace</button>
    </div>
  );
}

function WorkspaceLibrary({ brandWorkspaces, activeBrand, selectBrand, deleteBrand, downloadBrandKit, setPage }) {
  return (
    <div className="workspaceCard">
      <div className="tinyTag">MY BRANDS</div>
      <h2>Saved Brand Workspaces</h2>
      <p>This is where users emotionally invest. Each brand can hold logos, captions, hooks, bios, and launch assets.</p>

      {brandWorkspaces.length === 0 ? (
        <div className="emptyState">No brands yet. Create your first workspace.</div>
      ) : (
        <div className="brandList">
          {brandWorkspaces.map((brand) => (
            <div className={activeBrand?.id === brand.id ? "brandRow activeBrandRow" : "brandRow"} key={brand.id}>
              <button onClick={() => selectBrand(brand.id)}>
                <strong>{brand.name}</strong>
                <span>{brand.tone} • {brand.audience || "Audience not set"}</span>
              </button>
              <button className="miniDanger" onClick={() => deleteBrand(brand.id)}>Delete</button>
            </div>
          ))}
        </div>
      )}

      <div className="workspaceActions">
        <button className="btn light" onClick={() => setPage("features")}>Open Tools</button>
        <button className="btn dark" onClick={downloadBrandKit}>Download Brand Kit</button>
      </div>
    </div>
  );
}

function SavedAssets({ brand, copyToClipboard }) {
  const buckets = [
    ["logos", "Saved Logos"],
    ["captions", "Saved Captions"],
    ["hooks", "Saved Hooks"],
    ["bios", "Saved Bios"],
    ["hashtags", "Saved Hashtags"],
    ["email", "Saved Emails"],
    ["strategy", "Saved Strategy"],
    ["brand", "Saved Brand Ideas"],
  ];

  return (
    <section className="savedAssets">
      <div className="tinyTag">SAVED OUTPUTS</div>
      <h2>{brand.name} Brand Kit</h2>
      <div className="savedGrid">
        {buckets.map(([key, title]) => {
          const items = brand.saved?.[key] || [];
          return (
            <div className="savedBucket" key={key}>
              <h3>{title}</h3>
              {items.length === 0 ? (
                <p>No saved outputs yet.</p>
              ) : (
                items.slice(0, 3).map((item) => (
                  <div className="savedItem" key={item.id}>
                    {item.image && <img src={item.image} alt={item.title} />}
                    <strong>{item.title}</strong>
                    {item.content && <button onClick={() => copyToClipboard(item.content)}>Copy</button>}
                  </div>
                ))
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
      <div className="tinyTag">AI BRANDING TOOLS BUILT FOR SEARCH, SPEED, AND SOCIAL CONTENT</div>
      <h2>Brandthat.ai helps creators and businesses turn ideas into logos, captions, hooks, bios, and launch-ready brand content.</h2>
      <p>
        Brandthat.ai is built for modern creators, founders, small businesses, agencies, and social teams that need brand assets fast without sounding generic. Start with the AI Logo Generator, then build the captions, hooks, bios, email copy, and social strategy around the brand you are creating.
      </p>
      <div className="seoInternalLinks">
        <button onClick={() => openSeoPage("seo-logo")}>AI Logo Generator</button>
        <button onClick={() => openSeoPage("seo-instagram")}>Instagram Caption Generator</button>
        <button onClick={() => openSeoPage("seo-tiktok")}>TikTok Hook Generator</button>
        <button onClick={() => openSeoPage("seo-bio")}>Brand Bio Generator</button>
      </div>
      <div className="seoTextGrid">
        <div>
          <h3>Why Brandthat.ai exists</h3>
          <p>Most AI writing tools are too broad, too generic, or too corporate. Brandthat.ai focuses on the brand assets modern businesses need every day: logos, captions, hooks, bios, emails, and strategy.</p>
        </div>
        <div>
          <h3>Logo-first brand building</h3>
          <p>The logo generator is the center of the experience. Once a brand has a visual direction, Brandthat.ai helps support it with social content, launch copy, and brand messaging.</p>
        </div>
        <div>
          <h3>Built for momentum</h3>
          <p>Use it to create a brand from scratch, improve a social profile, write better captions, generate hooks, or create marketing copy without hiring a full creative team.</p>
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
  copyToClipboard,
  shareOutput,
  clearGenerator,
  saveCurrentOutput,
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
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
          saveCurrentOutput={saveCurrentOutput}
        />
      </div>

      <div className="seoArticle">
        <div className="seoArticleBlock">
          <h2>How it works</h2>
          <p>Describe what you want to create, choose a platform or style, select a tone, and Brandthat.ai generates a polished output you can copy, save, share, or build into your brand workspace.</p>
        </div>

        <div className="seoArticleBlock">
          <h2>Example prompts you can try</h2>
          <div className="examplePromptGrid">
            {seoPage.examples.map((example) => (
              <button
                key={example}
                onClick={() => {
                  setPrompt(example);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <div className="seoArticleBlock">
          <h2>Frequently asked questions</h2>
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
  copyToClipboard,
  shareOutput,
  clearGenerator,
  saveCurrentOutput
}) {
  return (
    <div className="generateCard">
      <div className="generateTop">
        <div>
          <div className="tinyTag">{activeTool.label}</div>
          <h2>{activeTool.title}</h2>
          <div className="planIndicator">
            {!user ? "Create a free Brand Workspace to start" : userPlan === "free" ? `${dailyRemaining} free generation left today` : `${userPlan.toUpperCase()} access active`}
          </div>
        </div>
        <div className="liveBadge">AI Powered</div>
      </div>

      <div className="generatorControls">
        <label>
          <span>{activeTool.platformLabel}</span>
          <select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>
            {activeTool.platforms.map((option) => <option key={option}>{option}</option>)}
          </select>
        </label>

        <label>
          <span>Tone</span>
          <select value={creativeTone} onChange={(e) => setCreativeTone(e.target.value)}>
            {tones.map((tone) => <option key={tone}>{tone}</option>)}
          </select>
        </label>
      </div>

      <textarea placeholder={activeTool.placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

      <div className="generatorButtons">
        <button className="btn dark" onClick={generate}>{loading ? "Generating..." : activeTool.key === "logo" ? "Generate Logo Image" : `Generate ${activeTool.shortTitle}`}</button>
        <button className="btn light" onClick={clearGenerator}>Clear</button>
      </div>

      {logoImage && (
        <div className="logoImageBox">
          <img src={logoImage} alt="Generated logo" />
          <div className="resultActions">
            <a className="downloadLink" href={logoImage} download="brandthat-logo.png">Download Logo</a>
          </div>
        </div>
      )}

      {(result || logoImage) && (
        <div className="resultActions resultMainActions">
          <button onClick={saveCurrentOutput}>Save to Workspace</button>
          {result && <button onClick={() => copyToClipboard(result)}>Copy</button>}
          {result && <button onClick={() => shareOutput(result)}>Share</button>}
        </div>
      )}

      {result && (
        <div className="resultBox">
          <div className="resultTop">
            <span>BRANDTHAT AI OUTPUT</span>
          </div>
          <div className="visualOutput">
            {result.split("\n").filter(Boolean).slice(0, 8).map((line, index) => (
              <div className="outputCard" key={`${line}-${index}`}>{line}</div>
            ))}
          </div>
          <div className="resultContent">{result}</div>
        </div>
      )}
    </div>
  );
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
h1{font-size:88px;line-height:.92;letter-spacing:-.07em;margin:0 0 24px}
.pageTitle{max-width:900px}
.pageLead{font-size:20px;line-height:1.6;color:#666;max-width:760px;margin:0 0 32px}
h2{font-size:44px;line-height:1;letter-spacing:-.05em;margin:0}
.toolCard h3,.featureCard h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin:0 0 12px}
.lead{font-size:22px;line-height:1.7;color:#666;max-width:620px}
.freeStrip{display:inline-flex;background:white;border:1px solid rgba(0,0,0,.08);padding:12px 16px;border-radius:999px;font-size:13px;font-weight:800;color:#8a6b37;margin-top:8px}
.heroCtas{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}
.generateCard,.workspaceCard,.signupBox{background:white;border-radius:38px;padding:34px;border:1px solid rgba(0,0,0,.08);box-shadow:0 30px 90px rgba(0,0,0,.06)}
.workspaceCard p{font-size:16px;line-height:1.7;color:#666}
.workspaceGrid,.workspaceLayout{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.workspaceActions{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
.brandList{display:flex;flex-direction:column;gap:12px;margin-top:20px}
.brandRow{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:18px;padding:12px}
.brandRow button:first-child{border:none;background:transparent;text-align:left;cursor:pointer}
.brandRow strong{display:block}
.brandRow span{display:block;color:#666;margin-top:4px}
.activeBrandRow{border-color:#111}
.miniDanger{border:none;background:#111;color:white;border-radius:999px;padding:8px 10px;cursor:pointer;font-weight:800}
.emptyState{background:#fafafa;border:1px dashed rgba(0,0,0,.18);border-radius:18px;padding:18px;color:#666;margin-top:16px}
.savedAssets{margin-top:46px}
.savedGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.savedBucket{background:white;border:1px solid rgba(0,0,0,.08);border-radius:24px;padding:18px}
.savedBucket h3{margin:0 0 12px}
.savedBucket p{color:#666}
.savedItem{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:16px;padding:12px;margin-top:10px}
.savedItem img{width:100%;border-radius:12px;margin-bottom:10px}
.savedItem button{margin-top:8px;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:8px 10px;font-weight:800;cursor:pointer}
.brandSystemSection{max-width:1280px;margin:0 auto;padding:40px 6vw 80px}
.systemGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:30px}
.systemCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:28px;padding:24px}
.systemCard span{font-weight:900;font-size:20px;letter-spacing:-.03em}
.systemCard p{color:#666;line-height:1.7}
.generateTop{display:flex;justify-content:space-between;gap:20px;margin-bottom:26px}
.liveBadge,.offerBadge{background:white;border:1px solid rgba(0,0,0,.08);padding:14px 18px;border-radius:999px;font-size:13px;font-weight:700;height:fit-content}
.planIndicator,.planNotice,.verifyNote{margin-top:16px;font-size:13px;font-weight:700;color:#8a6b37}
.activeBrandBar{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:14px 18px;margin-bottom:22px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.activeBrandBar button{background:#111;color:white;border:none;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}
textarea,input,select{width:100%;border-radius:24px;border:1px solid rgba(0,0,0,.08);padding:18px 20px;font-size:16px;background:#fafafa;font-family:inherit;margin-top:10px;color:#111}
textarea{height:170px;resize:none;line-height:1.6}
.generatorControls{display:grid;grid-template-columns:1fr 260px;gap:16px;margin-bottom:14px}
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
.signupBox p{color:#666;line-height:1.7}
.chatButton{position:fixed;bottom:24px;right:24px;background:#111;color:white;border:none;padding:16px 22px;border-radius:999px;font-weight:800;cursor:pointer;box-shadow:0 18px 40px rgba(0,0,0,.18);z-index:1000}
.chatWidget{position:fixed;bottom:90px;right:24px;width:340px;background:white;border-radius:28px;overflow:hidden;border:1px solid rgba(0,0,0,.08);box-shadow:0 30px 80px rgba(0,0,0,.12);z-index:1000}
.chatHeader{padding:20px;border-bottom:1px solid rgba(0,0,0,.06)}
.chatHeader strong{display:block;margin-bottom:6px}
.chatHeader span{font-size:14px;color:#666}
.chatBody{padding:18px;display:flex;flex-direction:column;gap:12px}
.chatBubble{background:#111;color:white;padding:14px 16px;border-radius:18px;line-height:1.6;font-size:14px}
.chatBubble.light{background:#f5f5f5;color:#111}
.seoHomeSection{max-width:1280px;margin:0 auto;padding:20px 6vw 100px}
.seoHomeSection h2{max-width:940px;margin-bottom:22px}
.seoHomeSection>p{font-size:19px;line-height:1.8;color:#666;max-width:900px}
.seoInternalLinks{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}
.seoInternalLinks button,.examplePromptGrid button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:13px 16px;font-weight:800;cursor:pointer;color:#111}
.seoTextGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:32px}
.seoTextGrid div,.seoArticleBlock,.faqCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:28px;padding:26px}
.seoTextGrid h3,.faqCard h3{font-size:20px;margin:0 0 10px;letter-spacing:-.03em}
.seoTextGrid p,.seoArticle p,.faqCard p{color:#666;line-height:1.8}
.seoArticle{margin-top:56px;display:flex;flex-direction:column;gap:22px}
.seoArticleBlock h2{font-size:34px;margin-bottom:14px}
.examplePromptGrid,.faqGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:18px}
.examplePromptGrid button{text-align:left;border-radius:18px;line-height:1.5}
@media(max-width:1100px){.logoHero,.workspaceLayout{grid-template-columns:1fr}.toolGrid,.featureGrid,.pricingGrid,.seoTextGrid,.systemGrid,.savedGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}}
@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{grid-template-columns:1fr auto;gap:12px;padding:24px 20px 8px}.navLinks{grid-column:1 / -1;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:6px}.accountBtn{grid-column:2;grid-row:1}.hero,.offersSection,.pageSection,.footerSubscribe,.seoHomeSection,.brandSystemSection{padding-left:20px;padding-right:20px}.hero{padding-top:28px}.toolGrid,.featureGrid,.pricingGrid,.workspaceGrid,.generatorButtons,.seoTextGrid,.examplePromptGrid,.faqGrid,.systemGrid,.savedGrid,.visualOutput{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}.resultTop{align-items:flex-start;flex-direction:column}textarea{height:160px}.chatWidget{width:calc(100vw - 40px);right:20px;bottom:84px}}
`;
