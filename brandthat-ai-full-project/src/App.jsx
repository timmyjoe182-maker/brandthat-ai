import React, { useEffect, useState } from "react";

const niches = [
  "Luxury Local Business",
  "Wedding Photographer",
  "Videographer",
  "Content Creator",
  "Ranch / Farm Brand",
  "Real Estate Agent",
  "Luxury Real Estate",
  "Interior Designer",
  "Med Spa",
  "Salon",
  "Restaurant",
  "Fitness Coach",
  "Marketing Agency",
  "Law Firm",
  "Retail Boutique",
  "Tech Startup",
  "Event Venue",
  "Private Chef",
  "Lifestyle Brand"
];

const voices = [
  "Refined",
  "Luxury",
  "Bold",
  "Minimal",
  "Modern",
  "Professional",
  "Playful",
  "Emotional",
  "High-End",
  "Cinematic",
  "Viral"
];

const outputs = [
  "Instagram caption + Reel hook",
  "Luxury Instagram Caption",
  "LinkedIn post",
  "TikTok Hook",
  "Email Campaign",
  "Facebook Caption",
  "Website Copy",
  "Brand Slogan",
  "Product Launch Copy",
  "Ad Copy"
];

export default function App() {
  const [page, setPage] = useState("home");
  const [isMobile, setIsMobile] = useState(false);

  const [businessType, setBusinessType] = useState(niches[0]);
  const [tone, setTone] = useState(voices[0]);
  const [contentType, setContentType] = useState(outputs[0]);
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const [userEmail, setUserEmail] = useState("");
  const [authMode, setAuthMode] = useState(null);
  const [hasUsedFreeTry, setHasUsedFreeTry] = useState(false);

  useEffect(() => {
    const updateMobile = () => setIsMobile(window.innerWidth < 800);

    updateMobile();
    window.addEventListener("resize", updateMobile);

    const savedUser = localStorage.getItem("brandthat_user");
    const freeTry = localStorage.getItem("brandthat_free_try_used") === "yes";

    if (savedUser) setUserEmail(savedUser);
    if (freeTry) setHasUsedFreeTry(true);

    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  const isLoggedIn = Boolean(userEmail);

  const handleGenerate = async () => {
    if (!isLoggedIn && hasUsedFreeTry) {
      setAuthMode("signup");
      return;
    }

    setLoading(true);
    setCaption("");

    try {
      const response = await fetch("/.netlify/functions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          businessType,
          tone,
          topic,
          contentType
        })
      });

      const data = await response.json();

      setCaption(data.text || data.result || data.error || "No response generated.");

      if (!isLoggedIn) {
        localStorage.setItem("brandthat_free_try_used", "yes");
        setHasUsedFreeTry(true);
      }
    } catch (error) {
      setCaption("Something went wrong connecting to AI.");
    }

    setLoading(false);
  };

  const signInDemo = () => {
    localStorage.setItem("brandthat_user", "demo@brandthat.ai");
    setUserEmail("demo@brandthat.ai");
    setAuthMode(null);
  };

  const logout = () => {
    localStorage.removeItem("brandthat_user");
    setUserEmail("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f3ef",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        color: "#111",
        overflowX: "hidden"
      }}
    >
      <nav
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? 18 : 0,
          justifyContent: "space-between",
          alignItems: "center",
          padding: isMobile ? "24px 20px" : "30px 60px"
        }}
      >
        <div
          onClick={() => setPage("home")}
          style={{
            fontWeight: 800,
            fontSize: 24,
            cursor: "pointer"
          }}
        >
          Brandthat
        </div>

        <div
          style={{
            display: "flex",
            gap: 14,
            flexWrap: "wrap",
            justifyContent: "center"
          }}
        >
          <button onClick={() => setPage("features")} style={navButton}>
            Features
          </button>

          <button onClick={() => setPage("pricing")} style={navButton}>
            Pricing
          </button>

          <button onClick={() => setPage("studio")} style={navButton}>
            Studio
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          {isLoggedIn ? (
            <button onClick={logout} style={whiteButton}>
              Logout
            </button>
          ) : (
            <>
              <button onClick={() => setAuthMode("login")} style={whiteButton}>
                Log in
              </button>

              <button onClick={() => setAuthMode("signup")} style={blackButton}>
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      {page === "home" && (
        <main
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: isMobile ? "30px 20px 60px" : "60px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 480px",
            gap: isMobile ? 34 : 60,
            alignItems: "center"
          }}
        >
          <Hero isMobile={isMobile} setPage={setPage} />

          <StudioCard
            businessType={businessType}
            setBusinessType={setBusinessType}
            tone={tone}
            setTone={setTone}
            contentType={contentType}
            setContentType={setContentType}
            topic={topic}
            setTopic={setTopic}
            caption={caption}
            loading={loading}
            handleGenerate={handleGenerate}
            isLoggedIn={isLoggedIn}
            hasUsedFreeTry={hasUsedFreeTry}
          />
        </main>
      )}

      {page === "studio" && (
        <main
          style={{
            maxWidth: 760,
            margin: "0 auto",
            padding: isMobile ? "25px 20px 60px" : "60px"
          }}
        >
          <StudioCard
            businessType={businessType}
            setBusinessType={setBusinessType}
            tone={tone}
            setTone={setTone}
            contentType={contentType}
            setContentType={setContentType}
            topic={topic}
            setTopic={setTopic}
            caption={caption}
            loading={loading}
            handleGenerate={handleGenerate}
            isLoggedIn={isLoggedIn}
            hasUsedFreeTry={hasUsedFreeTry}
          />
        </main>
      )}

      {page === "features" && (
        <Page title="Features" isMobile={isMobile}>
          <Card
            title="Premium AI Copy"
            text="Luxury-level captions, ads, hooks, emails, and campaigns."
          />

          <Card
            title="Brand Voices"
            text="Refined, cinematic, luxury, modern, playful, viral, and more."
          />

          <Card
            title="Business Specific"
            text="Tailored outputs for real estate, weddings, restaurants, ranches, and more."
          />
        </Page>
      )}

      {page === "pricing" && (
        <Page title="Pricing" isMobile={isMobile}>
          <Price
            name="Starter"
            price="$19/mo"
            items={["50 generations", "Instagram captions", "Basic AI tools"]}
          />

          <Price
            name="Pro"
            price="$49/mo"
            items={["250 generations", "Campaign tools", "Luxury AI voices"]}
          />

          <Price
            name="Agency"
            price="$99/mo"
            items={["Unlimited generations", "Client workspaces", "Priority AI"]}
          />
        </Page>
      )}

      {authMode && (
        <div style={modalOverlay}>
          <div
            style={{
              ...modalCard,
              width: isMobile ? "86%" : 420
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {authMode === "signup" ? "Create your account" : "Log in"}
            </h2>

            <p style={{ color: "#666" }}>
              Continue generating premium brand content.
            </p>

            <input placeholder="Email" style={inputStyle} />

            <input placeholder="Password" type="password" style={inputStyle} />

            <button
              onClick={signInDemo}
              style={{
                ...blackButton,
                width: "100%",
                marginTop: 16
              }}
            >
              {authMode === "signup" ? "Create account" : "Log in"}
            </button>

            <button
              onClick={() => setAuthMode(null)}
              style={{
                ...whiteButton,
                width: "100%",
                marginTop: 12
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Hero({ isMobile, setPage }) {
  return (
    <div>
      <div style={eyebrow}>AI CONTENT STUDIO FOR BRANDS</div>

      <h1
        style={{
          fontSize: isMobile ? 46 : 76,
          lineHeight: 1,
          marginBottom: 24
        }}
      >
        Modern content,
        <br />
        made simple.
      </h1>

      <p
        style={{
          fontSize: isMobile ? 17 : 22,
          lineHeight: 1.7,
          color: "#555",
          maxWidth: 600
        }}
      >
        Brandthat AI turns one idea into polished captions, hooks, ads, emails,
        campaigns, and premium brand copy.
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 28,
          flexWrap: "wrap"
        }}
      >
        <button onClick={() => setPage("studio")} style={blackButton}>
          Try the studio
        </button>

        <button onClick={() => setPage("pricing")} style={whiteButton}>
          View plans
        </button>
      </div>
    </div>
  );
}

function StudioCard(props) {
  return (
    <div style={studioCard}>
      <div style={eyebrow}>PREMIUM WORKSPACE</div>

      <h2 style={{ fontSize: 34, marginBottom: 24 }}>Content Studio</h2>

      {!props.isLoggedIn && (
        <div style={freeTryBox}>
          {props.hasUsedFreeTry
            ? "Free try used. Sign up to continue."
            : "You get 1 free generation before signing up."}
        </div>
      )}

      <label>Brand category</label>

      <select
        value={props.businessType}
        onChange={(e) => props.setBusinessType(e.target.value)}
        style={inputStyle}
      >
        {niches.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginTop: 16
        }}
      >
        <div>
          <label>Voice</label>

          <select
            value={props.tone}
            onChange={(e) => props.setTone(e.target.value)}
            style={inputStyle}
          >
            {voices.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Output</label>

          <select
            value={props.contentType}
            onChange={(e) => props.setContentType(e.target.value)}
            style={inputStyle}
          >
            {outputs.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </div>
      </div>

      <label style={{ display: "block", marginTop: 16 }}>Idea</label>

      <textarea
        value={props.topic}
        onChange={(e) => props.setTopic(e.target.value)}
        style={{
          ...inputStyle,
          height: 120,
          resize: "none"
        }}
      />

      <button
        onClick={props.handleGenerate}
        style={{
          ...blackButton,
          width: "100%",
          marginTop: 20
        }}
      >
        {props.loading ? "Generating..." : "Generate"}
      </button>

      {props.caption && (
        <div style={outputBox}>
          <div style={outputHeader}>
            <div>
              <div style={eyebrow}>AI OUTPUT</div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Ready-to-use content</h3>
            </div>

            <button
              onClick={() => navigator.clipboard.writeText(props.caption)}
              style={smallButton}
            >
              Copy
            </button>
          </div>

          <div style={outputContent}>
            {props.caption
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((section, index) => (
                <div key={index} style={outputSection}>
                  {section}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Page({ title, children, isMobile }) {
  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "30px 20px 60px" : "60px"
      }}
    >
      <h1
        style={{
          fontSize: isMobile ? 46 : 64
        }}
      >
        {title}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)",
          gap: 20
        }}
      >
        {children}
      </div>
    </main>
  );
}

function Card({ title, text }) {
  return (
    <div style={cardStyle}>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

function Price({ name, price, items }) {
  return (
    <div style={cardStyle}>
      <h3>{name}</h3>

      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          margin: "20px 0"
        }}
      >
        {price}
      </div>

      {items.map((x) => (
        <div key={x} style={{ marginBottom: 10 }}>
          ✓ {x}
        </div>
      ))}

      <button
        style={{
          ...blackButton,
          width: "100%",
          marginTop: 24
        }}
      >
        Choose plan
      </button>
    </div>
  );
}

const eyebrow = {
  fontSize: 12,
  letterSpacing: 3,
  color: "#999",
  marginBottom: 14
};

const studioCard = {
  background: "white",
  padding: 28,
  borderRadius: 30,
  boxShadow: "0 10px 40px rgba(0,0,0,0.06)"
};

const inputStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.1)",
  marginTop: 8,
  fontSize: 15,
  boxSizing: "border-box"
};

const blackButton = {
  background: "#111",
  color: "white",
  border: "none",
  borderRadius: 16,
  padding: "14px 22px",
  cursor: "pointer",
  fontWeight: 700
};

const whiteButton = {
  background: "white",
  color: "#111",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 16,
  padding: "14px 22px",
  cursor: "pointer",
  fontWeight: 700
};

const navButton = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 15,
  color: "#111",
  textDecoration: "none",
  appearance: "none",
  WebkitAppearance: "none"
};

const cardStyle = {
  background: "white",
  borderRadius: 24,
  padding: 28,
  boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
};

const outputBox = {
  marginTop: 24,
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 22,
  padding: 24,
  background: "#fafafa"
};

const outputHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  marginBottom: 18
};

const smallButton = {
  background: "white",
  color: "#111",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 999,
  padding: "8px 13px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12
};

const outputContent = {
  display: "grid",
  gap: 12
};

const outputSection = {
  background: "white",
  border: "1px solid rgba(0,0,0,0.06)",
  borderRadius: 16,
  padding: 16,
  whiteSpace: "pre-wrap",
  lineHeight: 1.8,
  fontSize: 15,
  color: "#222"
};

const freeTryBox = {
  background: "#f7f1e6",
  border: "1px solid rgba(150,100,20,.15)",
  color: "#5f4520",
  borderRadius: 16,
  padding: 14,
  fontSize: 14,
  marginBottom: 18
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999
};

const modalCard = {
  background: "white",
  borderRadius: 28,
  padding: 32,
  boxShadow: "0 30px 80px rgba(0,0,0,.22)"
};
