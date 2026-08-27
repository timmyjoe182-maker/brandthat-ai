export const GENERIC_SECTION_PATTERNS = [
  /use readable typography/i,
  /use professional colors/i,
  /create a visual identity/i,
  /stand out/i,
  /build trust/i,
  /appeal to (a )?wide audience/i,
  /modern and professional/i,
  /clean and simple/i,
  /high quality/i,
  /target customers/i,
  /increase brand awareness/i,
  /engage with (your )?audience/i,
  /post consistently/i,
  /premium feel/i,
  /clear offer/i,
];

export function cleanGeneratedText(text = "") {
  return String(text)
    .replace(/\*\*/g, "")
    .replace(/__+/g, "")
    .replace(/^\s*[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function isGenericRecommendation(value = "") {
  const text = cleanGeneratedText(value);
  if (text.length < 55) return true;
  const lower = text.toLowerCase();
  if (GENERIC_SECTION_PATTERNS.some((pattern) => pattern.test(lower))) return true;
  const uniqueWords = new Set(lower.split(/[^a-z0-9]+/).filter((word) => word.length > 3));
  return uniqueWords.size < 9;
}

export function ensureThesisDriven(value, replacement) {
  return isGenericRecommendation(value) ? replacement : cleanGeneratedText(value);
}

export function makeTaglines({ brandName = "Brand", industry = "brand", opportunity = "trust" } = {}) {
  const noun = String(industry || "brand").replace(/\s*\/.*$/, "");
  const lower = `${brandName} ${industry}`.toLowerCase();
  if (/houseplant|plant delivery|apartment greenery|indoor plant|plant subscription|plant care/.test(lower)) {
    return [
      `${brandName} makes greenery easier to keep.`,
      "Apartment plants, delivered with confidence.",
      "Greener rooms. Simpler care.",
      "Plants beginners can keep alive.",
      "Local greenery for smaller spaces.",
      "Care cards included. Confidence delivered.",
    ];
  }
  if (/dog|pet groom|grooming|pet care/.test(lower)) {
    return [
      `${brandName} brings gentle care to the driveway.`,
      "Clean pets, calmer days.",
      "Mobile grooming without the stressful trip.",
      "Trusted care for busy families and older pets.",
    ];
  }
  if (/coffee|hiker|outdoor event|trail/.test(lower)) {
    return [
      `${brandName} keeps the trail warm.`,
      "Coffee built for the next mile.",
      "Better energy, served outdoors.",
      "A warm stop wherever the day starts.",
    ];
  }
  if (/sponsor|invoice|creator|software|saas|platform|desk/.test(lower)) {
    return [
      `${brandName} keeps creator work in order.`,
      "Sponsorships, invoices, and deadlines in one place.",
      "Less admin between creators and paid work.",
      "The calmer way to manage brand deals.",
    ];
  }
  const options = {
    luxury: [`${brandName}, quietly exceptional.`, `Made for the rare ${noun} moment.`, `A more considered way to choose ${noun}.`, `Where restraint becomes recognition.`],
    convenience: [`${brandName} makes the next step easier.`, `${noun} without the usual friction.`, `Less hassle. More momentum.`, `Built for the easy yes.`],
    trust: [`${brandName} brings certainty closer.`, `Clearer decisions for serious moments.`, `The steady way forward.`, `Confidence, handled with care.`],
    craftsmanship: [`${brandName}, shaped with care.`, `Craft you can recognize.`, `Made with origin, finished with intention.`, `A more personal kind of ${noun}.`],
    speed: [`${brandName} moves ideas faster.`, `Less waiting. Sharper work.`, `Momentum with a clearer system.`, `Built for the next version.`],
    status: [`${brandName} signals taste without noise.`, `Recognized by restraint.`, `For the moment that should feel elevated.`, `A sharper expression of taste.`],
    sustainability: [`${brandName}, rooted in better choices.`, `Natural progress, made visible.`, `A brand with origin and intention.`, `Better materials. Better meaning.`],
    innovation: [`${brandName} turns complexity into clarity.`, `The future, made usable.`, `A cleaner way to move forward.`, `Intelligence with a human reason.`],
    nostalgia: [`${brandName} brings heritage forward.`, `Old soul. New standard.`, `A classic feeling, remade with care.`, `Rooted in memory, built for now.`],
    affordability: [`${brandName} makes good feel reachable.`, `Better choices without the premium barrier.`, `Useful, honest, and within reach.`, `Everyday value with a clearer point of view.`],
    joy: [`${brandName} makes the moment brighter.`, `Built for the happy yes.`, `More color for the moments people remember.`, `A playful reason to gather.`],
  };
  return options[opportunity] || options.trust;
}
