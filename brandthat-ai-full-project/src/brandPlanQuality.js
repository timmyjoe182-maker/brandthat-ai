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
