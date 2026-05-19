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
    promptGuide: "Create an actual modern logo image based on the user's brand name, word, sentence, or paragraph. The logo should feel premium, modern, clean, and ready for a website, social profile, or brand kit."
  }
];

const toolMap = Object.fromEntries(tools.map((tool) => [tool.key, tool]));

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
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(localStorage.getItem("brandthat_plan") || "free");
  const [dailyFreeCount, setDailyFreeCount] = useState(getStoredNumber("brandthat_daily_count", 0));

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  const [activeToolKey, setActiveToolKey] = useState("logo");
  const activeTool = toolMap[activeToolKey] || tools[0];
  const [selectedPlatform, setSelectedPlatform] = useState(activeTool.platforms[0]);
  const [creativeTone, setCreativeTone] = useState("Professional");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoImage, setLogoImage] = useState("");

  const [chatOpen, setChatOpen] = useState(false);

  const dailyRemaining = Math.max(0, 1 - dailyFreeCount);

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
    setAuthMessage("Try free now. Create a free account and get 1 free generation per day.");
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

    if (!user) {
      openTrialSignup();
      setResult("Try free now. Create a free account and get 1 free generation per day.");
      return;
    }

    if (userPlan === "free" && dailyFreeCount >= 1) {
      setPage("pricing");
      setResult("You’ve used your free generation for today. Upgrade to Starter or Pro for unlimited access.");
      return;
    }

    if (activeToolKey === "logo" && userPlan === "starter") {
      setPage("pricing");
      setResult("Logo image generation is included with Pro. Starter includes unlimited access to every other generator.");
      return;
    }

    if (activeToolKey === "logo") {
      setLoading(true);
      setResult("");
      setLogoImage("");

      try {
        const response = await fetch("/.netlify/functions/logo-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logoStyle: selectedPlatform,
            tone: creativeTone,
            logoPrompt: prompt
          })
        });

        const data = await response.json();

        if (!response.ok) {
          setResult(data.error || "Logo image generation failed. Please try again.");
          setLoading(false);
          return;
        }

        setLogoImage(data.image);
        setResult("Your logo image has been generated. Use the download button to save it.");

        if (userPlan === "free") {
          incrementDailyFreeUse();
        }
      } catch (error) {
        setResult("Something went wrong creating the logo image. Please try again.");
      }

      setLoading(false);
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

      if (userPlan === "free") {
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
    setLogoImage("");
  };

  return (
    <div className="app">
      <style>{css}</style>

      <nav className="nav">
        <button className="brand" onClick={() => setPage("home")}>Brandthat</button>

        <div className="navLinks">
          <button onClick={() => setPage("features")}>Features</button>
          <button onClick={() => setPage("pricing")}>Pricing</button>
          <button onClick={() => { setActiveToolKey("logo"); setPage("logo"); }}>Studio</button>
          <button onClick={() => selectTool("logo")}>AI Logo Generator</button>
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
              <div className="eyebrow">AI LOGO GENERATOR</div>
              <h1>Create a modern logo in seconds.</h1>
              <p className="lead">Brandthat.ai creates premium logo images first — plus captions, hashtags, bios, hooks, emails, strategy, and brand creation tools.</p>
              <div className="heroActions">
                <button className="btn dark" onClick={() => selectTool("logo")}>Try free now</button>
                <button className="btn light" onClick={() => setPage("pricing")}>View plans</button>
              </div>
              <div className="freeStrip">
                {!user ? "Try free now — create a free account for 1 generation daily" : userPlan === "free" ? `${dailyRemaining} free generation left today` : "Unlimited premium access active"}
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

      {page === "pricing" && (
        <section className="pageSection">
          <div className="tinyTag">PRICING</div>
          <h1 className="pageTitle">Start free, then upgrade when you’re ready.</h1>
          <div className="pricingGrid">
            <PriceCard
              name="STARTER"
              price="$10"
              desc="Unlimited generations for every Brandthat tool except the AI logo image generator."
              features={[
                "Unlimited captions",
                "Unlimited hashtags",
                "Unlimited brand bios",
                "Unlimited on-video hooks",
                "Unlimited email copy",
                "Unlimited social strategy",
                "Unlimited brand creation",
                "Logo image generator not included"
              ]}
              onClick={() => openPlanSignup("starter")}
            />
            <PriceCard
              name="PRO"
              price="$20"
              featured
              desc="Full access to everything, including unlimited AI logo image generations every month."
              features={[
                "Everything in Starter",
                "Unlimited AI logo image generations",
                "Modern logo image creation",
                "Premium creative outputs",
                "Brand creation tools",
                "Social strategy",
                "Best value for creators and businesses"
              ]}
              onClick={() => openPlanSignup("pro")}
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
          <p className="pageLead">Type a word, sentence, or paragraph describing the logo you want. Brandthat will create a modern logo image you can download.</p>

          <div className="planNotice">
            {!user && "Try free now — create a free account for 1 free generation daily."}
            {user && userPlan === "free" && `${dailyRemaining} free generation left today.`}
            {user && userPlan === "starter" && "Logo image generation is included with Pro. Starter unlocks unlimited access to every other generator."}
            {user && userPlan === "pro" && "Pro access active — unlimited logo image generations."}
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
          <button className="btn dark" onClick={subscribe}>Try free now</button>
          {subscribeMessage && <span>{subscribeMessage}</span>}
        </div>
      </footer>

      {showAuth && (
        <div className="modal">
          <div className="signupBox">
            <div className="tinyTag">{authMode === "signup" ? "CREATE ACCOUNT" : "LOG IN"}</div>
            <h2>{authMode === "signup" ? "Start using Brandthat." : "Welcome back."}</h2>
            <p>{authMode === "signup" ? "Try free now. Create your free account and get 1 free generation per day." : "Log in to continue using your Brandthat account."}</p>
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
            <div className="chatBubble light">Try free now with 1 free generation daily.<br />Starter unlocks unlimited text tools.<br />Pro unlocks unlimited logo images too.</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolGrid({ activeToolKey, selectTool }) {
  return (
    <div className="toolGrid">
      {[toolMap.logo, ...tools.filter((tool) => tool.key !== "logo")].map((tool) => (
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
            {!user ? "Try free now" : userPlan === "free" ? `${dailyRemaining} free generation left today` : "Unlimited premium access active"}
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
        <button className="btn dark" onClick={generate}>{loading ? (activeTool.key === "logo" ? "Creating logo..." : "Generating...") : activeTool.key === "logo" ? "Generate Logo Image" : `Generate ${activeTool.title}`}</button>
        <button className="btn light" onClick={clearGenerator}>Clear</button>
      </div>

      {(result || logoImage) && (
        <div className="resultBox">
          {logoImage && (
            <div className="logoImageWrap">
              <img src={logoImage} alt="Generated logo" className="generatedLogoImage" />
              <a className="downloadLogoBtn" href={logoImage} download="brandthat-logo.png">
                Download Logo
              </a>
            </div>
          )}
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
      <button className={featured ? "btn whiteBtn full" : "btn dark full"} onClick={onClick}>Try free now</button>
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
.freeStrip{display:inline-flex;background:white;border:1px solid rgba(0,0,0,.08);padding:12px 16px;border-radius:999px;font-size:13px;font-weight:800;color:#8a6b37;margin-top:16px}.heroActions{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0 0}
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
.logoImageWrap{padding:24px;background:white;border-bottom:1px solid rgba(0,0,0,.06);text-align:center}
.generatedLogoImage{width:100%;max-width:440px;border-radius:28px;border:1px solid rgba(0,0,0,.08);box-shadow:0 24px 70px rgba(0,0,0,.10);display:block;margin:0 auto 16px}
.downloadLogoBtn{display:inline-flex;align-items:center;justify-content:center;background:#111;color:white;text-decoration:none;font-weight:900;border-radius:999px;padding:12px 18px;font-size:13px}
.logoPreview{min-height:240px;display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;letter-spacing:-.06em;border-radius:24px;background:#fafafa;border:1px solid rgba(0,0,0,.06);text-align:center;padding:20px}
.logoBottom{margin-top:24px}
.logoLead,.footerSubscribe p{font-size:18px;line-height:1.7;color:#666;margin:18px 0 26px}
.offersSection,.pageSection{max-width:1280px;margin:0 auto;padding:40px 6vw 100px}
.offersTop{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:34px}
.toolGrid,.featureGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.pricingGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;max-width:900px}
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
@media(max-width:1100px){.toolGrid,.featureGrid{grid-template-columns:repeat(2,1fr)}.pricingGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}.generatorControls{grid-template-columns:1fr}}
@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{display:grid;grid-template-columns:1fr auto;gap:14px;padding:20px}.brand{grid-column:1;grid-row:1;justify-self:start}.accountBtn{grid-column:2;grid-row:1;justify-self:end;padding:10px 14px;font-size:14px}.navLinks{grid-column:1 / -1;grid-row:2;justify-content:flex-start;gap:12px}.hero,.offersSection,.pageSection,.footerSubscribe{padding-left:20px;padding-right:20px}.hero{padding-top:28px}.toolGrid,.featureGrid,.pricingGrid,.logoPageGrid,.logoInputs,.generatorButtons{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}.resultTop{align-items:flex-start;flex-direction:column}textarea{height:160px}.chatWidget{width:calc(100vw - 40px);right:20px;bottom:84px}.logoPreview{font-size:40px;min-height:180px}}
`;
