import { useCallback, useEffect, useRef, useState } from "react";

import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import type { Post, PostType } from "@/types/post";

export type SearchAuthor = {
  id: string;
  name: string;
  nickname: string;
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

function toText(value: unknown) {
  return typeof value === "string" ? value : "";
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

  const createdAt = toText(row.created_at) || new Date().toISOString();
  const authorName = toText(row.author_name) || toText(row.author_nickname) || "익명";
  const authorId = toIdText(row.author_id);

  return {
    id,
    type: normalizePostCategory(row.category),
    title: toText(row.title) || "(제목 없음)",
    excerpt: toText(row.excerpt),
    createdAt,
    author: {
      id: authorId,
      name: authorName,
    },
    stats: {
      likeCount: toNumber(row.like_count),
      bookmarkCount: toNumber(row.bookmark_count),
    },
    viewer: {
      isLiked: false,
      isBookmarked: false,
    },
  };
}

function normalizeSearchAuthor(value: unknown): SearchAuthor | null {
  const row = toRecord(value);
  const id = toIdText(row.id);
  if (!id) return null;

  return {
    id,
    name: toText(row.name) || "익명 작가",
    nickname: toText(row.nickname),
    postCount: toNumber(row.post_count),
    followerCount: toNumber(row.follower_count),
    latestPostAt: toText(row.latest_post_at) || null,
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
  error: AppErrorModel | null;
  refetch: () => Promise<void>;
};

export function useSearch(query: string): UseSearchResult {
  const normalizedQuery = query.trim();
  const requestSeqRef = useRef(0);

  const [posts, setPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<SearchAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);

  const fetchSearch = useCallback(async () => {
    const currentQuery = normalizedQuery;
    requestSeqRef.current += 1;
    const seq = requestSeqRef.current;

    if (!currentQuery) {
      setPosts([]);
      setAuthors([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("q", currentQuery);
      params.set("type", "all");
      params.set("limit", "20");
      params.set("offset", "0");

      const response = await apiGet<SearchResponse>(`/api/search?${params.toString()}`);
      if (!response?.ok) {
        throw new Error(response?.message || "검색 결과를 불러오지 못했어요.");
      }

      if (seq !== requestSeqRef.current) return;
      setPosts(normalizeSearchPosts(response.posts));
      setAuthors(normalizeSearchAuthors(response.authors));
    } catch (e) {
      if (seq !== requestSeqRef.current) return;
      setPosts([]);
      setAuthors([]);
      setError(normalizeApiError(e));
    } finally {
      if (seq !== requestSeqRef.current) return;
      setLoading(false);
    }
  }, [normalizedQuery]);

  useEffect(() => {
    fetchSearch();
  }, [fetchSearch]);

  return { posts, authors, loading, error, refetch: fetchSearch };
}
