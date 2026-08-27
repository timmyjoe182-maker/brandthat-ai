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

function replaceBetween(startNeedle, endNeedle, replacement, label) {
  if (source.includes(replacement)) return;
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error("Missing expected start block for " + label);
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error("Missing expected end block for " + label);
  source = source.slice(0, start) + replacement + source.slice(end + endNeedle.length);
  changed = true;
}

replaceOnce(
  "const LOGO_PROJECT_MARKER = \"BRANDTHAT_LOGO_PROJECT:\";",
  block([
    "const LOGO_PROJECT_MARKER = \"BRANDTHAT_LOGO_PROJECT:\";",
    "const SAVED_ASSET_META_MARKER = \"BRANDTHAT_ASSET_META:\";",
  ]),
  "saved asset metadata marker"
);

replaceOnce(
  block([
    "function stripLogoProjectMetadata(content = \"\") {",
    "  return String(content || \"\").replace(/\\n?\\s*<!--BRANDTHAT_LOGO_PROJECT:[A-Za-z0-9+/=]+-->\\s*/g, \"\").trim();",
    "}",
  ]),
  block([
    "function stripLogoProjectMetadata(content = \"\") {",
    "  return String(content || \"\").replace(/\\n?\\s*<!--BRANDTHAT_LOGO_PROJECT:[A-Za-z0-9+/=]+-->\\s*/g, \"\").trim();",
    "}",
    "",
    "function encodeSavedAssetContent(content = \"\", metadata = {}) {",
    "  const cleanContent = stripSavedAssetMetadata(stripLogoProjectMetadata(content));",
    "  const encoded = encodeJsonForContent(metadata);",
    "  return encoded ? `${cleanContent}\\n\\n<!--${SAVED_ASSET_META_MARKER}${encoded}-->` : cleanContent;",
    "}",
    "",
    "function decodeSavedAssetMetadata(content = \"\") {",
    "  const match = String(content || \"\").match(/<!--BRANDTHAT_ASSET_META:([A-Za-z0-9+/=]+)-->/);",
    "  return match ? decodeJsonFromContent(match[1]) : null;",
    "}",
    "",
    "function stripSavedAssetMetadata(content = \"\") {",
    "  return String(content || \"\").replace(/\\n?\\s*<!--BRANDTHAT_ASSET_META:[A-Za-z0-9+/=]+-->\\s*/g, \"\").trim();",
    "}",
    "",
    "function stripAllAssetMetadata(content = \"\") {",
    "  return stripSavedAssetMetadata(stripLogoProjectMetadata(content));",
    "}",
  ]),
  "saved asset metadata helpers"
);

replaceOnce(
  block([
    "  const mapGenerationRow = (row) => {",
    "    const project = decodeLogoProjectFromContent(row.content || \"\");",
    "",
    "    return {",
    "      id: row.id,",
    "      tool: row.tool,",
    "      title: row.title || `${row.tool || \"Asset\"} • ${new Date(row.created_at || Date.now()).toLocaleDateString()}`,",
    "      content: stripLogoProjectMetadata(row.content || \"\"),",
    "      image: row.image_url || project?.image || \"\",",
    "      favorite: Boolean(row.favorite),",
  ]),
  block([
    "  const mapGenerationRow = (row) => {",
    "    const project = decodeLogoProjectFromContent(row.content || \"\");",
    "    const assetMeta = decodeSavedAssetMetadata(row.content || \"\") || {};",
    "    const content = stripAllAssetMetadata(row.content || \"\");",
    "",
    "    return {",
    "      id: row.id,",
    "      tool: row.tool,",
    "      title: row.title || assetMeta.title || `${row.tool || \"Asset\"} • ${new Date(row.created_at || Date.now()).toLocaleDateString()}`,",
    "      content,",
    "      image: row.image_url || project?.image || \"\",",
    "      favorite: Boolean(row.favorite || assetMeta.favorite),",
    "      isCollection: Boolean(assetMeta.collection),",
    "      assetType: assetMeta.assetType || row.tool || \"\",",
    "      platform: assetMeta.platform || \"\",",
    "      contentHash: assetMeta.contentHash || normalizeAssetContent(content || row.image_url || \"\"),",
    "      assetMeta,",
  ]),
  "generation row durable metadata"
);

