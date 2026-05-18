import React, { useState } from "react";

const niches = [
  "Wedding Photographer", "Videographer", "Content Creator", "Ranch / Farm Brand", "Real Estate Agent",
  "Luxury Local Business", "Fine Dining Restaurant", "Cafe", "Fitness Coach", "Salon", "Med Spa",
  "Law Firm", "Marketing Agency", "Interior Designer", "Construction Company", "Retail Boutique",
  "E-commerce Brand", "Tech Startup", "Travel Agency", "Wedding Planner", "Event Venue",
  "Cleaning Service", "Private Chef", "Drone Services", "Lifestyle Brand"
];

const tones = ["Luxury", "Premium", "Elegant", "Refined", "Modern", "Warm", "Bold", "Simple", "Funny", "Professional"];

function Button({ children, className = "", ...props }) {
  return <button className={`btn ${className}`} {...props}>{children}</button>;
}

export default function App() {
  const [businessType, setBusinessType] = useState("Luxury Local Business");
  const [tone, setTone] = useState("Refined");
  const [topic, setTopic] = useState("A new service, product, offer, or brand moment");
  const [contentType, setContentType] = useState("Instagram caption + Reel hook");
  const [caption, setCaption] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCaption("");

    try {
      const response = await fetch("/.netlify/functions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType, tone, topic, contentType })
      });
      const data = await response.json();
      setCaption(data.text || "No response generated.");
    } catch (error) {
      console.error(error);
      setCaption("Something went wrong connecting to AI.");
    }

    setIsGenerating(false);
  };

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-bg" />
        <nav className="nav">
          <div className="brand"><div className="logo">BT</div>Brandthat AI</div>
          <div className="nav-links"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#demo">Studio</a></div>
          <Button>Start free</Button>
        </nav>

        <div className="hero-grid">
          <div>
            <div className="pill">AI content studio for brands</div>
            <h1>Modern content, made simple.</h1>
            <p className="hero-copy">Brandthat AI turns one idea into polished captions, hooks, ads, emails, and campaigns for any business.</p>
            <div className="hero-actions">
              <Button onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}>Try the studio</Button>
              <Button className="secondary" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>View plans</Button>
            </div>
          </div>

          <div id="demo" className="studio-card">
            <div className="studio-header">
              <div><p className="eyebrow">Premium workspace</p><h2>Content Studio</h2></div>
              <div className="logo studio-logo">BT</div>
            </div>

            <div className="form-grid">
              <label><span>Brand category</span><select value={businessType} onChange={(e) => setBusinessType(e.target.value)}>{niches.map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <div className="two-col">
                <label><span>Voice</span><select value={tone} onChange={(e) => setTone(e.target.value)}>{tones.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
                <label><span>Output</span><select value={contentType} onChange={(e) => setContentType(e.target.value)}><option>Instagram caption + Reel hook</option><option>Weekly content calendar</option><option>Facebook post</option><option>LinkedIn post</option><option>Email promo</option><option>Ad copy</option><option>Hashtag set</option></select></label>
              </div>
              <label><span>Idea</span><textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={4} /></label>
              <Button className="generate" onClick={handleGenerate} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate"}</Button>
              {caption && <div className="output"><p className="output-label">AI output</p><p>{caption}</p></div>}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section"><div className="wrap"><p className="eyebrow">Features</p><h2 className="section-title">Everything your brand needs to post well.</h2><div className="cards">{[["Captions","Polished posts for every platform."],["Hooks","Short lines built to stop the scroll."],["Campaigns","Turn one idea into a full content plan."]].map((feature) => <div key={feature[0]} className="card"><h3>{feature[0]}</h3><p>{feature[1]}</p></div>)}</div></div></section>

      <section id="pricing" className="section pricing"><div className="wrap"><div className="pricing-head"><p className="eyebrow">Pricing</p><h2 className="section-title">Simple plans.</h2></div><div className="cards">{[["Starter","$19",["50 generations","Captions + hooks","Saved history"]],["Pro","$49",["250 generations","Calendars","More brand types"]],["Agency","$99",["1,000 generations","Client workspaces","Campaigns"]]].map((plan) => <div key={plan[0]} className="card"><h3>{plan[0]}</h3><div className="price">{plan[1]}<span>/mo</span></div><div className="checks">{plan[2].map((item) => <div key={item}>✓ {item}</div>)}</div><Button className="choose">Choose plan</Button></div>)}</div></div></section>
      <footer>© 2026 BrandThat.ai</footer>
    </div>
  );
}
