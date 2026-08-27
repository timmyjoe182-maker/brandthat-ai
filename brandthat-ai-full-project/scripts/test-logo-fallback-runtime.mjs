import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appPath = join(__dirname, "../src/App.jsx");
const source = readFileSync(appPath, "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}`);
  assert(start !== -1, `Expected ${name} to exist in App.jsx`);
  if (name === "buildLogoFallbackOption") {
    const end = source.indexOf("\nfunction trackBrandthatEvent", start);
    assert(end !== -1, "Expected buildLogoFallbackOption to be followed by trackBrandthatEvent");
    return source.slice(start, end);
  }
  let index = source.indexOf("{", start);
  let depth = 0;
  for (; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert(false, `Could not extract ${name}`);
}

const runtimeSource = [
  `function createClientFallbackLogo() { throw new Error("createClientFallbackLogo should not be needed when server fallback payload is present."); }`,
  extractFunction("stableStringHash"),
  extractFunction("buildLogoFallbackOption"),
  `
  const serverFallback = {
    image: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjx0ZXh0PlN0b25lICZhbXA7IFN0ZW08L3RleHQ+PC9zdmc+",
    vectorImage: "data:image/svg+xml;base64,PHN2Zy8+",
    svg: "<svg><text>Stone &amp; Stem</text></svg>",
    transparentSvg: "<svg><text>Stone &amp; Stem</text></svg>",
    source: "instant-svg",
    variations: [{
      id: "server-instant-vector",
      name: "Instant Vector",
      image: "data:image/svg+xml;base64,PHN2Zy8+",
      svg: "<svg><text>Stone &amp; Stem</text></svg>",
    }],
    creativeBrief: {
      palette: "Leaf Green #3F6F45, Stone Gray #827F73, Warm Ivory #F6F0E3, Soft Terracotta #B86F4B",
      typography: "Warm botanical serif plus readable humanist sans",
    },
    note: "Instant editable vector fallback is available if you choose to use it.",
  };
  const stoneFallback = buildLogoFallbackOption(serverFallback, {
    brandName: "Stone & Stem",
    logoIndustry: "Houseplants / local plant delivery",
    logoStyle: "Friendly, Minimal",
    logoColors: "Leaf Green #3F6F45, Stone Gray #827F73, Warm Ivory #F6F0E3, Soft Terracotta #B86F4B",
    userPrompt: "Create an icon plus wordmark for apartment-friendly plant delivery.",
  }, {
    code: "LOGO_IMAGE_CLIENT_TIMEOUT",
    requestId: "runtime-test-request",
  });
  const stoneFallbackAgain = buildLogoFallbackOption(serverFallback, {
    brandName: "Stone & Stem",
    logoIndustry: "Houseplants / local plant delivery",
    logoStyle: "Friendly, Minimal",
    logoColors: "Leaf Green #3F6F45, Stone Gray #827F73, Warm Ivory #F6F0E3, Soft Terracotta #B86F4B",
    userPrompt: "Create an icon plus wordmark for apartment-friendly plant delivery.",
  }, {
    code: "LOGO_IMAGE_CLIENT_TIMEOUT",
    requestId: "runtime-test-request",
  });
  const signalFallback = buildLogoFallbackOption(serverFallback, {
    brandName: "SignalDesk",
    logoIndustry: "Creator sponsorship software",
    logoStyle: "Clean, structured",
    logoColors: "Ink, blue, white",
    userPrompt: "Create a software logo for sponsorship workflows.",
  }, {
    code: "LOGO_IMAGE_CLIENT_TIMEOUT",
    requestId: "runtime-test-request",
  });
  globalThis.results = { stoneFallback, stoneFallbackAgain, signalFallback };
  `,
].join("\n\n");

const context = vm.createContext({});
vm.runInContext(runtimeSource, context, { filename: "logo-fallback-runtime.vm.js" });

const { stoneFallback, stoneFallbackAgain, signalFallback } = context.results;

assert(typeof context.stableStringHash === "function", "stableStringHash must be callable in the extracted runtime.");
assert(stoneFallback.id === stoneFallbackAgain.id, "Same fallback input must produce the same stable fallback ID.");
assert(stoneFallback.id !== signalFallback.id, "Different fallback input must produce a different stable fallback ID.");
assert(stoneFallback.id.startsWith("instant-vector-"), "Fallback ID must identify instant-vector source.");
assert(stoneFallback.name === "Instant Vector", "Fallback option must be clearly named Instant Vector.");
assert(stoneFallback.type === "instant-vector", "Fallback option must use instant-vector type.");
assert(stoneFallback.image?.startsWith("data:image/svg+xml;base64,"), "Fallback option must include preview image data.");
assert(stoneFallback.svg?.includes("Stone &amp; Stem"), "Fallback SVG must preserve the active brand name.");
assert(stoneFallback.variations?.length === 1, "Fallback must render exactly one direction.");
assert(stoneFallback.errorCode === "LOGO_IMAGE_CLIENT_TIMEOUT", "Fallback must preserve safe error code.");
assert(stoneFallback.requestId === "runtime-test-request", "Fallback must preserve safe request ID.");
assert(source.includes("Retry AI Generation"), "Failed logo state must show Retry AI Generation.");
assert(source.includes("Use Instant Vector Instead"), "Failed logo state must show Use Instant Vector Instead.");
assert(source.includes("const useLogoFallbackOption = () => {"), "Fallback selection handler must be present.");
assert(!source.includes("hashString(stableSeed"), "Client fallback builder must not reference server-only hashString.");
assert(!source.includes("BrandThat created an instant editable fallback instead"), "Client timeout copy must not claim fallback was generated before user chooses it.");

console.log("Logo fallback runtime contract passed.");
