const HTML_BREAK_RE = /<(br|br\/)\s*\/?>/gi;
const HTML_BLOCK_END_RE = /<\/(p|div|section|article|li|h1|h2|h3|h4|h5|h6)>/gi;
const HTML_LIST_ITEM_RE = /<li[^>]*>/gi;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;
const HTML_TAG_RE = /<[^>]+>/g;

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
