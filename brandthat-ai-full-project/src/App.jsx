import React, { useState } from "react";

const niches = [
  "Luxury Local Business",
  "Wedding Photographer",
  "Videographer",
  "Content Creator",
  "Ranch / Farm Brand",
  "Real Estate Agent",
  "Luxury Real Estate Agent",
  "Interior Designer",
  "Med Spa",
  "Salon",
  "Spa",
  "Fine Dining Restaurant",
  "Cafe",
  "Private Chef",
  "Boutique Hotel",
  "Luxury Resort",
  "Vacation Rental",
  "Airbnb Host",
  "Wedding Venue",
  "Wedding Planner",
  "Florist",
  "Event Venue",
  "Fitness Coach",
  "Marketing Agency",
  "E-commerce Brand",
  "Tech Startup",
  "AI Company",
  "Law Firm",
  "Luxury Concierge",
  "Lifestyle Brand"
];

const tones = [
  "Refined",
  "Luxury",
  "Premium",
  "Elegant",
  "Modern",
  "Warm",
  "Bold",
  "Minimal",
  "Cinematic",
  "Editorial",
  "Confident",
  "Funny",
  "Professional",
  "Founder-led",
  "Conversational",
  "Viral"
];

const outputs = [
  "Instagram caption + Reel hook",
  "Weekly content calendar",
  "Facebook post",
  "LinkedIn post",
  "Email promo",
  "Ad copy",
  "Website hero copy",
  "Landing page copy",
  "TikTok hook ideas",
  "YouTube Shorts script",
  "Luxury brand bio",
  "Launch campaign",
  "30-day content plan",
  "Carousel post copy",
  "Cold DM script",
  "Newsletter"
];