replaceBetween(
  "  const saveGeneratedAsset = async ({ contentOverride = \"\", imageOverride = \"\", titleOverride = \"\", collection = false, favorite = false } = {}) => {",
  "  const saveCurrentOutput = async () => saveGeneratedAsset({ collection: activeTool.key !== \"logo\" });",
  block([
    "  const saveGeneratedAsset = async ({ contentOverride = \"\", imageOverride = \"\", titleOverride = \"\", collection = false, favorite = false } = {}) => {",
    "    const session = await requireMembershipOrTrial(\"save_output\");",
    "    if (!session) return;",
    "",
    "    if (!activeBrand) {",
    "      notify(\"error\", \"Create a Brand Workspace first\", \"Then you can save outputs, favorites, and brand kits to that workspace.\");",
    "      return;",
    "    }",
    "",
    "    const sourceContent = contentOverride || result;",
    "    const sourceImage = imageOverride || logoImage;",
    "",
    "    if (!sourceContent && !sourceImage) {",
    "      notify(\"error\", \"Generate something first\", \"Once an output appears, you can save it to your workspace.\");",
    "      return;",
    "    }",
    "",
    "    if (activeTool.key !== \"logo\" && isGenerationFailureText(sourceContent)) {",
    "      notify(\"error\", \"Nothing to save yet\", \"The last generation failed. Retry before saving this to your workspace.\");",
    "      return;",
    "    }",
    "",
    "    const bucket = getSavedBucketKey(activeTool.key);",
    "    const logoProject = activeTool.key === \"logo\"",
    "      ? {",
    "          image: sourceImage,",
    "          source: logoImageSource || \"openai\",",
    "          vectorImage: logoVectorImage || sourceImage,",
    "          svg: logoSvg || \"\",",
    "          transparentSvg: logoTransparentSvg || logoSvg || \"\",",
    "          variations: logoVariations || [],",
    "          creativeBrief: logoCreativeBrief || null,",
    "          generationMemory: logoGenerationMemory || {},",
    "          prompt,",
    "          brandName: creativeTone || activeBrand?.name || \"\",",
    "          style: selectedPlatform || \"\",",
    "          industry: logoIndustry || \"\",",
    "          symbol: logoSymbol || \"\",",
    "          colors: logoColors || \"\",",
    "          avoid: logoAvoid || \"\",",
    "          savedAt: new Date().toISOString(),",
    "        }",
    "      : null;",
    "    const displayContent = stripAllAssetMetadata(sourceContent);",
    "    const normalizedContent = normalizeAssetContent(displayContent || sourceImage);",
    "    const duplicate = (activeBrand.saved?.[bucket] || []).find((item) => normalizeAssetContent(item.content || item.image) === normalizedContent);",
    "",
    "    if (duplicate) {",
    "      notify(\"info\", \"This result is already saved.\", \"Choose another result or generate a fresh version before saving again.\");",
    "      return duplicate;",
    "    }",
    "",
    "    if (!session.user?.id) {",
    "      notify(\"error\", \"Sign in required\", \"Sign in again before saving this asset.\");",
    "      return null;",
    "    }",
    "",
    "    const assetMetadata = {",
    "      assetType: collection ? `${bucket.replace(/s$/, \"\")}_collection` : bucket.replace(/s$/, \"\"),",
    "      generatorType: activeTool.key,",
    "      platform: selectedPlatform || activeBrand?.growthPlatform || activeBrand?.channels || \"\",",
    "      collection,",
    "      favorite,",
    "      contentHash: normalizedContent,",
    "      workspaceId: activeBrand.id,",
    "      savedAt: new Date().toISOString(),",
    "    };",
    "    const contentWithAssetMetadata = encodeSavedAssetContent(displayContent, assetMetadata);",
    "    const storageContent = logoProject ? encodeLogoProjectContent(contentWithAssetMetadata, logoProject) : contentWithAssetMetadata;",
    "    let entry = {",
    "      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),",
    "      tool: activeTool.key,",
    "      title: titleOverride || `${activeTool.shortTitle}${collection ? \" Collection\" : \"\"} • ${new Date().toLocaleDateString()}`,",
    "      content: displayContent,",
    "      image: sourceImage,",
    "      project: logoProject,",
    "      source: logoProject?.source || \"\",",
    "      vectorImage: logoProject?.vectorImage || \"\",",
    "      svg: logoProject?.svg || \"\",",
    "      transparentSvg: logoProject?.transparentSvg || \"\",",
    "      variations: logoProject?.variations || [],",
    "      creativeBrief: logoProject?.creativeBrief || null,",
    "      generationMemory: logoProject?.generationMemory || null,",
    "      prompt: logoProject?.prompt || \"\",",
    "      brandName: logoProject?.brandName || \"\",",
    "      style: logoProject?.style || \"\",",
    "      industry: logoProject?.industry || \"\",",
    "      symbol: logoProject?.symbol || \"\",",
    "      colors: logoProject?.colors || \"\",",
    "      avoid: logoProject?.avoid || \"\",",
    "      favorite,",
    "      isCollection: collection,",
    "      assetType: assetMetadata.assetType,",
    "      platform: assetMetadata.platform,",
    "      contentHash: normalizedContent,",
    "      assetMeta: assetMetadata,",
    "      createdAt: new Date().toISOString(),",
    "    };",
    "",
    "    try {",
    "      const { data, error } = await supabase",
    "        .from(\"saved_generations\")",
    "        .insert({",
    "          user_id: session.user.id,",
    "          workspace_id: activeBrand.id,",
    "          tool: activeTool.key,",
    "          title: entry.title,",
    "          content: storageContent,",
    "          image_url: entry.image,",
    "        })",
    "        .select(\"*\")",
    "        .single();",
    "",
    "      if (error) throw error;",
    "      if (!data?.id) throw new Error(\"Saved asset did not return a durable ID.\");",
    "      entry = mapGenerationRow(data);",
    "    } catch (error) {",
    "      console.error(\"BrandThat durable asset save failed\", {",
    "        tool: activeTool.key,",
    "        workspaceId: activeBrand.id,",
    "        code: error?.code || \"\",",
    "        message: error?.message || \"Unknown Supabase save error\",",
    "      });",
    "      notify(\"error\", `Couldn't save this ${bucket === \"captions\" ? \"caption\" : \"asset\"}. Try again.`, \"Your generated result is still here.\");",
    "      return null;",
    "    }",
    "",
    "    setBrandWorkspaces((prev) =>",
    "      prev.map((brand) =>",
    "        brand.id === activeBrand.id",
    "          ? {",
    "              ...brand,",
    "              logoImage: activeTool.key === \"logo\" && logoImage ? logoImage : brand.logoImage,",
    "              saved: {",
    "                ...brand.saved,",
    "                [bucket]: [entry, ...(brand.saved?.[bucket] || [])],",
    "              },",
    "            }",
    "          : brand",
    "      )",
    "    );",
    "",
    "    if (favorite) {",
    "      setFavoriteIds((prev) => ({ ...prev, [entry.id]: true }));",
    "    }",
    "",
    "    notify(\"success\", \"Saved to workspace\", `${entry.title} was added to ${activeBrand.name}.`);",
    "    trackBrandthatEvent(\"asset_saved\", { tool: activeTool.key, hasImage: Boolean(entry.image) });",
    "    return entry;",
    "  };",
    "",
    "  const saveCurrentOutput = async () => saveGeneratedAsset({ collection: activeTool.key !== \"logo\" });"
  ]),
  "durable saveGeneratedAsset"
);

