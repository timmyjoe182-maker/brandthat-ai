import { readFileSync, writeFileSync } from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
let source = readFileSync(appPath, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (source.includes(replacement)) return;
  if (label === "logo prefill effect" && source.includes("const brandChanged = logoPrefillBrandId !== activeBrand.id;")) return;
  if (!source.includes(needle)) throw new Error("Missing expected block for " + label);
  source = source.replace(needle, replacement);
  changed = true;
}

function insertBefore(needle, insertion, label) {
  if (source.includes(insertion.trim().slice(0, 120))) return;
  if (!source.includes(needle)) throw new Error("Missing insertion point for " + label);
  source = source.replace(needle, insertion + "\n\n" + needle);
  changed = true;
}

const identityHelpers = String.raw`
function getIdentitySourceText(brand = {}, plan = {}) {
  return [brand.name, brand.description, brand.audience, brand.logoDirection, brand.style, brand.tone, brand.launchGoal, plan.workspaceContext?.industry, plan.logoContext?.industry, plan.colorSystem, plan.typographySystem, plan.moodboardDirection, plan.visualIdentityDirection, plan.brandPersonality].filter(Boolean).join(" ").toLowerCase();
}

function getWorkspaceIndustry(brand = {}, plan = {}) {
  return plan.logoContext?.industry || plan.workspaceContext?.industry || inferSimpleIndustry((brand.name || "") + " " + (brand.description || "") + " " + (brand.style || ""));
}

function getIdentityPalette(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return [{ role: "Primary", name: "Leaf Green", hex: "#3F6F45" }, { role: "Secondary", name: "Stone Gray", hex: "#827F73" }, { role: "Background", name: "Warm Ivory", hex: "#F6F0E3" }, { role: "Accent", name: "Soft Terracotta", hex: "#B86F4B" }];
  if (/coffee|cafe|bakery|restaurant|hospitality|food/.test(text)) return [{ role: "Primary", name: "Roasted Brown", hex: "#4A2F24" }, { role: "Secondary", name: "Cream Foam", hex: "#F4E9D8" }, { role: "Background", name: "Warm Paper", hex: "#FBF7EF" }, { role: "Accent", name: "Copper Heat", hex: "#B66A3C" }];
  if (/pet|dog|grooming|walking/.test(text)) return [{ role: "Primary", name: "Trust Navy", hex: "#26364A" }, { role: "Secondary", name: "Clean Cream", hex: "#F7F1E6" }, { role: "Background", name: "Soft White", hex: "#FCFAF6" }, { role: "Accent", name: "Leash Clay", hex: "#C88462" }];
  if (/software|saas|creator|invoice|sponsorship|platform|app/.test(text)) return [{ role: "Primary", name: "Deep Ink", hex: "#15171A" }, { role: "Secondary", name: "Interface Gray", hex: "#747C86" }, { role: "Background", name: "Cloud White", hex: "#F7F8F6" }, { role: "Accent", name: "Signal Blue", hex: "#4D6BFE" }];
  return [{ role: "Primary", name: "Brand Ink", hex: "#11110F" }, { role: "Secondary", name: "Warm Stone", hex: "#837B6D" }, { role: "Background", name: "Studio Cream", hex: "#F7F1E8" }, { role: "Accent", name: "Clay Accent", hex: "#AA6A45" }];
}

function hexToRgb(hex = "") {
  const clean = String(hex || "").replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return { r: 17, g: 17, b: 17 };
  return { r: parseInt(clean.slice(0, 2), 16), g: parseInt(clean.slice(2, 4), 16), b: parseInt(clean.slice(4, 6), 16) };
}

function getContrastTextColor(hex = "") {
  const rgb = hexToRgb(hex);
  return ((0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255) > 0.62 ? "#11110F" : "#FFFDF8";
}

function getRgbLabel(hex = "") {
  const rgb = hexToRgb(hex);
  return "RGB " + rgb.r + ", " + rgb.g + ", " + rgb.b;
}

function getIdentityTypography(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return { headline: "Fraunces or Cormorant Garamond", supporting: "Inter or Source Sans 3", wordmark: "Warm botanical serif", source: "Google Fonts / open-source font licenses", note: "A soft serif gives the wordmark a living, botanical quality while the humanist sans keeps care cards, captions, and subscription details easy to read." };
  return { ...getTypographyPairing({ style: (brand.style || "") + " " + (brand.tone || "") + " " + (plan.brandPersonality || ""), industry: getWorkspaceIndustry(brand, plan), typography: plan.typographySystem || brand.logoDirection || "" }), source: "Google Fonts alternatives / confirm license before final use" };
}

function getMoodboardTiles(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return [["Window-light apartment greenery", "Bright compact rooms, shelves, and entryways with practical greenery."], ["Local delivery moment", "Hands, kraft care cards, doorstep handoff, and calm packaging materials."], ["Beginner confidence", "Simple labels, clear instructions, resilient plant varieties, and no intimidating gardening language."], ["Avoid", "Generic wellness leaves, technology symbols, health claims, and over-polished greenhouse imagery."]];
  if (/pet|dog|grooming|walking/.test(text)) return [["Neighborhood trust", "Real homes, clean service details, friendly arrival moments, and calm pet handling."], ["Care cues", "Soft towels, tidy tools, appointment reminders, and warm human photography."], ["Family convenience", "Busy entryways, personal service, clear scheduling, and reliable local proof."], ["Avoid", "Cartoon paws, veterinary claims, generic pet-store colors, and chaotic grooming scenes."]];
  if (/software|saas|creator|invoice|sponsorship|platform|app/.test(text)) return [["Calm operator workspace", "Clean interface crops, organized cards, clear task states, and creator desk context."], ["Deal clarity", "Invoices, deliverables, timelines, and status moments shown as simple systems."], ["Founder credibility", "Sharp UI typography, restrained color, and lightweight product proof."], ["Avoid", "Abstract AI art, random code screens, fake metrics, and neon technology cliches."]];
  return [["Real customer context", "Show the brand in the moment where the customer understands why it matters."], ["Material proof", "Use product, service, texture, environment, or process details instead of decorative art."], ["Launch-ready system", "Show social, packaging, web, and workspace assets sharing one visual language."], ["Avoid", "Generic stock photos, random gradients, weak icons, and unrelated mockups."]];
}

function getLogoRecommendations(brand = {}, plan = {}) {
  const text = getIdentitySourceText(brand, plan);
  if (/houseplant|plant delivery|botanical|greenery/.test(text)) return { markType: ["Icon + wordmark"], brandFeel: ["Friendly", "Minimal"], useCases: ["Website header", "Instagram profile", "Packaging"], qualityTargets: ["Readable at small size", "Distinct silhouette", "Print-ready", "No generic symbols"], symbolDirection: "Subtle stone-and-leaf symbol or grounded botanical mark, restrained enough for a profile avatar." };
  if (/software|saas|creator|invoice|sponsorship|platform|app/.test(text)) return { markType: ["Wordmark", "Icon + wordmark"], brandFeel: ["Minimal", "Tech-forward"], useCases: ["Website header", "App icon", "Social avatar"], qualityTargets: ["Readable at small size", "Distinct silhouette", "No generic symbols"], symbolDirection: "A simple signal, workflow, or status mark that reads cleanly in product UI." };
  return { markType: ["Icon + wordmark"], brandFeel: ["Premium", "Minimal"], useCases: ["Website header", "Instagram profile", "Business cards"], qualityTargets: ["Readable at small size", "Distinct silhouette", "Print-ready", "No generic symbols"], symbolDirection: "A simple meaning-led symbol tied to the brand promise, not a generic category icon." };
}

function buildWorkspaceLogoBrief(brand = {}, plan = {}) {
  if (!brand?.name) return "";
  const industry = getWorkspaceIndustry(brand, plan);
  const palette = getIdentityPalette(brand, plan);
  const type = getIdentityTypography(brand, plan);
  const recs = getLogoRecommendations(brand, plan);
  const colors = palette.map((item) => item.name.toLowerCase()).join(", ");
  const personality = [brand.tone, plan.brandPersonality, brand.style].filter(Boolean).join(", ") || "clear, useful, and premium";
  const thesis = plan.brandThesis || plan.positioning || brand.differentiator || brand.description || "";
  const description = brand.description || "a " + industry + " brand";
  return "Create a strategy-backed identity for " + brand.name + ", " + description + ". Use " + (type.wordmark || type.headline) + " with " + recs.symbolDirection + " Use " + colors + ". The mark should feel " + personality + " and stay readable at small sizes. Audience: " + (brand.audience || plan.targetAudience || "the target customer inferred from the brand workspace") + ". Positioning: " + thesis + ". Avoid generic category symbols, unrelated technology cues, misspelled brand text, unsupported claims, and tiny decorative details.";
}
`;
insertBefore("function createMiniBrandAssetSvg", identityHelpers, "identity helpers");

