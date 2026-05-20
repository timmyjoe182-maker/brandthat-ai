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
    safeParse("brandthat_workspace_draft", {
      name: "",
      logoDirection: "",
      description: "",
      audience: "",
      tone: "Modern",
      style: "",
      launchGoal: "",
    })
  );

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [appNotice, setAppNotice] = useState(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState("Draft ready");
  const [favoriteIds, setFavoriteIds] = useState(() => safeParse("brandthat_favorite_ids", {}));

  const dailyRemaining = Math.max(0, 1 - dailyFreeCount);
  const isFree = userPlan === "free";
  const isStarter = userPlan === "starter";
  const isPro = userPlan === "pro";

  const emptySavedBuckets = () => ({
    captions: [],
    hooks: [],
    bios: [],
    hashtags: [],
    email: [],
    strategy: [],
    brand: [],
    logos: [],
  });

  const mapWorkspaceRow = (row) => ({
    id: row.id,
    name: row.name || "Untitled Brand",
    logoDirection: row.logo_direction || "",
    description: row.description || "",
    audience: row.audience || "",
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
    setWorkspaceDraft({
      name: "",
      logoDirection: "",
      description: "",
      audience: "",
      tone: "Modern",
      style: "",
      launchGoal: "",
    });
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

  const selectTool = (toolKey) => {
    const nextTool = toolMap[toolKey] || tools[0];
    setActiveToolKey(nextTool.key);
    setSelectedPlatform(activeBrand?.style || "");
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
    setSelectedPlatform(activeBrand?.style || "");
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

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Logo image generation failed.");
    }

    return data.image;
  };

  const generate = async () => {
    if (!prompt.trim()) {
      notify("error", "Add a prompt first", `Tell Brandthat what you want the ${activeTool.title} to create.`);
      return;
    }

    if (!user) {
      openAuth("signup", "Create a free account to unlock your 1 free AI logo generation.");
      return;
    }

    if (activeTool.key !== "logo" && !activeBrand) {
      setPage("workspace");
      notify("warning", "Create a workspace first", "Text tools are stronger when they are connected to a saved brand workspace.");
      setResult("Create a Brand Workspace first so your saved captions, hooks, bios, and brand assets stay organized.");
      return;
    }

    if (isFree && dailyFreeCount >= 1) {
      setPage("pricing");
      notify("warning", "Free logo generation used", "Subscribe to Pro to unlock unlimited AI logo generations.");
      setResult("Your free logo generation has been used. Subscribe to Pro for unlimited AI logo generations.");
      return;
    }

    if (activeTool.key === "logo" && isStarter) {
      setPage("pricing");
      notify("warning", "Logo generation is a Pro feature", "Starter includes unlimited text tools. Pro unlocks unlimited logo images.");
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

        const data = await response.json();
        setResult(data.text || "No response generated.");
      }

      if (isFree) incrementDailyFreeUse();
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
              <div className="eyebrow">AI BRAND WORKSPACE</div>
              <h1>Build your brand with AI.</h1>
              <p className="lead">Start with a logo, save your brand direction, then create captions, hooks, bios, launch copy, and strategy around one real brand workspace.</p>
              
              <div className="heroCtas">
                <button className="btn dark" onClick={() => setPage("workspace")}>Start Your Free Brand Workspace</button>
                <button className="btn light" onClick={() => openSeoPage("seo-logo")}>Try AI Logo Generator</button>
              </div>
            </div>

            <WorkspaceCreator
              workspaceDraft={workspaceDraft}
              setWorkspaceDraft={setWorkspaceDraft}
              createWorkspace={createWorkspace}
              autoSaveStatus={autoSaveStatus}
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
              features={["1 free AI logo generation after signup", "1 Brand Workspace", "Caption Generator", "Hook Generator", "Brand Bio Generator", "Basic Exports"]}
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

function WorkspaceCreator({ workspaceDraft, setWorkspaceDraft, createWorkspace, autoSaveStatus }) {
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
        <select
          value={workspaceDraft.style}
          onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, style: e.target.value })}
        >
          <option value="">Select Brand Style</option>
          <option value="Modern Minimal">Modern Minimal</option>
          <option value="Luxury">Luxury</option>
          <option value="Bold Startup">Bold Startup</option>
          <option value="Corporate">Corporate</option>
          <option value="Playful">Playful</option>
          <option value="Tech">Tech</option>
          <option value="Elegant">Elegant</option>
          <option value="Organic">Organic</option>
          <option value="Streetwear">Streetwear</option>
          <option value="Futuristic">Futuristic</option>
          <option value="Black and White">Black and White</option>
          <option value="Premium Editorial">Premium Editorial</option>
          <option value="Rustic">Rustic</option>
          <option value="Creative Agency">Creative Agency</option>
          <option value="Luxury Fashion">Luxury Fashion</option>
        </select>
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
                <strong>{brand.name}</strong>
                <span>{brand.tone} • {brand.audience || "Audience not set"}</span>
              </button>
              <div className="brandRowActions">
                <button onClick={() => duplicateBrand(brand.id)}>Duplicate</button>
                <button className="miniDanger" onClick={() => deleteBrand(brand.id)}>Delete</button>
              </div>
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
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
          saveCurrentOutput={saveCurrentOutput}
          toggleFavorite={toggleFavorite}
          remixOutput={remixOutput}
        />
      </div>

      <div className="seoArticle">
        <div className="seoArticleBlock">
          <h2>How it works</h2>
          <p>Describe what you want to create, choose a platform or style, select a tone, and Brandthat.ai generates a polished output you can copy, save, share, or build into your brand workspace.</p>
        </div>

        <CreativeDirectionPanel
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


function CreativeDirectionPanel({ toolKey, setPrompt, setSelectedPlatform, setCreativeTone }) {
  const directions = getCreativeDirections(toolKey);

  return (
    <div className="seoArticleBlock creativeDirectionsBlock">
      <div className="creativeDirectionsTop">
        <div>
          <div className="tinyTag">CREATIVE DIRECTIONS</div>
          <h2>Choose a creative direction.</h2>
        </div>
        <p>Clean, premium starting points that guide the AI without forcing a template.</p>
      </div>

      <div className="creativeDirectionGrid cleanDirections">
        {directions.map((direction) => (
          <button
            className="creativeDirectionCard cleanDirectionCard"
            key={direction.title}
            onClick={() => {
              setPrompt(direction.prompt);
              setSelectedPlatform(direction.style || "");
              setCreativeTone(direction.tone || "");
              document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <span className="directionKicker">{direction.style || direction.title}</span>
            <h3>{direction.title}</h3>
            <p>{direction.copy}</p>
            <div className="directionApply">Apply direction</div>
          </button>
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
  copyToClipboard,
  shareOutput,
  clearGenerator,
  saveCurrentOutput,
  toggleFavorite,
  remixOutput
}) {
  const resultCards = formatSmartResultCards(activeTool.key, result);

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
        <div className="liveBadge">AI Powered</div>
      </div>

      <div className="generatorControls freeTypeControls">
        <label>
          <span>{activeTool.platformLabel}</span>
          <input
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            placeholder={getStylePlaceholder(activeTool.key)}
          />
        </label>

        <label>
          <span>Tone</span>
          <input
            value={creativeTone}
            onChange={(e) => setCreativeTone(e.target.value)}
            placeholder={getTonePlaceholder(activeTool.key)}
          />
        </label>
      </div>

      <textarea
        className="mainPromptBox"
        placeholder={getMainPromptPlaceholder(activeTool)}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="generatorButtons">
        <button className="btn dark" onClick={generate}>
          {loading ? getLoadingText(activeTool.key) : activeTool.key === "logo" ? "Generate Logo Image" : `Generate ${activeTool.shortTitle}`}
        </button>
        <button className="btn light" onClick={clearGenerator}>Clear</button>
      </div>

      {loading && (
        <div className="premiumLoading">
          <div className="loadingPulse"></div>
          <div>
            <strong>{getLoadingText(activeTool.key)}</strong>
            <span>{getLoadingSubtext(activeTool.key)}</span>
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
              <button onClick={() => remixOutput(activeEntry)}>Remix</button>
            </div>
          </div>
        </div>
      )}

      {result && (
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
                    <button onClick={() => setPrompt(`Improve this ${activeTool.shortTitle}:\n\n${card.content}`)}>Use</button>
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
    hashtags: "Generate hashtag systems grouped by reach, niche, audience, and brand relevance.",
    email: "Write complete email copy with subject lines, preview text, and calls to action.",
    strategy: "Create a platform-specific content plan with pillars, cadence, and next steps.",
    brand: "Turn a rough idea into positioning, names, voice, audience, and launch direction."
  };
  return lines[toolKey] || "Create premium, ready-to-use brand assets in seconds.";
}

function getStylePlaceholder(toolKey) {
  const placeholders = {
    logo: "Logo style, industry, icon, colors, era, layout, or reference direction",
    captions: "Platform, post type, or format",
    hooks: "Video platform, content type, or hook style",
    bios: "Bio placement or profile type",
    hashtags: "Platform, niche, location, or audience",
    email: "Email type or campaign goal",
    strategy: "Platform, campaign, or growth focus",
    brand: "Brand category, market, or business type"
  };
  return placeholders[toolKey] || "Style, format, or direction";
}

function getTonePlaceholder(toolKey) {
  const placeholders = {
    logo: "Brand feeling, mood, audience perception, or personality",
    captions: "Caption tone or voice",
    hooks: "Hook energy or vibe",
    bios: "Voice and personality",
    hashtags: "Reach goal or audience feel",
    email: "Email tone",
    strategy: "Strategy tone or brand voice",
    brand: "Brand personality"
  };
  return placeholders[toolKey] || "Tone or voice";
}

function getMainPromptPlaceholder(activeTool) {
  if (activeTool.key === "logo") {
    return "Describe the logo you want. Include the brand name, what it does, symbols or letters you want, colors, style, audience, and anything it should avoid.";
  }
  return activeTool.placeholder;
}

function getLoadingText(toolKey) {
  const loading = {
    logo: "Designing your logo concept...",
    captions: "Writing premium captions...",
    hooks: "Building scroll-stopping hooks...",
    bios: "Crafting polished brand bios...",
    hashtags: "Creating hashtag systems...",
    email: "Writing high-converting email copy...",
    strategy: "Building your content strategy...",
    brand: "Creating your brand system..."
  };
  return loading[toolKey] || "Generating your brand asset...";
}

function getLoadingSubtext(toolKey) {
  const subtext = {
    logo: "Balancing style, clarity, scalability, and brand memorability.",
    captions: "Formatting options into usable caption cards.",
    hooks: "Creating multiple retention-focused opening angles.",
    bios: "Adapting the bio for different profile placements.",
    hashtags: "Grouping hashtags by intent and discoverability.",
    email: "Structuring subject, preview, body, and CTA.",
    strategy: "Turning your goal into content pillars and action steps.",
    brand: "Building identity, audience, positioning, and launch direction."
  };
  return subtext[toolKey] || "Formatting your results into premium brand cards.";
}

function formatSmartResultCards(toolKey, result) {
  if (!result) return [];

  const cleanLines = result
    .split("\n")
    .map((line) => line.replace(/^[-•*\d.)\s]+/, "").trim())
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
      { label: "NICHE", title: "Niche Hashtags", featured: true },
      { label: "REACH", title: "Broad Reach" },
      { label: "AUDIENCE", title: "Audience Tags" },
      { label: "LOCAL", title: "Location Tags" },
      { label: "BRAND", title: "Brand Tags" },
      { label: "VIRAL", title: "Trend Tags" }
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
    ]
  };
  return schemas[toolKey] || schemas.brand;
}

function getResultHeader(toolKey) {
  const headers = {
    logo: "LOGO + BRAND DIRECTION",
    captions: "CAPTION OPTIONS",
    hooks: "HOOK OPTIONS",
    bios: "BIO OPTIONS",
    hashtags: "HASHTAG SYSTEM",
    email: "EMAIL COPY",
    strategy: "SOCIAL STRATEGY",
    brand: "BRAND CREATION SYSTEM"
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
.seoHomeSection{max-width:1280px;margin:0 auto;padding:20px 6vw 100px}
.seoHomeSection h2{max-width:940px;margin-bottom:22px}
.seoHomeSection>p{font-size:19px;line-height:1.8;color:#666;max-width:900px}
.seoInternalLinks{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}
.seoInternalLinks button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:13px 16px;font-weight:800;cursor:pointer;color:#111}
.seoTextGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:32px}
.seoTextGrid div,.seoArticleBlock,.faqCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:28px;padding:26px}
.seoTextGrid h3,.faqCard h3{font-size:20px;margin:0 0 10px;letter-spacing:-.03em}
.seoTextGrid p,.seoArticle p,.faqCard p{color:#666;line-height:1.8}
.seoArticle{margin-top:56px;display:flex;flex-direction:column;gap:22px}
.seoArticleBlock h2{font-size:34px;margin-bottom:14px}
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

@media(max-width:1100px){.logoHero,.workspaceLayout{grid-template-columns:1fr}.toolGrid,.featureGrid,.pricingGrid,.seoTextGrid,.systemGrid,.savedGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}}
@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{grid-template-columns:1fr auto;gap:12px;padding:24px 20px 8px}.navLinks{grid-column:1 / -1;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:6px}.accountBtn{grid-column:2;grid-row:1}.hero,.offersSection,.pageSection,.footerSubscribe,.seoHomeSection,.brandSystemSection{padding-left:20px;padding-right:20px}.hero{padding-top:28px}.toolGrid,.featureGrid,.pricingGrid,.workspaceGrid,.generatorButtons,.seoTextGrid,.creativeDirectionsTop,.creativeDirectionGrid,.useCaseGrid,.faqGrid,.systemGrid,.savedGrid,.visualOutput,.logoShowcase,.resultCardGrid{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}.resultTop{align-items:flex-start;flex-direction:column}textarea{height:160px}}
`;
