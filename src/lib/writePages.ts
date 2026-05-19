import type { PostType } from "@/types/post";

export type WritePageDraft = {
  id: string;
  body: string;
};

export type WritePageInsight = {
  characterCount: number;
  lineCount: number;
  densityLabel: string;
  isOverLimit: boolean;
};

export const WRITE_PAGE_MAX_COUNT = 8;
export const WRITE_PAGE_MAX_CHARS = 1000;
export const WRITE_TOTAL_MAX_CHARS = WRITE_PAGE_MAX_COUNT * WRITE_PAGE_MAX_CHARS;

const ESTIMATED_PAGE_CAPACITY: Record<PostType, number> = {
  short: 190,
  poem: 300,
  essay: 500,
};

function makePageId(index = 0) {
  return `page-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePageBody(input: unknown) {
  if (typeof input !== "string") return "";
  return input.replace(/\r\n?/g, "\n");
}

export function createWritePageDraft(body = "", index = 0): WritePageDraft {
  return {
    id: makePageId(index),
    body: normalizePageBody(body),
  };
}

export function normalizeWritePageDrafts(input: unknown, fallbackBody = ""): WritePageDraft[] {
  const source = Array.isArray(input) && input.length > 0
    ? input
    : typeof fallbackBody === "string" && fallbackBody.trim()
      ? [fallbackBody]
      : [];

  const pages = source
    .slice(0, WRITE_PAGE_MAX_COUNT)
    .map((item, index) => {
      const body =
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "body" in item
            ? (item as { body?: unknown }).body
            : "";
      return createWritePageDraft(normalizePageBody(body), index);
    });

  return pages.length > 0 ? pages : [createWritePageDraft()];
}

export function flattenWritePages(pages: WritePageDraft[]) {
  return pages.map((page) => page.body.trim()).filter(Boolean).join("\n\n");
}

export function getSubmissionContentPages(pages: WritePageDraft[]) {
  const bodies = pages
    .slice(0, WRITE_PAGE_MAX_COUNT)
    .map((page) => normalizePageBody(page.body).trim());

  while (bodies.length > 1 && !bodies[bodies.length - 1]) {
    bodies.pop();
  }

  return bodies.some(Boolean) ? bodies : [];
}

function countContentCharacters(value: string) {
  return Array.from(value.replace(/\s/g, "")).length;
}

export function analyzeWritePage(body: string, type: PostType): WritePageInsight {
  const normalized = normalizePageBody(body);
  const characterCount = countContentCharacters(normalized);
  const lineCount = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean).length;
  const capacity = ESTIMATED_PAGE_CAPACITY[type] ?? ESTIMATED_PAGE_CAPACITY.short;
  const ratio = characterCount / Math.max(1, capacity);
  const densityLabel =
    characterCount === 0
      ? "대기"
      : ratio < 0.35
        ? "여백 넉넉"
        : ratio < 0.72
          ? "균형 좋음"
          : ratio < 1
            ? "조금 빽빽"
            : "초과";

  return {
    characterCount,
    lineCount,
    densityLabel,
    isOverLimit: characterCount > WRITE_PAGE_MAX_CHARS,
  };
}
