import { readFileSync, writeFileSync } from "node:fs";

const appUrl = new URL("../src/App.jsx", import.meta.url);
let source = readFileSync(appUrl, "utf8");
let changed = false;

function replaceOnce(needle, replacement, label) {
  if (!source.includes(needle)) {
    if (!source.includes(replacement)) {
      throw new Error(`Missing expected source block for ${label}`);
    }
    return;
  }
  source = source.replace(needle, replacement);
  changed = true;
}

replaceOnce(
  `  clearGenerator,\n  saveCurrentOutput,\n  setLogoAsBrandProfile,`,
  `  clearGenerator,\n  saveCurrentOutput,\n  saveGeneratedAsset = () => {},\n  setLogoAsBrandProfile,`,
  "GeneratorCard saveGeneratedAsset prop"
);

replaceOnce(
  `  const currentBucket = getSavedBucketKey(activeTool.key);\n  const isAssetSaved = (content = "", image = "") => {\n    const fingerprint = normalizeAssetContent(content || image);\n    if (!fingerprint || !activeBrand?.saved?.[currentBucket]) return false;\n    return activeBrand.saved[currentBucket].some((item) => normalizeAssetContent(item.content || item.image) === fingerprint);\n  };\n  const currentOutputSaved = activeTool.key === "logo" ? isAssetSaved("", logoImage) : isAssetSaved(stripLogoProjectMetadata(result));`,
  `  const currentBucket = getSavedBucketKey(activeTool.key);\n  const [savingResultKey, setSavingResultKey] = useState("");\n  const [copiedResultKey, setCopiedResultKey] = useState("");\n  const getSavedAsset = (content = "", image = "") => {\n    const fingerprint = normalizeAssetContent(content || image);\n    if (!fingerprint || !activeBrand?.saved?.[currentBucket]) return null;\n    return activeBrand.saved[currentBucket].find((item) => normalizeAssetContent(item.content || item.image) === fingerprint) || null;\n  };\n  const isAssetSaved = (content = "", image = "") => Boolean(getSavedAsset(content, image));\n  const currentOutputSaved = activeTool.key === "logo" ? isAssetSaved("", logoImage) : isAssetSaved(stripLogoProjectMetadata(result));\n  const getIndividualResultTitle = (index) => {\n    const singularLabels = {\n      captions: "Caption",\n      hooks: "Hook",\n      bios: "Bio",\n      hashtags: "Hashtag Set",\n      email: "Email",\n      strategy: "Strategy",\n      audit: "Audit",\n      campaign: "Campaign Idea",\n      growth: "Roadmap Idea",\n      brand: "Brand Plan Section",\n    };\n    return `${singularLabels[activeTool.key] || activeTool.shortTitle} ${index + 1} • ${new Date().toLocaleDateString()}`;\n  };\n  const getCollectionTitle = () => {\n    const platformPrefix = selectedPlatform ? `${selectedPlatform} ` : "";\n    const collectionLabels = {\n      captions: "Captions",\n      hooks: "Hooks",\n      bios: "Bios",\n      hashtags: "Hashtags",\n      email: "Emails",\n      strategy: "Strategy Ideas",\n      audit: "Audit Notes",\n      campaign: "Campaign Ideas",\n      growth: "Roadmap",\n      brand: "Brand Plan",\n    };\n    return `${platformPrefix}${collectionLabels[activeTool.key] || activeTool.shortTitle} — ${new Date().toLocaleDateString()}`;\n  };\n  const handleSaveResultItem = async (item, index, favorite = false) => {\n    const key = `${activeTool.key}-${index}`;\n    const savedAsset = getSavedAsset(item);\n    if (savedAsset && !favorite) return;\n    setSavingResultKey(key);\n    try {\n      if (savedAsset) {\n        if (favorite && !savedAsset.favorite) {\n          await toggleFavorite?.(savedAsset.id);\n        }\n        return;\n      }\n      await saveGeneratedAsset({\n        contentOverride: item,\n        titleOverride: getIndividualResultTitle(index),\n        favorite,\n      });\n    } catch (error) {\n      console.error("BrandThat individual asset save failed", {\n        tool: activeTool.key,\n        message: error?.message || "Unknown save error",\n      });\n    } finally {\n      setSavingResultKey("");\n    }\n  };\n  const handleCopyResultItem = async (item, index) => {\n    const key = `${activeTool.key}-${index}`;\n    try {\n      await copyToClipboard(item);\n      setCopiedResultKey(key);\n      window.setTimeout(() => {\n        setCopiedResultKey((current) => current === key ? "" : current);\n      }, 1400);\n    } catch (error) {\n      console.error("BrandThat copy failed", {\n        tool: activeTool.key,\n        message: error?.message || "Clipboard unavailable",\n      });\n    }\n  };`,
  "GeneratorCard per-result state"
);