replaceOnce("      brandStrategy: getBrandStrategyContextForLogo(),\n      logoPrompt: enhancedLogoPrompt", "      brandStrategy: getBrandStrategyContextForLogo(),\n      conceptCount: 3,\n      logoPrompt: enhancedLogoPrompt", "logo concept count");
replaceOnce("- Generate a polished logo concept suitable for a real business.", "- Generate three meaningfully different logo directions: 1. wordmark-led, 2. symbol plus wordmark, 3. compact avatar or badge.\n- Each direction must include rationale, black/white usage logic, square/avatar usage, horizontal usage, and small-size readability guidance.\n- Generate a polished logo concept suitable for a real business.", "logo generation requirements");

replaceOnce(String.raw`    setActiveToolKey(nextTool.key);
    setSelectedPlatform("");
    setCreativeTone("");
    setLogoIndustry("");
    setLogoSymbol("");
    setLogoColors("");
    setLogoAvoid("");
    setPrompt("");`, String.raw`    setActiveToolKey(nextTool.key);
    const activePlanForLogo = activeBrand ? getWorkspacePlan(activeBrand) : {};
    const logoDefaults = activeBrand ? getLogoRecommendations(activeBrand, activePlanForLogo) : null;
    const logoPalette = activeBrand ? getIdentityPalette(activeBrand, activePlanForLogo) : [];
    setSelectedPlatform(nextTool.key === "logo" && activeBrand ? logoDefaults.brandFeel.join(", ") : "");
    setCreativeTone(nextTool.key === "logo" && activeBrand ? activeBrand.name || "" : "");
    setLogoIndustry(nextTool.key === "logo" && activeBrand ? getWorkspaceIndustry(activeBrand, activePlanForLogo) : "");
    setLogoSymbol(nextTool.key === "logo" && activeBrand ? logoDefaults.symbolDirection : "");
    setLogoColors(nextTool.key === "logo" && activeBrand ? logoPalette.map((item) => item.name + " " + item.hex).join(", ") : "");
    setLogoAvoid(nextTool.key === "logo" && activeBrand ? "generic wellness leaves, unrelated technology symbols, misspelled text, tiny decorative details" : "");
    setPrompt(nextTool.key === "logo" && activeBrand ? buildWorkspaceLogoBrief(activeBrand, activePlanForLogo) : "");`, "brand-aware select tool");

