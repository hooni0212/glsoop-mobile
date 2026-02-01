import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import type { Post } from "@/types/post";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Sort = "latest" | "popular";

export type FeedQuery = {
  limit?: number;
  sort?: Sort;
  category?: string;
  tag?: string;
};

type FeedResponse = {
  ok: boolean;
  posts?: any[];
  hasMore?: boolean;
  message?: string;
};

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function toExcerpt(content: any, maxLen = 90) {
  const raw = typeof content === "string" ? content : "";
  const plain = stripHtml(raw);
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

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

function normalizePost(row: any): Post {
  const id = String(row?.id ?? row?.post_id ?? "");
  const title = pickFirstString(row?.title, row?.post_title);
  const content = pickFirstString(row?.content, row?.body, row?.html, row?.text);
  const createdAt = pickFirstString(row?.createdAt, row?.created_at, row?.created, row?.date);
  const authorName = pickFirstString(row?.author_name, row?.authorName, row?.nickname, row?.name);
  const authorId = String(row?.author_id ?? row?.user_id ?? row?.uid ?? "");

  const likeCount = pickFirstNumber(row?.like_count, row?.likeCount, row?.likes, row?.likes_count);
  const bookmarkCount = pickFirstNumber(
    row?.bookmark_count,
    row?.bookmarkCount,
    row?.bookmarks,
    row?.bookmarks_count
  );

  const userLiked = Boolean(row?.user_liked ?? row?.liked ?? row?.isLiked);
  const userBookmarked = Boolean(row?.user_bookmarked ?? row?.bookmarked ?? row?.isBookmarked);

  const category = pickFirstString(row?.category, row?.type) || "short";

  const post: any = {
    id,
    type: category,
    title: title || undefined,
    excerpt: toExcerpt(content),
    createdAt,
    author: {
      id: authorId || undefined,
      name: authorName || "익명",
    },
    stats: {
      likeCount,
      bookmarkCount,
    },
    tags: parseTags(row),
    viewer: {
      isLiked: userLiked,
      isBookmarked: userBookmarked,
    },
  };

  return post as Post;
}

export function useFeed(query: FeedQuery = {}) {
  const limit = query.limit ?? 10;
  const sort = query.sort ?? "latest";

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
    if (query.category) p.set("category", query.category);
    if (query.tag) p.set("tag", query.tag);
    return p;
  }, [limit, sort, query.category, query.tag]);

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
          typeof res.hasMore === "boolean" ? res.hasMore : next.length >= limit;

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
  }, [limit, sort, query.category, query.tag]);

  const patchItem = useCallback((postId: string, updater: (p: Post) => Post) => {
    setItems((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
  }, []);

  return { items, loading, refreshing, error, hasMore, refresh, loadMore, patchItem };
}