replaceBetween(
  "  const toggleFavorite = async (entryId) => {",
  "  const deleteSavedAsset = async (entryId) => {",
  block([
    "  const findSavedAssetById = (entryId) => {",
    "    for (const brand of brandWorkspaces) {",
    "      for (const [bucket, items] of Object.entries(brand.saved || {})) {",
    "        if (!Array.isArray(items)) continue;",
    "        const item = items.find((asset) => asset.id === entryId);",
    "        if (item) return { brand, bucket, item };",
    "      }",
    "    }",
    "    return null;",
    "  };",
    "",
    "  const toggleFavorite = async (entryId) => {",
    "    if (!entryId) return;",
    "    const savedMatch = findSavedAssetById(entryId);",
    "    if (!savedMatch) {",
    "      notify(\"error\", \"Favorite could not update\", \"This saved asset could not be found. Refresh the workspace and try again.\");",
    "      return false;",
    "    }",
    "",
    "    const nextFavorite = !Boolean(savedMatch.item.favorite || favoriteIds[entryId]);",
    "    const nextMetadata = {",
    "      ...(savedMatch.item.assetMeta || {}),",
    "      assetType: savedMatch.item.assetType || (savedMatch.item.isCollection ? `${savedMatch.bucket.replace(/s$/, \"\")}_collection` : savedMatch.bucket.replace(/s$/, \"\")),",
    "      generatorType: savedMatch.item.tool || savedMatch.bucket,",
    "      platform: savedMatch.item.platform || \"\",",
    "      collection: Boolean(savedMatch.item.isCollection),",
    "      favorite: nextFavorite,",
    "      contentHash: savedMatch.item.contentHash || normalizeAssetContent(savedMatch.item.content || savedMatch.item.image || \"\"),",
    "      workspaceId: savedMatch.brand.id,",
    "      updatedAt: new Date().toISOString(),",
    "    };",
    "    const nextContentWithMeta = encodeSavedAssetContent(savedMatch.item.content || \"\", nextMetadata);",
    "    const nextStoredContent = savedMatch.item.project",
    "      ? encodeLogoProjectContent(nextContentWithMeta, savedMatch.item.project)",
    "      : nextContentWithMeta;",
    "",
    "    try {",
    "      const { data: sessionData } = await supabase.auth.getSession();",
    "      if (!sessionData?.session?.user?.id) throw new Error(\"No authenticated session.\");",
    "",
    "      const { data, error } = await supabase",
    "        .from(\"saved_generations\")",
    "        .update({ content: nextStoredContent })",
    "        .eq(\"id\", entryId)",
    "        .eq(\"user_id\", sessionData.session.user.id)",
    "        .select(\"*\")",
    "        .single();",
    "",
    "      if (error) throw error;",
    "      if (!data?.id) throw new Error(\"Favorite update did not return a durable record.\");",
    "    } catch (error) {",
    "      console.error(\"BrandThat durable favorite update failed\", {",
    "        entryId,",
    "        code: error?.code || \"\",",
    "        message: error?.message || \"Unknown Supabase favorite error\",",
    "      });",
    "      notify(\"error\", \"Favorite could not update\", \"Please try again. Your saved assets were not changed.\");",
    "      return false;",
    "    }",
    "",
    "    setFavoriteIds((prev) => ({ ...prev, [entryId]: nextFavorite }));",
    "    setBrandWorkspaces((prev) => prev.map((brand) => ({",
    "      ...brand,",
    "      saved: Object.fromEntries(Object.entries(brand.saved || {}).map(([bucket, items]) => [",
    "        bucket,",
    "        Array.isArray(items) ? items.map((item) => item.id === entryId ? { ...item, favorite: nextFavorite, assetMeta: { ...(item.assetMeta || {}), favorite: nextFavorite } } : item) : items,",
    "      ])),",
    "    })));",
    "    notify(\"success\", nextFavorite ? \"Favorited\" : \"Favorite removed\", nextFavorite ? \"This asset now appears in Favorites.\" : \"This asset was removed from Favorites.\");",
    "    return true;",
    "  };",
    "",
    "  const deleteSavedAsset = async (entryId) => {"
  ]),
  "durable favorite toggle"
);

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

