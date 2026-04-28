import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuthToken, COOKIE_SESSION_TOKEN } from "@/lib/authToken";
import type { PostFontKey } from "@/lib/postContent";
import type { PostCommentPolicy, PostType, PostVisibility } from "@/types/post";

export type WriteDraft = {
  id: string;
  title: string;
  body: string;
  category?: PostType;
  visibility?: PostVisibility;
  commentPolicy?: PostCommentPolicy;
  fontKey?: PostFontKey;
  layoutJson?: unknown;
  mode?: "create" | "edit";
  postId?: string;
  authNamespace?: string;
  updatedAt: number; // epoch ms
  expiresAt: number;
};

const DRAFTS_KEY = "glsoop:write:drafts:v1";

// NOTE: Keep drafts reasonably small. This app stores plain text only (no images).
const MAX_DRAFTS = 30;
const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toAuthNamespace(token: string | null) {
  if (!token) return "anon";
  if (token === COOKIE_SESSION_TOKEN) return "cookie_session";
  return `bearer:${token.slice(0, 16)}`;
}

async function getCurrentAuthNamespace() {
  const token = await getAuthToken();
  return toAuthNamespace(token);
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function normalizeDraft(input: any): WriteDraft | null {
  if (!input || typeof input !== "object") return null;

  const id = typeof input.id === "string" ? input.id : "";
  if (!id) return null;

  const title = typeof input.title === "string" ? input.title : "";
  const body = typeof input.body === "string" ? input.body : "";
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
  const fontKey =
    input.fontKey === "sans" || input.fontKey === "hand" || input.fontKey === "serif"
      ? input.fontKey
      : "serif";
  const layoutJson = input.layoutJson ?? null;
  const postId = typeof input.postId === "string" && input.postId.trim() ? input.postId.trim() : undefined;
  const authNamespace =
    typeof input.authNamespace === "string" && input.authNamespace.trim()
      ? input.authNamespace.trim()
      : "anon";
  const updatedAt =
    typeof input.updatedAt === "number" ? input.updatedAt : Date.now();
  const expiresAt =
    typeof input.expiresAt === "number" ? input.expiresAt : updatedAt + DRAFT_TTL_MS;

  if (expiresAt <= Date.now()) return null;

  return {
    id,
    title,
    body,
    category,
    visibility,
    commentPolicy,
    fontKey,
    layoutJson,
    mode,
    postId,
    authNamespace,
    updatedAt,
    expiresAt,
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

async function loadAll(): Promise<WriteDraft[]> {
  const raw = await AsyncStorage.getItem(DRAFTS_KEY);
  const parsed = safeJsonParse<any>(raw);
  if (!Array.isArray(parsed)) return [];

  const drafts = parsed
    .map(normalizeDraft)
    .filter(Boolean) as WriteDraft[];

  // newest first
  drafts.sort((a, b) => b.updatedAt - a.updatedAt);
  return drafts;
}

async function saveAll(drafts: WriteDraft[]): Promise<void> {
  try {
    // enforce newest-first & max
    const sorted = [...drafts].sort((a, b) => b.updatedAt - a.updatedAt);
    await AsyncStorage.setItem(
      DRAFTS_KEY,
      JSON.stringify(sorted.slice(0, MAX_DRAFTS))
    );
  } catch {
    // ignore
  }
}

export async function listWriteDrafts(): Promise<WriteDraft[]> {
  try {
    const namespace = await getCurrentAuthNamespace();
    const drafts = await loadAll();
    return drafts.filter((draft) => (draft.authNamespace ?? "anon") === namespace);
  } catch {
    return [];
  }
}

export async function loadWriteDraftById(id: string): Promise<WriteDraft | null> {
  if (!id) return null;
  try {
    const namespace = await getCurrentAuthNamespace();
    const drafts = await loadAll();
    const scoped = drafts.filter((draft) => (draft.authNamespace ?? "anon") === namespace);
    return scoped.find((d) => d.id === id) ?? null;
  } catch {
    return null;
  }
}

export async function loadLatestWriteDraft(): Promise<WriteDraft | null> {
  try {
    const namespace = await getCurrentAuthNamespace();
    const drafts = await loadAll();
    const scoped = drafts.filter((draft) => (draft.authNamespace ?? "anon") === namespace);
    return scoped[0] ?? null;
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
  category?: PostType;
  visibility?: PostVisibility;
  commentPolicy?: PostCommentPolicy;
  fontKey?: PostFontKey;
  layoutJson?: unknown;
  mode?: "create" | "edit";
  postId?: string | null;
}): Promise<string> {
  const id = buildDraftId(input);
  const mode = input.mode === "edit" ? "edit" : "create";
  const authNamespace = await getCurrentAuthNamespace();
  const payload: WriteDraft = {
    id,
    title: input.title ?? "",
    body: input.body ?? "",
    category: input.category,
    visibility: input.visibility ?? "public",
    commentPolicy: input.commentPolicy ?? "logged_in",
    fontKey: input.fontKey ?? "serif",
    layoutJson: input.layoutJson ?? null,
    mode,
    postId: typeof input.postId === "string" ? input.postId : undefined,
    authNamespace,
    updatedAt: Date.now(),
    expiresAt: Date.now() + DRAFT_TTL_MS,
  };

  try {
    const drafts = await loadAll();
    const next = [payload, ...drafts.filter((d) => d.id !== id)];
    await saveAll(next);
  } catch {
    // ignore
  }

  return id;
}

export async function deleteWriteDraft(id: string): Promise<void> {
  if (!id) return;
  try {
    const drafts = await loadAll();
    await saveAll(drafts.filter((d) => d.id !== id));
  } catch {
    // ignore
  }
}

export async function clearAllWriteDrafts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFTS_KEY);
  } catch {
    // ignore
  }
}
