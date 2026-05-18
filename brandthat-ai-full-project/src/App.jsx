import React, { useState } from "react";

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
  "Spa",
  "Restaurant",
  "Coffee Shop",
  "Fitness Coach",
  "Marketing Agency",
  "Law Firm",
  "Travel Agency",
  "Construction Company",
  "Retail Boutique",
  "Tech Startup",
  "Event Venue",
  "Private Chef",
  "Drone Services",
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
  "Ad Copy",
  "YouTube Description",
  "Luxury CTA"
];

export default function App() {
  const [page, setPage] = useState("home");
  const [businessType, setBusinessType] = useState(niches[0]);
  const [tone, setTone] = useState(voices[0]);
  const [contentType, setContentType] = useState(outputs[0]);
  const [topic, setTopic] = useState("");
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);

  const [userEmail, setUserEmail] = useState(localStorage.getItem("brandthat_user") || "");
  const [authMode, setAuthMode] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");

  const hasUsedFreeTry = localStorage.getItem("brandthat_free_try_used") === "yes";
  const isLoggedIn = Boolean(userEmail);

  const handleGenerate = async () => {
    if (!isLoggedIn && hasUsedFreeTry) {
      setAuthMode("signup");
      setAuthMessage("Create a free account to keep generating.");
      return;
    }

    setLoading(true);

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

      setCaption(data.result || data.text || "No response generated.");

      if (!isLoggedIn) {
        localStorage.setItem("brandthat_free_try_used", "yes");
      }
    } catch (err) {
      setCaption("Something went wrong.");
    }

    setLoading(false);
  };

  const handleSignup = () => {
    if (!authEmail || !authPassword) {
      setAuthMessage("Enter your email and password.");
      return;
    }

    localStorage.setItem("brandthat_user", authEmail);
    setUserEmail(authEmail);
    setAuthMode(null);
    setAuthEmail("");
    setAuthPassword("");
    setAuthMessage("");
  };

  const handleLogin = () => {
    if (!authEmail || !authPassword) {
      setAuthMessage("Enter your email and password.");
      return;
    }

    localStorage.setItem("brandthat_user", authEmail);
    setUserEmail(authEmail);
    setAuthMode(null);
    setAuthEmail("");
    setAuthPassword("");
    setAuthMessage("");
  };

  const handleLogout = () => {
    localStorage.removeItem("brandthat_user");
    setUserEmail("");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f3ef",
        fontFamily: "Inter, sans-serif",
        color: "#111"
      }}
    >
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "30px 60px"
        }}
      >
        <div
          onClick={() => setPage("home")}
          style={{
            fontWeight: 700,
            fontSize: 24,
            cursor: "pointer"
          }}
        >
          Brandthat
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <button onClick={() => setPage("features")} style={navButton}>Features</button>
          <button onClick={() => setPage("pricing")} style={navButton}>Pricing</button>
          <button onClick={() => setPage("studio")} style={navButton}>Studio</button>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isLoggedIn ? (
            <>
              <span style={{ fontSize: 13, color: "#666" }}>{userEmail}</span>
              <button onClick={handleLogout} style={whiteButton}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => setAuthMode("login")} style={whiteButton}>Log in</button>
              <button onClick={() => setAuthMode("signup")} style={blackButton}>Sign up</button>
            </>
          )}
        </div>
      </nav>

      {page === "home" && (
        <div style={homeGrid}>
          <div>
            <div style={eyebrow}>AI CONTENT STUDIO FOR BRANDS</div>

            <h1 style={heroTitle}>
              Modern content,
              <br />
              made simple.
            </h1>

            <p style={heroText}>
              Brandthat AI turns one idea into polished captions, hooks, ads,
              emails, campaigns, and premium brand copy.
            </p>

            <div style={{ display: "flex", gap: 16, marginTop: 30 }}>
              <button onClick={() => setPage("studio")} style={blackButton}>Try the studio</button>
              <button onClick={() => setPage("pricing")} style={whiteButton}>View plans</button>
            </div>
          </div>

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
        </div>
      )}

      {page === "features" && (
        <PageContainer title="Features">
          <FeatureCard title="Premium AI Copy" desc="Luxury-level captions, ads, hooks, emails, and campaigns." />
          <FeatureCard title="Brand Voices" desc="Refined, cinematic, luxury, modern, playful, viral, and more." />
          <FeatureCard title="Business Specific" desc="Tailored outputs for real estate, weddings, restaurants, ranches, and more." />
        </PageContainer>
      )}

      {page === "pricing" && (
        <PageContainer title="Pricing">
          <PricingCard name="Starter" price="$19/mo" features={["50 generations", "Instagram captions", "Basic AI tools"]} />
          <PricingCard name="Pro" price="$49/mo" features={["250 generations", "Campaign tools", "Luxury AI voices"]} />
          <PricingCard name="Agency" price="$99/mo" features={["Unlimited generations", "Client workspaces", "Priority AI"]} />
        </PageContainer>
      )}

      {page === "studio" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "60px" }}>
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
        </div>
      )}

      {authMode && (
        <div style={modalOverlay}>
          <div style={modalCard}>
            <h2 style={{ marginTop: 0 }}>
              {authMode === "signup" ? "Create your account" : "Log in"}
            </h2>

            <p style={{ color: "#666", lineHeight: 1.6 }}>
              {authMode === "signup"
                ? "Get your free account and continue generating premium content."
                : "Log in to continue using Brandthat AI."}
            </p>

            <input
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="Password"
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              style={inputStyle}
            />

            {authMessage && <p style={{ color: "#8a5a00" }}>{authMessage}</p>}

            <button
              onClick={authMode === "signup" ? handleSignup : handleLogin}
              style={{ ...blackButton, width: "100%", marginTop: 16 }}
            >
              {authMode === "signup" ? "Create account" : "Log in"}
            </button>

            <button
              onClick={() => setAuthMode(null)}
              style={{ ...whiteButton, width: "100%", marginTop: 12 }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudioCard(props) {
  return (
    <div style={studioCard}>
      <div style={eyebrow}>PREMIUM WORKSPACE</div>

      <h2 style={{ fontSize: 38, marginBottom: 24 }}>Content Studio</h2>

      {!props.isLoggedIn && (
        <div style={freeTryBox}>
          {props.hasUsedFreeTry
            ? "Free try used. Sign up to continue."
            : "You get 1 free generation before signing up."}
        </div>
      )}

      <label>Brand category</label>
      <select value={props.businessType} onChange={(e) => props.setBusinessType(e.target.value)} style={inputStyle}>
        {niches.map((niche) => <option key={niche}>{niche}</option>)}
      </select>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
        <div>
          <label>Voice</label>
          <select value={props.tone} onChange={(e) => props.setTone(e.target.value)} style={inputStyle}>
            {voices.map((voice) => <option key={voice}>{voice}</option>)}
          </select>
        </div>

        <div>
          <label>Output</label>
          <select value={props.contentType} onChange={(e) => props.setContentType(e.target.value)} style={inputStyle}>
            {outputs.map((output) => <option key={output}>{output}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Idea</label>
        <textarea
          value={props.topic}
          onChange={(e) => props.setTopic(e.target.value)}
          style={{ ...inputStyle, height: 120, resize: "none" }}
        />
      </div>

      <button onClick={props.handleGenerate} style={{ ...blackButton, width: "100%", marginTop: 20 }}>
        {props.loading ? "Generating..." : "Generate"}
      </button>

      {props.caption && (
        <div style={outputBox}>
          <div style={eyebrow}>AI OUTPUT</div>
          <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.9, fontSize: 15 }}>
            {props.caption}
          </div>
        </div>
      )}
    </div>
  );
}

function PageContainer({ title, children }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "60px" }}>
      <h1 style={{ fontSize: 64, marginBottom: 40 }}>{title}</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

function FeatureCard({ title, desc }) {
  return (
    <div style={cardStyle}>
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function PricingCard({ name, price, features }) {
  return (
    <div style={cardStyle}>
      <h3>{name}</h3>
      <div style={{ fontSize: 42, fontWeight: 700, margin: "20px 0" }}>{price}</div>
      {features.map((feature) => (
        <div key={feature} style={{ marginBottom: 10 }}>✓ {feature}</div>
      ))}
      <button style={{ ...blackButton, width: "100%", marginTop: 24 }}>Choose plan</button>
    </div>
  );
}

const homeGrid = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "60px",
  display: "grid",
  gridTemplateColumns: "1fr 480px",
  gap: 60,
  alignItems: "center"
};

const heroTitle = {
  fontSize: 76,
  lineHeight: 1,
  marginBottom: 24
};

const heroText = {
  fontSize: 22,
  lineHeight: 1.7,
  color: "#555",
  maxWidth: 600
};

const eyebrow = {
  fontSize: 12,
  letterSpacing: 3,
  color: "#999",
  marginBottom: 14
};

const studioCard = {
  background: "white",
  padding: 32,
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
  padding: "16px 24px",
  cursor: "pointer",
  fontWeight: 600
};

const whiteButton = {
  background: "white",
  color: "#111",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 16,
  padding: "16px 24px",
  cursor: "pointer",
  fontWeight: 600
};

const navButton = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 15
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
  borderRadius: 20,
  padding: 24,
  background: "#fafafa"
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
  width: 420,
  boxShadow: "0 30px 80px rgba(0,0,0,.22)"
};
