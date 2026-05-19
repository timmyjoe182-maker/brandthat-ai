import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

const tools = [
  {
    key: "captions",
    title: "Captions",
    desc: "Premium captions for every social platform.",
    label: "Caption Generator",
    platformLabel: "Social platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: Write a caption for a video of our goats running to dinner at the ranch.",
    promptGuide: "Create premium social media captions. Give multiple options for the selected platform, including short, polished, hook-driven, and CTA versions."
  },
  {
    key: "hashtags",
    title: "Hashtags",
    desc: "Smart hashtag systems designed for reach.",
    label: "Hashtag Generator",
    platformLabel: "Social platform",
    platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"],
    placeholder: "Example: Mini cows, ranch life, goats, alpacas, luxury countryside content.",
    promptGuide: "Generate hashtag sets related to the user's word, sentence, or topic. Group hashtags by niche, broad reach, audience, location, and viral/reach potential."
  },
  {
    key: "bios",
    title: "Brand Bios",
    desc: "Polished bios for creators and businesses.",
    label: "Brand Bio Generator",
    platformLabel: "Bio placement",
    platforms: ["Instagram", "TikTok", "LinkedIn", "Website", "X / Twitter", "Facebook", "General Brand Profile"],
    placeholder: "Example: A private luxury ranch sharing miniature animals, ranch life, and high-end gifting.",
    promptGuide: "Create polished brand bios that feel specific, premium, and useful. Include several versions for the selected placement."
  },
  {
    key: "hooks",
    title: "On-video Hooks",
    desc: "Short hooks for Reels, TikTok, and Shorts.",
    label: "On-video Hook Generator",
    platformLabel: "Video platform",
    platforms: ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook Reels", "General Short Video"],
    placeholder: "Example: A 20-second video of baby goats jumping on hay bales.",
    promptGuide: "Generate quick catchy on-video hooks that make people stop scrolling. Keep hooks short, punchy, clear, and not cheesy. Include 1-second, 3-second, and 5-second options."
  },
  {
    key: "email",
    title: "Email Copy",
    desc: "Launch emails, promos, and newsletters.",
    label: "Email Copy Generator",
    platformLabel: "Email type",
    platforms: ["Team Update", "Product Launch", "Promo Email", "Newsletter", "Client Announcement", "Welcome Email", "Follow-up Email", "Partnership Outreach"],
    placeholder: "Example: Write an email to our team announcing the launch of a new AI logo generator.",
    promptGuide: "Generate complete email copy that can be copied and sent. Include subject lines, preview text, greeting, body, CTA, and sign-off. Match the selected email type."
  },
  {
    key: "strategy",
    title: "Social Strategy",
    desc: "Content direction across every platform.",
    label: "Social Strategy Generator",
    platformLabel: "Primary platform",
    platforms: ["Instagram", "TikTok", "LinkedIn", "Facebook", "X / Twitter", "YouTube Shorts", "Pinterest", "Multi-platform"],
    placeholder: "Example: We are a ranch brand trying to grow with animal videos, gifting, and high-end lifestyle content.",
    promptGuide: "Generate current best-practice social strategy for the selected platform. Include content pillars, posting ideas, hooks, cadence, growth tactics, and next steps."
  },
  {
    key: "brand",
    title: "Brand Creation",
    desc: "Generate brand names and positioning.",
    label: "Brand Creation Generator",
    platformLabel: "Brand focus",
    platforms: ["New Business", "Creator Brand", "Product Brand", "Luxury Brand", "Local Business", "Agency / Studio", "Personal Brand", "Online Tool / SaaS"],
    placeholder: "Example: I want to create a premium AI tool that helps small businesses make content and branding faster.",
    promptGuide: "Help the user create the best possible brand from a word, sentence, or paragraph. Include brand names, positioning, audience, tagline, voice, visual direction, offer ideas, and launch direction."
  },
  {
    key: "logo",
    title: "Logo Generator",
    desc: "Create modern logo concepts instantly.",
    label: "AI Logo Generator",
    platformLabel: "Logo style",
    platforms: ["Modern Minimal", "Luxury Wordmark", "Bold Monogram", "Editorial Serif", "Clean Tech", "Founder Brand", "Beauty / Wellness", "Restaurant / Hospitality", "Real Estate", "Social Media Icon"],
    placeholder: "Example: Brandthat.ai, a black-and-white AI creative studio for modern creators and brands.",
    promptGuide: "Create a real modern logo image plus brand-ready logo direction. The user can type a word, sentence, or paragraph describing the logo they want."
  }
];

const toolMap = Object.fromEntries(tools.map((tool) => [tool.key, tool]));

