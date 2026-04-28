import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { buildPostExcerpt } from "@/lib/postContent";
import { normalizePostRenderImageFields } from "@/lib/postRenderImages";
import { normalizePublicDisplayName } from "@/lib/publicDisplayName";
import type { Post } from "@/types/post";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Sort = "latest" | "popular";
type FeedType = "all" | "following";

export type FeedQuery = {
  limit?: number;
  sort?: Sort;
  type?: FeedType;
  category?: string;
  tag?: string;
};

type FeedResponse = {
  ok: boolean;
  posts?: any[];
  has_more?: boolean;
  hasMore?: boolean;
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

function normalizePost(row: any): Post {
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

  const userLiked = parseFlag(row?.user_liked, row?.liked, row?.isLiked);
  const userBookmarked = parseFlag(
    row?.user_bookmarked,
    row?.bookmarked,
    row?.isBookmarked
  );

  const category = pickFirstString(row?.category, row?.type) || "short";

  const post: any = {
    id,
    type: category,
    title: title || undefined,
    excerpt: buildPostExcerpt(content, 90),
    createdAt,
    author: {
      id: authorId || undefined,
      name: authorName,
    },
    stats: {
      likeCount,
      bookmarkCount,
    },
    tags: parseTags(row),
    visibility: parseVisibility(row),
    commentPolicy: parseCommentPolicy(row),
    viewer: {
      isLiked: userLiked,
      isBookmarked: userBookmarked,
    },
    ...normalizePostRenderImageFields(row, { fallbackPostId: id }),
  };

  return post as Post;
}

export function useFeed(query: FeedQuery = {}) {
  const limit = query.limit ?? 10;
  const sort = query.sort ?? "latest";
  const type = query.type ?? "all";

  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const inflightRef = useRef(false);

  const baseParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", String(limit));
    p.set("sort", sort);
    if (type === "following") p.set("type", "following");
    if (query.category) p.set("category", query.category);
    if (query.tag) p.set("tag", query.tag);
    return p;
  }, [limit, sort, type, query.category, query.tag]);

  const fetchPage = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      const reset = Boolean(opts.reset);
      if (inflightRef.current) return;
      inflightRef.current = true;

      try {
        setError(null);

        if (reset) {
          setRefreshing(true);
          offsetRef.current = 0;
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams(baseParams);
        params.set("offset", String(offsetRef.current));

        const res = await apiGet<FeedResponse>(`/api/posts?${params.toString()}`);

        if (!res?.ok) throw new Error(res?.message || "피드를 불러오지 못했어요.");

        const nextRaw = res.posts ?? [];
        const next = nextRaw.map(normalizePost);

        setItems((prev) => (reset ? next : [...prev, ...next]));

        const inferredHasMore =
          typeof res.has_more === "boolean"
            ? res.has_more
            : typeof res.hasMore === "boolean"
              ? res.hasMore
              : next.length >= limit;

        setHasMore(inferredHasMore);
        offsetRef.current += next.length;
      } catch (e: any) {
        setError(normalizeApiError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
        inflightRef.current = false;
      }
    },
    [baseParams, limit]
  );

  const refresh = useCallback(async () => {
    await fetchPage({ reset: true });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    await fetchPage({ reset: false });
  }, [fetchPage, hasMore, loading, refreshing]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const patchItem = useCallback((postId: string, updater: (p: Post) => Post) => {
    setItems((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
  }, []);

  return { items, loading, refreshing, error, hasMore, refresh, loadMore, patchItem };
}
