import { readFileSync, writeFileSync } from "node:fs";

const appPath = new URL("../src/App.jsx", import.meta.url);
let source = readFileSync(appPath, "utf8");
let changed = false;

const block = (lines) => lines.join("\n");
const pattern = (value) => String(value).replaceAll("\\n", "\n");

function replaceOnce(needle, replacement, label) {
  needle = pattern(needle);
  replacement = pattern(replacement);
  if (source.includes(replacement)) return;
  if (!source.includes(needle)) throw new Error(`Missing expected block for ${label}`);
  source = source.replace(needle, replacement);
  changed = true;
}

function replaceBetween(startNeedle, endNeedle, replacement, label) {
  startNeedle = pattern(startNeedle);
  endNeedle = pattern(endNeedle);
  replacement = pattern(replacement);
  if (source.includes(replacement.trim().slice(0, 180))) return;
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error(`Missing expected start block for ${label}`);
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error(`Missing expected end block for ${label}`);
  source = source.slice(0, start) + replacement + source.slice(end);
  changed = true;
}

replaceOnce(
  `{ key: "logo", completeLabel: "Logo saved", missingLabel: "Logo missing", complete: hasSaved("logos") || Boolean(brand?.logoImage), action: "Generate Logo Concepts", tool: "logo" },`,
  `{ key: "logo", completeLabel: "Primary logo set", missingLabel: "Logo missing", complete: Boolean(brand?.logoImage), action: "Generate Logo Concepts", tool: "logo" },`,
  "primary logo completion criterion"
);

replaceOnce(
  `              logoImage: activeTool.key === "logo" && logoImage ? logoImage : brand.logoImage,`,
  `              logoImage: brand.logoImage,`,
  "saving a logo concept must not set primary implicitly"
);

const saveBlockReplacement = block([
  `  const saveCurrentOutput = async () => saveGeneratedAsset({ collection: activeTool.key !== "logo" });`,
  ``,
  `  const saveCurrentLogoConcept = async ({ favorite = false, titleOverride = "" } = {}) => {`,
  `    if (!logoImage) {`,
  `      notify("error", "Generate a logo first", "Once a concept appears, you can save it to this brand workspace.");`,
  `      return null;`,
  `    }`,
  ``,
  `    const title = titleOverride || "Logo Concept • " + new Date().toLocaleDateString();`,
  `    return saveGeneratedAsset({`,
  `      imageOverride: logoImage,`,
  `      contentOverride: result || "Logo concept generated from the active Brand Workspace.",`,
  `      titleOverride: title,`,
  `      collection: false,`,
  `      favorite,`,
  `    });`,
  `  };`,
  ``,
  `  const setLogoAsBrandProfile = async () => {`,
  `    const session = await requireMembershipOrTrial("workspace");`,
  `    if (!session) return;`,
  ``,
  `    if (!activeBrand) {`,
  `      notify("error", "Create a Brand Workspace first", "Then you can set a saved logo concept as the brand profile image.");`,
  `      return;`,
  `    }`,
  ``,
  `    if (!logoImage) {`,
  `      notify("error", "Generate a logo first", "Once a logo appears, save it and set it as the primary logo.");`,
  `      return;`,
  `    }`,
  ``,
  `    const savedEntry = await saveCurrentLogoConcept({ titleOverride: "Primary Logo Concept • " + new Date().toLocaleDateString() });`,
  `    if (!savedEntry?.id && !savedEntry?.image) return;`,
  ``,
  `    const durableLogoImage = savedEntry?.image || logoImage;`,
  ``,
  `    try {`,
  `      const { error } = await supabase`,
  `        .from("brand_workspaces")`,
  `        .update({ logo_image_url: durableLogoImage, updated_at: new Date().toISOString() })`,
  `        .eq("id", activeBrand.id)`,
  `        .eq("user_id", session.user.id);`,
  ``,
  `      if (error) throw error;`,
  `    } catch (error) {`,
  `      console.error("BrandThat primary logo save failed", {`,
  `        workspaceId: activeBrand.id,`,
  `        code: error?.code || "",`,
  `        message: error?.message || "Unknown Supabase workspace update error",`,
  `      });`,
  `      notify("error", "Primary logo was not updated", "The concept is still available. Try setting it as primary again.");`,
  `      return;`,
  `    }`,
  ``,
  `    setBrandWorkspaces((prev) =>`,
  `      prev.map((brand) =>`,
  `        brand.id === activeBrand.id`,
  `          ? { ...brand, logoImage: durableLogoImage }`,
  `          : brand`,
  `      )`,
  `    );`,
  ``,
  `    notify("success", "Primary logo updated", activeBrand.name + " now uses this saved concept as its primary logo.");`,
  `    trackBrandthatEvent("brand_logo_set", { source: "saved_generation", savedAssetId: savedEntry?.id || "existing" });`,
  `    return savedEntry;`,
  `  };`,
  ``,
]);