const seoPages = {
  logo: {
    path: "/ai-logo-generator",
    toolKey: "logo",
    eyebrow: "AI LOGO GENERATOR",
    title: "AI Logo Generator for Modern Brands, Creators, and Startups",
    metaTitle: "AI Logo Generator | Brandthat.ai",
    metaDescription: "Create premium AI logo images and brand-ready logo concepts for startups, creators, agencies, and businesses with Brandthat.ai.",
    intro: "Brandthat.ai helps founders, creators, and businesses generate modern logo ideas without starting from a blank page. Describe your brand, choose a style, and use the AI logo generator to create a clean, premium visual direction that can work for websites, social media profiles, product launches, and brand identity concepts.",
    sections: [
      {
        heading: "Why use an AI logo generator?",
        body: "A strong logo gives a brand a recognizable first impression. Most new businesses need something that feels polished, simple, and usable across platforms, but hiring a designer before the idea is fully formed can be expensive. Brandthat.ai gives you a fast way to explore logo directions, typography styles, monogram ideas, icon concepts, and visual identity notes before you commit to a final brand system."
      },
      {
        heading: "How Brandthat creates logo ideas",
        body: "Start by typing a brand name, industry, mood, audience, or visual idea. For example, you can ask for a black-and-white AI logo for a modern creative studio, a luxury wordmark for a skincare brand, or a bold monogram for a real estate business. Brandthat turns that input into a logo image and supporting brand direction so the output feels useful, not random."
      },
      {
        heading: "Best for startup logos, creator brands, and small businesses",
        body: "The logo generator is designed for people moving quickly: founders testing names, creators building a personal brand, agencies brainstorming for clients, and small businesses that need a strong first visual identity. Use it to explore premium, minimal, luxury, bold, editorial, clean-tech, wellness, restaurant, hospitality, and social media icon styles."
      }
    ],
    examples: [
      "Create a minimal black-and-white logo for an AI branding tool called Brandthat.ai.",
      "Generate a luxury serif wordmark for a boutique skincare brand focused on natural ingredients.",
      "Create a bold monogram logo for a real estate team that wants to feel modern and trustworthy."
    ],
    faqs: [
      ["Can I use the generated logo for my business?", "Brandthat.ai is built for concept generation and brand exploration. You should review final usage rights, trademark availability, and uniqueness before using any logo commercially."],
      ["Can the logo generator create a social media profile logo?", "Yes. Ask for a logo that works as a profile image, app icon, watermark, or social media avatar."],
      ["What should I type into the logo generator?", "Include your brand name, industry, desired style, colors, audience, and any symbols you want included or avoided."]
    ]
  },
  captions: {
    path: "/instagram-caption-generator",
    toolKey: "captions",
    eyebrow: "INSTAGRAM CAPTION GENERATOR",
    title: "Instagram Caption Generator for Creators, Brands, and Businesses",
    metaTitle: "Instagram Caption Generator | Brandthat.ai",
    metaDescription: "Generate polished Instagram captions, social media captions, CTAs, and hook-driven post copy for creators and brands.",
    intro: "The Brandthat.ai caption generator helps you turn simple ideas into polished social media copy. Whether you are posting a Reel, carousel, product launch, lifestyle image, behind-the-scenes moment, or brand announcement, the tool creates captions that match your platform and tone.",
    sections: [
      { heading: "Captions that match the platform", body: "A caption for Instagram should not always sound like a LinkedIn post or a TikTok description. Brandthat lets you choose the platform and tone so the output is shaped for the place you are posting." },
      { heading: "Built for scroll-stopping social posts", body: "The generator can create short captions, polished captions, hook-driven captions, CTA versions, and multiple options so you can choose the one that fits your post best." },
      { heading: "Use it for daily content", body: "Use the caption generator for product posts, creator updates, ranch content, wedding photography, fashion, food, real estate, wellness, luxury brands, and local businesses." }
    ],
    examples: [
      "Write an Instagram caption for a luxury ranch video of goats running to dinner.",
      "Create a polished caption for a wedding photography carousel.",
      "Write a TikTok caption for a behind-the-scenes product launch video."
    ],
    faqs: [
      ["Does this only work for Instagram?", "No. You can generate captions for Instagram, TikTok, Facebook, LinkedIn, X, YouTube Shorts, and Pinterest."],
      ["Can I choose a tone?", "Yes. You can choose tones like professional, modern, luxury, witty, friendly, emotional, and viral."],
      ["Will it write multiple caption options?", "Yes. Brandthat is designed to give multiple usable options so you are not stuck with one generic caption."]
    ]
  },
  hooks: {
    path: "/tiktok-hook-generator",
    toolKey: "hooks",
    eyebrow: "TIKTOK HOOK GENERATOR",
    title: "TikTok Hook Generator for Reels, Shorts, and Viral Videos",
    metaTitle: "TikTok Hook Generator | Brandthat.ai",
    metaDescription: "Generate short on-video hooks for TikTok, Instagram Reels, YouTube Shorts, and social videos.",
    intro: "A good video hook can decide whether someone watches or scrolls away. Brandthat.ai creates short, clear, catchy hooks for TikTok, Instagram Reels, YouTube Shorts, and other short-form video platforms.",
    sections: [
      { heading: "Short hooks for the first few seconds", body: "The strongest hooks are often simple. Brandthat generates 1-second, 3-second, and 5-second hook options designed to quickly communicate why someone should keep watching." },
      { heading: "Built for creators and brands", body: "Use the hook generator for animal videos, tutorials, product demos, founder videos, transformations, behind-the-scenes clips, lifestyle content, and educational posts." },
      { heading: "Avoid cheesy hook copy", body: "The tool is instructed to keep hooks punchy, natural, and not overly cheesy. You can choose a tone and platform to better match your content style." }
    ],
    examples: [
      "Give me hooks for a 20-second video of baby goats jumping on hay bales.",
      "Create TikTok hooks for a founder showing a new AI logo generator.",
      "Write on-screen hooks for a before-and-after brand makeover video."
    ],
    faqs: [
      ["What is an on-video hook?", "It is the short text or opening line that grabs attention at the beginning of a video."],
      ["Can I use the hooks on Instagram Reels?", "Yes. The tool works for TikTok, Instagram Reels, YouTube Shorts, Facebook Reels, and general short video."],
      ["How many hooks does it create?", "It can generate multiple hook options, including very short versions for the first second of a video."]
    ]
  },
  bios: {
    path: "/brand-bio-generator",
    toolKey: "bios",
    eyebrow: "BRAND BIO GENERATOR",
    title: "Brand Bio Generator for Instagram, TikTok, LinkedIn, and Websites",
    metaTitle: "Brand Bio Generator | Brandthat.ai",
    metaDescription: "Create polished brand bios for Instagram, TikTok, LinkedIn, websites, and business profiles with Brandthat.ai.",
    intro: "Your bio is often the first thing people read before deciding to follow, click, book, or buy. Brandthat.ai helps creators, businesses, and founders turn a basic brand description into a polished bio for Instagram, TikTok, LinkedIn, websites, and general brand profiles.",
    sections: [
      { heading: "Make your brand clear quickly", body: "A strong bio should explain who you are, what you do, who you help, and why someone should care. Brandthat creates concise bio options that feel clear and professional." },
      { heading: "Bios for every platform", body: "Instagram bios need to be short and sharp. LinkedIn bios can be more professional. Website bios can be more polished and descriptive. Brandthat lets you choose the placement first." },
      { heading: "Useful for creators and businesses", body: "Use the bio generator for personal brands, ranch brands, agencies, restaurants, real estate teams, wellness brands, creators, online tools, and local businesses." }
    ],
    examples: [
      "Write a bio for a luxury private ranch with miniature animals and high-end gifting.",
      "Create an Instagram bio for a husband-and-wife photography and social media studio.",
      "Write a LinkedIn bio for an AI branding tool for small businesses."
    ],
    faqs: [
      ["Can it write Instagram bios?", "Yes. Choose Instagram as the bio placement and describe your brand."],
      ["Can it make my bio sound more premium?", "Yes. Choose a tone like luxury, modern, editorial, or professional."],
      ["Can it write multiple bio versions?", "Yes. It can give short, polished, professional, and platform-specific versions."]
    ]
  }
};

