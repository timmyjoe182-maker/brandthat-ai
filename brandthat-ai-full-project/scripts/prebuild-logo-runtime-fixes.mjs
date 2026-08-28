import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Missing expected block: ${label}`);
  return source.replace(needle, replacement);
}

function replaceBetween(source, startNeedle, endNeedle, replacement, label) {
  if (source.includes(replacement)) return source;
  const start = source.indexOf(startNeedle);
  if (start === -1) throw new Error(`Missing expected start block: ${label}`);
  const end = source.indexOf(endNeedle, start);
  if (end === -1) throw new Error(`Missing expected end block: ${label}`);
  return `${source.slice(0, start)}${replacement}${source.slice(end + endNeedle.length)}`;
}

function patchLogoFunction() {
  const path = new URL("../netlify/functions/logo-image.js", import.meta.url);
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    `const OpenAI = require("openai");\nconst { requireVerifiedUser } = require("./lib/auth.js");`,
    `import { readFileSync } from "node:fs";\nimport OpenAI from "openai";\nimport { getRequestId, json, requireVerifiedUser } from "./lib/membership.js";\n\nexport const config = {\n  timeout: 60,\n};`,
    "logo-image ESM imports",
  );

  source = replaceOnce(
    source,
    `let STYLE_SCHEMA = {};\ntry {\n  STYLE_SCHEMA = require("./logo-style-schemas.json");\n} catch {\n  STYLE_SCHEMA = {};\n}`,
    `let STYLE_SCHEMA = {};\ntry {\n  STYLE_SCHEMA = JSON.parse(readFileSync(new URL("./logo-style-schemas.json", import.meta.url), "utf8"));\n} catch {\n  STYLE_SCHEMA = {};\n}`,
    "logo-image style schema import",
  );

  source = replaceOnce(
    source,
    `exports.handler = async (event, context) => {\n  if (context) context.callbackWaitsForEmptyEventLoop = false;`,
    `export const handler = async (event, context) => {\n  if (context) context.callbackWaitsForEmptyEventLoop = false;\n  const requestId = getRequestId("logo_image");`,
    "logo-image ESM handler",
  );

  source = replaceOnce(
    source,
    `      statusCode: 401,\n      message: "Please log in again to continue.",`,
    `      statusCode: 401,\n      code: "AUTH_REQUIRED",\n      message: "Please log in again to continue.",`,
    "logo-image auth code",
  );

  source = replaceOnce(
    source,
    `  if (auth.error) {\n    return {\n      statusCode: auth.error.statusCode,\n      body: JSON.stringify({ error: auth.error.message }),\n    };\n  }`,
    `  if (auth.error) {\n    return json(auth.error.statusCode || 401, {\n      ok: false,\n      code: auth.error.code || "AUTH_REQUIRED",\n      message: auth.error.message,\n      requestId,\n    });\n  }`,
    "logo-image auth response",
  );

  source = replaceOnce(
    source,
    `    if (!checkRateLimit(event)) {\n      return {\n        statusCode: 429,\n        body: JSON.stringify({ error: "Too many logo generations. Please wait a minute and try again." }),\n      };\n    }`,
    `    if (!checkRateLimit(event)) {\n      return json(429, {\n        ok: false,\n        code: "LOGO_RATE_LIMITED",\n        message: "Too many logo generations. Please wait a minute and try again.",\n        requestId,\n      });\n    }`,
    "logo-image rate limit response",
  );

  source = replaceOnce(
    source,
    `    if (!logoPrompt) {\n      return {\n        statusCode: 400,\n        body: JSON.stringify({ error: "Logo prompt is required." }),\n      };\n    }`,
    `    if (!logoPrompt) {\n      return json(400, {\n        ok: false,\n        code: "LOGO_PROMPT_REQUIRED",\n        message: "Logo prompt is required.",\n        requestId,\n      });\n    }`,
    "logo-image prompt response",
  );

  source = replaceOnce(
    source,
    `const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 8000);`,
    `const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 50000);`,
    "logo-image timeout",
  );

  source = replaceBetween(
    source,
    `    } catch (imageError) {\n      clearTimeout(timeout);`,
    `    }\n  } catch (error) {`,
    `    } catch (imageError) {\n      clearTimeout(timeout);\n      const providerCode = imageError?.code || imageError?.type || imageError?.name || "LOGO_IMAGE_PROVIDER_FAILED";\n      console.warn("BrandThat logo image provider failed", {\n        requestId,\n        type: imageError?.type || imageError?.name,\n        code: imageError?.code,\n        statusCode: imageError?.status || imageError?.statusCode,\n        message: imageError?.message,\n      });\n\n      return json(503, {\n        ok: false,\n        code: providerCode,\n        message: "AI logo generation is temporarily unavailable.",\n        requestId,\n        providerError: {\n          code: providerCode,\n          statusCode: imageError?.status || imageError?.statusCode || null,\n        },\n        fallback: {\n          image: vectorLogo.image,\n          source: "instant-svg",\n          vectorImage: vectorLogo.image,\n          svg: vectorLogo.svg,\n          transparentSvg: vectorLogo.transparentSvg,\n          variations: (vectorLogo.variations || []).slice(0, 1),\n          creativeBrief: vectorLogo.creativeBrief,\n          generationMemory: vectorLogo.generationMemory,\n          layers: vectorLogo.layers,\n          promptInterpreter,\n          brandStrategy,\n          qualityGate,\n          note: "AI logo generation is temporarily unavailable. Use the instant editable vector only if you choose that fallback.",\n        },\n      });\n    }\n  } catch (error) {`,
    "logo-image provider error branch",
  );

  source = replaceOnce(
    source,
    `    console.error("BrandThat logo image function failed", {\n      type: error?.type || error?.name,`,
    `    console.error("BrandThat logo image function failed", {\n      requestId,\n      type: error?.type || error?.name,`,
    "logo-image top-level log request id",
  );

  source = replaceOnce(
    source,
    `    return {\n      statusCode: 500,\n      headers: { "Content-Type": "application/json" },\n      body: JSON.stringify({\n        ok: false,\n        code: error?.code || error?.type || "LOGO_IMAGE_FUNCTION_FAILED",\n        message: "Logo generation is temporarily unavailable.",\n      }),\n    };`,
    `    return json(500, {\n        ok: false,\n        code: error?.code || error?.type || "LOGO_IMAGE_FUNCTION_FAILED",\n        message: "Logo generation is temporarily unavailable.",\n        requestId,\n      });`,
    "logo-image top-level error response",
  );

  writeFileSync(path, source);
}

function patchApp() {
  const path = new URL("../src/App.jsx", import.meta.url);
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    `  error.diagnostic = {\n    url: response.url,\n    status,\n    code,\n    requestId,\n    contentType: response.headers.get("content-type") || "",\n  };\n  return error;`,
    `  error.diagnostic = {\n    url: response.url,\n    status,\n    code,\n    requestId,\n    contentType: response.headers.get("content-type") || "",\n  };\n  error.data = data;\n  return error;`,
    "request error response payload",
  );

  if (!source.includes("function buildLogoFallbackOption(")) {
    source = replaceOnce(
      source,
      `function trackBrandthatEvent(name, properties = {}) {`,
      `function stableStringHash(value = "") {\n  let hash = 2166136261;\n  const input = String(value);\n  for (let index = 0; index < input.length; index += 1) {\n    hash ^= input.charCodeAt(index);\n    hash = Math.imul(hash, 16777619);\n  }\n  return (hash >>> 0).toString(36);\n}\n\nfunction buildLogoFallbackOption(fallback = {}, requestPayload = {}, error = {}) {\n  const fallbackLogo = fallback?.image ? fallback : createClientFallbackLogo(requestPayload);\n  const firstVariation = Array.isArray(fallbackLogo.variations) && fallbackLogo.variations.length\n    ? fallbackLogo.variations[0]\n    : { id: "instant-vector-primary", name: "Instant Vector", image: fallbackLogo.image, svg: fallbackLogo.svg };\n  const stableSeed = [\n    requestPayload.brandName,\n    requestPayload.logoIndustry,\n    requestPayload.logoStyle,\n    firstVariation?.name,\n    fallbackLogo.image || fallbackLogo.svg,\n  ].filter(Boolean).join("|");\n\n  return {\n    ...fallbackLogo,\n    id: \`instant-vector-\${stableStringHash(stableSeed || "brandthat-logo-fallback")}\`,\n    name: firstVariation?.name || fallbackLogo.name || "Instant Vector",
    type: "instant-vector",
    image: fallbackLogo.image || firstVariation?.image || firstVariation?.svg || "",
    vectorImage: fallbackLogo.vectorImage || fallbackLogo.image || firstVariation?.image || firstVariation?.svg || "",
    svg: fallbackLogo.svg || firstVariation?.svg || "",
    transparentSvg: fallbackLogo.transparentSvg || fallbackLogo.svg || firstVariation?.svg || "",
    variations: [{ ...firstVariation, name: firstVariation?.name || "Instant Vector" }],
    previewData: {
      image: fallbackLogo.image || firstVariation?.image || firstVariation?.svg || "",
      source: "instant-svg",
    },
    workspaceContext: requestPayload.structuredLogo || requestPayload.brandStrategy || {},
    palette: requestPayload.logoColors || fallbackLogo.creativeBrief?.palette || "",
    typography: requestPayload.parsedLogo?.typography || fallbackLogo.creativeBrief?.typography || "",
    saveBehavior: "Save Logo Concept",
    setPrimaryBehavior: "Set as Primary Logo",
    errorCode: error?.code || fallback?.providerError?.code || "LOGO_IMAGE_UNAVAILABLE",
    requestId: error?.requestId || fallback?.requestId || "",
    note: fallbackLogo.note || "Instant editable vector fallback is available if you choose to use it.",
  };
}

function trackBrandthatEvent(name, properties = {}) {`,
      "logo fallback option builder",
    );
  }

  source = replaceOnce(
    source,
    `  const [logoCreativeBrief, setLogoCreativeBrief] = useState(null);\n  const [logoGenerationError, setLogoGenerationError] = useState("");`,
    `  const [logoCreativeBrief, setLogoCreativeBrief] = useState(null);\n  const [logoFallbackOption, setLogoFallbackOption] = useState(null);\n  const [logoGenerationError, setLogoGenerationError] = useState("");`,
    "logo fallback state",
  );

  source = replaceOnce(
    source,
    `        timeoutMessage: "Logo generation took too long. BrandThat created an instant editable fallback instead."`,
    `        timeoutMessage: "AI logo generation is temporarily unavailable.\\nError code: LOGO_IMAGE_CLIENT_TIMEOUT"`,
    "honest logo timeout message",
  );

  source = replaceOnce(
    source,
    `    } catch (error) {\n      if (error?.status === 429) throw error;\n      console.warn("Brandthat logo function unavailable, using instant fallback:", error);\n      return createClientFallbackLogo(requestPayload);\n    }\n\n    if (!data.image) {\n      console.warn("Brandthat logo function returned no image, using instant fallback.");\n      return createClientFallbackLogo(requestPayload);\n    }`,
    `    } catch (error) {\n      if (error?.data?.fallback) {\n        error.fallback = buildLogoFallbackOption(error.data.fallback, requestPayload, error);\n      } else if (error?.status !== 429) {\n        error.fallback = buildLogoFallbackOption({}, requestPayload, {\n          ...error,\n          code: error?.code || "LOGO_IMAGE_CLIENT_TIMEOUT",\n        });\n      }\n      throw error;\n    }\n\n    if (!data.image) {\n      const error = new Error("AI logo generation is temporarily unavailable.\\nError code: LOGO_IMAGE_EMPTY_RESPONSE");\n      error.code = "LOGO_IMAGE_EMPTY_RESPONSE";\n      error.fallback = buildLogoFallbackOption({}, requestPayload, error);\n      throw error;\n    }`,
    "stop silent logo fallback",
  );

  source = replaceOnce(
    source,
    `    setLogoImageSource("");\n    if (activeTool.key === "logo" && logoContext?.resetReason) {`,
    `    setLogoImageSource("");\n    setLogoFallbackOption(null);\n    if (activeTool.key === "logo" && logoContext?.resetReason) {`,
    "clear fallback at generation start",
  );

  source = replaceOnce(
    source,
    `        setLogoGenerationError(error?.message || "Logo generation failed. Please try again with a clearer brand name and direction.");\n        setResult("");`,
    `        setLogoGenerationError(error?.message || "Logo generation failed. Please try again with a clearer brand name and direction.");\n        setLogoFallbackOption(error?.fallback || null);\n        setResult("");`,
    "store fallback on logo error",
  );

  source = replaceOnce(
    source,
    `    setLogoCreativeBrief(null);\n    setLogoGenerationError("");`,
    `    setLogoCreativeBrief(null);\n    setLogoFallbackOption(null);\n    setLogoGenerationError("");`,
    "clear fallback on clear",
  );

  source = replaceOnce(
    source,
    `    setLogoCreativeBrief(project.creativeBrief || null);\n    setLogoGenerationMemory(project.generationMemory || {});`,
    `    setLogoCreativeBrief(project.creativeBrief || null);\n    setLogoFallbackOption(null);\n    setLogoGenerationMemory(project.generationMemory || {});`,
    "clear fallback on restore",
  );

  source = replaceOnce(
    source,
    `  const continueSavedLogo = (entry) => {`,
    `  const useLogoFallbackOption = () => {\n    if (!logoFallbackOption?.image) return;\n    setLogoImage(logoFallbackOption.image);\n    setLogoImageSource(logoFallbackOption.source || "instant-svg");\n    setLogoVectorImage(logoFallbackOption.vectorImage || logoFallbackOption.image);\n    setLogoSvg(logoFallbackOption.svg || "");\n    setLogoTransparentSvg(logoFallbackOption.transparentSvg || logoFallbackOption.svg || "");\n    setLogoVariations((Array.isArray(logoFallbackOption.variations) ? logoFallbackOption.variations : []).slice(0, 1));\n    setLogoCreativeBrief(logoFallbackOption.creativeBrief || null);\n    if (logoFallbackOption.generationMemory) setLogoGenerationMemory(logoFallbackOption.generationMemory);\n    setLogoGenerationError("");\n    setLogoFallbackOption(null);\n    setResult("Editable vector logo created.\\n\\nAI logo generation was unavailable, so you chose to use the instant editable vector fallback.");\n    trackBrandthatEvent("logo_instant_vector_selected", {\n      code: logoFallbackOption.errorCode || "",\n      requestId: logoFallbackOption.requestId || "",\n    });\n  };\n\n  const continueSavedLogo = (entry) => {`,
    "use explicit logo fallback",
  );

  source = replaceOnce(
    source,
    `          logoCreativeBrief={logoCreativeBrief}\n          logoGenerationMemory={logoGenerationMemory}`,
    `          logoCreativeBrief={logoCreativeBrief}\n          logoFallbackOption={logoFallbackOption}\n          logoGenerationMemory={logoGenerationMemory}`,
    "seo logo fallback prop",
  );

  source = replaceOnce(
    source,
    `          setLogoAsBrandProfile={setLogoAsBrandProfile}\n          onStartWorkspace={startWorkspaceFromCurrentLogo}`,
    `          setLogoAsBrandProfile={setLogoAsBrandProfile}\n          onUseLogoFallback={useLogoFallbackOption}\n          onStartWorkspace={startWorkspaceFromCurrentLogo}`,
    "seo logo fallback action",
  );

  source = replaceOnce(
    source,
    `            logoCreativeBrief={logoCreativeBrief}\n            logoGenerationMemory={logoGenerationMemory}`,
    `            logoCreativeBrief={logoCreativeBrief}\n            logoFallbackOption={logoFallbackOption}\n            logoGenerationMemory={logoGenerationMemory}`,
    "app logo fallback prop",
  );

  source = replaceOnce(
    source,
    `            setLogoAsBrandProfile={setLogoAsBrandProfile}\n            onStartWorkspace={startWorkspaceFromCurrentLogo}`,
    `            setLogoAsBrandProfile={setLogoAsBrandProfile}\n            onUseLogoFallback={useLogoFallbackOption}\n            onStartWorkspace={startWorkspaceFromCurrentLogo}`,
    "app logo fallback action",
  );

  source = replaceOnce(
    source,
    `  logoCreativeBrief,\n  logoGenerationMemory,`,
    `  logoCreativeBrief,\n  logoFallbackOption,\n  logoGenerationMemory,`,
    "SEOPage fallback prop",
  );

  source = replaceOnce(
    source,
    `  setLogoAsBrandProfile,\n  onStartWorkspace,`,
    `  setLogoAsBrandProfile,\n  onUseLogoFallback = () => {},\n  onStartWorkspace,`,
    "SEOPage fallback action",
  );

  source = replaceOnce(
    source,
    `          logoCreativeBrief={logoCreativeBrief}\n          logoGenerationMemory={logoGenerationMemory}`,
    `          logoCreativeBrief={logoCreativeBrief}\n          logoFallbackOption={logoFallbackOption}\n          logoGenerationMemory={logoGenerationMemory}`,
    "SEOPage GeneratorCard fallback prop",
  );

  source = replaceOnce(
    source,
    `            setLogoAsBrandProfile={setLogoAsBrandProfile}\n          onStartWorkspace={onStartWorkspace}`,
    `            setLogoAsBrandProfile={setLogoAsBrandProfile}\n          onUseLogoFallback={onUseLogoFallback}\n          onStartWorkspace={onStartWorkspace}`,
    "SEOPage GeneratorCard fallback action",
  );

  source = replaceOnce(
    source,
    `  logoVariations = [],\n  logoCreativeBrief = null,\n  logoGenerationMemory = {},`,
    `  logoVariations = [],\n  logoCreativeBrief = null,\n  logoFallbackOption = null,\n  logoGenerationMemory = {},`,
    "GeneratorCard fallback prop",
  );

  source = replaceOnce(
    source,
    `  setLogoAsBrandProfile,\n  onStartWorkspace = () => {},`,
    `  setLogoAsBrandProfile,\n  onUseLogoFallback = () => {},\n  onStartWorkspace = () => {},`,
    "GeneratorCard fallback action",
  );

  source = replaceOnce(
    source,
    `      {activeTool.key === "logo" && logoGenerationError && !loading && (\n        <div className="generatorErrorPanel">\n          <strong>Logo generation did not finish.</strong>\n          <span>{logoGenerationError}</span>\n          <button onClick={generate}>Try again</button>\n        </div>\n      )}`,
    `      {activeTool.key === "logo" && logoGenerationError && !loading && (\n        <div className="generatorErrorPanel" role="alert" aria-live="assertive">\n          <strong>Logo generation did not finish.</strong>\n          <span>{logoGenerationError}</span>\n          <div className="generatorErrorActions">\n            <button onClick={generate}>Retry AI Generation</button>\n            {logoFallbackOption?.image && (\n              <button onClick={onUseLogoFallback}>Use Instant Vector Instead</button>\n            )}\n          </div>\n        </div>\n      )}`,
    "logo error actions",
  );

  source = replaceOnce(
    source,
    `.generatorErrorPanel button{width:max-content;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 12px;font-weight:850;cursor:pointer;color:#111}`,
    `.generatorErrorPanel button{width:max-content;background:white;border:1px solid rgba(0,0,0,.08);border-radius:999px;padding:9px 12px;font-weight:850;cursor:pointer;color:#111}\n.generatorErrorActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}\n.generatorErrorActions button:first-child{background:#111;color:white}`,
    "logo error action styles",
  );

  writeFileSync(path, source);
}

function patchTests() {
  const path = new URL("./test-primary-logo-contract.mjs", import.meta.url);
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    `assert(logoFunction.includes("fallback: true"), "Logo function must identify instant-vector fallback responses.");\nassert(logoFunction.includes("providerError"), "Logo function must return safe provider diagnostics for fallback responses.");\nassert(logoFunction.includes("Logo generation is temporarily unavailable."), "Logo function must return structured JSON failure messages.");`,
    `assert(logoFunction.includes("return json(503") && logoFunction.includes("fallback: {"), "Logo function must return honest structured provider failures with an explicit fallback option.");\nassert(logoFunction.includes("providerError"), "Logo function must return safe provider diagnostics for fallback responses.");\nassert(logoFunction.includes("AI logo generation is temporarily unavailable."), "Logo function must return structured JSON failure messages.");\nassert(app.includes("const [logoFallbackOption, setLogoFallbackOption] = useState(null)"), "App must define logo fallback state before rendering the error panel.");\nassert(app.includes("logoFallbackOption = null"), "GeneratorCard must receive a safe default fallback option prop.");\nassert(app.includes("onUseLogoFallback = () => {}"), "GeneratorCard must receive a safe fallback action prop.");\nassert(app.includes("Retry AI Generation"), "Logo failure UI must expose a retry action.");\nassert(app.includes("Use Instant Vector Instead"), "Logo failure UI must expose an explicit instant-vector choice.");\nassert(!app.includes("BrandThat created an instant editable fallback instead"), "Timeout copy must not claim the fallback was generated before the user chooses it.");`,
    "logo fallback contract test",
  );

  writeFileSync(path, source);
}

patchLogoFunction();
patchApp();
patchTests();
console.log("Logo runtime fixes applied.");