replaceBetween(
  "{parseTenOptions(result).map((item, index) => (",
  "            ))}",
  block([
    "{parseTenOptions(result).map((item, index) => {",
    "              const key = `${activeTool.key}-${index}`;",
    "              const savedAsset = getSavedAsset(item);",
    "              const isSaving = savingResultKey === key;",
    "              const isCopied = copiedResultKey === key;",
    "              return (",
    "              <div className=\"captionOptionRow\" key={`${item}-${index}`}> ",
    "                <div className=\"captionNumber\">{index + 1}</div>",
    "                <p>{item}</p>",
    "                <div className=\"captionRowActions\">",
    "                  <button onClick={() => handleSaveResultItem(item, index)} disabled={Boolean(savedAsset) || isSaving}>",
    "                    {isSaving ? \"Saving...\" : savedAsset ? `Saved to ${activeBrand?.name || \"Workspace\"} ✓` : \"Save\"}",
    "                  </button>",
    "                  <button onClick={() => handleCopyResultItem(item, index)}>{isCopied ? \"Copied\" : \"Copy\"}</button>",
    "                  <button onClick={() => handleSaveResultItem(item, index, true)} disabled={isSaving}>",
    "                    {isSaving ? \"Saving...\" : savedAsset?.favorite ? \"Favorited\" : \"Favorite\"}",
    "                  </button>",
    "                </div>",
    "              </div>",
    "              );",
    "            })}"
  ]),
  "per-result row actions"
);

replaceOnce(
  "      bucketLabel: label,\n      brandName: brand.name,",
  "      bucketLabel: label,\n      assetLabel: item.assetType === \"caption_collection\" || item.isCollection ? \"Caption Collection\" : bucket === \"captions\" ? \"Caption\" : label,\n      brandName: brand.name,",
  "asset library individual labels"
);

replaceOnce(
  "<span>{item.bucketLabel}</span>",
  "<span>{item.assetLabel || item.bucketLabel}</span>",
  "asset library display label"
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
  console.log("Applied BrandThat production UI and persistence fixes.");
} else {
  console.log("BrandThat production UI and persistence fixes already applied.");
}
