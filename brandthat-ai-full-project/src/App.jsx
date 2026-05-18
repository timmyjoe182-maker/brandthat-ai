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
  "Gym",
  "Marketing Agency",
  "Law Firm",
  "Travel Agency",
  "Construction Company",
  "Retail Boutique",
  "Tech Startup",
  "Event Venue",
  "Private Chef",
  "Drone Services",
  "Lifestyle Brand",
];

const voices = [
  "Refined",
  "Bold",
  "Luxury",
  "Minimal",
  "Modern",
  "Professional",
  "Playful",
  "Emotional",
  "High-End",
  "Cinematic",
  "Viral",
  "Elegant",
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
  "Luxury CTA",
];

export default function BrandThatAI() {
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
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessType,
          tone,
          topic,
          contentType,
        }),
      });

      const data = await response.json();

      setCaption(data.result || "No response generated.");
    } catch (err) {
      setCaption("Something went wrong connecting to AI.");
    }

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f3ef",
        padding: 40,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 480px",
          gap: 60,
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 3,
              marginBottom: 20,
              color: "#777",
            }}
          >
            AI CONTENT STUDIO FOR BRANDS
          </div>

          <h1
            style={{
              fontSize: 72,
              lineHeight: 1,
              marginBottom: 24,
              color: "#111",
            }}
          >
            Modern content,
            <br />
            made simple.
          </h1>

          <p
            style={{
              fontSize: 20,
              lineHeight: 1.7,
              color: "#555",
              maxWidth: 600,
            }}
          >
            Brandthat AI turns one idea into polished captions,
            hooks, campaigns, ads, and luxury brand copy.
          </p>
        </div>

        <div
          style={{
            background: "white",
            padding: 32,
            borderRadius: 30,
            boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 3,
              marginBottom: 14,
              color: "#999",
            }}
          >
            PREMIUM WORKSPACE
          </div>

          <h2
            style={{
              fontSize: 34,
              marginBottom: 28,
              color: "#111",
            }}
          >
            Content Studio
          </h2>

          <div style={{ marginBottom: 18 }}>
            <label>Brand category</label>

            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              style={selectStyle}
            >
              {niches.map((niche) => (
                <option key={niche}>{niche}</option>
              ))}
            </select>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <div>
              <label>Voice</label>

              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                style={selectStyle}
              >
                {voices.map((voice) => (
                  <option key={voice}>{voice}</option>
                ))}
              </select>
            </div>

            <div>
              <label>Output</label>

              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                style={selectStyle}
              >
                {outputs.map((output) => (
                  <option key={output}>{output}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <label>Idea</label>

            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Describe your content idea..."
              style={{
                width: "100%",
                height: 130,
                borderRadius: 18,
                border: "1px solid rgba(0,0,0,0.1)",
                padding: 18,
                marginTop: 8,
                resize: "none",
                fontSize: 15,
              }}
            />
          </div>

          <button
            onClick={handleGenerate}
            style={{
              width: "100%",
              marginTop: 22,
              background: "#111",
              color: "white",
              border: "none",
              borderRadius: 18,
              padding: 18,
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {loading ? "Generating..." : "Generate"}
          </button>

          {caption && (
            <div
              style={{
                marginTop: 26,
                background: "#fafafa",
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 22,
                padding: 24,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 3,
                  color: "#999",
                  marginBottom: 18,
                }}
              >
                AI OUTPUT
              </div>

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 15,
                  lineHeight: 1.9,
                  color: "#222",
                }}
              >
                {caption}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const selectStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.1)",
  marginTop: 8,
  fontSize: 15,
};
