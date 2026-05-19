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
    promptGuide: "Create modern logo concepts. Include logo directions, typography, icon/monogram ideas, color palette, usage notes, and a detailed image-generation prompt someone could use to create the logo."
  }
];

const toolMap = Object.fromEntries(tools.map((tool) => [tool.key, tool]));

const creativeTones = [
  "Professional", "Modern", "Minimal", "Luxury", "Bold", "Playful", "Editorial", "Cinematic",
  "Premium", "Friendly", "Witty", "Elegant", "Direct", "Emotional", "High-end", "Viral"
];


const seoPages = {
  "seo-logo": {
    path: "/ai-logo-generator",
    toolKey: "logo",
    eyebrow: "AI LOGO GENERATOR",
    h1: "AI Logo Generator for Modern Brands, Startups, and Creators",
    intro: "Create premium logo concepts from a brand name, sentence, or full creative direction. Brandthat.ai helps founders, creators, small businesses, and agencies turn rough ideas into polished visual identity directions.",
    sections: [
      {
        title: "Create a logo idea before hiring a designer",
        body: "A strong logo starts with a clear direction. Brandthat.ai helps you explore modern logo concepts, wordmarks, monograms, color palettes, typography styles, and brand identity ideas before you spend money on a full design process."
      },
      {
        title: "Built for startups, creators, and businesses",
        body: "Use the AI logo generator for SaaS brands, local businesses, personal brands, restaurants, real estate teams, beauty brands, ranch brands, podcasts, YouTube channels, and product launches. Describe the style you want and generate a brand-ready concept."
      },
      {
        title: "How it works",
        body: "Enter your brand name and describe the logo you want. Choose a style like modern minimal, luxury wordmark, bold monogram, clean tech, or social media icon. Brandthat.ai then creates a logo direction and can generate a visual logo image when image generation is enabled."
      }
    ],
    examples: [
      "Minimal black-and-white AI logo for a creative studio",
      "Luxury ranch brand logo with a premium serif wordmark",
      "Modern coffee shop logo with a clean icon and warm typography",
      "Bold startup logo for a social media automation platform"
    ],
    faqs: [
      ["Can I use Brandthat.ai for real business logo ideas?", "Yes. Brandthat.ai is designed to help you create professional logo concepts, brand directions, and visual identity starting points for real businesses."],
      ["Does the logo generator create images?", "Yes, the logo generator is built to create actual logo images when connected to the logo image generation function."],
      ["What should I type into the logo generator?", "Include your brand name, what your business does, the style you want, colors, audience, and any visual ideas you already have."]
    ]
  },
  "seo-instagram": {
    path: "/instagram-caption-generator",
    toolKey: "captions",
    eyebrow: "INSTAGRAM CAPTION GENERATOR",
    h1: "Instagram Caption Generator for Brands, Creators, and Businesses",
    intro: "Write better Instagram captions for Reels, carousels, product launches, lifestyle posts, founder updates, and brand storytelling. Brandthat.ai creates platform-aware captions that sound polished, useful, and ready to post.",
    sections: [
      {
        title: "Captions that match your brand voice",
        body: "Generic captions do not build a brand. Brandthat.ai helps you create captions that fit your tone, audience, post type, and goal — whether you want premium, playful, direct, emotional, editorial, or viral."
      },
      {
        title: "Built for Reels, carousels, and feed posts",
        body: "Use the caption generator for short Reels captions, storytelling captions, educational carousels, sales posts, product announcements, launch posts, local business updates, and creator content."
      },
      {
        title: "How it works",
        body: "Choose Instagram as your platform, describe the post, select your tone, and generate multiple caption options. You can copy, share, or refine the result for your next post."
      }
    ],
    examples: [
      "Caption for a behind-the-scenes ranch dinner routine",
      "Luxury product launch caption for a new candle brand",
      "Founder story caption for a startup announcement",
      "Short Reel caption with a clean call-to-action"
    ],
    faqs: [
      ["Can it write captions for Reels?", "Yes. It can create short hooks, polished captions, and CTA-driven captions for Instagram Reels."],
      ["Can I choose a tone?", "Yes. You can choose tones like professional, modern, luxury, witty, emotional, high-end, viral, and more."],
      ["Is this only for influencers?", "No. It works for creators, small businesses, agencies, startups, local brands, and personal brands."]
    ]
  },
  "seo-tiktok": {
    path: "/tiktok-hook-generator",
    toolKey: "hooks",
    eyebrow: "TIKTOK HOOK GENERATOR",
    h1: "TikTok Hook Generator for Short-Form Videos",
    intro: "Create fast, scroll-stopping hooks for TikTok, Instagram Reels, YouTube Shorts, and short-form video campaigns. Brandthat.ai helps you turn a simple video idea into a hook people actually want to watch.",
    sections: [
      {
        title: "Better hooks for the first 1–5 seconds",
        body: "The first seconds decide whether someone keeps watching. Brandthat.ai creates short on-video hook options designed to be clear, direct, curiosity-driven, and easy to overlay on video."
      },
      {
        title: "Built for creators and brands",
        body: "Use the hook generator for product demos, before-and-after videos, ranch content, beauty videos, local business clips, startup content, educational posts, and storytelling videos."
      },
      {
        title: "How it works",
        body: "Describe your video, choose the platform, pick a tone, and generate 1-second, 3-second, and 5-second hooks that can be used as on-screen text or opening lines."
      }
    ],
    examples: [
      "POV: your logo finally looks like a real brand",
      "This is why your captions are not converting",
      "I tried an AI logo generator for a luxury brand",
      "One small change made this Reel feel premium"
    ],
    faqs: [
      ["What is a video hook?", "A hook is the first line or on-screen text that grabs attention and makes someone keep watching."],
      ["Can it create hooks for Reels too?", "Yes. The tool works for TikTok, Instagram Reels, YouTube Shorts, and other short-form content."],
      ["Are the hooks cheesy?", "The generator is designed to avoid cheesy hooks and focus on clear, useful, modern short-form video ideas."]
    ]
  },
  "seo-bio": {
    path: "/brand-bio-generator",
    toolKey: "bios",
    eyebrow: "BRAND BIO GENERATOR",
    h1: "Brand Bio Generator for Instagram, TikTok, LinkedIn, and Websites",
    intro: "Create polished brand bios that explain who you are, what you do, and why people should care. Brandthat.ai helps creators, founders, and businesses turn rough brand descriptions into clean profile copy.",
    sections: [
      {
        title: "Turn your brand idea into a clear bio",
        body: "A strong bio should be short, specific, and instantly understandable. Brandthat.ai creates bios for Instagram, TikTok, LinkedIn, websites, founder profiles, and general brand descriptions."
      },
      {
        title: "Built for every kind of modern brand",
        body: "Use the bio generator for creators, local businesses, ranch brands, agencies, SaaS tools, personal brands, beauty brands, restaurants, podcasts, and product brands."
      },
      {
        title: "How it works",
        body: "Describe your brand, choose where the bio will be used, select a tone, and generate multiple bio versions that are easy to copy, test, and improve."
      }
    ],
    examples: [
      "Instagram bio for a luxury ranch brand",
      "LinkedIn bio for a founder-led AI company",
      "TikTok bio for a creator sharing business tips",
      "Website bio for a premium local service brand"
    ],
    faqs: [
      ["What makes a good brand bio?", "A good bio quickly explains who the brand helps, what it offers, and what makes it different."],
      ["Can I create multiple versions?", "Yes. Brandthat.ai can generate several options for different platforms and tones."],
      ["Can it help with personal brands?", "Yes. It works for creator bios, founder bios, LinkedIn profiles, and personal brand positioning."]
    ]
  }
};

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

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredNumber(key, fallback = 0) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
}

