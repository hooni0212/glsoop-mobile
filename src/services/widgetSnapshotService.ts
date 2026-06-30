import { NativeModules, Platform } from "react-native";

import type { DailyWritingCampaignStatus } from "@/features/writingCampaign/dailyWritingCampaign";
import { buildRenderedPostShareImageUrl } from "@/lib/feedImage";
import { logger } from "@/lib/logger";
import { normalizePostBackgroundTemplateId } from "@/lib/postBackgroundTemplates";
import type { Post } from "@/types/post";

export const WIDGET_APP_GROUP_IDENTIFIER = "group.com.glsoop.app";
export const TODAY_PROMPT_WIDGET_SNAPSHOT_KEY = "glsoop.widget.todayPrompt.v1";
export const SENTENCE_FRAME_WIDGET_SNAPSHOT_KEY = "glsoop.widget.sentenceFrame.v1";

export type TodayPromptWidgetSnapshot = {
  version: 1;
  updatedAt: string;
  localDateKey: string;
  campaignKey: string;
  day: number;
  title: string;
  body: string;
  deepLink: string;
};

export type SentenceFrameWidgetSnapshot = {
  version: 1;
  updatedAt: string;
  premiumStatus: "active";
  postId: string;
  title: string;
  excerpt: string;
  authorName: string;
  imageUrl: string;
  deepLink: string;
};

type WidgetSnapshotNativeModule = {
  updateSnapshot?: (key: string, payload: string) => Promise<void>;
  removeSnapshot?: (key: string) => Promise<void>;
};

type WidgetSnapshotResult =
  | { ok: true }
  | { ok: false; reason: "unavailable" | "native_error"; message?: string };

type SentenceFrameSourcePost = Post & {
  content?: string | null;
  contentRaw?: string | null;
  paragraphs?: string[];
};

const nativeWidgetSnapshots = NativeModules.GlsoopWidgetSnapshots as
  | WidgetSnapshotNativeModule
  | undefined;

function canUseNativeWidgetSnapshots() {
  return (
    Platform.OS === "ios" &&
    typeof nativeWidgetSnapshots?.updateSnapshot === "function" &&
    typeof nativeWidgetSnapshots?.removeSnapshot === "function"
  );
}

function buildDeepLink(path: string) {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `glsoop://${normalizedPath}`;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

async function updateWidgetSnapshot(
  key: string,
  payload: TodayPromptWidgetSnapshot | SentenceFrameWidgetSnapshot,
  logScope: string
): Promise<WidgetSnapshotResult> {
  if (!canUseNativeWidgetSnapshots()) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    await nativeWidgetSnapshots?.updateSnapshot?.(key, JSON.stringify(payload));
    return { ok: true };
  } catch (error) {
    logger.warn(`[widgets] failed to update ${logScope} snapshot`, { error });
    return {
      ok: false,
      reason: "native_error",
      message: error instanceof Error ? error.message : undefined,
    };
  }
}

async function removeWidgetSnapshot(key: string, logScope: string): Promise<WidgetSnapshotResult> {
  if (!canUseNativeWidgetSnapshots()) {
    return { ok: false, reason: "unavailable" };
  }

  try {
    await nativeWidgetSnapshots?.removeSnapshot?.(key);
    return { ok: true };
  } catch (error) {
    logger.warn(`[widgets] failed to remove ${logScope} snapshot`, { error });
    return {
      ok: false,
      reason: "native_error",
      message: error instanceof Error ? error.message : undefined,
    };
  }
}

export function buildTodayPromptWidgetSnapshot(
  status: DailyWritingCampaignStatus
): TodayPromptWidgetSnapshot {
  const writePath = `/write?${new URLSearchParams({
    campaignKey: status.campaignKey,
    campaignPromptKey: status.prompt.key,
    promptTitle: status.prompt.title,
    promptBody: status.prompt.body,
    promptCategory: status.prompt.defaultCategory,
    promptTags: status.prompt.suggestedHashtags.join(","),
    promptSource: status.title,
    promptDay: String(status.prompt.day),
    source: "widget",
  }).toString()}`;

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    localDateKey: status.localDateKey,
    campaignKey: status.campaignKey,
    day: status.prompt.day,
    title: status.prompt.title,
    body: status.prompt.body,
    deepLink: buildDeepLink(writePath),
  };
}

function pickSentenceFrameExcerpt(post: SentenceFrameSourcePost) {
  const fromExcerpt = normalizeText(post.excerpt);
  if (fromExcerpt) return truncate(fromExcerpt, 86);

  const fromParagraph = Array.isArray(post.paragraphs)
    ? normalizeText(post.paragraphs.find((item) => normalizeText(item)))
    : "";
  if (fromParagraph) return truncate(fromParagraph, 86);

  const fromContent = normalizeText(post.contentRaw) || normalizeText(post.content);
  return truncate(fromContent || "선택한 글을 다시 읽어보세요.", 86);
}

export function buildSentenceFrameWidgetSnapshot(
  post: SentenceFrameSourcePost
): SentenceFrameWidgetSnapshot {
  const template = normalizePostBackgroundTemplateId(post.renderImages?.template);

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    premiumStatus: "active",
    postId: String(post.id),
    title: truncate(normalizeText(post.title) || "문장 액자", 48),
    excerpt: pickSentenceFrameExcerpt(post),
    authorName: truncate(normalizeText(post.author?.name) || "글숲", 28),
    imageUrl: buildRenderedPostShareImageUrl(String(post.id), {
      format: "png",
      scale: 2,
      template,
    }),
    deepLink: buildDeepLink(`/posts/${encodeURIComponent(String(post.id))}`),
  };
}

export async function updateTodayPromptWidgetSnapshot(
  status: DailyWritingCampaignStatus
): Promise<WidgetSnapshotResult> {
  return updateWidgetSnapshot(
    TODAY_PROMPT_WIDGET_SNAPSHOT_KEY,
    buildTodayPromptWidgetSnapshot(status),
    "today prompt"
  );
}

export async function saveSentenceFrameWidgetSnapshot(
  post: SentenceFrameSourcePost
): Promise<WidgetSnapshotResult> {
  return updateWidgetSnapshot(
    SENTENCE_FRAME_WIDGET_SNAPSHOT_KEY,
    buildSentenceFrameWidgetSnapshot(post),
    "sentence frame"
  );
}

export async function clearSentenceFrameWidgetSnapshot(): Promise<WidgetSnapshotResult> {
  return removeWidgetSnapshot(SENTENCE_FRAME_WIDGET_SNAPSHOT_KEY, "sentence frame");
}
