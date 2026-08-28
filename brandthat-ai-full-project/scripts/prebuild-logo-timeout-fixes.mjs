import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) throw new Error(`Missing expected block: ${label}`);
  return source.replace(needle, replacement);
}

function insertBeforeOnce(source, marker, addition, label) {
  if (source.includes(addition)) return source;
  if (!source.includes(marker)) throw new Error(`Missing expected marker: ${label}`);
  return source.replace(marker, `${addition}${marker}`);
}

function patchApp() {
  const path = new URL("../src/App.jsx", import.meta.url);
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    `        timeoutMs: 22000,\n        errorMessage: "Logo generation failed.",\n        timeoutMessage: "AI logo generation is temporarily unavailable.\\nError code: LOGO_IMAGE_CLIENT_TIMEOUT"`,
    `        timeoutMs: 55000,\n        errorMessage: "Logo generation failed.",\n        timeoutMessage: "AI logo generation is temporarily unavailable.\\nError code: LOGO_IMAGE_CLIENT_TIMEOUT"`,
    "logo-image client timeout",
  );

  writeFileSync(path, source);
}

function patchLogoFunction() {
  const path = new URL("../netlify/functions/logo-image.js", import.meta.url);
  let source = readFileSync(path, "utf8");

  source = replaceOnce(
    source,
    `  const requestId = getRequestId("logo_image");`,
    `  const requestId = getRequestId("logo_image");\n  const requestStartedAt = Date.now();\n  const logTiming = (stage, fields = {}) => {\n    console.info("BrandThat logo-image timing", {\n      requestId,\n      stage,\n      durationMs: Date.now() - requestStartedAt,\n      ...fields,\n    });\n  };\n  logTiming("request_received");`,
    "logo-image timing init",
  );

  source = replaceOnce(
    source,
    `    const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 50000);\n    const controller = new AbortController();`,
    `    const timeoutMs = Number(process.env.LOGO_IMAGE_TIMEOUT_MS || 50000);\n    const model = process.env.LOGO_IMAGE_MODEL || "gpt-image-1";\n    const controller = new AbortController();`,
    "logo-image model timing vars",
  );

  source = replaceOnce(
    source,
    `    try {\n      const image = await generateOpenAiLogo({ finalPrompt, signal: controller.signal });\n      clearTimeout(timeout);`,
    `    try {\n      logTiming("openai_request_started", { model, timeoutMs });\n      const image = await generateOpenAiLogo({ finalPrompt, signal: controller.signal });\n      clearTimeout(timeout);\n      logTiming("openai_response_received", { model });`,
    "logo-image openai timing",
  );

  source = replaceOnce(
    source,
    `      return {\n        statusCode: 200,\n        body: JSON.stringify({`,
    `      logTiming("response_serialization_started", { statusCode: 200, source: "brand-guarded-svg" });\n      logTiming("response_returned", { statusCode: 200, source: "brand-guarded-svg" });\n\n      return {\n        statusCode: 200,\n        body: JSON.stringify({`,
    "logo-image success response timing",
  );

  source = replaceOnce(
    source,
    `      const providerCode = imageError?.code || imageError?.type || imageError?.name || "LOGO_IMAGE_PROVIDER_FAILED";\n      console.warn("BrandThat logo image provider failed", {`,
    `      const providerCode = imageError?.code || imageError?.type || imageError?.name || "LOGO_IMAGE_PROVIDER_FAILED";\n      logTiming("generation_failed", {\n        model,\n        code: providerCode,\n        statusCode: imageError?.status || imageError?.statusCode || null,\n        timedOut: imageError?.name === "AbortError",\n      });\n      console.warn("BrandThat logo image provider failed", {`,
    "logo-image provider failure timing",
  );

  source = replaceOnce(
    source,
    `  } catch (error) {\n    console.error("BrandThat logo image function failed", {`,
    `  } catch (error) {\n    logTiming("generation_failed", {\n      code: error?.code || error?.type || "LOGO_IMAGE_FUNCTION_FAILED",\n      statusCode: error?.status || error?.statusCode || null,\n      timedOut: error?.name === "AbortError",\n    });\n    console.error("BrandThat logo image function failed", {`,
    "logo-image top-level failure timing",
  );

  writeFileSync(path, source);
}

function patchTests() {
  const path = new URL("./test-primary-logo-contract.mjs", import.meta.url);
  let source = readFileSync(path, "utf8");
  const assertions = `assert(app.includes("timeoutMs: 55000"), "Logo image client request must wait for the server OpenAI window instead of aborting at 22s.");\nassert(logoFunction.includes("logTiming(\\\"request_received\\\")"), "Logo function must log request_received timing.");\nassert(logoFunction.includes("logTiming(\\\"openai_request_started\\\""), "Logo function must log OpenAI request start timing.");\nassert(logoFunction.includes("logTiming(\\\"openai_response_received\\\""), "Logo function must log OpenAI response timing.");\nassert(logoFunction.includes("logTiming(\\\"response_returned\\\""), "Logo function must log response return timing.");\nassert(logoFunction.includes("logTiming(\\\"generation_failed\\\""), "Logo function must log sanitized generation failure timing.");\n`;

  source = insertBeforeOnce(source, `console.log("Primary logo contract checks passed.");`, assertions, "logo timeout/timing contract assertions");

  writeFileSync(path, source);
}

patchApp();
patchLogoFunction();
patchTests();
console.log("Logo timeout and timing fixes applied.");