const workspaceIdentityNeedle = String.raw`function WorkspaceIdentity({ brand, setPage, navigateWorkspaceSection, selectTool }) {
  if (!brand) return <WorkspaceEmptyState navigateWorkspaceSection={navigateWorkspaceSection} />;
  const plan = getWorkspacePlan(brand);
  const savedLogos = (brand.saved?.logos || []).filter((item) => item.image).slice(0, 6);
  return (
    <section className="appContentSection">
      <div className="tinyTag">VISUAL IDENTITY</div>
      <h1 className="pageTitle">{brand.name} identity direction.</h1>
      <div className="identityOverviewGrid">
        <div className="appPanel wide">
          <span>Logo Direction</span>
          <p>{brand.logoDirection || plan.logoDirection || "Generate logo concepts once the strategy and visual direction feel right."}</p>
          <button onClick={() => selectTool("logo")}>Generate Logo Concepts</button>
        </div>
        <div className="appPanel"><span>Colors</span><p>{plan.colorSystem || brand.style || "Color direction is not set yet."}</p></div>
        <div className="appPanel"><span>Typography</span><p>{plan.typographySystem || "Typography direction is not set yet."}</p></div>
        <div className="appPanel"><span>Moodboard</span><p>{plan.moodboardDirection || brand.style || "Moodboard direction is not set yet."}</p></div>
        <div className="appPanel wide"><span>Visual Direction</span><p>{plan.visualIdentityDirection || plan.moodboardDirection || brand.style || "Add visual direction in the brand basics or regenerate the brand plan."}</p></div>
      </div>
      {savedLogos.length > 0 && (
        <div className="identityLogoStrip">
          {savedLogos.map((logo) => <img key={logo.id} src={logo.image} alt={logo.title || "Saved logo concept"} />)}
        </div>
      )}
    </section>
  );
}`;
const workspaceIdentityReplacement = String.raw`function WorkspaceIdentity({ brand, setPage, navigateWorkspaceSection, selectTool }) {
  if (!brand) return <WorkspaceEmptyState navigateWorkspaceSection={navigateWorkspaceSection} />;
  const plan = getWorkspacePlan(brand);
  const savedLogos = (brand.saved?.logos || []).filter((item) => item.image).slice(0, 6);
  const palette = getIdentityPalette(brand, plan);
  const typography = getIdentityTypography(brand, plan);
  const moodboard = getMoodboardTiles(brand, plan);
  const logoDefaults = getLogoRecommendations(brand, plan);
  const logoBrief = buildWorkspaceLogoBrief(brand, plan);
  return (
    <section className="appContentSection">
      <div className="tinyTag">VISUAL IDENTITY</div>
      <h1 className="pageTitle">{brand.name} identity direction.</h1>
      <p className="pageLead">Your logo, palette, typography, moodboard, and saved concepts all come from the active Brand Workspace context.</p>
      <div className="visualIdentityBoard">
        <div className="identityBoardHero"><div className="identityPrimaryMark">{brand.logoImage ? <img src={brand.logoImage} alt={(brand.name || "Brand") + " primary logo"} /> : <span>{getInitialsFromBrandName(brand.name)}</span>}</div><div><span>Logo Direction</span><h2>{brand.logoImage ? "Primary logo selected" : "Ready for logo concepts"}</h2><p>{brand.logoDirection || plan.logoDirection || logoDefaults.symbolDirection}</p><button className="btn dark" onClick={() => selectTool("logo")}>Generate Logo Concepts</button></div></div>
        <div className="identityPalettePanel"><div className="appCardHeader"><div><span>Color Palette</span><h2>Editable starting system.</h2></div></div><div className="identityPaletteGrid">{palette.map((color) => <div className="identitySwatchCard" key={color.name}><div className="identitySwatch" style={{ background: color.hex, color: getContrastTextColor(color.hex) }}><strong>{color.role}</strong></div><b>{color.name}</b><span>{color.hex}</span><small>{getRgbLabel(color.hex)}</small><button onClick={() => navigator.clipboard?.writeText(color.hex)}>Copy HEX</button></div>)}</div><p className="identityRationale">{plan.colorSystem || "Palette generated from the brand category, personality, and visual direction. Check contrast before final production use."}</p></div>
        <div className="identityTypePanel"><span>Typography</span><div className="typeSpecimen headlineSpecimen">{brand.name}</div><p className="bodySpecimen">{brand.description || plan.brandThesis}</p><div className="typePairingGrid"><div><strong>Headline / Wordmark</strong><span>{typography.headline}</span></div><div><strong>Body / UI</strong><span>{typography.supporting}</span></div><div><strong>Source</strong><span>{typography.source}</span></div></div><p>{plan.typographySystem || typography.note}</p></div>
        <div className="identityMoodboardPanel"><span>Moodboard Direction</span><div className="moodboardTileGrid">{moodboard.map(([title, copy]) => <article key={title}><strong>{title}</strong><p>{copy}</p></article>)}</div><p>{plan.moodboardDirection || brand.style || "Use these as honest direction tiles until custom photography or generated references are supplied."}</p></div>
        <div className="identityLogoSpecPanel"><span>Logo System</span><div className="logoSpecGrid"><div><strong>Mark type</strong><p>{logoDefaults.markType.join(", ")}</p></div><div><strong>Brand feel</strong><p>{logoDefaults.brandFeel.join(", ")}</p></div><div><strong>Use cases</strong><p>{logoDefaults.useCases.join(", ")}</p></div><div><strong>Quality target</strong><p>{logoDefaults.qualityTargets.join(", ")}</p></div></div><details><summary>Logo brief generated from this workspace</summary><p>{logoBrief}</p></details></div>
      </div>
      {savedLogos.length > 0 && <div className="identityLogoStrip">{savedLogos.map((logo) => <img key={logo.id} src={logo.image} alt={logo.title || "Saved logo concept"} />)}</div>}
    </section>
  );
}`;
replaceOnce(workspaceIdentityNeedle, workspaceIdentityReplacement, "visual identity board");