const routeMap = {
  "/": { page: "home", toolKey: "logo", seoKey: null },
  "/ai-logo-generator": { page: "seo", toolKey: "logo", seoKey: "logo" },
  "/logo-generator": { page: "seo", toolKey: "logo", seoKey: "logo" },
  "/instagram-caption-generator": { page: "seo", toolKey: "captions", seoKey: "captions" },
  "/caption-generator": { page: "seo", toolKey: "captions", seoKey: "captions" },
  "/tiktok-hook-generator": { page: "seo", toolKey: "hooks", seoKey: "hooks" },
  "/hook-generator": { page: "seo", toolKey: "hooks", seoKey: "hooks" },
  "/brand-bio-generator": { page: "seo", toolKey: "bios", seoKey: "bios" }
};

function getInitialRoute() {
  const path = window.location.pathname || "/";
  return routeMap[path] || { page: "home", toolKey: "logo", seoKey: null };
}

function updateMeta(title, description, canonicalPath = "/") {
  document.title = title;
  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement("meta");
    descriptionTag.setAttribute("name", "description");
    document.head.appendChild(descriptionTag);
  }
  descriptionTag.setAttribute("content", description);

  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }
  canonical.setAttribute("href", `https://brandthat.ai${canonicalPath}`);
}

const creativeTones = [
  "Professional", "Modern", "Minimal", "Luxury", "Bold", "Playful", "Editorial", "Cinematic",
  "Premium", "Friendly", "Witty", "Elegant", "Direct", "Emotional", "High-end", "Viral"
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredNumber(key, fallback = 0) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

export default function App() {
  const initialRoute = useMemo(() => getInitialRoute(), []);
  const [page, setPage] = useState(initialRoute.page);
  const [seoPageKey, setSeoPageKey] = useState(initialRoute.seoKey);
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(localStorage.getItem("brandthat_plan") || "free");
  const [visitorFreeCount, setVisitorFreeCount] = useState(getStoredNumber("brandthat_visitor_free_count", 0));
  const [dailyFreeCount, setDailyFreeCount] = useState(getStoredNumber("brandthat_daily_count", 0));

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  const [activeToolKey, setActiveToolKey] = useState(initialRoute.toolKey || "logo");
  const activeTool = toolMap[activeToolKey] || tools[0];
  const [selectedPlatform, setSelectedPlatform] = useState(activeTool.platforms[0]);
  const [creativeTone, setCreativeTone] = useState("Professional");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [logoImage, setLogoImage] = useState("");
  const [loading, setLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);

  const visitorRemaining = Math.max(0, 3 - visitorFreeCount);
  const dailyRemaining = Math.max(0, 10 - dailyFreeCount);

  useEffect(() => {
    const today = getTodayKey();
    const storedDate = localStorage.getItem("brandthat_daily_date");

    if (storedDate !== today) {
      localStorage.setItem("brandthat_daily_date", today);
      localStorage.setItem("brandthat_daily_count", "0");
      setDailyFreeCount(0);
    }

    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user || null);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);


  useEffect(() => {
    const onPopState = () => {
      const route = getInitialRoute();
      setPage(route.page);
      setSeoPageKey(route.seoKey);
      setActiveToolKey(route.toolKey || "logo");
      setSelectedPlatform((toolMap[route.toolKey] || toolMap.logo).platforms[0]);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (page === "seo" && seoPageKey && seoPages[seoPageKey]) {
      const seo = seoPages[seoPageKey];
      updateMeta(seo.metaTitle, seo.metaDescription, seo.path);
      return;
    }

    updateMeta(
      "Brandthat.ai | AI Logo Generator & AI Branding Tools",
      "Generate premium AI logos, captions, hooks, brand bios, hashtags, email copy, and social strategy instantly with Brandthat.ai.",
      "/"
    );
  }, [page, seoPageKey]);

  const goToRoute = (path) => {
    const route = routeMap[path] || { page: "home", toolKey: "logo", seoKey: null };
    window.history.pushState({}, "", path);
    setPage(route.page);
    setSeoPageKey(route.seoKey);
    setActiveToolKey(route.toolKey || "logo");
    setSelectedPlatform((toolMap[route.toolKey] || toolMap.logo).platforms[0]);
    setPrompt("");
    setResult("");
    setLogoImage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openTrialSignup = () => {
    setAuthMode("signup");
    setSelectedPlan("free");
    setAuthMessage("Create a free account to continue. Free accounts get 10 generations per day.");
    setShowAuth(true);
  };

  const openPlanSignup = (plan) => {
    setAuthMode("signup");
    setSelectedPlan(plan);
    setAuthMessage("");
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
      options: {
        emailRedirectTo: "https://brandthat.ai"
      }
    });

    if (error) {
      setAuthMessage(error.message);
      setLoading(false);
      return;
    }

    localStorage.setItem("brandthat_plan", selectedPlan);
    setUserPlan(selectedPlan);
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

  const subscribe = () => {
    if (!subscribeEmail) {
      setSubscribeMessage("Please enter your email.");
      return;
    }

    localStorage.setItem("brandthat_newsletter", subscribeEmail);
    setSubscribeMessage("You're subscribed. Thank you.");
    setSubscribeEmail("");
  };

  const incrementVisitorFreeUse = () => {
    const newCount = visitorFreeCount + 1;
    localStorage.setItem("brandthat_visitor_free_count", String(newCount));
    setVisitorFreeCount(newCount);
  };

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
    setPrompt("");
    setResult("");
    setLogoImage("");
    setSeoPageKey(null);
    setPage(nextTool.key === "logo" ? "logo" : "studio");

    window.setTimeout(() => {
      const generator = document.getElementById("brandthat-generator");
      generator?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const getSystemPrompt = () => {
    const basePrompt = `
You are Brandthat AI, a premium AI creative studio for creators, brands, agencies, and businesses.

The user selected this generator:
${activeTool.title}

What this generator must do:
${activeTool.promptGuide}

Selected platform/style/type:
${selectedPlatform}

Selected tone:
${creativeTone}

Rules:
- Match the selected generator exactly.
- Do not give random generic luxury copy unless the user asks for luxury.
- Make the output specific to the user's request.
- Use clear headings and spacing.
- Give multiple useful options when appropriate.
- Make the output easy to copy and use immediately.
- Avoid fluff.
- Avoid saying "as an AI."
- Be modern, premium, clear, and practical.
`;

    if (userPlan === "free") {
      return `${basePrompt}\nCurrent access level: Free. Give a useful answer, but keep it concise and clean.`;
    }

    if (userPlan === "starter") {
      return `${basePrompt}\nCurrent access level: Starter. Generate strong content outputs with practical options.`;
    }

    if (userPlan === "pro") {
      return `${basePrompt}\nCurrent access level: Pro. Generate premium, polished, multi-option outputs with platform-specific recommendations.`;
    }

    if (userPlan === "studio") {
      return `${basePrompt}\nCurrent access level: Studio. Generate agency-level, client-ready outputs with strategy, positioning, execution notes, and polished formatting.`;
    }

    return basePrompt;
  };

  const generate = async () => {
    if (!prompt.trim()) {
      setResult(`Tell Brandthat what you want the ${activeTool.title} tool to create first.`);
      return;
    }

    if (!user && visitorFreeCount >= 3) {
      openTrialSignup();
      setResult("You’ve used your 3 free generations. Create a free account to keep going.");
      return;
    }

    if (user && userPlan === "free" && dailyFreeCount >= 10) {
      setPage("pricing");
      setResult("You’ve reached your 10 free generations for today. Upgrade for unlimited access.");
      return;
    }

    setLoading(true);
    if (activeTool.key === "logo") setLogoImage("");

    try {
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

      if (activeTool.key === "logo") {
        try {
          const logoResponse = await fetch("/.netlify/functions/logo-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              brandName: prompt.slice(0, 80),
              logoPrompt: `${selectedPlatform}. ${creativeTone} tone. ${prompt}`
            })
          });

          const logoData = await logoResponse.json();
          if (logoResponse.ok && logoData.image) {
            setLogoImage(logoData.image);
          }
        } catch (logoError) {
          setResult((previous) => `${previous}

Logo image preview could not be created, but your logo direction is ready above.`);
        }
      }

      if (!user) {
        incrementVisitorFreeUse();
      } else if (userPlan === "free") {
        incrementDailyFreeUse();
      }
    } catch (error) {
      setResult("Something went wrong. Please try again.");
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
    setResult("");
  };

  return (
    <div className="app">
      <style>{css}</style>

      <nav className="nav">
        <button className="brand" onClick={() => goToRoute("/")}>Brandthat</button>

        <div className="navLinks">
          <button onClick={() => setPage("features")}>Features</button>
          <button onClick={() => setPage("pricing")}>Pricing</button>
          <button onClick={() => { setActiveToolKey("captions"); setPage("studio"); }}>Studio</button>
          <button onClick={() => goToRoute("/ai-logo-generator")}>AI Logo Generator</button>
        </div>

        {user ? (
          <button className="accountBtn" onClick={logOut}>Log out</button>
        ) : (
          <button className="accountBtn" onClick={() => setShowAuth(true)}>Log in</button>
        )}
      </nav>

      {page === "home" && (
        <>
          <main className="hero">
            <div className="heroTop">
              <div className="eyebrow">AI CREATIVE STUDIO</div>
              <h1>Your AI creative partner for every post.</h1>
              <p className="lead">Generate captions, hashtags, launch ideas, bios, emails, logos, and social media direction — all in one workspace.</p>
              <div className="freeStrip">
                {!user ? `${visitorRemaining} free generations left before signup` : userPlan === "free" ? `${dailyRemaining} free generations left today` : "Unlimited premium access active"}
              </div>
            </div>

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
              user={user}
              userPlan={userPlan}
              visitorRemaining={visitorRemaining}
              dailyRemaining={dailyRemaining}
              copyToClipboard={copyToClipboard}
              shareOutput={shareOutput}
              clearGenerator={clearGenerator}
              logoImage={logoImage}
            />
          </main>

          <section className="offersSection">
            <div className="offersTop">
              <div>
                <div className="tinyTag">WHAT BRANDTHAT AI OFFERS</div>
                <h2>Everything modern brands need.</h2>
              </div>
              <div className="offerBadge">Click a tool to start</div>
            </div>

            <ToolGrid activeToolKey={activeToolKey} selectTool={selectTool} />
            <SEOHomeContent goToRoute={goToRoute} />
          </section>
        </>
      )}

      {page === "features" && (
        <section className="pageSection">
          <div className="tinyTag">FEATURES</div>
          <h1 className="pageTitle">Choose exactly what you want Brandthat to create.</h1>
          <ToolGrid activeToolKey={activeToolKey} selectTool={selectTool} />
        </section>
      )}


      {page === "seo" && seoPageKey && seoPages[seoPageKey] && (
        <section className="pageSection seoPage" id="brandthat-generator">
          <SEOPageContent seo={seoPages[seoPageKey]} goToRoute={goToRoute} />
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
            user={user}
            userPlan={userPlan}
            visitorRemaining={visitorRemaining}
            dailyRemaining={dailyRemaining}
            copyToClipboard={copyToClipboard}
            shareOutput={shareOutput}
            clearGenerator={clearGenerator}
            logoImage={logoImage}
          />
        </section>
      )}

      {page === "pricing" && (
        <section className="pageSection">
          <div className="tinyTag">PRICING</div>
          <h1 className="pageTitle">Choose the plan that fits your workflow.</h1>
          <div className="pricingGrid">
            <PriceCard
              name="STARTER"
              price="$10"
              desc="Unlimited AI generations for captions, hashtags, bios, hooks, and simple social ideas."
              features={["Unlimited AI generations", "Captions & hashtags", "Brand bios", "On-video hooks", "Simple social ideas", "No AI Logo Generator"]}
              onClick={() => openPlanSignup("starter")}
            />
            <PriceCard
              name="PRO"
              price="$20"
              featured
              desc="Everything in Starter plus unlimited AI Logo Generator and premium creative outputs."
              features={["Unlimited AI generations", "Unlimited AI Logo Generator", "Brand creation tools", "Premium creative outputs", "Launch & campaign ideas", "Social strategy"]}
              onClick={() => openPlanSignup("pro")}
            />
            <PriceCard
              name="STUDIO"
              price="$50"
              desc="Built for agencies, studios, and brands needing client-ready creative systems."
              features={["Everything in Pro", "Agency-level workflows", "Brand system generation", "Premium export layouts", "Client-ready presentations", "Future white-label access", "Early access to new AI tools"]}
              onClick={() => openPlanSignup("studio")}
            />
          </div>
        </section>
      )}

      {page === "studio" && (
        <section className="pageSection" id="brandthat-generator">
          <div className="tinyTag">{activeTool.label}</div>
          <h1 className="pageTitle">{activeTool.title}</h1>
          <p className="pageLead">{activeTool.desc} Select the type, describe what you need, and Brandthat will generate it.</p>
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
            user={user}
            userPlan={userPlan}
            visitorRemaining={visitorRemaining}
            dailyRemaining={dailyRemaining}
            copyToClipboard={copyToClipboard}
            shareOutput={shareOutput}
            clearGenerator={clearGenerator}
            logoImage={logoImage}
          />
        </section>
      )}

      {page === "logo" && (
        <section className="pageSection" id="brandthat-generator">
          <div className="tinyTag">AI LOGO GENERATOR</div>
          <h1 className="pageTitle">Create modern logo concepts instantly.</h1>
          <p className="pageLead">Type a word, sentence, or paragraph describing the logo you want. Brandthat will generate a modern logo direction, palette, typography, and image prompt.</p>

          <div className="planNotice">
            {!user && `${visitorRemaining} free generations remaining before signup.`}
            {user && userPlan === "free" && `${dailyRemaining} free generations left today.`}
            {user && userPlan !== "free" && "Premium logo generation access active."}
          </div>

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
            user={user}
            userPlan={userPlan}
            visitorRemaining={visitorRemaining}
            dailyRemaining={dailyRemaining}
            copyToClipboard={copyToClipboard}
            shareOutput={shareOutput}
            clearGenerator={clearGenerator}
            logoImage={logoImage}
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
            <h2>{authMode === "signup" ? "Start using Brandthat." : "Welcome back."}</h2>
            <p>{authMode === "signup" ? "Create your free account to continue generating. Free accounts get 10 generations per day." : "Log in to continue using your Brandthat account."}</p>
            <input placeholder="Email address" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} />
            <input placeholder="Password" type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} />
            <button className="btn dark full" onClick={authMode === "signup" ? signUp : logIn}>{loading ? "Please wait..." : authMode === "signup" ? "Create account" : "Log in"}</button>
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
            <div className="chatBubble">Click any tool card to open the exact generator for that task.</div>
            <div className="chatBubble light">3 free generations before signup.<br />Free accounts get 10 daily generations.<br />Paid plans unlock premium access.</div>
          </div>
        </div>
      )}
    </div>
  );
}


