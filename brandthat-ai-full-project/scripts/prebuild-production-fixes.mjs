import { readFileSync, writeFileSync } from "node:fs";

const appUrl = new URL("../src/App.jsx", import.meta.url);
let source = readFileSync(appUrl, "utf8");
let changed = false;

const block = (lines) => lines.join("\n");

function replaceOnce(needle, replacement, label) {
  if (!source.includes(needle)) {
    if (!source.includes(replacement)) {
      throw new Error("Missing expected source block for " + label);
    }
    return;
  }
  source = source.replace(needle, replacement);
  changed = true;
}

replaceOnce(
  block([
    "  clearGenerator,",
    "  saveCurrentOutput,",
    "  setLogoAsBrandProfile,",
  ]),
  block([
    "  clearGenerator,",
    "  saveCurrentOutput,",
    "  saveGeneratedAsset = () => {},",
    "  setLogoAsBrandProfile,",
  ]),
  "GeneratorCard saveGeneratedAsset prop"
);

replaceOnce(
  block([
    "  const currentBucket = getSavedBucketKey(activeTool.key);",
    "  const isAssetSaved = (content = \"\", image = \"\") => {",
    "    const fingerprint = normalizeAssetContent(content || image);",
    "    if (!fingerprint || !activeBrand?.saved?.[currentBucket]) return false;",
    "    return activeBrand.saved[currentBucket].some((item) => normalizeAssetContent(item.content || item.image) === fingerprint);",
    "  };",
    "  const currentOutputSaved = activeTool.key === \"logo\" ? isAssetSaved(\"\", logoImage) : isAssetSaved(stripLogoProjectMetadata(result));",
  ]),
  block([
    "  const currentBucket = getSavedBucketKey(activeTool.key);",
    "  const [savingResultKey, setSavingResultKey] = useState(\"\");",
    "  const [copiedResultKey, setCopiedResultKey] = useState(\"\");",
    "  const getSavedAsset = (content = \"\", image = \"\") => {",
    "    const fingerprint = normalizeAssetContent(content || image);",
    "    if (!fingerprint || !activeBrand?.saved?.[currentBucket]) return null;",
    "    return activeBrand.saved[currentBucket].find((item) => normalizeAssetContent(item.content || item.image) === fingerprint) || null;",
    "  };",
    "  const isAssetSaved = (content = \"\", image = \"\") => Boolean(getSavedAsset(content, image));",
    "  const currentOutputSaved = activeTool.key === \"logo\" ? isAssetSaved(\"\", logoImage) : isAssetSaved(stripLogoProjectMetadata(result));",
    "  const getIndividualResultTitle = (index) => {",
    "    const singularLabels = {",
    "      captions: \"Caption\",",
    "      hooks: \"Hook\",",
    "      bios: \"Bio\",",
    "      hashtags: \"Hashtag Set\",",
    "      email: \"Email\",",
    "      strategy: \"Strategy\",",
    "      audit: \"Audit\",",
    "      campaign: \"Campaign Idea\",",
    "      growth: \"Roadmap Idea\",",
    "      brand: \"Brand Plan Section\",",
    "    };",
    "    return `${singularLabels[activeTool.key] || activeTool.shortTitle} ${index + 1} • ${new Date().toLocaleDateString()}`;",
    "  };",
    "  const getCollectionTitle = () => {",
    "    const platformPrefix = selectedPlatform ? `${selectedPlatform} ` : \"\";",
    "    const collectionLabels = {",
    "      captions: \"Captions\",",
    "      hooks: \"Hooks\",",
    "      bios: \"Bios\",",
    "      hashtags: \"Hashtags\",",
    "      email: \"Emails\",",
    "      strategy: \"Strategy Ideas\",",
    "      audit: \"Audit Notes\",",
    "      campaign: \"Campaign Ideas\",",
    "      growth: \"Roadmap\",",
    "      brand: \"Brand Plan\",",
    "    };",
    "    return `${platformPrefix}${collectionLabels[activeTool.key] || activeTool.shortTitle} — ${new Date().toLocaleDateString()}`;",
    "  };",
    "  const handleSaveResultItem = async (item, index, favorite = false) => {",
    "    const key = `${activeTool.key}-${index}`;",
    "    const savedAsset = getSavedAsset(item);",
    "    if (savedAsset && !favorite) return;",
    "    setSavingResultKey(key);",
    "    try {",
    "      if (savedAsset) {",
    "        if (favorite && !savedAsset.favorite) {",
    "          await toggleFavorite?.(savedAsset.id);",
    "        }",
    "        return;",
    "      }",
    "      await saveGeneratedAsset({",
    "        contentOverride: item,",
    "        titleOverride: getIndividualResultTitle(index),",
    "        favorite,",
    "      });",
    "    } catch (error) {",
    "      console.error(\"BrandThat individual asset save failed\", {",
    "        tool: activeTool.key,",
    "        message: error?.message || \"Unknown save error\",",
    "      });",
    "    } finally {",
    "      setSavingResultKey(\"\");",
    "    }",
    "  };",
    "  const handleCopyResultItem = async (item, index) => {",
    "    const key = `${activeTool.key}-${index}`;",
    "    try {",
    "      await copyToClipboard(item);",
    "      setCopiedResultKey(key);",
    "      window.setTimeout(() => {",
    "        setCopiedResultKey((current) => current === key ? \"\" : current);",
    "      }, 1400);",
    "    } catch (error) {",
    "      console.error(\"BrandThat copy failed\", {",
    "        tool: activeTool.key,",
    "        message: error?.message || \"Clipboard unavailable\",",
    "      });",
    "    }",
    "  };",
  ]),
  "GeneratorCard per-result state"
);