replaceOnce(`  const [logoExampleIndex, setLogoExampleIndex] = useState(0);`, `  const [logoExampleIndex, setLogoExampleIndex] = useState(0);\n  const [logoPrefillBrandId, setLogoPrefillBrandId] = useState("");\n  const logoWorkspacePlan = activeBrand ? getWorkspacePlan(activeBrand) : {};\n  const logoWorkspaceBrief = activeBrand ? buildWorkspaceLogoBrief(activeBrand, logoWorkspacePlan) : "";\n  const logoWorkspaceDefaults = activeBrand ? getLogoRecommendations(activeBrand, logoWorkspacePlan) : null;\n  const logoWorkspacePalette = activeBrand ? getIdentityPalette(activeBrand, logoWorkspacePlan) : [];\n  const recommendedLogoOptions = activeBrand && logoWorkspaceDefaults ? { "Mark Type": logoWorkspaceDefaults.markType, "Brand Feel": logoWorkspaceDefaults.brandFeel, "Use Case": logoWorkspaceDefaults.useCases, "Quality Target": logoWorkspaceDefaults.qualityTargets } : {};`, "logo workspace state");
replaceOnce(`  const logoPromptPlaceholder = activeTool.key === "logo"\n    ? premiumLogoPromptExamples[logoExampleIndex % premiumLogoPromptExamples.length]\n    : getMainPromptPlaceholder(activeTool);`, `  const logoPromptPlaceholder = activeTool.key === "logo"\n    ? logoWorkspaceBrief || "Describe the logo direction, brand name, audience, mood, symbols, colors, and where the logo must work."\n    : getMainPromptPlaceholder(activeTool);`, "logo placeholder");
replaceOnce(String.raw`  useEffect(() => {
    if (activeTool.key !== "logo") return undefined;
    const timer = window.setInterval(() => {
      setLogoExampleIndex((index) => (index + 1) % premiumLogoPromptExamples.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [activeTool.key]);`, String.raw`  useEffect(() => {
    if (activeTool.key !== "logo" || !activeBrand?.id) return;
    const promptLooksStale = !String(prompt || "").trim() || /Northline Goods|carry goods/i.test(prompt);
    if (!promptLooksStale && logoPrefillBrandId === activeBrand.id) return;
    if (promptLooksStale) setPrompt(logoWorkspaceBrief);
    if (!creativeTone || /Northline Goods/i.test(creativeTone)) setCreativeTone(activeBrand.name || "");
    if (!selectedPlatform || /carry goods|Northline/i.test(selectedPlatform)) setSelectedPlatform(logoWorkspaceDefaults?.brandFeel?.join(", ") || activeBrand.tone || "");
    if (!logoIndustry || /carry goods|Northline/i.test(logoIndustry)) setLogoIndustry(getWorkspaceIndustry(activeBrand, logoWorkspacePlan));
    if (!logoSymbol || /Northline|N mark/i.test(logoSymbol)) setLogoSymbol(logoWorkspaceDefaults?.symbolDirection || activeBrand.logoDirection || "");
    if (!logoColors || /black and warm-neutral|Northline/i.test(logoColors)) setLogoColors(logoWorkspacePalette.map((item) => item.name + " " + item.hex).join(", "));
    if (!logoAvoid) setLogoAvoid("misspelled brand name, generic category symbols, unrelated technology cues, tiny decorative details, unsupported claims");
    setLogoPrefillBrandId(activeBrand.id);
  }, [activeTool.key, activeBrand?.id, logoWorkspaceBrief]);`, "logo prefill effect");
