import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const appPath = path.join(root, "src/App.jsx");
const qualityPath = path.join(root, "src/brandPlanQuality.js");
const globalGuardPath = path.join(root, "src/globalQualityGuard.js");

const requiredWorkspaceHelpers = [
  "ensureThesisDriven",
  "makeTaglines",
  "selectPlatformStrategy",
  "getBrandDNA",
  "getWhyThisWorks",
  "getCustomerPsychology",
  "getRealityCheck",
  "getPositioningScorecard",
  "getExpandedRoadmap",
  "getLaunchChecklist",
  "getRevenuePlan",
  "getCreativeDirectorNotes",
  "normalizeRoadmapItems",
];

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function hasFunctionOrImport(source, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`function\\s+${escaped}\\s*\\(`).test(source) ||
    new RegExp(`(?:const|let|var)\\s+${escaped}\\b`).test(source) ||
    new RegExp(`import\\s+\\{[^}]*\\b${escaped}\\b[^}]*\\}\\s+from`).test(source);
}

const app = read(appPath);
const quality = read(qualityPath);
const globalGuard = read(globalGuardPath);
const failures = [];

for (const helper of requiredWorkspaceHelpers) {
  const isCalled = new RegExp(`\\b${helper}\\s*\\(`).test(app);
  if (!isCalled) continue;
  if (!hasFunctionOrImport(app, helper)) {
    failures.push(`src/App.jsx calls ${helper}(...) but does not define or import it.`);
  }
}

for (const sharedHelper of ["ensureThesisDriven", "makeTaglines"]) {
  if (!new RegExp(`export\\s+function\\s+${sharedHelper}\\s*\\(`).test(quality)) {
    failures.push(`src/brandPlanQuality.js must export ${sharedHelper}(...).`);
  }
  if (!new RegExp(`globalThis\\.${sharedHelper}\\s*=`).test(globalGuard)) {
    failures.push(`src/globalQualityGuard.js must expose globalThis.${sharedHelper}.`);
  }
}

if (failures.length) {
  console.error("Undefined workspace helper check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Undefined workspace helper check passed.");