function Button({ children, style = {}, ...props }) {
  return (
    <button
      style={{
        border: "none",
        cursor: "pointer",
        borderRadius: 999,
        fontWeight: 500,
        transition: "all .2s ease",
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export default function BrandThatAI() {
  const [page, setPage] = useState("home");
  const [businessType, setBusinessType] = useState("Luxury Local Business");
  const [tone, setTone] = useState("Refined");
  const [topic, setTopic] = useState("");
  const [contentType, setContentType] = useState("Instagram caption + Reel hook");
  const [caption, setCaption] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);

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

      setCaption(data.text || "No response generated.");
    } catch (error) {
      setCaption("Something went wrong connecting to AI.");
    }

    setIsGenerating(false);
  };

  const Studio = () => (
    <div
      style={{
        background: "white",
        border: "1px solid rgba(0,0,0,.10)",
        borderRadius: 32,
        padding: 30,
        boxShadow: "0 28px 70px rgba(0,0,0,.12)"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 24
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#a3a3a3",
              fontSize: 12,
              letterSpacing: ".2em",
              textTransform: "uppercase"
            }}
          >
            Premium workspace
          </p>

          <h2
            style={{
              margin: "6px 0 0",
              fontSize: 22,
              fontWeight: 500
            }}
          >
            Content Studio
          </h2>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 999,
            background: "#111",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          BT
        </div>
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        <label>
          <span>Brand category</span>

          <select
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            style={inputStyle}
          >
            {niches.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16
          }}
        >
          <label>
            <span>Voice</span>

            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              style={inputStyle}
            >
              {tones.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Output</span>

            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              style={inputStyle}
            >
              {outputs.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        </div>

        <label>
          <span>Idea</span>

          <textarea
            rows={4}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            style={{
              ...inputStyle,
              resize: "none"
            }}
          />
        </label>

        <Button
          onClick={handleGenerate}
          style={{
            width: "100%",
            background: "#111",
            color: "white",
            padding: "15px",
            borderRadius: 18
          }}
        >
          {isGenerating ? "Generating..." : "Generate"}
        </Button>

       {caption && (
  <div
    style={{
      background: "#faf9f6",
      border: "1px solid rgba(0,0,0,.08)",
      borderRadius: 24,
      padding: 24,
      color: "#171717",
      boxShadow: "0 18px 45px rgba(0,0,0,.06)"
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 18
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: "#a3a3a3",
            fontSize: 11,
            letterSpacing: ".2em",
            textTransform: "uppercase"
          }}
        >
          Brandthat AI Output
        </p>

        <h3
          style={{
            margin: "6px 0 0",
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "-.03em"
          }}
        >
          Ready-to-use content
        </h3>
      </div>

      <button
        onClick={() => navigator.clipboard.writeText(caption)}
        style={{
          border: "1px solid rgba(0,0,0,.10)",
          background: "white",
          borderRadius: 999,
          padding: "8px 13px",
          fontSize: 12,
          cursor: "pointer",
          color: "#171717"
        }}
      >
        Copy
      </button>
    </div>

    <div
      style={{
        display: "grid",
        gap: 14
      }}
    {caption &&
  caption
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((section, index) => (
          <div
            key={index}
            style={{
              background: "white",
              border: "1px solid rgba(0,0,0,.07)",
              borderRadius: 18,
              padding: 18
            }}
          >
            <p
              style={{
                whiteSpace: "pre-line",
                margin: 0,
                fontSize: 14,
                lineHeight: 1.75,
                color: "#333"
              }}
            >
              {section}
            </p>
          </div>
        ))}
    </div>
  </div>
)}
)}
  const inputStyle = {
    width: "100%",
    border: "1px solid rgba(0,0,0,.10)",
    background: "white",
    color: "#171717",
    borderRadius: 18,
    padding: "13px 15px",
    outline: "none",
    fontSize: 14
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f7f5f0",
        color: "#171717",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      }}
    >
      <nav
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "28px 6vw 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <button
          onClick={() => setPage("home")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 18,
            fontWeight: 600,
            background: "transparent",
            border: "none",
            cursor: "pointer"
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              background: "#111",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            BT
          </div>

          Brandthat AI
        </button>

        <div style={{ display: "flex", gap: 8 }}>
          <Button
            onClick={() => setPage("features")}
            style={{
              padding: "8px 13px",
              background: page === "features" ? "#111" : "transparent",
              color: page === "features" ? "white" : "#737373"
            }}
          >
            Features
          </Button>

          <Button
            onClick={() => setPage("pricing")}
            style={{
              padding: "8px 13px",
              background: page === "pricing" ? "#111" : "transparent",
              color: page === "pricing" ? "white" : "#737373"
            }}
          >
            Pricing
          </Button>

          <Button
            onClick={() => setPage("studio")}
            style={{
              padding: "8px 13px",
              background: page === "studio" ? "#111" : "transparent",
              color: page === "studio" ? "white" : "#737373"
            }}
          >
            Studio
          </Button>
        </div>
      </nav>

      <main
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "70px 6vw 84px"
        }}
      >
        {(page === "home" || page === "studio") && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 56,
              alignItems: "center"
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  background: "white",
                  border: "1px solid rgba(0,0,0,.10)",
                  borderRadius: 999,
                  padding: "9px 16px",
                  fontSize: 12,
                  color: "#737373",
                  letterSpacing: ".18em",
                  textTransform: "uppercase"
                }}
              >
                AI content studio for brands
              </div>

              <h1
                style={{
                  margin: "24px 0 0",
                  maxWidth: 620,
                  fontSize: 58,
                  lineHeight: 0.96,
                  letterSpacing: "-.055em",
                  fontWeight: 500
                }}
              >
                Modern content, made simple.
              </h1>

              <p
                style={{
                  marginTop: 22,
                  maxWidth: 520,
                  color: "#666",
                  fontSize: 18,
                  lineHeight: 1.7
                }}
              >
                Brandthat AI turns one idea into polished captions, hooks,
                ads, emails, and campaigns for any business.
              </p>
            </div>

            <Studio />
          </div>
        )}

        {page === "features" && (
          <div>
            <h1 style={{ fontSize: 56, fontWeight: 500 }}>
              Everything your brand needs.
            </h1>

            <div
              style={{
                marginTop: 40,
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 20
              }}
            >
              {[
                "AI captions",
                "Hooks",
                "Campaigns",
                "Calendars",
                "Ad copy",
                "Brand voice"
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    background: "white",
                    borderRadius: 28,
                    padding: 28
                  }}
                >
                  <h3>{item}</h3>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === "pricing" && (
          <div>
            <h1 style={{ fontSize: 56, fontWeight: 500 }}>
              Simple pricing.
            </h1>

            <div
              style={{
                marginTop: 40,
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 20
              }}
            >
              {[
                ["Starter", "$19"],
                ["Pro", "$49"],
                ["Agency", "$99"]
              ].map((plan) => (
                <div
                  key={plan[0]}
                  style={{
                    background: "white",
                    borderRadius: 28,
                    padding: 28
                  }}
                >
                  <h3>{plan[0]}</h3>

                  <div
                    style={{
                      marginTop: 18,
                      fontSize: 42,
                      fontWeight: 500
                    }}
                  >
                    {plan[1]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer
        style={{
          borderTop: "1px solid rgba(0,0,0,.10)",
          textAlign: "center",
          color: "#a3a3a3",
          padding: 34,
          fontSize: 14
        }}
      >
        © 2026 BrandThat.ai
      </footer>
    </div>
  );
}