replaceOnce(
  `<button onClick={() => saveGeneratedAsset({ titleOverride: `${activeTool.shortTitle} Set • ${new Date().toLocaleDateString()}` })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save Set"}</button>`,
  `<button onClick={() => saveGeneratedAsset({ collection: true, titleOverride: getCollectionTitle() })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save Set"}</button>`,
  "hashtag collection save title"
);

replaceOnce(
  `<button onClick={saveCurrentOutput} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save All"}</button>`,
  `<button onClick={() => saveGeneratedAsset({ collection: true, titleOverride: getCollectionTitle() })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save All"}</button>`,
  "Save All collection title"
);

replaceOnce(
  `{parseTenOptions(result).map((item, index) => (\n              <div className="captionOptionRow" key={`${item}-${index}`}>\n                <div className="captionNumber">{index + 1}</div>\n                <p>{item}</p>\n                <div className="captionRowActions">\n                  <button onClick={() => saveGeneratedAsset({ contentOverride: item, titleOverride: `${activeTool.shortTitle} ${index + 1} • ${new Date().toLocaleDateString()}` })} disabled={isAssetSaved(item)}>\n                    {isAssetSaved(item) ? "Saved ✓" : "Save"}\n                  </button>\n                  <button onClick={() => copyToClipboard(item)}>Copy</button>\n                  <button onClick={() => saveGeneratedAsset({ contentOverride: item, titleOverride: `${activeTool.shortTitle} ${index + 1} • ${new Date().toLocaleDateString()}`, favorite: true })} disabled={isAssetSaved(item)}>\n                    {isAssetSaved(item) ? "Saved" : "Favorite"}\n                  </button>\n                </div>\n              </div>\n            ))}`,
  `{parseTenOptions(result).map((item, index) => {\n              const key = `${activeTool.key}-${index}`;\n              const savedAsset = getSavedAsset(item);\n              const isSaving = savingResultKey === key;\n              const isCopied = copiedResultKey === key;\n              return (\n                <div className="captionOptionRow" key={`${item}-${index}`}>\n                  <div className="captionNumber">{index + 1}</div>\n                  <p>{item}</p>\n                  <div className="captionRowActions">\n                    <button onClick={() => handleSaveResultItem(item, index)} disabled={Boolean(savedAsset) || isSaving}>\n                      {isSaving ? "Saving..." : savedAsset ? `Saved to ${activeBrand?.name || "Workspace"} ✓` : "Save"}\n                    </button>\n                    <button onClick={() => handleCopyResultItem(item, index)}>{isCopied ? "Copied" : "Copy"}</button>\n                    <button onClick={() => handleSaveResultItem(item, index, true)} disabled={isSaving}>\n                      {isSaving ? "Saving..." : savedAsset?.favorite ? "Favorited" : "Favorite"}\n                    </button>\n                  </div>\n                </div>\n              );\n            })}`,
  "per-result row actions"
);

replaceOnce(
  `- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, or availability claims unless the user explicitly supplied that evidence.\n- Prefer non-quantified lifestyle language when mentioning benefits.`,
  `- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, or availability claims unless the user explicitly supplied that evidence.\n- For plant care, pet care, health, finance, legal, or technical setup, do not provide exact instructions, schedules, frequencies, diagnoses, claims, or guarantees unless the user supplied those details.\n- For plant watering, do not give an exact watering frequency unless the plant species, lighting, soil, pot, season, or explicit care instructions are provided. Say watering needs vary and point to the included care card instead.\n- Prefer non-quantified lifestyle language when mentioning benefits.`,
  "caption factual safety"
);

replaceOnce(
  `- Avoid random spam tags.\n- Avoid repeated hashtags.`,
  `- Avoid random spam tags.\n- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, availability, or exact-care claims.\n- Avoid repeated hashtags.`,
  "hashtag factual safety"
);

replaceOnce(
  `- Avoid generic filler and cheesy phrasing.\n- Keep the output fast, clean, and easy to scan.`,
  `- Avoid generic filler and cheesy phrasing.\n- Do not invent health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, availability, or exact-care claims unless the user supplied those details.\n- For plant watering or care advice, never invent universal schedules; say needs vary by plant, light, soil, pot, and season unless the user provided exact care facts.\n- Keep the output fast, clean, and easy to scan.`,
  "general factual safety"
);

if (changed) {
  writeFileSync(appUrl, source);
  console.log("Applied BrandThat production UI fixes.");
} else {
  console.log("BrandThat production UI fixes already applied.");
}
