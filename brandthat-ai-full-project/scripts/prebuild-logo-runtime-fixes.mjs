import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) {
    console.warn(`Logo runtime prebuild skipped ${label}; source already differs.`);
    return source;
  }
  return source.replace(needle, replacement);
}

function replaceBetween(source, startNeedle, endNeedle, replacement, label) {
  if (source.includes(replacement)) return source;
  const start = source.indexOf(startNeedle);
  if (start === -1) {
    console.warn(`Logo runtime prebuild skipped ${label}; start block already differs.`);
    return source;
  }
  const end = source.indexOf(endNeedle, start);
  if (end === -1) {
    console.warn(`Logo runtime prebuild skipped ${label}; end block already differs.`);
    return source;
  }
  return `${source.slice(0, start)}${replacement}${source.slice(end + endNeedle.length)}`;
}

function patchLogoFunction() {
  const path = new URL("../netlify/functions/logo-image.js", import.meta.url);
  let source = readFileSync(path, "utf8");

  if (
    source.includes(`from "./lib/membership.js"`) &&
    source.includes("export const handler = async") &&
    source.includes("return json(503") &&
    source.includes("fallback: {")
  ) {
    writeFileSync(path, source);
    return;
  }

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

  writeFileSync(path, source);
}

function patchTests() {
  const path = new URL("./test-primary-logo-contract.mjs", import.meta.url);
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    `assert(logoFunction.includes("fallback: true"), "Logo function must identify instant-vector fallback responses.");\nassert(logoFunction.includes("providerError"), "Logo function must return safe provider diagnostics for fallback responses.");\nassert(logoFunction.includes("Logo generation is temporarily unavailable."), "Logo function must return structured JSON failure messages.");`,
    `assert(logoFunction.includes("return json(503") && logoFunction.includes("fallback: {"), "Logo function must return honest structured provider failures with an explicit fallback option.");\nassert(logoFunction.includes("providerError"), "Logo function must return safe provider diagnostics for fallback responses.");\nassert(logoFunction.includes("AI logo generation is temporarily unavailable."), "Logo function must return structured JSON failure messages.");`,
    "logo fallback contract test",
  );

  writeFileSync(path, source);
}

patchLogoFunction();
patchApp();
patchTests();
console.log("Logo runtime fixes applied.");
