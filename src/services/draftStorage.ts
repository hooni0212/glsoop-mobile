import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet } from "@/lib/api";
import { getAuthToken, COOKIE_SESSION_TOKEN } from "@/lib/authToken";
import type { MeResponse } from "@/features/me/accountCenter";
import type { PostFontKey } from "@/lib/postContent";
import {
  flattenWritePages,
  normalizeWritePageDrafts,
  type WritePageDraft,
} from "@/lib/writePages";
import type { PostCommentPolicy, PostType, PostVisibility } from "@/types/post";

export type WriteDraft = {
  id: string;
  title: string;
  body: string;
  pages?: WritePageDraft[];
  category?: PostType;
  visibility?: PostVisibility;
  commentPolicy?: PostCommentPolicy;
  hashtags?: string[];
  fontKey?: PostFontKey;
  layoutJson?: unknown;
  mode?: "create" | "edit";
  postId?: string;
  questContext?: WriteDraftQuestContext;
  authNamespace?: string;
  updatedAt: number; // epoch ms
  expiresAt: number;
};

export type WriteDraftQuestContext = {
  stateId: number;
  promptKey: string;
  promptTitle?: string;
  promptBody?: string;
  defaultCategory?: PostType;
  suggestedHashtags?: string[];
};

const DRAFTS_KEY_PREFIX = "glsoop:write:drafts:v2";

// NOTE: Keep drafts reasonably small. This app stores plain text only (no images).
const MAX_DRAFTS = 30;
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IDENTITY_CACHE_TTL_MS = 60 * 1000;

let identityCache:
  | { token: string; namespace: string | null; cachedAt: number }
  | null = null;

function toBearerNamespace(token: string | null) {
  if (!token) return "anon";
  if (token === COOKIE_SESSION_TOKEN) return "cookie_session";
  return `bearer:${token.slice(0, 16)}`;
}

function toUserNamespace(me: Partial<MeResponse> | null | undefined) {
  const id = Number(me?.id);
  if (Number.isInteger(id) && id > 0) return `user:${id}`;

  const email = typeof me?.email === "string" ? me.email.trim().toLowerCase() : "";
  if (email) return `email:${email}`;

  return null;
}

async function getCurrentAuthNamespace(): Promise<string | null> {
  const token = await getAuthToken();
  if (!token) return "anon";

  const now = Date.now();
  if (
    token !== COOKIE_SESSION_TOKEN &&
    identityCache &&
    identityCache.token === token &&
    now - identityCache.cachedAt < IDENTITY_CACHE_TTL_MS
  ) {
    return identityCache.namespace;
  }

  try {
    const me = await apiGet<MeResponse>("/api/me");
    const namespace = toUserNamespace(me);
    if (namespace) {
      if (token !== COOKIE_SESSION_TOKEN) {
        identityCache = { token, namespace, cachedAt: now };
      }
      return namespace;
    }
  } catch {
    // Keep draft privacy first. Cookie-session users must resolve to a concrete account.
  }

  const namespace = token === COOKIE_SESSION_TOKEN ? null : toBearerNamespace(token);
  if (token !== COOKIE_SESSION_TOKEN) {
    identityCache = { token, namespace, cachedAt: now };
  }
  return namespace;
}

async function getCurrentDraftStorageContext() {
  const namespace = await getCurrentAuthNamespace();
  if (!namespace) return null;
  return {
    namespace,
    storageKey: `${DRAFTS_KEY_PREFIX}:${namespace}`,
  };
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeDraftHashtags(input: unknown): string[] {
  const values = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[\s,]+/)
      : [];
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    const tag = String(value).trim().replace(/^#+/, "").toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    tags.push(tag);
    if (tags.length >= 12) break;
  }

  return tags;
}

