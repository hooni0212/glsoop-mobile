import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { normalizePostReadText, splitPostParagraphs } from "@/lib/postContent";
import { normalizePostRenderImageFields } from "@/lib/postRenderImages";
import { normalizePublicDisplayName } from "@/lib/publicDisplayName";
import { normalizeProfileCosmeticsExpanded } from "@/types/cosmetics";
import type { Post } from "@/types/post";
import { useCallback, useEffect, useRef, useState } from "react";

type PostDetailResponse = {
  ok: boolean;
  post?: any;
  message?: string;
};

function pickFirstString(...vals: any[]) {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function pickFirstNumber(...vals: any[]) {
  for (const v of vals) {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function parseFlag(...vals: any[]) {
  for (const v of vals) {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === 1;
    if (typeof v === "string") {
      const s = v.trim().toLowerCase();
      if (s === "1" || s === "true") return true;
      if (s === "0" || s === "false" || s === "") return false;
    }
  }
  return false;
}

function parseTags(row: any) {
  const a = row?.tags;
  if (Array.isArray(a)) return a.map(String).filter(Boolean);

  const s = pickFirstString(row?.hashtags, row?.tag, row?.tagsCsv);
  if (!s) return [];

  return s
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
}

function parseVisibility(row: any) {
  const value = pickFirstString(row?.visibility);
  return value === "followers" || value === "unlisted" || value === "private" ? value : "public";
}

function parseCommentPolicy(row: any) {
  const value = pickFirstString(row?.comment_policy, row?.commentPolicy);
  return value === "everyone" ||
    value === "followers" ||
    value === "author_only" ||
    value === "closed"
    ? value
    : "logged_in";
}

function parseAuthorProfileCosmetics(row: any) {
  return normalizeProfileCosmeticsExpanded(
    row?.author_profile_cosmetics ??
      row?.authorProfileCosmetics ?? {
        primary_badge: row?.author_primary_badge_key
          ? {
              key: row.author_primary_badge_key,
              name: row.author_primary_badge_name,
              icon_emoji: row.author_primary_badge_icon_emoji,
              rarity: row.author_primary_badge_rarity,
              season: row.author_primary_badge_season,
            }
          : null,
      }
  );
}

function normalizePostDetail(row: any): any {
  const id = String(row?.id ?? row?.post_id ?? "");
  const title = pickFirstString(row?.title, row?.post_title);
  const contentRaw = pickFirstString(row?.content, row?.body, row?.html, row?.text);
  const createdAt = pickFirstString(row?.createdAt, row?.created_at, row?.created, row?.date);

  const authorName = normalizePublicDisplayName(
    row?.display_name,
    row?.author_display_name,
    row?.nickname,
    row?.author_nickname
  );
  const authorId = String(row?.author_id ?? row?.user_id ?? row?.uid ?? "");

  const likeCount = pickFirstNumber(row?.like_count, row?.likeCount, row?.likes, row?.likes_count);
  const bookmarkCount = pickFirstNumber(
    row?.bookmark_count,
    row?.bookmarkCount,
    row?.bookmarks,
    row?.bookmarks_count
  );

  const userLiked = parseFlag(row?.user_liked, row?.liked, row?.isLiked);
  const userBookmarked = parseFlag(
    row?.user_bookmarked,
    row?.bookmarked,
    row?.isBookmarked
  );

  const category = pickFirstString(row?.category, row?.type) || "short";
  const viewer = row?.viewer && typeof row.viewer === "object" ? row.viewer : {};
  const hasCanRead =
    Object.prototype.hasOwnProperty.call(viewer, "can_read") ||
    Object.prototype.hasOwnProperty.call(viewer, "canRead");
  const hasCanComment =
    Object.prototype.hasOwnProperty.call(viewer, "can_comment") ||
    Object.prototype.hasOwnProperty.call(viewer, "canComment");

  const post: any = {
    id,
    type: category,
    title: title || undefined,
    createdAt,
    author: {
      id: authorId || undefined,
      name: authorName,
      profileCosmetics: parseAuthorProfileCosmetics(row),
    },
    stats: { likeCount, bookmarkCount },
    tags: parseTags(row),
    visibility: parseVisibility(row),
    commentPolicy: parseCommentPolicy(row),
    viewer: {
      isLiked: userLiked,
      isBookmarked: userBookmarked,
      canRead: hasCanRead ? parseFlag(viewer?.can_read, viewer?.canRead) : true,
      canComment: hasCanComment ? parseFlag(viewer?.can_comment, viewer?.canComment) : true,
      isAuthor: parseFlag(viewer?.is_author, viewer?.isAuthor),
      visibilityReason:
        typeof viewer?.visibility_reason === "string" ? viewer.visibility_reason : null,
    },
    content: normalizePostReadText(contentRaw),
    paragraphs: splitPostParagraphs(contentRaw),
    contentRaw,
    layoutJson: row?.layout_json ?? row?.layoutJson ?? null,
    ...normalizePostRenderImageFields(row, { fallbackPostId: id }),
  };

  return post as Post & { content?: string; contentRaw?: string };
}

export function usePost(id: string | undefined) {
  const [post, setPost] = useState<
    (Post & { content?: string; contentRaw?: string; paragraphs?: string[]; layoutJson?: unknown }) | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);
  const inflightRef = useRef(false);

  const fetchPost = useCallback(async () => {
    if (!id) return;
    if (inflightRef.current) return;
    inflightRef.current = true;

    try {
      setError(null);
      setLoading(true);

      const res = await apiGet<PostDetailResponse>(`/api/posts/${encodeURIComponent(id)}`);
      if (!res?.ok) throw new Error(res?.message || "글을 불러오지 못했어요.");

      const raw = res.post ?? null;
      if (!raw) throw new Error("글 데이터가 비어있어요.");

      setPost(normalizePostDetail(raw));
    } catch (e: any) {
      setError(normalizeApiError(e));
      setPost(null);
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const mutatePost = useCallback(
    (
      updater: (
        prev: Post & { content?: string; contentRaw?: string; paragraphs?: string[]; layoutJson?: unknown }
      ) => Post & { content?: string; contentRaw?: string; paragraphs?: string[]; layoutJson?: unknown }
    ) => {
      setPost((prev) => (prev ? updater(prev) : prev));
    },
    []
  );

  return { post, loading, error, refetch: fetchPost, mutatePost };
}