function SEOHomeContent({ goToRoute }) {
  return (
    <div className="seoContent homeSeo">
      <div className="tinyTag">AI BRANDING TOOLS BUILT TO BE FOUND</div>
      <h2>Generate logos, captions, hooks, bios, and brand direction from one clean workspace.</h2>
      <p>
        Brandthat.ai is designed for creators, founders, small businesses, agencies, and growing brands that need professional creative work fast. Instead of opening separate tools for logo ideas, Instagram captions, TikTok hooks, hashtag sets, brand bios, emails, and social strategy, Brandthat gives you a single AI creative studio built around real brand use cases.
      </p>
      <p>
        The main focus is the AI Logo Generator: a simple way to describe a brand and create a modern logo image plus supporting brand direction. From there, you can generate the content that helps launch and grow the brand: captions, bios, hooks, hashtags, emails, and social plans.
      </p>
      <div className="seoCtaGrid">
        <button onClick={() => goToRoute("/ai-logo-generator")}>Explore AI Logo Generator</button>
        <button onClick={() => goToRoute("/instagram-caption-generator")}>Instagram Caption Generator</button>
        <button onClick={() => goToRoute("/tiktok-hook-generator")}>TikTok Hook Generator</button>
        <button onClick={() => goToRoute("/brand-bio-generator")}>Brand Bio Generator</button>
      </div>
    </div>
  );
}

