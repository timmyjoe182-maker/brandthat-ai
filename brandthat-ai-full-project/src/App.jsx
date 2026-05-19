
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

const tools = [
  { key: "logo", title: "AI Logo Generator", desc: "Create premium logo images and brand identity directions.", label: "AI Logo Generator", platformLabel: "Logo style", platforms: ["Modern Minimal", "Luxury Wordmark", "Bold Monogram", "Editorial Serif", "Clean Tech", "Founder Brand", "Beauty / Wellness", "Restaurant / Hospitality", "Real Estate", "Social Media Icon"], placeholder: "Example: Brandthat.ai, a black-and-white AI creative studio for modern creators and brands.", promptGuide: "Create a modern logo image and brand identity direction." },
  { key: "captions", title: "Captions", desc: "Premium captions for every social platform.", label: "Caption Generator", platformLabel: "Social platform", platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"], placeholder: "Example: Write a caption for a video of our goats running to dinner at the ranch.", promptGuide: "Create premium social media captions with multiple versions." },
  { key: "hashtags", title: "Hashtags", desc: "Smart hashtag systems designed for reach.", label: "Hashtag Generator", platformLabel: "Social platform", platforms: ["Instagram", "TikTok", "Facebook", "LinkedIn", "X / Twitter", "YouTube Shorts", "Pinterest"], placeholder: "Example: Mini cows, ranch life, goats, alpacas, luxury countryside content.", promptGuide: "Generate grouped hashtags by niche, broad reach, audience, location, and viral/reach potential." },
  { key: "bios", title: "Brand Bios", desc: "Polished bios for creators and businesses.", label: "Brand Bio Generator", platformLabel: "Bio placement", platforms: ["Instagram", "TikTok", "LinkedIn", "Website", "X / Twitter", "Facebook", "General Brand Profile"], placeholder: "Example: A private luxury ranch sharing miniature animals, ranch life, and high-end gifting.", promptGuide: "Create polished brand bios for the selected placement." },
  { key: "hooks", title: "On-video Hooks", desc: "Short hooks for Reels, TikTok, and Shorts.", label: "On-video Hook Generator", platformLabel: "Video platform", platforms: ["Instagram Reels", "TikTok", "YouTube Shorts", "Facebook Reels", "General Short Video"], placeholder: "Example: A 20-second video of baby goats jumping on hay bales.", promptGuide: "Generate short, catchy, non-cheesy hooks for short-form video." },
  { key: "email", title: "Email Copy", desc: "Launch emails, promos, and newsletters.", label: "Email Copy Generator", platformLabel: "Email type", platforms: ["Team Update", "Product Launch", "Promo Email", "Newsletter", "Client Announcement", "Welcome Email", "Follow-up Email", "Partnership Outreach"], placeholder: "Example: Write an email to our team announcing the launch of a new AI logo generator.", promptGuide: "Generate full email copy with subject lines, preview text, body, CTA, and sign-off." },
  { key: "strategy", title: "Social Strategy", desc: "Content direction across every platform.", label: "Social Strategy Generator", platformLabel: "Primary platform", platforms: ["Instagram", "TikTok", "LinkedIn", "Facebook", "X / Twitter", "YouTube Shorts", "Pinterest", "Multi-platform"], placeholder: "Example: We are a ranch brand trying to grow with animal videos, gifting, and high-end lifestyle content.", promptGuide: "Generate platform-specific social strategy with pillars, cadence, hooks, and next steps." },
  { key: "brand", title: "Brand Creation", desc: "Generate brand names and positioning.", label: "Brand Creation Generator", platformLabel: "Brand focus", platforms: ["New Business", "Creator Brand", "Product Brand", "Luxury Brand", "Local Business", "Agency / Studio", "Personal Brand", "Online Tool / SaaS"], placeholder: "Example: I want to create a premium AI tool that helps small businesses make content and branding faster.", promptGuide: "Help create the best possible brand from a word, sentence, or paragraph." }
];

const toolMap = Object.fromEntries(tools.map((tool) => [tool.key, tool]));
const tones = ["Professional", "Modern", "Minimal", "Luxury", "Bold", "Playful", "Editorial", "Cinematic", "Premium", "Friendly", "Witty", "Elegant", "Direct", "Emotional", "High-end", "Viral"];

const seoPages = {
  "seo-logo": { path: "/ai-logo-generator", toolKey: "logo", eyebrow: "AI LOGO GENERATOR", h1: "AI Logo Generator for Modern Brands", intro: "Create premium logo images, brand identity directions, typography, colors, and launch-ready visual systems from a simple brand idea." },
  "seo-instagram": { path: "/instagram-caption-generator", toolKey: "captions", eyebrow: "INSTAGRAM CAPTION GENERATOR", h1: "Instagram Caption Generator for Brands", intro: "Write better Instagram captions for Reels, carousels, product launches, lifestyle posts, and founder stories." },
  "seo-tiktok": { path: "/tiktok-hook-generator", toolKey: "hooks", eyebrow: "TIKTOK HOOK GENERATOR", h1: "TikTok Hook Generator for Short-Form Videos", intro: "Create fast, scroll-stopping on-video hooks for TikTok, Reels, Shorts, and social campaigns." },
  "seo-bio": { path: "/brand-bio-generator", toolKey: "bios", eyebrow: "BRAND BIO GENERATOR", h1: "Brand Bio Generator for Social Profiles", intro: "Create polished bios for Instagram, TikTok, LinkedIn, websites, creators, founders, and businesses." }
};

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getStoredNumber(key, fallback = 0) {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? value : fallback;
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

  const [workspace, setWorkspace] = useState(() => {
    try { return JSON.parse(localStorage.getItem("brandthat_workspace") || "{}"); } catch { return {}; }
  });

  const [workspaceDraft, setWorkspaceDraft] = useState({
    name: workspace.name || "",
    description: workspace.description || "",
    audience: workspace.audience || "",
    tone: workspace.tone || "Modern",
    style: workspace.style || "Black-and-white, modern, premium"
  });

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [chatOpen, setChatOpen] = useState(false);

  const dailyRemaining = Math.max(0, 1 - dailyFreeCount);
  const isFree = userPlan === "free";
  const isStarter = userPlan === "starter";

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
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });

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
      openAuth("signup", "Create a free account first, then continue to checkout.");
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

  const saveWorkspace = () => {
    localStorage.setItem("brandthat_workspace", JSON.stringify(workspaceDraft));
    setWorkspace(workspaceDraft);
    setPrompt(`${workspaceDraft.name}\n${workspaceDraft.description}\nAudience: ${workspaceDraft.audience}\nTone: ${workspaceDraft.tone}\nStyle: ${workspaceDraft.style}`);
    setActiveToolKey("logo");
    setSelectedPlatform("Modern Minimal");
    setCreativeTone(workspaceDraft.tone || "Modern");
    setPage("logo");
    setTimeout(() => document.getElementById("brandthat-generator")?.scrollIntoView({ behavior: "smooth" }), 80);
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
    setPrompt("");
    setResult("");
    setLogoImage("");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 80);
  };

  const getSystemPrompt = () => {
    const workspaceContext = workspace?.name
      ? `Current Brand Workspace:\nBrand name: ${workspace.name}\nDescription: ${workspace.description}\nAudience: ${workspace.audience}\nBrand tone: ${workspace.tone}\nVisual style: ${workspace.style}`
      : "";

    return `You are Brandthat.ai, a premium AI brand workspace for creators, founders, businesses, and agencies.

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
- Make the output easy to copy and use immediately.
- Avoid fluff.
- Avoid saying "as an AI."
- Be modern, premium, practical, and brand-aware.`;
  };

  const createLogoImage = async () => {
    const response = await fetch("/.netlify/functions/logo-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandName: workspace?.name || "",
        logoPrompt: `${selectedPlatform}. ${creativeTone}. ${prompt}`
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Logo image generation failed.");
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

    if (isFree && dailyFreeCount >= 1) {
      setPage("pricing");
      setResult("Your free daily brand generation has been used. Upgrade to keep building.");
      return;
    }

    if (activeTool.key === "logo" && isStarter) {
      setPage("pricing");
      setResult("AI logo image generation is included with Pro. Starter includes unlimited text generators.");
      return;
    }

    setLoading(true);
    setLogoImage("");

    try {
      if (activeTool.key === "logo") {
        const image = await createLogoImage();
        setLogoImage(image);
        setResult(`Your logo image has been generated.\n\nBrand direction used:\n${prompt}\n\nTip: Pro includes unlimited AI logo image generations.`);
      } else {
        const response = await fetch("/.netlify/functions/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: `${getSystemPrompt()}\n\nUser request:\n${prompt}` })
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
    try { await navigator.clipboard.writeText(text); }
    catch {
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
      try { await navigator.share({ title: "Brandthat.ai", text: shareText, url: "https://brandthat.ai" }); return; }
      catch { copyToClipboard(shareText); return; }
    }
    copyToClipboard(shareText);
  };

  const clearGenerator = () => {
    setPrompt("");
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
          <button onClick={() => setPage("features")}>Features</button>
          <button onClick={() => setPage("pricing")}>Pricing</button>
          <button onClick={() => setPage("workspace")}>Workspace</button>
          <button onClick={() => openSeoPage("seo-logo")}>AI Logo Generator</button>
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
              <p className="lead">Start with a logo, then turn your idea into captions, hooks, bios, emails, social strategy, and launch-ready brand content.</p>
              <div className="freeStrip">
                {!user ? "Start your free Brand Workspace" : isFree ? `${dailyRemaining} free brand generation left today` : `${userPlan.toUpperCase()} workspace active`}
              </div>
              <div className="heroCtas">
                <button className="btn dark" onClick={() => setPage("workspace")}>Start Your Free Brand Workspace</button>
                <button className="btn light" onClick={() => openSeoPage("seo-logo")}>Try AI Logo Generator</button>
              </div>
            </div>

            <WorkspaceCard workspaceDraft={workspaceDraft} setWorkspaceDraft={setWorkspaceDraft} saveWorkspace={saveWorkspace} />
          </main>

          <section className="offersSection">
            <div className="offersTop">
              <div>
                <div className="tinyTag">YOUR BRAND SYSTEM</div>
                <h2>Logo first. Then everything your brand needs.</h2>
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
          <div className="tinyTag">FREE BRAND WORKSPACE</div>
          <h1 className="pageTitle">Create your first brand workspace.</h1>
          <p className="pageLead">Instead of random generations, Brandthat helps you build around one real brand idea. Add your brand direction once and use it across logos, captions, hooks, bios, emails, and strategy.</p>
          <WorkspaceCard workspaceDraft={workspaceDraft} setWorkspaceDraft={setWorkspaceDraft} saveWorkspace={saveWorkspace} />
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
          <h1 className="pageTitle">Build for free. Upgrade when your brand needs more.</h1>
          <p className="pageLead">Every free account gets one daily brand generation. Starter unlocks unlimited text tools. Pro unlocks everything, including unlimited AI logo image generation.</p>
          <div className="pricingGrid twoPlans">
            <PriceCard
              name="STARTER"
              price="$10"
              desc="Unlimited text generations for captions, hashtags, hooks, bios, emails, brand creation, and social strategy."
              features={["Unlimited text generations", "Captions & hashtags", "Brand bios", "On-video hooks", "Email copy", "Social strategy", "Brand creation", "No logo image generator"]}
              onClick={() => startCheckout("starter")}
            />
            <PriceCard
              name="PRO"
              price="$20"
              featured
              desc="Everything in Starter plus unlimited AI logo image generation and complete brand-building access."
              features={["Everything in Starter", "Unlimited AI logo image generations", "Premium logo concepts", "Brand workspace workflow", "Commercial brand direction", "Future premium visual tools"]}
              onClick={() => startCheckout("pro")}
            />
          </div>
        </section>
      )}

      {(page === "studio" || page === "logo") && (
        <section className="pageSection" id="brandthat-generator">
          <div className="tinyTag">{activeTool.label}</div>
          <h1 className="pageTitle">{activeTool.title}</h1>
          <p className="pageLead">{activeTool.desc} Select the type, describe what you need, and Brandthat will generate it around your brand workspace.</p>
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
            <div className="chatBubble">Start with your Brand Workspace, then generate logos, captions, hooks, bios, and strategy around one clear brand.</div>
            <div className="chatBubble light">Free: 1 daily generation<br />Starter: unlimited text tools<br />Pro: unlimited logo images + everything</div>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkspaceCard({ workspaceDraft, setWorkspaceDraft, saveWorkspace }) {
  return (
    <div className="workspaceCard">
      <div className="tinyTag">START HERE</div>
      <h2>Your Free Brand Workspace</h2>
      <p>Create one brand direction and use it across every generator. This makes Brandthat feel like your brand system, not just a random AI tool.</p>

      <div className="workspaceGrid">
        <input placeholder="Brand name" value={workspaceDraft.name} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, name: e.target.value })} />
        <select value={workspaceDraft.tone} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, tone: e.target.value })}>
          {tones.map((tone) => <option key={tone}>{tone}</option>)}
        </select>
      </div>

      <textarea placeholder="Describe your brand idea. Example: A premium AI creative studio that helps creators and small businesses build logos, captions, and brand systems fast." value={workspaceDraft.description} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, description: e.target.value })} />

      <div className="workspaceGrid">
        <input placeholder="Audience" value={workspaceDraft.audience} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, audience: e.target.value })} />
        <input placeholder="Visual style" value={workspaceDraft.style} onChange={(e) => setWorkspaceDraft({ ...workspaceDraft, style: e.target.value })} />
      </div>

      <button className="btn dark full" onClick={saveWorkspace}>Create Brand Workspace</button>
    </div>
  );
}