replaceBetween(
  `  const saveCurrentOutput = async () => saveGeneratedAsset({ collection: activeTool.key !== "logo" });`,
  `  const setSavedLogoAsBrandProfile = async (entry) => {`,
  saveBlockReplacement,
  "durable logo save and primary handler"
);

replaceOnce(
  block([`  setLogoAsBrandProfile,`, `  onStartWorkspace = () => {},`]),
  block([`  setLogoAsBrandProfile,`, `  saveCurrentLogoConcept = () => {},`, `  onStartWorkspace = () => {},`]),
  "GeneratorCard accepts saveCurrentLogoConcept"
);

replaceOnce(
  block([`            saveCurrentOutput={saveCurrentOutput}`, `            saveGeneratedAsset={saveGeneratedAsset}`, `            setLogoAsBrandProfile={setLogoAsBrandProfile}`]),
  block([`            saveCurrentOutput={saveCurrentOutput}`, `            saveGeneratedAsset={saveGeneratedAsset}`, `            setLogoAsBrandProfile={setLogoAsBrandProfile}`, `            saveCurrentLogoConcept={saveCurrentLogoConcept}`]),
  "primary GeneratorCard receives logo save helper"
);

replaceOnce(
  block([`              saveCurrentOutput={saveCurrentOutput}`, `              saveGeneratedAsset={saveGeneratedAsset}`, `              setLogoAsBrandProfile={setLogoAsBrandProfile}`]),
  block([`              saveCurrentOutput={saveCurrentOutput}`, `              saveGeneratedAsset={saveGeneratedAsset}`, `              setLogoAsBrandProfile={setLogoAsBrandProfile}`, `              saveCurrentLogoConcept={saveCurrentLogoConcept}`]),
  "route GeneratorCard receives logo save helper"
);

replaceOnce(
  `  const currentOutputSaved = activeTool.key === "logo" ? isAssetSaved("", logoImage) : isAssetSaved(stripLogoProjectMetadata(result));`,
  block([
    `  const currentOutputSaved = activeTool.key === "logo" ? isAssetSaved("", logoImage) : isAssetSaved(stripLogoProjectMetadata(result));`,
    `  const logoSaveInProgress = savingResultKey === "logo-current";`,
    `  const saveLogoConceptFromResult = async (options = {}) => {`,
    `    if (logoSaveInProgress) return null;`,
    `    setSavingResultKey("logo-current");`,
    `    try {`,
    `      return await saveCurrentLogoConcept(options);`,
    `    } finally {`,
    `      setSavingResultKey("");`,
    `    }`,
    `  };`,
  ]),
  "logo result save loading handler"
);

replaceBetween(
  block([`              <div className="logoActionStack">`, `                <button className="downloadLink" onClick={downloadLogoImage}>Download Logo</button>`]),
  block([`                <button onClick={() => {`, `                  const continuityPrompt =`]),
  block([
    `              <div className="logoActionStack">`,
    `                <button onClick={() => saveLogoConceptFromResult()} disabled={logoSaveInProgress || currentOutputSaved}>`,
    `                  {logoSaveInProgress ? "Saving..." : currentOutputSaved ? "Saved to " + (activeBrand?.name || "Workspace") + " ✓" : "Save Logo Concept"}`,
    `                </button>`,
    `                <button onClick={setLogoAsBrandProfile} disabled={logoSaveInProgress}>Set as Primary Logo</button>`,
    `                <button className="downloadLink" onClick={downloadLogoImage}>Download Preview</button>`,
    `                <button onClick={() => document.querySelector(".logoRefinePanel textarea")?.focus()}>Refine</button>`,
    `                <button onClick={onBuildGrowthRoadmap}>Build Roadmap</button>`,
    `                <details className="logoMoreActions">`,
    `                  <summary>More</summary>`,
    `                  <button onClick={openLogoImage}>Open Full Size</button>`,
    `                  {editableLogo && <button onClick={() => downloadGeneratedImage(editableLogo, editorFileName + "-vector")}>Download SVG</button>}`,
    `                  {editableTransparentLogo && <button onClick={() => downloadTransparentPng(editableTransparentLogo, editorFileName)}>Transparent PNG</button>}`,
    `                  <button onClick={() => saveLogoConceptFromResult({ favorite: true, titleOverride: "Favorite Logo Concept • " + new Date().toLocaleDateString() })}>Favorite</button>`,
    `                </details>`,
  ]),
  "explicit logo result actions"
);

