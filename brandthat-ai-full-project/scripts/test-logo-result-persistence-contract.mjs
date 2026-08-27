import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

function assert(condition, message) {
  if (!condition) {
    console.error(`Logo persistence contract failed: ${message}`);
    process.exit(1);
  }
}

assert(
  app.includes(`completeLabel: "Primary logo set"`) && app.includes(`complete: hasLogo`),
  "logo completion must depend on a persisted primary workspace logo, not only a saved concept"
);

assert(
  !app.includes(`complete: hasSaved("logos") || Boolean(brand?.logoImage)`),
  "saved logo concepts must not complete the primary-logo checklist item by themselves"
);

assert(
  app.includes(`const saveCurrentLogoConcept = async`),
  "current generated logo needs an explicit durable save handler"
);

assert(
  app.includes(`Save Logo Concept`) && app.includes(`Set as Primary Logo`) && app.includes(`Download Preview`),
  "logo result actions must be explicit: save concept, set primary, and download"
);

assert(
  !app.includes(`<button onClick={onStartWorkspace}>Save Brand Project</button>`),
  "logo result must not use the generic workspace-prep Save Brand Project action"
);

assert(
  !app.includes(`Primary mark generated`) && !app.includes(`Colors, type, avatar, and exports ready`) && !app.includes(`Workspace ready`),
  "logo result must not claim primary/export/workspace states before persistence"
);

assert(
  app.includes(`workspaceLogoContext={structuredLogoContext}`),
  "Creative Director summary should receive structured workspace context"
);

assert(
  app.includes(`activeBrand ? getIdentityPalette(activeBrand, workspacePlan)`) && app.includes(`activeBrand ? getIdentityTypography(activeBrand, workspacePlan)`),
  "lightweight logo brand kit should use the active workspace identity system first"
);

console.log("Logo result persistence contract passed.");
