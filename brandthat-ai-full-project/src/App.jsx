import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient.js";

const supabase = createClient(
  "https://vfnkmabnocbwawbvdxfo.supabase.co",
  "YOUR_FULL_SB_PUBLISHABLE_KEY_HERE"
);

const tools = [
  { title: "Captions", desc: "Premium captions for every social platform." },
  { title: "Hashtags", desc: "Smart hashtag systems designed for reach." },
  { title: "Brand Bios", desc: "Polished bios for creators and businesses." },
  { title: "On-video Hooks", desc: "Short hooks for Reels, TikTok, and Shorts." },
  { title: "Email Copy", desc: "Launch emails, promos, and newsletters." },
  { title: "Social Strategy", desc: "Content direction across every platform." },
  { title: "Brand Creation", desc: "Generate brand names and positioning." },
  { title: "Logo Generator", desc: "Create modern logo concepts instantly." }
];

const creativeTools = [
  "Instagram Caption", "TikTok Caption", "Facebook Caption", "LinkedIn Post", "X / Twitter Post",
  "Reel Hook", "TikTok Hook", "YouTube Short Hook", "On-video Caption", "Carousel Copy",
  "Hashtag Set", "Brand Bio", "Instagram Bio", "TikTok Bio", "LinkedIn Bio",
  "Email Campaign", "Newsletter", "Product Launch Email", "Promo Email", "Welcome Email",
  "Brand Name Ideas", "Tagline Ideas", "Slogan Ideas", "Brand Voice", "Mission Statement",
  "Website Hero Copy", "Landing Page Copy", "Ad Headline", "Meta Ad Copy", "Google Ad Copy",
  "Content Calendar", "30-Day Content Plan", "Social Strategy", "Campaign Concept", "Launch Plan"
];

const creativeTones = [
  "Luxury", "Modern", "Minimal", "Bold", "Playful", "Professional", "Editorial", "Cinematic",
  "Premium", "Friendly", "Witty", "Elegant", "Direct", "Emotional", "High-end", "Viral"
];

const logoStyles = [
  "Luxury Wordmark", "Modern Minimal", "Bold Monogram", "Editorial Serif", "Clean Sans Serif",
  "Founder Brand", "Beauty Brand", "Real Estate Brand", "Restaurant Brand", "Fashion Brand",
  "Wellness Brand", "Tech Startup", "Agency Brand", "Luxury Product", "Signature Style",
  "Icon + Wordmark", "Badge Logo", "Social Profile Logo", "Packaging Logo", "High-end Brand System"
];

const logoMoods = [
  "Luxury", "Minimal", "Modern", "Elegant", "Bold", "Editorial", "Timeless", "Clean",
  "Premium", "Soft", "Masculine", "Feminine", "Warm", "Sharp", "Classic", "Creative"
];

function makeCombos(a, b) {
  const combos = [];
  a.forEach((x) => b.forEach((y) => combos.push(`${x} — ${y}`)));
  return combos;
}