export default function App() {
  const [page, setPage] = useState(getInitialPageFromPath());
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

  const [activeToolKey, setActiveToolKey] = useState(getInitialToolFromPath());
  const activeTool = toolMap[activeToolKey] || tools[0];
  const [selectedPlatform, setSelectedPlatform] = useState(activeTool.platforms[0]);
  const [creativeTone, setCreativeTone] = useState("Professional");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
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
    setPage(nextTool.key === "logo" ? "logo" : "studio");

    window.setTimeout(() => {
      const generator = document.getElementById("brandthat-generator");
      generator?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const openSeoPage = (seoKey) => {
    const seoPage = seoPages[seoKey];
    if (!seoPage) return;
    const nextTool = toolMap[seoPage.toolKey] || tools[0];

    window.history.pushState({}, "", seoPage.path);
    setPage(seoKey);
    setActiveToolKey(nextTool.key);
    setSelectedPlatform(nextTool.platforms[0]);
    setPrompt("");
    setResult("");

    window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
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
        <button className="brand" onClick={() => setPage("home")}>Brandthat</button>

        <div className="navLinks">
          <button onClick={() => setPage("features")}>Features</button>
          <button onClick={() => setPage("pricing")}>Pricing</button>
          <button onClick={() => { setActiveToolKey("captions"); setPage("studio"); }}>Studio</button>
          <button onClick={() => openSeoPage("seo-logo")}>AI Logo Generator</button>
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
          </section>

          <HomepageSEOContent openSeoPage={openSeoPage} />
        </>
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
          user={user}
          userPlan={userPlan}
          visitorRemaining={visitorRemaining}
          dailyRemaining={dailyRemaining}
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
          openSeoPage={openSeoPage}
        />
      )}

      {page === "features" && (
        <section className="pageSection">
          <div className="tinyTag">FEATURES</div>
          <h1 className="pageTitle">Choose exactly what you want Brandthat to create.</h1>
          <ToolGrid activeToolKey={activeToolKey} selectTool={selectTool} />
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


function HomepageSEOContent({ openSeoPage }) {
  return (
    <section className="seoHomeSection">
      <div className="tinyTag">AI BRANDING TOOLS BUILT FOR SEARCH, SPEED, AND SOCIAL CONTENT</div>
      <h2>Brandthat.ai helps creators and businesses turn ideas into logos, captions, hooks, bios, and launch-ready brand content.</h2>
      <p>
        Brandthat.ai is built for modern creators, founders, small businesses, agencies, and social teams that need content fast without sounding generic. Start with the AI Logo Generator, then build the captions, hashtags, bios, hooks, email copy, and strategy around the brand you are creating.
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
          <p>Most AI writing tools are too broad, too generic, or too corporate. Brandthat.ai focuses on the actual content modern brands need every day: logos, captions, social hooks, brand bios, email copy, hashtags, and strategy direction.</p>
        </div>
        <div>
          <h3>Built around the logo generator</h3>
          <p>The logo generator is the center of the experience. Once a brand has a visual identity direction, Brandthat.ai helps support it with content that can be used on Instagram, TikTok, websites, newsletters, launches, and social campaigns.</p>
        </div>
        <div>
          <h3>Useful for creators and businesses</h3>
          <p>Use it to create a brand from scratch, improve a social profile, write better captions, generate hooks for short-form videos, or create quick marketing copy without hiring a full creative team.</p>
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
  user,
  userPlan,
  visitorRemaining,
  dailyRemaining,
  copyToClipboard,
  shareOutput,
  clearGenerator,
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
          user={user}
          userPlan={userPlan}
          visitorRemaining={visitorRemaining}
          dailyRemaining={dailyRemaining}
          copyToClipboard={copyToClipboard}
          shareOutput={shareOutput}
          clearGenerator={clearGenerator}
        />
      </div>

      <div className="seoArticle">
        {seoPage.sections.map((section) => (
          <div className="seoArticleBlock" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
          </div>
        ))}

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
  clearGenerator
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

.seoHomeSection{max-width:1280px;margin:0 auto;padding:20px 6vw 100px}
.seoHomeSection h2{max-width:940px;margin-bottom:22px}
.seoHomeSection>p{font-size:19px;line-height:1.8;color:#666;max-width:900px}
.seoInternalLinks{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}
.seoInternalLinks button,.examplePromptGrid button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:13px 16px;font-weight:800;cursor:pointer;color:#111}
.seoTextGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:32px}
.seoTextGrid div,.seoArticleBlock,.faqCard{background:white;border:1px solid rgba(0,0,0,.08);border-radius:28px;padding:26px}
.seoTextGrid h3,.faqCard h3{font-size:20px;margin:0 0 10px;letter-spacing:-.03em}
.seoTextGrid p,.seoArticle p,.faqCard p{color:#666;line-height:1.8}
.seoPage .generateCard{margin-bottom:56px}
.seoArticle{margin-top:56px;display:flex;flex-direction:column;gap:22px}
.seoArticleBlock h2{font-size:34px;margin-bottom:14px}
.examplePromptGrid,.faqGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:18px}
.examplePromptGrid button{text-align:left;border-radius:18px;line-height:1.5}

@media(max-width:1100px){.toolGrid,.featureGrid,.pricingGrid,.seoTextGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}}
@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{flex-direction:column;gap:18px;padding:24px 20px 8px}.navLinks{justify-content:center}.hero,.offersSection,.pageSection,.footerSubscribe{padding-left:20px;padding-right:20px}.hero{padding-top:28px}.toolGrid,.featureGrid,.pricingGrid,.logoPageGrid,.logoInputs,.generatorButtons,.seoTextGrid,.examplePromptGrid,.faqGrid{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}.resultTop{align-items:flex-start;flex-direction:column}textarea{height:160px}.chatWidget{width:calc(100vw - 40px);right:20px;bottom:84px}.logoPreview{font-size:40px;min-height:180px}}
`;
