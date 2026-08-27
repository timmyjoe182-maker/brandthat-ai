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
    `import OpenAI from "openai";\nimport styleSchema from "./logo-style-schemas.json";\nimport { getRequestId, json, requireVerifiedUser } from "./lib/membership.js";\n\nexport const config = {\n  timeout: 60,\n};`,
    "logo-image ESM imports",
  );

  source = replaceOnce(
    source,
    `let STYLE_SCHEMA = {};\ntry {\n  STYLE_SCHEMA = require("./logo-style-schemas.json");\n} catch {\n  STYLE_SCHEMA = {};\n}`,
    `const STYLE_SCHEMA = styleSchema || {};`,
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
    `const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 8000);`,
    `const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 50000);`,
    "logo-image timeout",
  );

  source = replaceBetween(
    source,
    `    } catch (imageError) {\n      clearTimeout(timeout);`,
    `    }\n  } catch (error) {`,
    `    } catch (imageError) {\n      clearTimeout(timeout);\n      const providerCode = imageError?.code || imageError?.type || imageError?.name || "LOGO_IMAGE_PROVIDER_FAILED";\n      console.warn("BrandThat logo image provider failed", {\n        requestId,\n        type: imageError?.type || imageError?.name,\n        code: imageError?.code,\n        statusCode: imageError?.status || imageError?.statusCode,\n        message: imageError?.message,\n      });\n\n      return json(503, {\n        ok: false,\n        code: providerCode,\n        message: "AI logo generation is temporarily unavailable.",\n        requestId,\n        providerError: {\n          code: providerCode,\n          statusCode: imageError?.status || imageError?.statusCode || null,\n        },\n        fallback: {\n          image: vectorLogo.image,\n          source: "instant-svg",\n          vectorImage: vectorLogo.image,\n          svg: vectorLogo.svg,\n          transparentSvg: vectorLogo.transparentSvg,\n          variations: vectorLogo.variations,\n          creativeBrief: vectorLogo.creativeBrief,\n          generationMemory: vectorLogo.generationMemory,\n          layers: vectorLogo.layers,\n          promptInterpreter,\n          brandStrategy,\n          qualityGate,\n          note: "AI logo generation is temporarily unavailable. Use the instant editable vector only if you choose that fallback.",\n        },\n      });\n    }\n  } catch (error) {`,
    "logo-image provider error branch",
  );

  source = source.replace(
    `        ok: false,\n        code: error?.code || error?.type || "LOGO_IMAGE_FUNCTION_FAILED",\n        message: "Logo generation is temporarily unavailable.",`,
    `        ok: false,\n        code: error?.code || error?.type || "LOGO_IMAGE_FUNCTION_FAILED",\n        message: "Logo generation is temporarily unavailable.",\n        requestId,`,
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

  source = replaceOnce(
    source,
    `  const [logoCreativeBrief, setLogoCreativeBrief] = useState(null);\n  const [logoGenerationError, setLogoGenerationError] = useState("");`,
    `  const [logoCreativeBrief, setLogoCreativeBrief] = useState(null);\n  const [logoFallbackOption, setLogoFallbackOption] = useState(null);\n  const [logoGenerationError, setLogoGenerationError] = useState("");`,
    "logo fallback state",
  );

  source = replaceOnce(
    source,
    `    setLogoImageSource("");\n    if (activeTool.key === "logo" && logoContext?.resetReason) {`,
    `    setLogoImageSource("");\n    setLogoFallbackOption(null);\n    if (activeTool.key === "logo" && logoContext?.resetReason) {`,
    "clear logo fallback option",
  );

  source = replaceOnce(
    source,
    `    } catch (error) {\n      if (error?.status === 429) throw error;\n      console.warn("Brandthat logo function unavailable, using instant fallback:", error);\n      return createClientFallbackLogo(requestPayload);\n    }\n\n    if (!data.image) {`,
    `    } catch (error) {\n      if (error?.data?.fallback) {\n        error.fallback = error.data.fallback;\n        throw error;\n      }\n      if (error?.status === 429) throw error;\n      throw error;\n    }\n\n    if (!data.image) {`,
    "stop silent logo fallback",
  );

  source = replaceOnce(
    source,
    `        setLogoGenerationError(error?.message || "Logo generation failed. Please try again with a clearer brand name and direction.");\n        setResult("");`,
    `        setLogoGenerationError(error?.message || "Logo generation failed. Please try again with a clearer brand name and direction.");\n        setLogoFallbackOption(error?.fallback || null);\n        setResult("");`,
    "store logo fallback option",
  );

  source = replaceOnce(
    source,
    `          <button onClick={generate}>Try again</button>\n        </div>\n      )}`,
    `          <div className="generatorErrorActions">\n            <button onClick={generate}>Retry AI Generation</button>\n            {logoFallbackOption && <button onClick={() => {\n              setLogoImage(logoFallbackOption.image);\n              setLogoImageSource(logoFallbackOption.source || "instant-svg");\n              setLogoVectorImage(logoFallbackOption.vectorImage || logoFallbackOption.image);\n              setLogoSvg(logoFallbackOption.svg || "");\n              setLogoTransparentSvg(logoFallbackOption.transparentSvg || logoFallbackOption.svg || "");\n              setLogoVariations(Array.isArray(logoFallbackOption.variations) ? logoFallbackOption.variations : []);\n              setLogoCreativeBrief(logoFallbackOption.creativeBrief || null);\n              if (logoFallbackOption.generationMemory) setLogoGenerationMemory(logoFallbackOption.generationMemory);\n              setLogoGenerationError("");\n              setLogoFallbackOption(null);\n              setResult("Editable vector logo created.\\\\n\\\\nAI logo generation was unavailable, so you chose to use the instant editable vector fallback.");\n            }}>Use Instant Vector Instead</button>}\n          </div>\n        </div>\n      )}`,
    "logo error actions",
  );

  source = replaceOnce(
    source,
    `.assetCardActions .miniDanger{border-color:rgba(145,34,18,.25);color:#8d2718}`,
    `.assetCardActions .miniDanger{border-color:rgba(145,34,18,.25);color:#8d2718}.generatorErrorActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.generatorErrorActions button{border:1px solid #11110f;border-radius:999px;background:#11110f;color:#fffdf8;padding:10px 14px;font-weight:850}`,
    "logo error action styles",
  );

  writeFileSync(path, source);
}

function patchTests() {
  const path = new URL("./test-primary-logo-contract.mjs", import.meta.url);
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    `assert(logoFunction.includes("fallback: true"), "Logo function must identify instant-vector fallback responses.");`,
    `assert(logoFunction.includes("return json(503") && logoFunction.includes("fallback: {"), "Logo function must return honest structured provider failures with an explicit fallback option.");`,
    "logo fallback contract test",
  );

  writeFileSync(path, source);
}

patchLogoFunction();
patchApp();
patchTests();
console.log("Logo runtime fixes applied.");