replaceOnce(
  "<button onClick={() => saveGeneratedAsset({ titleOverride: `${activeTool.shortTitle} Set • ${new Date().toLocaleDateString()}` })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || \"Workspace\"} ✓` : \"Save Set\"}</button>",
  "<button onClick={() => saveGeneratedAsset({ collection: true, titleOverride: getCollectionTitle() })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || \"Workspace\"} ✓` : \"Save Set\"}</button>",
  "hashtag collection save title"
);

replaceOnce(
  "<button onClick={saveCurrentOutput} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || \"Workspace\"} ✓` : \"Save All\"}</button>",
  "<button onClick={() => saveGeneratedAsset({ collection: true, titleOverride: getCollectionTitle() })} disabled={currentOutputSaved}>{currentOutputSaved ? `Saved to ${activeBrand?.name || \"Workspace\"} ✓` : \"Save All\"}</button>",
  "Save All collection title"
);

replaceOnce(
  block([
    "{parseTenOptions(result).map((item, index) => (",
    "              <div className=\"captionOptionRow\" key={`${item}-${index}`}",
  ]).replace("key={`${item}-${index}`}", "key={`${item}-${index}`}>"),
  block([
    "{parseTenOptions(result).map((item, index) => {",
    "              const key = `${activeTool.key}-${index}`;",
    "              const savedAsset = getSavedAsset(item);",
    "              const isSaving = savingResultKey === key;",
    "              const isCopied = copiedResultKey === key;",
    "              return (",
    "              <div className=\"captionOptionRow\" key={`${item}-${index}`}>"
  ]),
  "per-result row opening"
);

replaceOnce(
  block([
    "                  <button onClick={() => saveGeneratedAsset({ contentOverride: item, titleOverride: `${activeTool.shortTitle} ${index + 1} • ${new Date().toLocaleDateString()}` })} disabled={isAssetSaved(item)}>",
    "                    {isAssetSaved(item) ? \"Saved ✓\" : \"Save\"}",
    "                  </button>",
    "                  <button onClick={() => copyToClipboard(item)}>Copy</button>",
    "                  <button onClick={() => saveGeneratedAsset({ contentOverride: item, titleOverride: `${activeTool.shortTitle} ${index + 1} • ${new Date().toLocaleDateString()}`, favorite: true })} disabled={isAssetSaved(item)}>",
    "                    {isAssetSaved(item) ? \"Saved\" : \"Favorite\"}",
    "                  </button>",
  ]),
  block([
    "                    <button onClick={() => handleSaveResultItem(item, index)} disabled={Boolean(savedAsset) || isSaving}>",
    "                      {isSaving ? \"Saving...\" : savedAsset ? `Saved to ${activeBrand?.name || \"Workspace\"} ✓` : \"Save\"}",
    "                    </button>",
    "                    <button onClick={() => handleCopyResultItem(item, index)}>{isCopied ? \"Copied\" : \"Copy\"}</button>",
    "                    <button onClick={() => handleSaveResultItem(item, index, true)} disabled={isSaving}>",
    "                      {isSaving ? \"Saving...\" : savedAsset?.favorite ? \"Favorited\" : \"Favorite\"}",
    "                    </button>",
  ]),
  "per-result row controls"
);

replaceOnce(
  block([
    "              </div>",
    "            ))}",
    "          </div>",
  ]),
  block([
    "              </div>",
    "              );",
    "            })}",
    "          </div>",
  ]),
  "per-result row closing"
);

replaceOnce(
  "- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, or availability claims unless the user explicitly supplied that evidence.\n- Prefer non-quantified lifestyle language when mentioning benefits.",
  "- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, or availability claims unless the user explicitly supplied that evidence.\n- For plant care, pet care, health, finance, legal, or technical setup, do not provide exact instructions, schedules, frequencies, diagnoses, claims, or guarantees unless the user supplied those details.\n- For plant watering, do not give an exact watering frequency unless the plant species, lighting, soil, pot, season, or explicit care instructions are provided. Say watering needs vary and point to the included care card instead.\n- Prefer non-quantified lifestyle language when mentioning benefits.",
  "caption factual safety"
);

replaceOnce(
  "- Avoid random spam tags.\n- Avoid repeated hashtags.",
  "- Avoid random spam tags.\n- Avoid unsupported health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, availability, or exact-care claims.\n- Avoid repeated hashtags.",
  "hashtag factual safety"
);

replaceOnce(
  "- Avoid generic filler and cheesy phrasing.\n- Keep the output fast, clean, and easy to scan.",
  "- Avoid generic filler and cheesy phrasing.\n- Do not invent health, scientific, financial, legal, performance, discount, guarantee, scarcity, shipping, availability, or exact-care claims unless the user supplied those details.\n- For plant watering or care advice, never invent universal schedules; say needs vary by plant, light, soil, pot, and season unless the user provided exact care facts.\n- Keep the output fast, clean, and easy to scan.",
  "general factual safety"
);

if (changed) {
  writeFileSync(appUrl, source);
  console.log("Applied BrandThat production UI fixes.");
} else {
  console.log("BrandThat production UI fixes already applied.");
}
