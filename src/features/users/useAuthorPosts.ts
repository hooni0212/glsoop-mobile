import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import type { Post } from "@/types/post";

type AuthorPostsResponse = {
  ok?: boolean;
  message?: string;
  data?: any;
  items?: any[];
  posts?: any[];
  has_more?: boolean;
  hasNext?: boolean;
  hasMore?: boolean;
};

const PAGE_SIZE = 10;
export type AuthorPostSort = "newest" | "oldest" | "likes";

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

function normalizePost(row: any): Post {
  const id = String(row?.id ?? row?.post_id ?? "");
  const title = pickFirstString(row?.title, row?.post_title);
  const content = pickFirstString(row?.content, row?.body, row?.html, row?.text);
  const createdAt = pickFirstString(
    row?.createdAt,
    row?.created_at,
    row?.created,
    row?.date
  );
  const authorName = pickFirstString(
    row?.author_nickname,
    row?.nickname,
    row?.author_name,
    row?.authorName,
    row?.name
  );
  const authorId = String(row?.author_id ?? row?.user_id ?? row?.uid ?? "");

  const likeCount = pickFirstNumber(
    row?.like_count,
    row?.likeCount,
    row?.likes,
    row?.likes_count
  );
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

function extractPostsPayload(res: AuthorPostsResponse) {
  if (res?.ok === false) {
    throw new Error(res?.message || "작가 글을 불러오지 못했어요.");
  }

  const base = res?.data && typeof res.data === "object" ? res.data : res;

  const items = Array.isArray(base?.items)
    ? base.items
    : Array.isArray(base?.posts)
      ? base.posts
      : [];

  const hasMore =
    typeof base?.has_more === "boolean"
      ? base.has_more
      : typeof base?.hasMore === "boolean"
        ? base.hasMore
        : typeof base?.hasNext === "boolean"
          ? base.hasNext
          : items.length >= PAGE_SIZE;

  return { items, hasMore };
}

function mergePosts(prev: Post[], next: Post[]) {
  if (prev.length === 0) return next;

  const seen = new Set(prev.map((item) => item.id));
  const dedupedNext = next.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return [...prev, ...dedupedNext];
}

export function useAuthorPosts(userId?: string, sort: AuthorPostSort = "newest") {
  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const offsetRef = useRef(0);
  const inflightRef = useRef(false);

  const fetchPage = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      if (!userId || inflightRef.current) return;

      const reset = Boolean(opts.reset);
      const requestedOffset = reset ? 0 : offsetRef.current;
      inflightRef.current = true;

      try {
        setError(null);

        if (reset) {
          setRefreshing(true);
          offsetRef.current = 0;
        } else {
          setLoading(true);
        }

        const params = new URLSearchParams();
        params.set("limit", String(PAGE_SIZE));
        params.set("offset", String(requestedOffset));
        params.set("sort", sort);

        const res = await apiGet<AuthorPostsResponse>(
          `/api/users/${encodeURIComponent(userId)}/posts?${params.toString()}`
        );
        const payload = extractPostsPayload(res);
        const nextItems = payload.items.map(normalizePost);

        setItems((prev) => (reset ? nextItems : mergePosts(prev, nextItems)));
        offsetRef.current = requestedOffset + nextItems.length;
        setHasMore(payload.hasMore);
      } catch (err) {
        setError(normalizeApiError(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
        inflightRef.current = false;
      }
    },
    [sort, userId]
  );

  const refresh = useCallback(async () => {
    await fetchPage({ reset: true });
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    await fetchPage({ reset: false });
  }, [fetchPage, hasMore, loading, refreshing]);

  useEffect(() => {
    if (!userId) return;
    setItems([]);
    offsetRef.current = 0;
    setHasMore(true);
    refresh();
  }, [refresh, sort, userId]);

  const patchItem = useCallback((postId: string, updater: (p: Post) => Post) => {
    setItems((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
  }, []);

  return { items, loading, refreshing, error, hasMore, refresh, loadMore, patchItem };
}