function HomepageSEOContent({ openSeoPage }) {
  return (
    <section className="seoHomeSection">
      <div className="tinyTag">AI BRANDING TOOLS BUILT FOR SEARCH, SPEED, AND SOCIAL CONTENT</div>
      <h2>Brandthat.ai helps creators and businesses turn ideas into logos, captions, hooks, bios, and launch-ready brand content.</h2>
      <p>Brandthat.ai is built for modern creators, founders, small businesses, agencies, and social teams that need brand assets fast without sounding generic.</p>
      <div className="seoInternalLinks">
        <button onClick={() => openSeoPage("seo-logo")}>AI Logo Generator</button>
        <button onClick={() => openSeoPage("seo-instagram")}>Instagram Caption Generator</button>
        <button onClick={() => openSeoPage("seo-tiktok")}>TikTok Hook Generator</button>
        <button onClick={() => openSeoPage("seo-bio")}>Brand Bio Generator</button>
      </div>
      <div className="seoTextGrid">
        <div><h3>Why Brandthat.ai exists</h3><p>Most AI writing tools are too broad. Brandthat focuses on the brand assets businesses need every day.</p></div>
        <div><h3>Logo-first brand building</h3><p>The logo generator is the center. Then Brandthat supports it with content, launch copy, and strategy.</p></div>
        <div><h3>Built for momentum</h3><p>Create a brand from scratch, improve social profiles, write captions, and generate hooks quickly.</p></div>
      </div>
    </section>
  );
}