replaceOnce(
  `            onStartWorkspace={onStartWorkspace}`,
  `            onStartWorkspace={saveLogoConceptFromResult}`,
  "BrandJourneyPanel saves the generated logo concept"
);

replaceBetween(
  block([`  const steps = [`, `    ["Strategy", strategy.positioning || "Brand direction created"],`]),
  block([`  return (`, `    <section className="brandJourneyPanel">`]),
  block([
    `  const steps = [`,
    `    ["Concept", "Generated on this screen"],`,
    `    ["Save", "Use Save Logo Concept to add it to Saved Assets"],`,
    `    ["Primary", "Set as Primary Logo when it should represent the workspace"],`,
    `    ["Roadmap", "Next step: turn this identity into launch content"],`,
    `  ];`,
    `  const saveLabel = !isLoggedIn`,
    `    ? "Create Account to Keep It"`,
    `    : canSaveProject`,
    `      ? "Save Logo Concept"`,
    `      : "Start Membership to Save";`,
    `  const ownershipCopy = !isLoggedIn`,
    `    ? "This concept is only on this screen right now. Create an account to keep logo concepts, strategy, and roadmap work together."`,
    `    : canSaveProject`,
    `      ? "Save the generated logo concept first. Then set it as primary when you want it to count toward this brand workspace."`,
    `      : "Start the $9.99/month membership to keep saving, refining, exporting, and building this brand.";`,
    ``,
  ]),
  "logo journey status language"
);

replaceOnce(`<span>{isLoggedIn ? "Workspace ready" : "Unsaved project"}</span>`, `<span>{isLoggedIn ? "Concept generated" : "Unsaved concept"}</span>`, "logo journey status badge");
replaceOnce(`<div className="tinyTag">KEEP YOUR PROJECT</div>`, `<div className="tinyTag">LOGO STATUS</div>`, "logo journey label");

replaceOnce(
  block([
    `function buildLightweightBrandKit({ parsedLogo = {}, logoEditor = {}, logoCreativeBrief = {}, logoImage = "" }) {`,
    `  const brandName = parsedLogo.brandName || logoCreativeBrief?.brandName || "Brand";`,
    `  const initials = getInitialsFromBrandName(brandName);`,
    `  const palette = getPaletteFromLogoContext(parsedLogo, logoEditor, logoCreativeBrief);`,
    `  const typography = getTypographyPairing(parsedLogo);`,
  ]),
  block([
    `function buildLightweightBrandKit({ parsedLogo = {}, logoEditor = {}, logoCreativeBrief = {}, logoImage = "", activeBrand = null, workspacePlan = {} }) {`,
    `  const brandName = activeBrand?.name || parsedLogo.brandName || logoCreativeBrief?.brandName || "Brand";`,
    `  const initials = getInitialsFromBrandName(brandName);`,
    `  const identityPalette = activeBrand ? getIdentityPalette(activeBrand, workspacePlan) : [];`,
    `  const palette = identityPalette.length >= 2`,
    `    ? { primary: identityPalette.slice(0, 3).map((color) => color.hex), secondary: identityPalette.slice(2, 4).map((color) => color.hex) }`,
    `    : getPaletteFromLogoContext(parsedLogo, logoEditor, logoCreativeBrief);`,
    `  const typography = activeBrand ? getIdentityTypography(activeBrand, workspacePlan) : getTypographyPairing(parsedLogo);`,
  ]),
  "brand kit uses workspace identity"
);

replaceOnce(
  block([`      parsedLogo: parsedLogoPreview,`, `      logoEditor,`, `      logoCreativeBrief,`, `      logoImage,`]),
  block([`      parsedLogo: parsedLogoPreview,`, `      logoEditor,`, `      logoCreativeBrief,`, `      logoImage,`, `      activeBrand,`, `      workspacePlan: logoWorkspacePlan,`]),
  "pass workspace identity to logo kit"
);