function SEOPageContent({ seo, goToRoute }) {
  return (
    <div className="seoContent dedicatedSeo">
      <div className="tinyTag">{seo.eyebrow}</div>
      <h1 className="pageTitle">{seo.title}</h1>
      <p className="pageLead">{seo.intro}</p>

      <div className="seoInfoGrid">
        {seo.sections.map((section) => (
          <article className="seoInfoCard" key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </article>
        ))}
      </div>

      <div className="exampleBox">
        <div className="tinyTag">EXAMPLE PROMPTS</div>
        <h2>Try prompts like these.</h2>
        <ul>
          {seo.examples.map((example) => <li key={example}>{example}</li>)}
        </ul>
      </div>

      <div className="faqBox">
        <div className="tinyTag">FAQ</div>
        <h2>Common questions.</h2>
        {seo.faqs.map(([question, answer]) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>

      <div className="relatedTools">
        <div className="tinyTag">RELATED TOOLS</div>
        <button onClick={() => goToRoute("/ai-logo-generator")}>AI Logo Generator</button>
        <button onClick={() => goToRoute("/instagram-caption-generator")}>Instagram Caption Generator</button>
        <button onClick={() => goToRoute("/tiktok-hook-generator")}>TikTok Hook Generator</button>
        <button onClick={() => goToRoute("/brand-bio-generator")}>Brand Bio Generator</button>
      </div>
    </div>
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
          <span>Open {tool.title}</span>
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
  user,
  userPlan,
  visitorRemaining,
  dailyRemaining,
  copyToClipboard,
  shareOutput,
  clearGenerator,
  logoImage
}) {
  return (
    <div className="generateCard">
      <div className="generateTop">
        <div>
          <div className="tinyTag">{activeTool.label}</div>
          <h2>{activeTool.title}</h2>
          <div className="planIndicator">
            {!user ? `${visitorRemaining} free generations remaining` : userPlan === "free" ? `${dailyRemaining} free generations left today` : "Unlimited premium access active"}
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
            {creativeTones.map((tone) => <option key={tone}>{tone}</option>)}
          </select>
        </label>
      </div>

      <textarea placeholder={activeTool.placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

      <div className="generatorButtons">
        <button className="btn dark" onClick={generate}>{loading ? "Generating..." : `Generate ${activeTool.title}`}</button>
        <button className="btn light" onClick={clearGenerator}>Clear</button>
      </div>

      {result && (
        <div className="resultBox">
          <div className="resultTop">
            <span>BRANDTHAT AI</span>
            <div className="resultActions compact">
              <button onClick={() => copyToClipboard(result)}>Copy</button>
              <button onClick={() => shareOutput(result)}>Share</button>
            </div>
          </div>
          {activeTool.key === "logo" && logoImage && (
            <div className="logoImageResult">
              <img src={logoImage} alt="Generated AI logo" />
              <button onClick={() => window.open(logoImage, "_blank")}>Open Logo Image</button>
            </div>
          )}
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
      <button className={featured ? "btn whiteBtn full" : "btn dark full"} onClick={onClick}>Subscribe</button>
    </div>
  );
}

const css = `
*{box-sizing:border-box}
body{margin:0}
.app{background:#f6f4ef;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#111;overflow-x:hidden}
.nav{max-width:1280px;margin:0 auto;padding:28px 6vw 10px;display:flex;justify-content:space-between;align-items:center;gap:20px}
.brand{background:none;border:none;font-size:30px;font-weight:900;letter-spacing:-.06em;cursor:pointer;color:#111}
.navLinks{display:flex;gap:18px;flex-wrap:wrap}
.navLinks button,.accountBtn{background:none;border:none;font-weight:700;cursor:pointer;color:#111;font-size:15px}
.accountBtn{background:#111;color:white;padding:12px 18px;border-radius:999px}
.hero{max-width:1280px;margin:0 auto;padding:38px 6vw 40px}
.heroTop{max-width:760px;margin-bottom:50px}
.eyebrow,.tinyTag{font-size:11px;font-weight:800;letter-spacing:2px;color:#9b7b3f;text-transform:uppercase;margin-bottom:12px}
h1{font-size:88px;line-height:.92;letter-spacing:-.07em;margin:0 0 24px}
.pageTitle{max-width:900px}
.pageLead{font-size:20px;line-height:1.6;color:#666;max-width:760px;margin:0 0 32px}
h2{font-size:44px;line-height:1;letter-spacing:-.05em;margin:0}
.toolCard h3,.featureCard h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin:0 0 12px}
.lead{font-size:22px;line-height:1.7;color:#666;max-width:620px}
.freeStrip{display:inline-flex;background:white;border:1px solid rgba(0,0,0,.08);padding:12px 16px;border-radius:999px;font-size:13px;font-weight:800;color:#8a6b37;margin-top:8px}
.generateCard,.logoCard,.logoPreviewCard,.signupBox{background:white;border-radius:38px;padding:34px;border:1px solid rgba(0,0,0,.08);box-shadow:0 30px 90px rgba(0,0,0,.06)}
.generateTop{display:flex;justify-content:space-between;gap:20px;margin-bottom:26px}
.liveBadge,.offerBadge{background:white;border:1px solid rgba(0,0,0,.08);padding:14px 18px;border-radius:999px;font-size:13px;font-weight:700;height:fit-content}
.planIndicator,.planNotice,.verifyNote{margin-top:16px;font-size:13px;font-weight:700;color:#8a6b37}
.planNotice{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:16px 18px;margin-bottom:28px;max-width:760px}
textarea,input,select{width:100%;border-radius:24px;border:1px solid rgba(0,0,0,.08);padding:18px 20px;font-size:16px;background:#fafafa;font-family:inherit;margin-top:10px;color:#111}
textarea{height:180px;resize:none;line-height:1.6}
.generatorControls{display:grid;grid-template-columns:1fr 260px;gap:16px;margin-bottom:14px}
.generatorControls label span{display:block;font-size:12px;font-weight:900;letter-spacing:1.4px;color:#9b7b3f;text-transform:uppercase;margin-left:8px}
.generatorButtons{display:grid;grid-template-columns:1fr 130px;gap:12px;margin-top:16px}
.logoInputs{display:grid;grid-template-columns:1fr 220px;gap:16px;margin:26px 0}
.btn{border:none;border-radius:18px;padding:16px 24px;font-weight:800;cursor:pointer;font-size:15px;transition:.2s ease;display:inline-flex;align-items:center;justify-content:center}
.btn:hover{transform:translateY(-2px);opacity:.96}
.btn.dark{background:#111;color:white}
.btn.light{background:white;color:#111;border:1px solid rgba(0,0,0,.08)}
.btn.full{width:100%;margin-top:18px}
.whiteBtn{background:white;color:#111;border:none}
.resultBox{margin-top:26px;background:#fafafa;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,.06)}
.resultTop{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.06)}
.resultTop span{font-size:12px;font-weight:800;letter-spacing:2px;color:#9b7b3f}
.resultActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.resultActions.compact{margin-top:0}
.resultActions button,.resultTop button{background:white;border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:999px;font-weight:700;cursor:pointer;color:#111}
.resultContent{padding:24px;line-height:1.9;white-space:pre-wrap;font-size:15px}
.logoPreview{min-height:240px;display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;letter-spacing:-.06em;border-radius:24px;background:#fafafa;border:1px solid rgba(0,0,0,.06);text-align:center;padding:20px}
.logoBottom{margin-top:24px}
.logoLead,.footerSubscribe p{font-size:18px;line-height:1.7;color:#666;margin:18px 0 26px}
.offersSection,.pageSection{max-width:1280px;margin:0 auto;padding:40px 6vw 100px}
.offersTop{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:34px}
.toolGrid,.featureGrid,.pricingGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.logoPageGrid{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start}
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
.footerForm input{margin-top:0}
.footerForm .btn{margin-top:8px;width:100%;display:flex;align-items:center;justify-content:center;padding:16px 24px}
.footerForm span{display:block;margin-top:14px;font-weight:700;color:#8a6b37}
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
.seoContent{margin-top:56px;background:white;border:1px solid rgba(0,0,0,.08);border-radius:38px;padding:38px;box-shadow:0 30px 90px rgba(0,0,0,.04)}
.seoContent h2{font-size:34px;line-height:1.05;margin-bottom:18px}
.seoContent p{font-size:17px;line-height:1.85;color:#555;max-width:980px}
.homeSeo{margin-top:38px}
.seoCtaGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:28px}
.seoCtaGrid button,.relatedTools button{background:#111;color:white;border:none;border-radius:18px;padding:16px 18px;font-weight:900;cursor:pointer;text-align:center}
.dedicatedSeo{margin-top:0;margin-bottom:36px}
.seoInfoGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:30px 0}
.seoInfoCard{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:24px;padding:24px}
.seoInfoCard h2{font-size:25px;margin-bottom:12px}
.exampleBox,.faqBox{background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:24px;padding:26px;margin-top:22px}
.exampleBox ul{margin:18px 0 0;padding-left:20px;color:#444;line-height:1.9}
.faqBox details{border-top:1px solid rgba(0,0,0,.08);padding:18px 0}
.faqBox details:first-of-type{border-top:none}
.faqBox summary{font-weight:900;cursor:pointer;font-size:17px}
.faqBox p{margin:12px 0 0}
.relatedTools{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
.logoImageResult{padding:24px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;flex-direction:column;align-items:center;gap:16px;background:white}
.logoImageResult img{width:100%;max-width:420px;border-radius:24px;border:1px solid rgba(0,0,0,.08);box-shadow:0 18px 60px rgba(0,0,0,.08)}
.logoImageResult button{background:#111;color:white;border:none;border-radius:999px;padding:12px 18px;font-weight:900;cursor:pointer}
@media(max-width:1100px){.toolGrid,.featureGrid,.pricingGrid,.seoInfoGrid{grid-template-columns:repeat(2,1fr)}.seoCtaGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}}
@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{flex-direction:column;gap:18px;padding:24px 20px 8px}.navLinks{justify-content:center}.hero,.offersSection,.pageSection,.footerSubscribe{padding-left:20px;padding-right:20px}.seoContent{padding:26px}.seoInfoGrid,.seoCtaGrid{grid-template-columns:1fr}.hero{padding-top:28px}.toolGrid,.featureGrid,.pricingGrid,.logoPageGrid,.logoInputs,.generatorButtons{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}.resultTop{align-items:flex-start;flex-direction:column}textarea{height:160px}.chatWidget{width:calc(100vw - 40px);right:20px;bottom:84px}.logoPreview{font-size:40px;min-height:180px}}
`;