export default function App() {
  const [page, setPage] = useState("home");

  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(localStorage.getItem("brandthat_plan") || "free");
  const [freeUsed, setFreeUsed] = useState(localStorage.getItem("brandthat_free_used") === "yes");

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const [subscribeEmail, setSubscribeEmail] = useState("");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  const [prompt, setPrompt] = useState("");
  const [creativeType, setCreativeType] = useState("Instagram Caption — Luxury");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);

  const [logoName, setLogoName] = useState("");
  const [logoCombo, setLogoCombo] = useState("Luxury Wordmark — Luxury");
  const [logoResult, setLogoResult] = useState("");

  const creativeOptions = useMemo(() => makeCombos(creativeTools, creativeTones), []);
  const logoOptions = useMemo(() => makeCombos(logoStyles, logoMoods), []);

  useEffect(() => {
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
    setAuthMessage("");
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

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    localStorage.setItem("brandthat_plan", selectedPlan);
    setUserPlan(selectedPlan);

    setAuthMessage("Verification email sent. Please check your inbox and click the confirmation link.");
  };

  const logIn = async () => {
    if (!authEmail || !authPassword) {
      setAuthMessage("Please enter your email and password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    setShowAuth(false);
    setAuthEmail("");
    setAuthPassword("");
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

  const generate = async () => {
    if (!user) {
      openTrialSignup();
      return;
    }

    if (userPlan === "free" && freeUsed) {
      setPage("pricing");
      setResult("Your free use has been used. Please choose a plan to continue.");
      return;
    }

    setLoading(true);

    let systemPrompt = "";

    if (userPlan === "free" || userPlan === "starter") {
      systemPrompt = `
You are Brandthat AI Starter.
Generate captions, hashtags, on-video hooks, and short brand bio ideas.
Keep it simple, useful, and clean.
Do not create advanced strategy, full campaigns, or agency-level systems.
`;
    }

    if (userPlan === "pro") {
      systemPrompt = `
You are Brandthat AI Pro.
Generate captions, hashtags, hooks, bios, launch ideas, social strategy, and premium content direction.
Make it polished, organized, and professional.
`;
    }

    if (userPlan === "studio") {
      systemPrompt = `
You are Brandthat AI Studio.
Generate captions, hashtags, hooks, bios, launch ideas, campaign direction, content calendar ideas, brand positioning, social strategy, and client-ready execution notes.
Make it agency-level, detailed, strategic, and premium.
`;
    }

    try {
      const response = await fetch("/.netlify/functions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${systemPrompt}

Selected generator type:
${creativeType}

User request:
${prompt}`
        })
      });

      const data = await response.json();
      setResult(data.text || "No response generated.");

      if (userPlan === "free") {
        localStorage.setItem("brandthat_free_used", "yes");
        setFreeUsed(true);
      }
    } catch {
      setResult("Something went wrong.");
    }

    setLoading(false);
  };

  const generateLogo = () => {
    if (!user) {
      openTrialSignup();
      return;
    }

    if (userPlan === "free" || userPlan === "starter") {
      setLogoResult("AI Logo Generator is available on Pro and Studio plans. Please upgrade to unlock logo concepts.");
      return;
    }

    if (userPlan === "pro") {
      setLogoResult(`
${logoName || "Your Brand"}

PRO LOGO CONCEPT

Selected Style:
${logoCombo}

• Modern premium wordmark
• Clean typography direction
• Social-media ready logo concept
• Website-ready brand mark
• Simple color palette

Recommended Colors:
- Matte Black
- Soft Ivory
- Warm Gold Accent
      `);
      return;
    }

    if (userPlan === "studio") {
      setLogoResult(`
${logoName || "Your Brand"}

STUDIO BRAND IDENTITY SYSTEM

Selected Style:
${logoCombo}

Primary Logo:
• Premium luxury wordmark
• Refined typography
• Strong spacing system
• High-end visual identity

Secondary System:
• Monogram concept
• Social watermark
• Website header version
• Small-icon version

Recommended Palette:
- Matte Black
- Bone White
- Champagne Gold
- Soft Stone Neutral

Studio Notes:
• Use generous spacing
• Keep typography minimal
• Build around recognition and trust
• Create a version that works as a profile picture
      `);
    }
  };

  return (
    <div className="app">
      <style>{css}</style>

      <nav className="nav">
        <button className="brand" onClick={() => setPage("home")}>
          Brandthat
        </button>

        <div className="navLinks">
          <button onClick={() => setPage("features")}>Features</button>
          <button onClick={() => setPage("pricing")}>Pricing</button>
          <button onClick={() => setPage("studio")}>Studio</button>
          <button onClick={() => setPage("logo")}>AI Logo Generator</button>
        </div>

        {user ? (
          <button className="accountBtn" onClick={logOut}>
            Log out
          </button>
        ) : (
          <button className="accountBtn" onClick={() => setShowAuth(true)}>
            Log in
          </button>
        )}
      </nav>

      {page === "home" && (
        <>
          <main className="hero">
            <div className="heroTop">
              <div className="eyebrow">AI CREATIVE STUDIO</div>

              <h1>Your AI creative partner for every post.</h1>

              <p className="lead">
                Generate captions, hashtags, launch ideas, bios, emails, logos,
                and social media direction — all in one workspace.
              </p>
            </div>

            <GeneratorCard
              prompt={prompt}
              setPrompt={setPrompt}
              creativeType={creativeType}
              setCreativeType={setCreativeType}
              creativeOptions={creativeOptions}
              generate={generate}
              loading={loading}
              result={result}
              userPlan={userPlan}
              freeUsed={freeUsed}
            />
          </main>

          <section className="offersSection">
            <div className="offersTop">
              <div>
                <div className="tinyTag">WHAT BRANDTHAT AI OFFERS</div>
                <h2>Everything modern brands need.</h2>
              </div>

              <div className="offerBadge">Built for creators, brands, and agencies</div>
            </div>

            <div className="toolGrid">
              {tools.map((tool) => (
                <div className="toolCard" key={tool.title}>
                  <div className="toolGlow"></div>
                  <h3>{tool.title}</h3>
                  <p>{tool.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {page === "features" && (
        <section className="pageSection">
          <div className="tinyTag">FEATURES</div>
          <h1 className="pageTitle">Everything you need to grow your brand.</h1>

          <div className="featureGrid">
            {tools.map((tool) => (
              <div className="featureCard" key={tool.title}>
                <h3>{tool.title}</h3>
                <p>{tool.desc}</p>
              </div>
            ))}
          </div>
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
              features={[
                "Unlimited AI generations",
                "Captions & hashtags",
                "Brand bios",
                "On-video hooks",
                "Simple social ideas",
                "No AI Logo Generator"
              ]}
              onClick={() => openPlanSignup("starter")}
            />

            <PriceCard
              name="PRO"
              price="$20"
              featured
              desc="Everything in Starter plus unlimited AI Logo Generator and premium creative outputs."
              features={[
                "Unlimited AI generations",
                "Unlimited AI Logo Generator",
                "Brand creation tools",
                "Premium creative outputs",
                "Launch & campaign ideas",
                "Social strategy"
              ]}
              onClick={() => openPlanSignup("pro")}
            />

            <PriceCard
              name="STUDIO"
              price="$50"
              desc="Built for agencies, studios, and brands needing client-ready creative systems."
              features={[
                "Everything in Pro",
                "Agency-level workflows",
                "Brand system generation",
                "Premium export layouts",
                "Client-ready presentations",
                "Future white-label access",
                "Early access to new AI tools"
              ]}
              onClick={() => openPlanSignup("studio")}
            />
          </div>
        </section>
      )}

      {page === "studio" && (
        <section className="pageSection">
          <div className="tinyTag">STUDIO</div>
          <h1 className="pageTitle">Your AI creative workspace.</h1>

          <GeneratorCard
            prompt={prompt}
            setPrompt={setPrompt}
            creativeType={creativeType}
            setCreativeType={setCreativeType}
            creativeOptions={creativeOptions}
            generate={generate}
            loading={loading}
            result={result}
            userPlan={userPlan}
            freeUsed={freeUsed}
          />
        </section>
      )}

      {page === "logo" && (
        <section className="pageSection">
          <div className="tinyTag">AI LOGO GENERATOR</div>
          <h1 className="pageTitle">Create premium logo concepts instantly.</h1>

          <div className="planNotice">
            {userPlan === "free" && "AI Logo Generator is available with Pro or Studio."}
            {userPlan === "starter" && "Starter does not include AI Logo Generator. Upgrade to Pro or Studio."}
            {userPlan === "pro" && "Pro includes unlimited AI Logo Generator access."}
            {userPlan === "studio" && "Studio unlocks advanced brand identity systems and premium logo direction."}
          </div>

          <div className="logoPageGrid">
            <div className="logoCard">
              <h2>Generate your logo direction.</h2>

              <p className="logoLead">
                Create luxury, modern, minimal, and premium logo concepts for your brand.
              </p>

              <div className="logoInputs">
                <input
                  placeholder="Brand name"
                  value={logoName}
                  onChange={(e) => setLogoName(e.target.value)}
                />

                <select
                  value={logoCombo}
                  onChange={(e) => setLogoCombo(e.target.value)}
                >
                  {logoOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </div>

              <button className="btn dark full" onClick={generateLogo}>
                Generate Logo Concept
              </button>
            </div>

            <div className="logoPreviewCard">
              <div className="logoPreview">{logoName || "Your Brand"}</div>

              <div className="logoBottom">
                <div className="tinyTag">AI GENERATED DIRECTION</div>
                <div className="resultContent">{logoResult || "Your logo concept will appear here."}</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <footer className="footerSubscribe">
        <div>
          <div className="tinyTag">NEWSLETTER</div>
          <h2>Subscribe for Brandthat updates.</h2>
          <p>Get product news, AI content tips, launch updates, and new feature announcements.</p>
        </div>

        <div className="footerForm">
          <input
            placeholder="Enter your email"
            value={subscribeEmail}
            onChange={(e) => setSubscribeEmail(e.target.value)}
          />

          <button className="btn dark" onClick={() => {
            if (!subscribeEmail) {
              setSubscribeMessage("Please enter your email.");
              return;
            }
            localStorage.setItem("brandthat_newsletter", subscribeEmail);
            setSubscribeMessage("You're subscribed. Thank you.");
            setSubscribeEmail("");
          }}>
            Subscribe
          </button>

          {subscribeMessage && <span>{subscribeMessage}</span>}
        </div>
      </footer>

      {showAuth && (
        <div className="modal">
          <div className="signupBox">
            <div className="tinyTag">{authMode === "signup" ? "CREATE ACCOUNT" : "LOG IN"}</div>

            <h2>{authMode === "signup" ? "Start using Brandthat." : "Welcome back."}</h2>

            <p>
              {authMode === "signup"
                ? "Create your account. Supabase will send a real verification email to your inbox."
                : "Log in to continue using your Brandthat account."}
            </p>

            <input
              placeholder="Email address"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
            />

            <input
              placeholder="Password"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
            />

            <button className="btn dark full" onClick={authMode === "signup" ? signUp : logIn}>
              {authMode === "signup" ? "Create account" : "Log in"}
            </button>

            <button
              className="btn light full"
              onClick={() => {
                setAuthMode(authMode === "signup" ? "login" : "signup");
                setAuthMessage("");
              }}
            >
              {authMode === "signup" ? "Already have an account? Log in" : "Create a new account"}
            </button>

            <button className="btn light full" onClick={() => setShowAuth(false)}>
              Cancel
            </button>

            {authMessage && <div className="verifyNote">{authMessage}</div>}
          </div>
        </div>
      )}

      <button className="chatButton" onClick={() => setChatOpen(!chatOpen)}>
        AI Assistant
      </button>

      {chatOpen && (
        <div className="chatWidget">
          <div className="chatHeader">
            <strong>Brandthat AI</strong>
            <span>Need help getting started?</span>
          </div>

          <div className="chatBody">
            <div className="chatBubble">
              Create an account, verify your email, and start generating brand content.
            </div>

            <div className="chatBubble light">
              Starter: content tools
              <br />
              Pro: content + logos
              <br />
              Studio: agency-level systems
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GeneratorCard({
  prompt,
  setPrompt,
  creativeType,
  setCreativeType,
  creativeOptions,
  generate,
  loading,
  result,
  userPlan,
  freeUsed
}) {
  return (
    <div className="generateCard">
      <div className="generateTop">
        <div>
          <div className="tinyTag">CREATIVE STUDIO</div>
          <h2>Generate content instantly.</h2>
          <div className="planIndicator">
            {userPlan === "free"
              ? freeUsed
                ? "Free use completed. Choose a plan to continue."
                : "Try free now."
              : "Plan access active."}
          </div>
        </div>

        <div className="liveBadge">AI Powered</div>
      </div>

      <select
        value={creativeType}
        onChange={(e) => setCreativeType(e.target.value)}
      >
        {creativeOptions.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <textarea
        placeholder="Create captions, hashtags, hooks, and branding ideas for my luxury coffee brand..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button className="btn dark full" onClick={generate}>
        {loading ? "Generating..." : "Generate"}
      </button>

      {result && (
        <div className="resultBox">
          <div className="resultTop">
            <span>BRANDTHAT AI</span>
            <button onClick={() => navigator.clipboard.writeText(result)}>Copy</button>
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

      <div className="priceFeatures">
        {features.map((feature) => (
          <div key={feature}>✓ {feature}</div>
        ))}
      </div>

      <button className={featured ? "btn whiteBtn full" : "btn dark full"} onClick={onClick}>
        Subscribe
      </button>
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
.pageTitle{max-width:820px}
h2{font-size:44px;line-height:1;letter-spacing:-.05em;margin:0}
.toolCard h3,.featureCard h3{font-size:24px;font-weight:700;letter-spacing:-.03em;margin:0 0 12px}
.lead{font-size:22px;line-height:1.7;color:#666;max-width:620px}
.generateCard,.logoCard,.logoPreviewCard,.signupBox{background:white;border-radius:38px;padding:34px;border:1px solid rgba(0,0,0,.08);box-shadow:0 30px 90px rgba(0,0,0,.06)}
.generateTop{display:flex;justify-content:space-between;gap:20px;margin-bottom:30px}
.liveBadge,.offerBadge{background:white;border:1px solid rgba(0,0,0,.08);padding:14px 18px;border-radius:999px;font-size:13px;font-weight:700;height:fit-content}
.planIndicator,.planNotice,.verifyNote{margin-top:16px;font-size:13px;font-weight:700;color:#8a6b37}
.planNotice{background:white;border:1px solid rgba(0,0,0,.08);border-radius:18px;padding:16px 18px;margin-bottom:28px;max-width:760px}
textarea,input,select{width:100%;border-radius:24px;border:1px solid rgba(0,0,0,.08);padding:20px;font-size:16px;background:#fafafa;font-family:inherit;margin-top:12px}
textarea{height:170px;resize:none}
.logoInputs{display:grid;grid-template-columns:1fr 220px;gap:16px;margin:26px 0}
.btn{border:none;border-radius:18px;padding:16px 24px;font-weight:800;cursor:pointer;font-size:15px;transition:.2s ease;display:inline-flex;align-items:center;justify-content:center}
.btn:hover{transform:translateY(-2px);opacity:.96}
.btn.dark{background:#111;color:white}
.btn.light{background:white;color:#111;border:1px solid rgba(0,0,0,.08)}
.btn.full{width:100%;margin-top:18px}
.whiteBtn{background:white;color:#111;border:none}
.resultBox{margin-top:26px;background:#fafafa;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,.06)}
.resultTop{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid rgba(0,0,0,.06)}
.resultTop span{font-size:12px;font-weight:800;letter-spacing:2px;color:#9b7b3f}
.resultTop button{background:white;border:1px solid rgba(0,0,0,.08);padding:8px 12px;border-radius:999px;font-weight:700;cursor:pointer}
.resultContent{padding:24px;line-height:1.9;white-space:pre-wrap;font-size:15px}
.logoPreview{min-height:240px;display:flex;align-items:center;justify-content:center;font-size:64px;font-weight:900;letter-spacing:-.06em;border-radius:24px;background:#fafafa;border:1px solid rgba(0,0,0,.06);text-align:center;padding:20px}
.logoBottom{margin-top:24px}
.logoLead,.footerSubscribe p{font-size:18px;line-height:1.7;color:#666;margin:18px 0 26px}
.offersSection,.pageSection{max-width:1280px;margin:0 auto;padding:40px 6vw 100px}
.offersTop{display:flex;justify-content:space-between;gap:30px;align-items:end;margin-bottom:34px}
.toolGrid,.featureGrid,.pricingGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.logoPageGrid{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start}
.toolCard,.featureCard,.priceCard{position:relative;overflow:hidden;background:white;padding:26px;border-radius:28px;border:1px solid rgba(0,0,0,.08);min-height:180px;transition:.25s ease}
.toolCard:hover,.featureCard:hover,.priceCard:hover{transform:translateY(-4px);box-shadow:0 18px 50px rgba(0,0,0,.06)}
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
@media(max-width:1100px){.toolGrid,.featureGrid,.pricingGrid{grid-template-columns:repeat(2,1fr)}.footerSubscribe{grid-template-columns:1fr}}
@media(max-width:820px){h1{font-size:52px}h2{font-size:36px}.nav{flex-direction:column;gap:18px;padding:24px 20px 8px}.navLinks{justify-content:center}.hero,.offersSection,.pageSection,.footerSubscribe{padding-left:20px;padding-right:20px}.hero{padding-top:28px}.toolGrid,.featureGrid,.pricingGrid,.logoPageGrid,.logoInputs{grid-template-columns:1fr}.offersTop,.generateTop{flex-direction:column;align-items:flex-start}textarea{height:150px}.chatWidget{width:calc(100vw - 40px);right:20px;bottom:84px}.logoPreview{font-size:40px;min-height:180px}}
`;