replaceOnce(String.raw`            <div className="logoGuideGrid">
              {logoBriefSections.map(([label, options]) => (
                <div className="logoGuideColumn" key={label}>
                  <strong>{label}</strong>
                  <div>
                    {options.map((option) => (
                      <button key={option} onClick={() => addLogoSuggestion(option)}>{option}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>`, String.raw`            {activeBrand && <div className="recommendedFromStrategy">Recommended from your Brand Strategy</div>}
            <div className="logoGuideGrid">
              {logoBriefSections.map(([label, options]) => (
                <div className="logoGuideColumn" key={label}>
                  <strong>{label}</strong>
                  <div>{options.map((option) => { const selected = (recommendedLogoOptions[label] || []).includes(option); return <button key={option} className={selected ? "selectedLogoOption" : ""} aria-pressed={selected} onClick={() => addLogoSuggestion(option)}>{option}</button>; })}</div>
                </div>
              ))}
            </div>`, "recommended logo options");
replaceOnce(`<textarea\n            className="mainPromptBox logoPromptFirstBox"\n            placeholder={logoPromptPlaceholder}\n            value={prompt}\n            onChange={(e) => setPrompt(e.target.value)}\n          />`, `<label className="logoBriefLabel"><span>Editable logo brief</span><textarea\n            className="mainPromptBox logoPromptFirstBox"\n            placeholder={logoPromptPlaceholder}\n            value={prompt}\n            onChange={(e) => setPrompt(e.target.value)}\n          /></label>`, "logo brief label");
replaceOnce(`<button onClick={saveCurrentOutput}>Save Output</button>\n                  <button onClick={setLogoAsBrandProfile}>Set as Brand Logo</button>`, `<button onClick={saveCurrentOutput} disabled={currentOutputSaved}>{currentOutputSaved ? "Saved to " + (activeBrand?.name || "Workspace") + " ✓" : "Save Concept"}</button>\n                  <button onClick={() => saveGeneratedAsset({ favorite: true, titleOverride: "Favorite Logo Concept • " + new Date().toLocaleDateString() })}>Favorite</button>\n                  <button onClick={setLogoAsBrandProfile}>Set as Primary Logo</button>`, "logo actions");
replaceOnce(`                <span>Preparing brand prompt</span>\n                <span>Designing logo concept</span>\n                <span>Finalizing image</span>`, `                <span>Preparing brand prompt</span>\n                <span>Creating three logo directions</span>\n                <span>Finalizing logo previews</span>`, "logo loading copy");
replaceOnce(`    return "Example: Make me a premium black and warm-neutral logo for a carry goods brand called Northline Goods with a clean N mark.";`, `    return "Describe the logo direction, brand name, audience, mood, symbols, colors, and where the logo must work.";`, "neutral logo placeholder");