function normalizeDraft(input: any, fallbackAuthNamespace: string): WriteDraft | null {
  if (!input || typeof input !== "object") return null;

  const id = typeof input.id === "string" ? input.id : "";
  if (!id) return null;

  const title = typeof input.title === "string" ? input.title : "";
  const body = typeof input.body === "string" ? input.body : "";
  const pages = normalizeWritePageDrafts(input.pages, body);
  const normalizedBody = body || flattenWritePages(pages);
  const category =
    input.category === "poem" || input.category === "essay" || input.category === "short"
      ? input.category
      : undefined;
  const mode = input.mode === "edit" ? "edit" : "create";
  const visibility =
    input.visibility === "followers" || input.visibility === "unlisted" || input.visibility === "private"
      ? input.visibility
      : "public";
  const commentPolicy =
    input.commentPolicy === "everyone" ||
    input.commentPolicy === "followers" ||
    input.commentPolicy === "author_only" ||
    input.commentPolicy === "closed"
      ? input.commentPolicy
      : "logged_in";
  const hashtags = normalizeDraftHashtags(input.hashtags);
  const fontKey =
    input.fontKey === "sans" || input.fontKey === "hand" || input.fontKey === "serif"
      ? input.fontKey
      : "serif";
  const layoutJson = input.layoutJson ?? null;
  const postId = typeof input.postId === "string" && input.postId.trim() ? input.postId.trim() : undefined;
  const questContext = normalizeDraftQuestContext(input.questContext);
  const authNamespace =
    typeof input.authNamespace === "string" && input.authNamespace.trim()
      ? input.authNamespace.trim()
      : fallbackAuthNamespace;
  const updatedAt =
    typeof input.updatedAt === "number" ? input.updatedAt : Date.now();
  const expiresAt =
    typeof input.expiresAt === "number" ? input.expiresAt : updatedAt + DRAFT_TTL_MS;

  if (expiresAt <= Date.now()) return null;

  return {
    id,
    title,
    body: normalizedBody,
    pages,
    category,
    visibility,
    commentPolicy,
    hashtags: hashtags.length > 0 ? hashtags : undefined,
    fontKey,
    layoutJson,
    mode,
    postId,
    questContext,
    authNamespace,
    updatedAt,
    expiresAt,
  };
}

function normalizeDraftQuestContext(input: any): WriteDraftQuestContext | undefined {
  if (!input || typeof input !== "object") return undefined;
  const stateId = Number(input.stateId);
  const promptKey = typeof input.promptKey === "string" ? input.promptKey.trim() : "";
  if (!Number.isInteger(stateId) || stateId <= 0 || !promptKey) return undefined;
  const defaultCategory =
    input.defaultCategory === "poem" || input.defaultCategory === "essay" || input.defaultCategory === "short"
      ? input.defaultCategory
      : undefined;
  const suggestedHashtags = Array.isArray(input.suggestedHashtags)
    ? input.suggestedHashtags.map(String).map((tag: string) => tag.trim()).filter(Boolean).slice(0, 12)
    : undefined;
  return {
    stateId,
    promptKey,
    promptTitle: typeof input.promptTitle === "string" ? input.promptTitle : undefined,
    promptBody: typeof input.promptBody === "string" ? input.promptBody : undefined,
    defaultCategory,
    suggestedHashtags,
  };
}

