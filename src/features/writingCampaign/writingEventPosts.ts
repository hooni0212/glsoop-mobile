import { apiGet } from "@/lib/api";
import { normalizePostPreviewText } from "@/lib/postContent";
import type { PostType } from "@/types/post";

export type WritingEventPost = {
  id: string;
  title: string;
  excerpt: string;
  category: PostType;
  createdAt: string | null;
  eventKey: string;
  eventTitle: string | null;
  promptKey: string;
  promptDay: number | null;
  promptTitle: string | null;
  promptBody: string | null;
};

type WritingEventPostsResponse = {
  ok?: boolean;
  message?: string;
  event_key?: unknown;
  posts?: unknown;
};

function toRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function toText(input: unknown, fallback = "") {
  if (typeof input === "string") return input;
  if (typeof input === "number" && Number.isFinite(input)) return String(input);
  return fallback;
}

function toNullableText(input: unknown) {
  const value = toText(input).trim();
  return value.length > 0 ? value : null;
}

function toPostCategory(input: unknown): PostType {
  const value = toText(input).trim();
  return value === "poem" || value === "essay" || value === "short" ? value : "short";
}

function toNullableNumber(input: unknown) {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeWritingEventPost(input: unknown): WritingEventPost | null {
  const row = toRecord(input);
  const id = toText(row.id).trim();
  const promptKey = toText(row.prompt_key ?? row.promptKey).trim();
  const eventKey = toText(row.event_key ?? row.eventKey).trim();
  if (!id || !promptKey || !eventKey) return null;

  return {
    id,
    title: toText(row.title, "제목 없는 글"),
    excerpt: normalizePostPreviewText(row.excerpt),
    category: toPostCategory(row.category),
    createdAt: toNullableText(row.created_at ?? row.createdAt),
    eventKey,
    eventTitle: toNullableText(row.event_title ?? row.eventTitle),
    promptKey,
    promptDay: toNullableNumber(row.prompt_day ?? row.promptDay),
    promptTitle: toNullableText(row.prompt_title ?? row.promptTitle),
    promptBody: toNullableText(row.prompt_body ?? row.promptBody),
  };
}

export async function fetchWritingEventPosts(eventKey: string, limit = 12) {
  const encoded = encodeURIComponent(eventKey);
  const safeLimit = Math.max(1, Math.min(30, Math.floor(limit)));
  const res = await apiGet<WritingEventPostsResponse>(
    `/api/writing-events/${encoded}/me/posts?limit=${safeLimit}`
  );

  if (!res?.ok) {
    throw new Error(res?.message || "글쓰기 이벤트 글 목록을 불러오지 못했어요.");
  }

  const rawPosts = Array.isArray(res.posts) ? res.posts : [];
  return rawPosts
    .map(normalizeWritingEventPost)
    .filter((item): item is WritingEventPost => item !== null);
}
