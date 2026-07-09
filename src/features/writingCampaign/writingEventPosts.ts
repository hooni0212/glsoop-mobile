import { apiGet } from "@/lib/api";
import { normalizePostPreviewText } from "@/lib/postContent";
import type { PostType } from "@/types/post";
import {
  buildDailyWritingPromptWritePath,
  DAILY_WRITING_CAMPAIGN_KEY,
  type DailyWritingCampaignProgressStep,
  type DailyWritingCampaignStatus,
  type DailyWritingPrompt,
} from "./dailyWritingCampaign";

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

type WritingEventStatusResponse = {
  ok?: boolean;
  message?: string;
  event?: unknown;
  today_prompt?: unknown;
  prompts?: unknown;
  progress_steps?: unknown;
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

function toPositiveNumber(input: unknown, fallback: number) {
  const value = Number(input);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function toPercent(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toHashtags(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => toText(item).trim())
    .filter((item) => item.length > 0)
    .slice(0, 12);
}

function normalizeWritingEventPrompt(input: unknown): DailyWritingPrompt | null {
  const row = toRecord(input);
  const key = toText(row.key).trim();
  const title = toText(row.title).trim();
  const body = toText(row.body).trim();
  const day = toPositiveNumber(row.day, 0);
  if (!key || !title || day <= 0) return null;

  return {
    key,
    day,
    title,
    body,
    defaultCategory: toPostCategory(row.defaultCategory ?? row.default_category),
    suggestedHashtags: toHashtags(row.suggestedHashtags ?? row.suggested_hashtags),
  };
}

function normalizeWritingEventProgressStep(input: unknown): DailyWritingCampaignProgressStep | null {
  const prompt = normalizeWritingEventPrompt(input);
  if (!prompt) return null;
  const row = toRecord(input);
  const state = toText(row.state).trim();
  return {
    ...prompt,
    state: state === "completed" || state === "current" ? state : "upcoming",
  };
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

export async function fetchWritingEventStatus(eventKey = DAILY_WRITING_CAMPAIGN_KEY) {
  const encoded = encodeURIComponent(eventKey);
  const res = await apiGet<WritingEventStatusResponse>(`/api/writing-events/${encoded}`);

  if (!res?.ok) {
    throw new Error(res?.message || "글쓰기 이벤트 정보를 불러오지 못했어요.");
  }

  const event = toRecord(res.event);
  const prompt = normalizeWritingEventPrompt(res.today_prompt);
  if (event.active === false || !prompt) return null;

  const prompts = (Array.isArray(res.prompts) ? res.prompts : [])
    .map(normalizeWritingEventPrompt)
    .filter((item): item is DailyWritingPrompt => item !== null);
  const progressSteps = (Array.isArray(res.progress_steps) ? res.progress_steps : [])
    .map(normalizeWritingEventProgressStep)
    .filter((item): item is DailyWritingCampaignProgressStep => item !== null);
  const campaignKey = toText(event.key, eventKey).trim() || eventKey;
  const totalDays = toPositiveNumber(event.total_days ?? event.totalDays, prompts.length || prompt.day);
  const currentDay = toPositiveNumber(event.current_day ?? event.currentDay, prompt.day);
  const remoteWritePath = toText(
    toRecord(res.today_prompt).write_path ?? event.write_path ?? event.writePath
  ).trim();
  const status: DailyWritingCampaignStatus = {
    active: true,
    campaignKey,
    title: toText(event.title, "글숲 한달 글쓰기 프로젝트"),
    subtitle: toText(event.subtitle),
    totalDays,
    currentDay,
    completedDays: Math.max(0, Number(event.completed_days ?? event.completedDays) || currentDay - 1),
    prompt,
    progressPercent: toPercent(event.progress_percent ?? event.progressPercent),
    remainingDays: Math.max(0, Number(event.remaining_days ?? event.remainingDays) || totalDays - currentDay),
    localDateKey: toText(event.local_date_key ?? event.localDateKey),
    promptLabel: toText(event.prompt_label ?? event.promptLabel, "오늘의 글감"),
    promptSetKey: toNullableText(event.prompt_set_key ?? event.promptSetKey),
    promptSetStartsLocalDate:
      toNullableText(event.prompt_set_starts_local_date ?? event.promptSetStartsLocalDate) ??
      undefined,
    prompts: prompts.length > 0 ? prompts : [prompt],
    writePath: remoteWritePath,
  };
  if (progressSteps.length > 0) {
    status.progressSteps = progressSteps;
  }

  return {
    ...status,
    writePath: status.writePath || buildDailyWritingPromptWritePath(status),
  };
}
