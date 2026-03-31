const HTML_BREAK_RE = /<(br|br\/)\s*\/?>/gi;
const HTML_BLOCK_END_RE = /<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6)>/gi;
const HTML_LIST_ITEM_RE = /<li[^>]*>/gi;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HTML_TAG_RE = /<[^>]+>/g;
const FONT_META_RE = /<!--\s*FONT:(serif|sans|hand)\s*-->/i;

export type PostFontKey = "serif" | "sans" | "hand";

const ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

function decodeHtmlEntities(value: string) {
  return value.replace(/&([a-zA-Z0-9#]+);/g, (match, entity) => ENTITY_MAP[entity] ?? match);
}

export function extractPostFontKey(input: unknown): PostFontKey {
  if (typeof input !== "string") return "serif";
  const match = input.match(FONT_META_RE);
  if (!match?.[1]) return "serif";
  const key = match[1].toLowerCase();
  return key === "sans" || key === "hand" ? key : "serif";
}

export function withPostFontMeta(input: string, fontKey: PostFontKey): string {
  const safeFontKey = fontKey === "sans" || fontKey === "hand" ? fontKey : "serif";
  const content = typeof input === "string" ? input.replace(FONT_META_RE, "").trim() : "";
  return `<!--FONT:${safeFontKey}-->${content}`;
}

export function normalizePostEditorText(input: unknown): string {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  const withBreaks = trimmed
    .replace(HTML_COMMENT_RE, "")
    .replace(HTML_BREAK_RE, "\n")
    .replace(HTML_BLOCK_END_RE, "\n\n")
    .replace(HTML_LIST_ITEM_RE, "• ");

  const withoutTags = withBreaks.replace(HTML_TAG_RE, " ");
  const decoded = decodeHtmlEntities(withoutTags)
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");

  return decoded.trim();
}

export function normalizePostReadText(input: unknown): string {
  return normalizePostEditorText(input)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizePostPreviewText(input: unknown): string {
  return normalizePostReadText(input)
    .replace(/\s*\n+\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function buildPostExcerpt(input: unknown, maxLen = 90): string {
  const normalized = normalizePostPreviewText(input);
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLen - 3)).trim()}...`;
}

export function splitPostParagraphs(input: unknown): string[] {
  const normalized = normalizePostReadText(input);
  if (!normalized) return [];

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
