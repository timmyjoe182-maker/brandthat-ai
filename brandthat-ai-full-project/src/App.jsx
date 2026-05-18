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

  const handleGenerate = async () => {
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
    } catch (err) {
      setCaption("Something went wrong.");
    }

    setLoading(false);
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

        <div
          style={{
            display: "flex",
            gap: 20
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
      </nav>

      {page === "home" && (
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "60px",
            display: "grid",
            gridTemplateColumns: "1fr 480px",
            gap: 60,
            alignItems: "center"
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 3,
                color: "#777",
                marginBottom: 20
              }}
            >
              AI CONTENT STUDIO FOR BRANDS
            </div>

            <h1
              style={{
                fontSize: 76,
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
                fontSize: 22,
                lineHeight: 1.7,
                color: "#555",
                maxWidth: 600
              }}
            >
              Brandthat AI turns one idea into polished captions,
              hooks, ads, emails, campaigns, and premium brand copy.
            </p>

            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 30
              }}
            >
              <button
                onClick={() => setPage("studio")}
                style={blackButton}
              >
                Try the studio
              </button>

              <button
                onClick={() => setPage("pricing")}
                style={whiteButton}
              >
                View plans
              </button>
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
          />
        </div>
      )}

      {page === "features" && (
        <PageContainer title="Features">
          <FeatureCard
            title="Premium AI Copy"
            desc="Luxury-level captions, ads, hooks, emails, and campaigns."
          />

          <FeatureCard
            title="Brand Voices"
            desc="Refined, cinematic, luxury, modern, playful, viral, and more."
          />

          <FeatureCard
            title="Business Specific"
            desc="Tailored outputs for real estate, weddings, restaurants, ranches, and more."
          />
        </PageContainer>
      )}

      {page === "pricing" && (
        <PageContainer title="Pricing">
          <PricingCard
            name="Starter"
            price="$19/mo"
            features={[
              "50 generations",
              "Instagram captions",
              "Basic AI tools"
            ]}
          />

          <PricingCard
            name="Pro"
            price="$49/mo"
            features={[
              "250 generations",
              "Campaign tools",
              "Luxury AI voices"
            ]}
          />

          <PricingCard
            name="Agency"
            price="$99/mo"
            features={[
              "Unlimited generations",
              "Client workspaces",
              "Priority AI"
            ]}
          />
        </PageContainer>
      )}

      {page === "studio" && (
        <div
          style={{
            maxWidth: 700,
            margin: "0 auto",
            padding: "60px"
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
          />
        </div>
      )}
    </div>
  );
}

function StudioCard(props) {
  return (
    <div
      style={{
        background: "white",
        padding: 32,
        borderRadius: 30,
        boxShadow: "0 10px 40px rgba(0,0,0,0.06)"
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: 3,
          color: "#999",
          marginBottom: 12
        }}
      >
        PREMIUM WORKSPACE
      </div>

      <h2
        style={{
          fontSize: 38,
          marginBottom: 24
        }}
      >
        Content Studio
      </h2>

      <label>Brand category</label>

      <select
        value={props.businessType}
        onChange={(e) => props.setBusinessType(e.target.value)}
        style={inputStyle}
      >
        {niches.map((niche) => (
          <option key={niche}>{niche}</option>
        ))}
      </select>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
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
            {voices.map((voice) => (
              <option key={voice}>{voice}</option>
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
            {outputs.map((output) => (
              <option key={output}>{output}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Idea</label>

        <textarea
          value={props.topic}
          onChange={(e) => props.setTopic(e.target.value)}
          style={{
            ...inputStyle,
            height: 120,
            resize: "none"
          }}
        />
      </div>

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
        <div
          style={{
            marginTop: 24,
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 20,
            padding: 24,
            background: "#fafafa"
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 3,
              color: "#999",
              marginBottom: 14
            }}
          >
            AI OUTPUT
          </div>

          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.9,
              fontSize: 15
            }}
          >
            {props.caption}
          </div>
        </div>
      )}
    </div>
  );
}

function PageContainer({ title, children }) {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "60px"
      }}
    >
      <h1
        style={{
          fontSize: 64,
          marginBottom: 40
        }}
      >
        {title}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 20
        }}
      >
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

      <div
        style={{
          fontSize: 42,
          fontWeight: 700,
          margin: "20px 0"
        }}
      >
        {price}
      </div>

      {features.map((feature) => (
        <div key={feature} style={{ marginBottom: 10 }}>
          ✓ {feature}
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

const inputStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.1)",
  marginTop: 8,
  fontSize: 15
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