replaceOnce(
  `    [logoCreativeBrief, parsedLogoPreview, logoEditor, logoImage]`,
  `    [logoCreativeBrief, parsedLogoPreview, logoEditor, logoImage, activeBrand, logoWorkspacePlan]`,
  "brand kit memo dependencies"
);

replaceOnce(
  block([`              rememberRejectedLogoDirection={rememberRejectedLogoDirection}`, `              generate={generate}`, `            />`]),
  block([`              rememberRejectedLogoDirection={rememberRejectedLogoDirection}`, `              generate={generate}`, `              workspaceLogoContext={structuredLogoContext}`, `            />`]),
  "pass structured context to Creative Director"
);

replaceOnce(
  block([`  rememberRejectedLogoDirection,`, `  generate,`, `}) {`]),
  block([`  rememberRejectedLogoDirection,`, `  generate,`, `  workspaceLogoContext = null,`, `}) {`]),
  "Creative Director accepts structured context"
);

replaceOnce(
  block([
    `      {creativeBrief && (`,
    `        <p className="creativeDirectorSummary">`,
    `          Brand: {creativeBrief.brandName}. Audience: {creativeBrief.targetAudience}. Visual territory: {creativeBrief.visualTerritory}.`,
    `        </p>`,
    `      )}`,
  ]),
  block([
    `      {creativeBrief && (() => {`,
    `        const summaryParts = [`,
    `          ["Brand", workspaceLogoContext?.brandName || creativeBrief.brandName],`,
    `          ["Audience", workspaceLogoContext?.audience || creativeBrief.targetAudience],`,
    `          ["Visual territory", workspaceLogoContext?.symbol || creativeBrief.visualTerritory],`,
    `        ].filter(([, value]) => String(value || "").trim());`,
    `        if (!summaryParts.length) return null;`,
    `        return <p className="creativeDirectorSummary">{summaryParts.map(([label, value]) => label + ": " + value).join(". ")}.</p>;`,
    `      })()}`,
  ]),
  "Creative Director summary has no empty punctuation"
);

replaceOnce(
  block([
    `  const refinements = [`,
    `    ["Make more luxury", "Regenerate this logo with more luxury, restraint, premium spacing, refined typography, and fewer casual details."],`,
    `    ["Make simpler", "Regenerate this logo in a simpler, cleaner, more scalable vector-style direction."],`,
    `    ["Make bolder", "Regenerate this logo with a bolder mark, stronger silhouette, and more confident contrast."],`,
    `    ["Try different icon", "Regenerate this logo with a different icon or symbol that still accurately matches the brand words."],`,
    `    ["More modern", "Regenerate this logo with a more modern, polished, current brand-system look."],`,
    `    ["More premium", "Regenerate this logo with a more premium commercial identity direction and stronger brand fit."],`,
    `  ];`,
  ]),
  block([
    `  const refinements = [`,
    `    ["Clarify the symbol", "Regenerate this logo with a clearer category-specific symbol while preserving the active brand name, palette, typography direction, and selected concept."],`,
    `    ["Improve small-size readability", "Regenerate this logo with simpler shapes, stronger silhouette, and better legibility as a social avatar."],`,
    `    ["Use the recommended type", "Regenerate this logo with the workspace typography direction more clearly represented."],`,
    `    ["Try new colors", "Regenerate this logo with a concept-specific palette variation while keeping the workspace palette as the source of truth unless adopted."],`,
    `    ["Keep symbol, change type", "Regenerate this logo by preserving the current symbol direction and changing only the typography treatment."],`,
    `    ["Keep type, change symbol", "Regenerate this logo by preserving the current typography direction and changing only the symbol."],`,
    `  ];`,
  ]),
  "concept-aware refinements"
);

replaceOnce(
  `["More luxury", "Simplify it", "Stronger monogram", "Typography focus", "Remove icon", "More timeless", "More editorial", "Less corporate"].map((item) => (`,
  `["Make the symbol clearer", "Use the recommended type", "Improve small-size readability", "Add a palette accent", "Keep symbol, change type", "Keep type, change symbol", "Make it more minimal", "Make it more friendly"].map((item) => (`,
  "inline logo refinements"
);

if (changed) {
  writeFileSync(appPath, source);
  console.log("Applied logo result persistence fixes.");
} else {
  console.log("Logo result persistence fixes already applied.");
}