function uuidLike(): string {
  // No crypto dependency; good enough for local keys.
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function buildDraftId(input: { id?: string | null; mode?: "create" | "edit"; postId?: string | null }) {
  if (input.id) return input.id;
  if (input.mode === "edit" && input.postId) return `edit:${input.postId}`;
  return `create:${uuidLike()}`;
}

async function loadAll(storageKey: string, authNamespace: string): Promise<WriteDraft[]> {
  const raw = await AsyncStorage.getItem(storageKey);
  const parsed = safeJsonParse<any>(raw);
  if (!Array.isArray(parsed)) return [];

  const drafts = parsed
    .map((draft) => normalizeDraft(draft, authNamespace))
    .filter(Boolean) as WriteDraft[];

  // newest first
  drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  return drafts;
}

async function saveAll(storageKey: string, drafts: WriteDraft[]): Promise<void> {
  // enforce newest-first & max
  const sorted = [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);
  await AsyncStorage.setItem(
    storageKey,
    JSON.stringify(sorted.slice(0, MAX_DRAFTS))
  );
}

export async function listWriteDrafts(): Promise<WriteDraft[]> {
  try {
    const context = await getCurrentDraftStorageContext();
    if (!context) return [];
    const drafts = await loadAll(context.storageKey, context.namespace);
    return drafts.filter((draft) => (draft.authNamespace ?? context.namespace) === context.namespace);
  } catch {
    return [];
  }
}

export async function loadWriteDraftById(id: string): Promise<WriteDraft | null> {
  if (!id) return null;
  try {
    const context = await getCurrentDraftStorageContext();
    if (!context) return null;
    const drafts = await loadAll(context.storageKey, context.namespace);
    return drafts.find((d) => d.id === id && d.authNamespace === context.namespace) ?? null;
  } catch {
    return null;
  }
}

export async function loadLatestWriteDraft(): Promise<WriteDraft | null> {
  try {
    const context = await getCurrentDraftStorageContext();
    if (!context) return null;
    const drafts = await loadAll(context.storageKey, context.namespace);
    return drafts.find((draft) => draft.authNamespace === context.namespace) ?? null;
  } catch {
    return null;
  }
}

/**
 * Upsert a draft. If id is omitted, creates a new draft and returns its id.
 */
export async function upsertWriteDraft(input: {
  id?: string | null;
  title: string;
  body: string;
  pages?: WritePageDraft[] | null;
  category?: PostType;
  visibility?: PostVisibility;
  commentPolicy?: PostCommentPolicy;
  hashtags?: string[] | string | null;
  fontKey?: PostFontKey;
  layoutJson?: unknown;
  mode?: "create" | "edit";
  postId?: string | null;
  questContext?: WriteDraftQuestContext | null;
}): Promise<string> {
  const id = buildDraftId(input);
  const mode = input.mode === "edit" ? "edit" : "create";
  const context = await getCurrentDraftStorageContext();
  if (!context) {
    throw new Error("현재 계정 정보를 확인하지 못해 임시저장할 수 없어요.");
  }
  const authNamespace = context.namespace;
  const hashtags = normalizeDraftHashtags(input.hashtags);
  const pages = normalizeWritePageDrafts(input.pages, input.body ?? "");
  const body = input.body ?? flattenWritePages(pages);
  const payload: WriteDraft = {
    id,
    title: input.title ?? "",
    body,
    pages,
    category: input.category,
    visibility: input.visibility ?? "public",
    commentPolicy: input.commentPolicy ?? "logged_in",
    hashtags: hashtags.length > 0 ? hashtags : undefined,
    fontKey: input.fontKey ?? "serif",
    layoutJson: input.layoutJson ?? null,
    mode,
    postId: typeof input.postId === "string" ? input.postId : undefined,
    questContext: input.questContext ?? undefined,
    authNamespace,
    updatedAt: Date.now(),
    expiresAt: Date.now() + DRAFT_TTL_MS,
  };

  const drafts = await loadAll(context.storageKey, context.namespace);
  const next = [
    payload,
    ...drafts.filter((d) => !(d.id === id && d.authNamespace === authNamespace)),
  ];
  await saveAll(context.storageKey, next);

  return id;
}

export async function deleteWriteDraft(id: string): Promise<void> {
  if (!id) return;
  try {
    const context = await getCurrentDraftStorageContext();
    if (!context) return;
    const drafts = await loadAll(context.storageKey, context.namespace);
    await saveAll(
      context.storageKey,
      drafts.filter((d) => !(d.id === id && d.authNamespace === context.namespace))
    );
  } catch {
    // ignore
  }
}

export async function clearAllWriteDrafts(): Promise<void> {
  try {
    const context = await getCurrentDraftStorageContext();
    if (!context) return;
    await AsyncStorage.removeItem(context.storageKey);
  } catch {
    // ignore
  }
}
