import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { normalizePostPreviewText } from "@/lib/postContent";
import { normalizePostRenderImageFields } from "@/lib/postRenderImages";
import { toAbsoluteProfilePhotoUrl } from "@/lib/profilePhoto";
import { normalizePublicDisplayName, pickOptionalText } from "@/lib/publicDisplayName";
import type { Post, PostType } from "@/types/post";

export type SearchAuthor = {
  id: string;
  name: string;
  nickname: string | null;
  postCount: number;
  followerCount: number;
  latestPostAt: string | null;
};

type SearchResponse = {
  ok?: boolean;
  message?: string;
  posts?: unknown[];
  authors?: unknown[];
};

type SearchType = "all" | "posts" | "authors";
const PAGE_SIZE = 20;

function toText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function pickFirstText(...values: unknown[]) {
  for (const value of values) {
    const next = toText(value);
    if (next) return next;
  }
  return "";
}

function toIdText(value: unknown) {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizePostCategory(value: unknown): PostType {
  const category = toText(value);
  if (category === "poem" || category === "essay" || category === "short") return category;
  return "short";
}

function normalizeSearchPost(value: unknown): Post | null {
  const row = toRecord(value);
  const id = toIdText(row.id);
  if (!id) return null;

  const createdAt = pickFirstText(row.createdAt, row.created_at, row.created, row.date) || new Date().toISOString();
  const authorName = normalizePublicDisplayName(
    row.display_name,
    row.author_display_name,
    row.nickname,
    row.author_nickname
  );
  const authorId = toIdText(row.author_id);

  return {
    id,
    type: normalizePostCategory(row.category),
    title: toText(row.title) || "(제목 없음)",
    excerpt: normalizePostPreviewText(row.excerpt),
    createdAt,
    author: {
      id: authorId,
      name: authorName,
      profilePhotoUrl: toAbsoluteProfilePhotoUrl(
        row.author_profile_photo_url,
        row.authorProfilePhotoUrl
      ),
      profilePhotoThumbnailUrl: toAbsoluteProfilePhotoUrl(
        row.author_profile_photo_thumbnail_url,
        row.authorProfilePhotoThumbnailUrl
      ),
    },
    stats: {
      likeCount: toNumber(row.like_count),
      bookmarkCount: toNumber(row.bookmark_count),
    },
    viewer: {
      isLiked: false,
      isBookmarked: false,
    },
    ...normalizePostRenderImageFields(row, { fallbackPostId: id }),
  };
}

function normalizeSearchAuthor(value: unknown): SearchAuthor | null {
  const row = toRecord(value);
  const id = toIdText(row.id);
  if (!id) return null;

  return {
    id,
    name: normalizePublicDisplayName(row.display_name, row.nickname),
    nickname: pickOptionalText(row.nickname),
    postCount: toNumber(row.post_count),
    followerCount: toNumber(row.follower_count),
    latestPostAt: pickFirstText(row.latestPostAt, row.latest_post_at) || null,
  };
}

function normalizeSearchPosts(values: unknown): Post[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(normalizeSearchPost)
    .filter((item): item is Post => item !== null);
}

function normalizeSearchAuthors(values: unknown): SearchAuthor[] {
  if (!Array.isArray(values)) return [];
  return values
    .map(normalizeSearchAuthor)
    .filter((item): item is SearchAuthor => item !== null);
}

export type UseSearchResult = {
  posts: Post[];
  authors: SearchAuthor[];
  loading: boolean;
  loadingMore: boolean;
  hasMorePosts: boolean;
  hasMoreAuthors: boolean;
  error: AppErrorModel | null;
  refetch: () => Promise<void>;
  loadMore: (type: "posts" | "authors") => Promise<void>;
};

export function useSearch(query: string): UseSearchResult {
  const normalizedQuery = query.trim();
  const requestSeqRef = useRef(0);

  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<SearchAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [hasMoreAuthors, setHasMoreAuthors] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);

  const requestSearch = useCallback(async (type: SearchType, offset: number) => {
    const params = new URLSearchParams();
    params.set("q", normalizedQuery);
    params.set("type", type);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    return apiGet<SearchResponse>(`/api/search?${params.toString()}`);
  }, [normalizedQuery]);

  const fetchSearch = useCallback(async () => {
    const currentQuery = normalizedQuery;
    requestSeqRef.current += 1;
    const seq = requestSeqRef.current;

    if (!currentQuery) {
      setPosts([]);
      setAuthors([]);
      setHasMorePosts(false);
      setHasMoreAuthors(false);
      setError(null);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setLoading(true);
    setLoadingMore(false);
    setError(null);

    try {
      const response = await requestSearch("all", 0);
      if (!response?.ok) {
        throw new Error(response?.message || "검색 결과를 불러오지 못했어요.");
      }

      if (seq !== requestSeqRef.current) return;
      const nextPosts = normalizeSearchPosts(response.posts);
      const nextAuthors = normalizeSearchAuthors(response.authors);
      setPosts(nextPosts);
      setAuthors(nextAuthors);
      setHasMorePosts(nextPosts.length === PAGE_SIZE);
      setHasMoreAuthors(nextAuthors.length === PAGE_SIZE);
      setError(null);
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      setPosts([]);
      setAuthors([]);
      setHasMorePosts(false);
      setHasMoreAuthors(false);
      setError(normalizeApiError(e));
    } finally {
      if (seq !== requestSeqRef.current) return;
      setLoading(false);
    }
  }, [normalizedQuery, requestSearch]);

  const loadMore = useCallback(async (type: "posts" | "authors") => {
    if (!normalizedQuery) return;
    if (loading || loadingMore) return;
    if (type === "posts" && !hasMorePosts) return;
    if (type === "authors" && !hasMoreAuthors) return;

    const seq = requestSeqRef.current;
    const currentOffset = type === "posts" ? posts.length : authors.length;
    setLoadingMore(true);

    try {
      const response = await requestSearch(type, currentOffset);
      if (!response?.ok) {
        throw new Error(response?.message || "검색 결과를 추가로 불러오지 못했어요.");
      }

      if (seq !== requestSeqRef.current) return;
      if (type === "posts") {
        const next = normalizeSearchPosts(response.posts);
        setPosts((prev) => {
          const prevIds = new Set(prev.map((item) => item.id));
          const append = next.filter((item) => !prevIds.has(item.id));
          return [...prev, ...append];
        });
        setHasMorePosts(next.length === PAGE_SIZE);
      } else {
        const next = normalizeSearchAuthors(response.authors);
        setAuthors((prev) => {
          const prevIds = new Set(prev.map((item) => item.id));
          const append = next.filter((item) => !prevIds.has(item.id));
          return [...prev, ...append];
        });
        setHasMoreAuthors(next.length === PAGE_SIZE);
      }
      setError(null);
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      setError(normalizeApiError(e));
    } finally {
      if (seq !== requestSeqRef.current) return;
      setLoadingMore(false);
    }
  }, [
    normalizedQuery,
    loading,
    loadingMore,
    hasMorePosts,
    hasMoreAuthors,
    posts.length,
    authors.length,
    requestSearch,
  ]);

  useEffect(() => {
    fetchSearch();
  }, [fetchSearch]);

  return {
    posts,
    authors,
    loading,
    loadingMore,
    hasMorePosts,
    hasMoreAuthors,
    error,
    refetch: fetchSearch,
    loadMore,
  };
}