function SEOPage(props) {
  const { seoPage, openSeoPage } = props;
  return (
    <section className="pageSection seoPage">
      <div className="tinyTag">{seoPage.eyebrow}</div>
      <h1 className="pageTitle">{seoPage.h1}</h1>
      <p className="pageLead">{seoPage.intro}</p>
      <div id="brandthat-generator"><GeneratorCard {...props} /></div>
      <div className="seoArticle">
        <div className="seoArticleBlock"><h2>How it works</h2><p>Describe what you want, choose a platform or style, select a tone, and Brandthat generates a polished output built around your brand workspace.</p></div>
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
        <button className={activeToolKey === tool.key ? "toolCard activeTool" : "toolCard"} key={tool.key} onClick={() => selectTool(tool.key)}>
          <div className="toolGlow"></div>
          <h3>{tool.title}</h3>
          <p>{tool.desc}</p>
          <span>Open {tool.title}</span>
        </button>
      ))}
    </div>
  );
}

function GeneratorCard({ activeTool, prompt, setPrompt, selectedPlatform, setSelectedPlatform, creativeTone, setCreativeTone, generate, loading, result, logoImage, user, userPlan, dailyRemaining, copyToClipboard, shareOutput, clearGenerator }) {
  return (
    <div className="generateCard">
      <div className="generateTop">
        <div>
          <div className="tinyTag">{activeTool.label}</div>
          <h2>{activeTool.title}</h2>
          <div className="planIndicator">{!user ? "Create a free Brand Workspace to start" : userPlan === "free" ? `${dailyRemaining} free generation left today` : `${userPlan.toUpperCase()} access active`}</div>
        </div>
        <div className="liveBadge">AI Powered</div>
      </div>

      <div className="generatorControls">
        <label><span>{activeTool.platformLabel}</span><select value={selectedPlatform} onChange={(e) => setSelectedPlatform(e.target.value)}>{activeTool.platforms.map((option) => <option key={option}>{option}</option>)}</select></label>
        <label><span>Tone</span><select value={creativeTone} onChange={(e) => setCreativeTone(e.target.value)}>{tones.map((tone) => <option key={tone}>{tone}</option>)}</select></label>
      </div>

      <textarea placeholder={activeTool.placeholder} value={prompt} onChange={(e) => setPrompt(e.target.value)} />

      <div className="generatorButtons">
        <button className="btn dark" onClick={generate}>{loading ? "Generating..." : activeTool.key === "logo" ? "Generate Logo Image" : `Generate ${activeTool.title}`}</button>
        <button className="btn light" onClick={clearGenerator}>Clear</button>
      </div>

      {logoImage && (
        <div className="logoImageBox">
          <img src={logoImage} alt="Generated logo" />
          <div className="resultActions"><a className="downloadLink" href={logoImage} download="brandthat-logo.png">Download Logo</a></div>
        </div>
      )}

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
*{box-sizing:border-box}body{margin:0}.app{background:#f6f4ef;min-height:100vh;font-family:Inter,system-ui,sans-serif;color:#111;overflow-x:hidden}.nav{max-width:1280px;margin:0 auto;padding:28px 6vw 10px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px}.brand{background:none;border:none;font-size:30px;font-weight:900;letter-spacing:-.06em;cursor:pointer;color:#111;text-align:left}.navLinks{display:flex;gap:18px;flex-wrap:wrap;justify-content:center}.navLinks button,.accountBtn{background:none;border:none;font-weight:700;cursor:pointer;color:#111;font-size:15px}.accountBtn{background:#111;color:white;padding:12px 18px;border-radius:999px}.hero{max-width:1280px;margin:0 auto;padding:38px 6vw 40px}.logoHero{display:grid;grid-template-columns:.9fr 1.1fr;gap:34px;align-items:start}.heroTop{max-width:760px;margin-bottom:50px}.eyebrow,.tinyTag{font-size:11px;font-weight:800;letter-spacing:2px;color:#9b7b3f;text-transform:uppercase;margin-bottom:12px}h1{font-size:88px;line-height:.92;letter-spacing:-.07em;margin:0 0 24px}.pageTitle{max-width:900px}.pageLead{font-size:20px;line-height:1.6;color:#666;max-width:760px;margin:0 0 32px}h2{font-size:44px;line-height:1;letter-spacing:-.05em;margin:0}.toolCard h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin:0 0 12px}.lead{font-size:22px;line-height:1.7;color:#666;max-width:620px}.freeStrip{display:inline-flex;background:white;border:1px solid rgba(0,0,0,.08);padding:12px 16px;border-radius:999px;font-size:13px;font-weight:800;color:#8a6b37;margin-top:8px}.heroCtas{display:flex;gap:12px;margin-top:24px;flex-wrap:wrap}.generateCard,.workspaceCard,.signupBox{background:white;border-radius:38px;padding:34px;border:1px solid rgba(0,0,0,.08);box-shadow:0 30px 90px rgba(0,0,0,.06)}.workspaceCard p{font-size:16px;line-height:1.7;color:#666}.workspaceGrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.generateTop{display:flex;justify-content:space-between;gap:20px;margin-bottom:26px}.liveBadge,.offerBadge{background:white;border:1px solid rgba(0,0,0,.08);padding:14px 18px;border-radius:999px;font-size:13px;font-weight:700;height:fit-content}.planIndicator,.verifyNote{margin-top:16px;font-size:13px;font-weight:700;color:#8a6b37}textarea,input,select{width:100%;border-radius:24px;border:1px solid rgba(0,0,0,.08);padding:18px 20px;font-size:16px;background:#fafafa;font-family:inherit;margin-top:10px;color:#111}textarea{height:180px;resize:none;line-height:1.6}.generatorControls{display:grid;grid-template-columns:1fr 260px;gap:16px;margin-bottom:14px}.generatorControls label span{display:block;font-size:12px;font-weight:900;letter-spacing:1.4px;color:#9b7b3f;text-transform:uppercase;margin-left:8px}.generatorButtons{display:grid;grid-template-columns:1fr 130px;gap:12px;margin-top:16px}.btn{border:none;border-radius:18px;padding:16px 24px;font-weight:800;cursor:pointer;font-size:15px;transition:.2s ease;display:inline-flex;align-items:center;justify-content:center}.btn:hover{transform:translateY(-2px);opacity:.96}.btn.dark{background:#111;color:white}.btn.light{background:white;color:#111;border:1px solid rgba(0,0,0,.08)}.btn.full{width:100%;margin-top:18px}.whiteBtn{background:white;color:#111;border:none}.logoImageBox{margin-top:26px;background:#fafafa;border:1px solid rgba(0,0,0,.06);border-radius:28px;padding:22px;text-align:center}.logoImageBox img{width:100%;max-width:420px;border-radius:22px;display:block;margin:0 auto}.downloadLink{display:inline-flex;background:#111;color:white;text-decoration:none;padding:12px 16px;border-radius:999px;font-weight:800;margin-top:16px}.resultBox{margin-top:26px;background:#fafafa;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,.06)}.resultTop{display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.06)}.resultTop span{font-size:12px;font-weight:800;letter-spacing:2px;color:#9b7b3f}.resultActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}.resultActions.compact{margin-top:0}.resultActions button,.resultTop button{background:white;border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:999px;font-weight:700;cursor:pointer;color:#111}.resultContent{padding:24px;line-height:1.9;white-space:pre-wrap;font-size:15px}.offersSection,.pageSection{max-width:1280px;margin:0 auto;padding:40px 6vw 100px}.offersTop{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:34px}.toolGrid,.pricingGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}.twoPlans{grid-template-columns:repeat(2,1fr);max-width:900px}.toolCard,.priceCard{position:relative;overflow:hidden;background:white;padding:26px;border-radius:28px;border:1px solid rgba(0,0,0,.08);min-height:180px;transition:.25s ease;text-align:left;color:#111;font-family:inherit;cursor:pointer}.toolCard:hover,.priceCard:hover,.activeTool{transform:translateY(-4px);box-shadow:0 18px 50px rgba(0,0,0,.08);border-color:rgba(0,0,0,.18)}.toolCard span{position:relative;z-index:2;display:inline-flex;margin-top:16px;font-size:12px;font-weight:900;letter-spacing:.8px;color:#8a6b37;text-transform:uppercase}.toolGlow{position:absolute;top:-80px;right:-60px;width:180px;height:180px;background:radial-gradient(circle,#f0dfb5,transparent 70%);opacity:.8}.toolCard p,.priceCard p{color:#666;line-height:1.7;position:relative;z-index:2}.priceTag{font-size:11px;font-weight:800;letter-spacing:2px;color:#9b7b3f}.priceSub{margin-top:-8px;margin-bottom:28px;font-size:15px;color:#777}.priceSub.white{color:rgba(255,255,255,.7)}.priceFeatures{display:flex;flex-direction:column;gap:14px;margin-top:30px}.priceFeatures div{padding-bottom:14px;border-bottom:1px solid rgba(0,0,0,.06);line-height:1.6;font-size:15px}.featuredPrice{background:#111;color:white}.featuredPrice p{color:rgba(255,255,255,.7)}.featuredPrice .priceFeatures div{border-bottom:1px solid rgba(255,255,255,.08)}.footerSubscribe{max-width:1280px;margin:0 auto;padding:60px 6vw 90px;border-top:1px solid rgba(0,0,0,.08);display:grid;grid-template-columns:1fr 420px;gap:40px;align-items:start}.footerForm{background:white;border-radius:28px;padding:28px;border:1px solid rgba(0,0,0,.08);display:flex;flex-direction:column;gap:18px}.footerSubscribe p,.footerForm span{color:#666;line-height:1.7}.footerForm input{margin-top:0}.modal{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:20px;z-index:2000}.signupBox{max-width:460px;width:100%}.signupBox p{color:#666;line-height:1.7}.chatButton{position:fixed;bottom:24px;right:24px;background:#111;color:white;border:none;padding:16px 22px;border-radius:999px;font-weight:800;cursor:pointer;box-shadow:0 18px 40px rgba(0,0,0,.18);z-index:1000}.chatWidget{position:fixed;bottom:90px;right:24px;width:340px;background:white;border-radius:28px;overflow:hidden;border:1px solid rgba(0,0,0,.08);box-shadow:0 30px 80px rgba(0,0,0,.12);z-index:1000}.chatHeader{padding:20px;border-bottom:1px solid rgba(0,0,0,.06)}.chatHeader strong{display:block;margin-bottom:6px}.chatHeader span{font-size:14px;color:#666}.chatBody{padding:18px;display:flex;flex-direction:column;gap:12px}.chatBubble{background:#111;color:white;padding:14px 16px;border-radius:18px;line-height:1.6;font-size:14px}.chatBubble.light{background:#f5f5f5;color:#111}.seoHomeSection{max-width:1280px;margin:0 auto;padding:20px 6vw 100px}.seoHomeSection h2{max-width:940px;margin-bottom:22px}.seoHomeSection>p{font-size:19px;line-height:1.8;color:#666;max-width:900px}.seoInternalLinks{display:flex;flex-wrap:wrap;gap:12px;margin:28px 0}.seoInternalLinks button{background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:13px 16px;font-weight:800;cursor:pointer;color:#111}.seoTextGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:32px}.seoTextGrid div,.seoArticleBlock{background:white;border:1px solid rgba(0,0,0,.08);border-radius:28px;padding:26px}.seoTextGrid h3{font-size:20px;margin:0 0 10px;letter-spacing:-.03em}.seoTextGrid p,.seoArticle p{color:#666;line-height:1.8}.seoArticle{margin-top:56px;display:flex;flex-direction:column;gap:22px}.seoArticleBlock h2{font-size:34px;margin-bottom:14px}@media(max-width:1100px){.logoHero{grid-template-columns:1fr}.toolGrid,.pricingGrid,.seoTextGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}}@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{grid-template-columns:1fr auto;gap:12px;padding:24px 20px 8px}.navLinks{grid-column:1 / -1;justify-content:flex-start;overflow-x:auto;flex-wrap:nowrap;padding-bottom:6px}.accountBtn{grid-column:2;grid-row:1}.hero,.offersSection,.pageSection,.footerSubscribe,.seoHomeSection{padding-left:20px;padding-right:20px}.hero{padding-top:28px}.toolGrid,.pricingGrid,.workspaceGrid,.generatorButtons,.seoTextGrid{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}.resultTop{align-items:flex-start;flex-direction:column}textarea{height:160px}.chatWidget{width:calc(100vw - 40px);right:20px;bottom:84px}}
`;