const cssMarker = `.identityBoard{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:12px}`;
const cssInsertion = `.visualIdentityBoard{display:grid;gap:18px;margin-top:22px}.identityBoardHero,.identityPalettePanel,.identityTypePanel,.identityMoodboardPanel,.identityLogoSpecPanel{background:#11110f;color:#fffdf8;border-radius:24px;padding:24px;border:1px solid rgba(255,255,255,.08)}.identityBoardHero{display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:center}.identityPrimaryMark{aspect-ratio:1;border-radius:22px;background:#fffdf8;color:#11110f;display:flex;align-items:center;justify-content:center;font-size:48px;font-weight:950;overflow:hidden}.identityPrimaryMark img{width:100%;height:100%;object-fit:contain;padding:16px}.identityPaletteGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.identitySwatchCard{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:12px}.identitySwatch{height:112px;border-radius:12px;padding:12px;display:flex;align-items:flex-end}.identitySwatchCard b,.identitySwatchCard span,.identitySwatchCard small{display:block;margin-top:8px}.identitySwatchCard button,.identityLogoSpecPanel button{margin-top:10px;border:1px solid rgba(255,255,255,.18);background:#fffdf8;color:#11110f;border-radius:999px;padding:8px 10px;font-weight:850}.identityTypePanel .typeSpecimen{font-size:52px;letter-spacing:-.05em;line-height:.95;margin:14px 0}.bodySpecimen{font-size:18px;color:rgba(255,255,255,.72)}.typePairingGrid,.logoSpecGrid,.moodboardTileGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}.typePairingGrid div,.logoSpecGrid div,.moodboardTileGrid article{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:14px}.recommendedFromStrategy{display:inline-flex;margin-bottom:12px;border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900;color:#fff;background:rgba(255,255,255,.08)}.logoGuideColumn button.selectedLogoOption{background:#fffdf8;color:#11110f;box-shadow:0 0 0 2px rgba(255,255,255,.32)}.logoBriefLabel span{display:block;margin:0 0 8px 6px;font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#444}@media(max-width:820px){.identityBoardHero,.identityPaletteGrid,.typePairingGrid,.logoSpecGrid,.moodboardTileGrid{grid-template-columns:1fr}.identityPrimaryMark{width:150px}.identityTypePanel .typeSpecimen{font-size:40px}}`;
if (!source.includes(".visualIdentityBoard{")) {
  if (!source.includes(cssMarker)) throw new Error("Missing insertion point for visual identity css");
  source = source.replace(cssMarker, cssMarker + cssInsertion);
  changed = true;
}

if (changed) {
  writeFileSync(appPath, source);
  console.log("Applied BrandThat logo identity fixes.");
} else {
  console.log("BrandThat logo identity fixes already applied.");
}
