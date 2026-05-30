import { useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { buildPostExcerpt } from "@/lib/postContent";
import { normalizePostRenderImageFields } from "@/lib/postRenderImages";
import { toAbsoluteProfilePhotoUrl } from "@/lib/profilePhoto";
import { normalizePublicDisplayName } from "@/lib/publicDisplayName";
import { normalizeProfileCosmeticsExpanded } from "@/types/cosmetics";
import type { Post } from "@/types/post";

type RelatedPostsResponse = {
  ok?: boolean;
  message?: string;
  posts?: any[];
};

function pickFirstString(...vals: any[]) {
  for (const value of vals) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

function pickFirstNumber(...vals: any[]) {
  for (const value of vals) {
    const next = Number(value);
    if (!Number.isNaN(next)) return next;
  }
  return 0;
}

function parseFlag(...vals: any[]) {
  for (const value of vals) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "1" || normalized === "true") return true;
      if (normalized === "0" || normalized === "false" || normalized === "") return false;
    }
  }
  return false;
}

function parseTags(row: any) {
  if (Array.isArray(row?.tags)) return row.tags.map(String).filter(Boolean);

  const raw = pickFirstString(row?.hashtags, row?.tag, row?.tagsCsv);
  if (!raw) return [];

  return raw
    .split(",")
    .map((item: string) => item.trim())
    .filter(Boolean);
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

function normalizeRelatedPost(row: any): Post {
  const id = String(row?.id ?? row?.post_id ?? "");
  const title = pickFirstString(row?.title, row?.post_title);
  const content = pickFirstString(row?.content, row?.body, row?.html, row?.text);
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
  const category = pickFirstString(row?.category, row?.type) || "short";

  return {
    id,
    type: category as Post["type"],
    title: title || undefined,
    excerpt: buildPostExcerpt(content, 72),
    createdAt,
    author: {
      id: authorId,
      name: authorName,
      profilePhotoUrl: toAbsoluteProfilePhotoUrl(
        row?.author_profile_photo_url,
        row?.authorProfilePhotoUrl
      ),
      profilePhotoThumbnailUrl: toAbsoluteProfilePhotoUrl(
        row?.author_profile_photo_thumbnail_url,
        row?.authorProfilePhotoThumbnailUrl
      ),
      profileCosmetics: parseAuthorProfileCosmetics(row),
    },
    stats: {
      likeCount,
      bookmarkCount,
    },
    tags: parseTags(row),
    viewer: {
      isLiked: parseFlag(row?.user_liked, row?.liked, row?.isLiked),
      isBookmarked: parseFlag(row?.user_bookmarked, row?.bookmarked, row?.isBookmarked),
    },
    ...normalizePostRenderImageFields(row, { fallbackPostId: id }),
  };
}

export function useRelatedPosts(postId?: string, limit = 6) {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);

  const fetchRelated = useCallback(async () => {
    if (!postId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await apiGet<RelatedPostsResponse>(
        `/api/posts/${encodeURIComponent(postId)}/related?limit=${limit}`
      );

      if (res?.ok === false) {
        throw new Error(res?.message || "관련 글을 불러오지 못했어요.");
      }

      const nextItems = Array.isArray(res?.posts) ? res.posts.map(normalizeRelatedPost) : [];
      setItems(nextItems);
    } catch (err) {
      setError(normalizeApiError(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [limit, postId]);

  useEffect(() => {
    if (!postId) return;
    fetchRelated();
  }, [fetchRelated, postId]);

  return { items, loading, error, refetch: fetchRelated };
}
