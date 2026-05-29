import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { buildPostExcerpt } from "@/lib/postContent";
import { normalizePostRenderImageFields } from "@/lib/postRenderImages";
import { normalizePublicDisplayName } from "@/lib/publicDisplayName";
import { normalizeProfileCosmeticsExpanded } from "@/types/cosmetics";
import type { Post } from "@/types/post";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Sort = "latest" | "popular" | "recommended";
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
  context?: {
    sort?: string;
    recommendation_seed?: number | null;
  };
};

type FeedBatch = {
  posts: Post[];
  hasMore: boolean;
  context?: FeedResponse["context"];
};

type RecommendedBuildOptions = {
  seenPostIds?: ReadonlySet<string>;
  rotationSeed?: number;
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
      profileCosmetics: parseAuthorProfileCosmetics(row),
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

function inferHasMore(res: FeedResponse, nextLength: number, limit: number) {
  if (typeof res.has_more === "boolean") return res.has_more;
  if (typeof res.hasMore === "boolean") return res.hasMore;
  return nextLength >= limit;
}

async function fetchFeedBatch(params: URLSearchParams, limit: number): Promise<FeedBatch> {
  const res = await apiGet<FeedResponse>(`/api/posts?${params.toString()}`);

  if (!res?.ok) throw new Error(res?.message || "피드를 불러오지 못했어요.");

  const posts = (res.posts ?? []).map(normalizePost);
  return {
    posts,
    hasMore: inferHasMore(res, posts.length, limit),
    context: res.context,
  };
}

function appendUniquePosts(prev: Post[], next: Post[]) {
  if (prev.length === 0) return next;
  const seen = new Set(prev.map((item) => item.id));
  const uniqueNext = next.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  return [...prev, ...uniqueNext];
}

function getPreferenceSignals(posts: Post[]) {
  const categories = new Set<string>();
  const tags = new Set<string>();

  for (const post of posts) {
    if (!post.viewer?.isLiked && !post.viewer?.isBookmarked) continue;
    categories.add(post.type);
    for (const tag of post.tags ?? []) {
      if (tag) tags.add(tag);
    }
  }

  return { categories, tags };
}

function hashToUnitInterval(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function buildRecommendedPosts(
  latest: Post[],
  popular: Post[],
  options: RecommendedBuildOptions = {}
) {
  const byId = new Map<
    string,
    {
      post: Post;
      score: number;
    }
  >();
  const source = [...popular, ...latest];
  const preferences = getPreferenceSignals(source);

  popular.forEach((post, index) => {
    const current = byId.get(post.id) ?? { post, score: 0 };
    current.score += (popular.length - index) * 3;
    byId.set(post.id, current);
  });

  latest.forEach((post, index) => {
    const current = byId.get(post.id) ?? { post, score: 0 };
    current.score += (latest.length - index) * 2;
    if (index < 6) current.score += 6 - index;
    byId.set(post.id, current);
  });

  for (const item of byId.values()) {
    if (preferences.categories.has(item.post.type)) item.score += 8;
    for (const tag of item.post.tags ?? []) {
      if (preferences.tags.has(tag)) item.score += 4;
    }
  }

  const candidates = Array.from(byId.values());
  const picked: Post[] = [];
  const authorUse = new Map<string, number>();
  const categoryUse = new Map<string, number>();
  const seenPostIds = options.seenPostIds;
  const rotationSeed = options.rotationSeed ?? 0;

  while (candidates.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const authorId = candidate.post.author?.id || "";
      const authorPenalty = authorId ? (authorUse.get(authorId) ?? 0) * 14 : 0;
      const categoryPenalty = (categoryUse.get(candidate.post.type) ?? 0) * 6;
      const seen = Boolean(seenPostIds?.has(candidate.post.id));
      const seenPenalty = seen ? 1000 : 0;
      const rotationBonus =
        hashToUnitInterval(`${rotationSeed}:${candidate.post.id}`) * (seen ? 18 : 3);
      const adjustedScore =
        candidate.score - authorPenalty - categoryPenalty - seenPenalty + rotationBonus;

      if (adjustedScore > bestScore) {
        bestIndex = index;
        bestScore = adjustedScore;
      }
    }

    const [next] = candidates.splice(bestIndex, 1);
    picked.push(next.post);

    const authorId = next.post.author?.id || "";
    if (authorId) authorUse.set(authorId, (authorUse.get(authorId) ?? 0) + 1);
    categoryUse.set(next.post.type, (categoryUse.get(next.post.type) ?? 0) + 1);
  }

  return picked;
}

async function fetchRecommendedBatch(
  baseParams: URLSearchParams,
  offset: number,
  limit: number,
  options: RecommendedBuildOptions = {}
): Promise<FeedBatch> {
  const serverParams = new URLSearchParams(baseParams);
  serverParams.set("sort", "recommended");
  serverParams.set("offset", String(offset));
  serverParams.set("seed", String(options.rotationSeed ?? 0));
  if (offset === 0 && options.seenPostIds?.size) {
    const excludedIds = Array.from(options.seenPostIds).slice(0, 100);
    if (excludedIds.length > 0) {
      serverParams.set("exclude_ids", excludedIds.join(","));
    }
  }

  let serverRecommendationError: unknown = null;
  try {
    const serverBatch = await fetchFeedBatch(serverParams, limit);
    if (serverBatch.context?.sort === "recommended") {
      return serverBatch;
    }
  } catch (error) {
    serverRecommendationError = error;
  }

  const poolLimit = Math.min(50, Math.max(limit * 3, 18));

  const fetchWithSort = (sort: "latest" | "popular") => {
    const params = new URLSearchParams(baseParams);
    params.set("sort", sort);
    params.set("limit", String(poolLimit));
    params.set("offset", String(offset));
    return fetchFeedBatch(params, poolLimit);
  };

  const [popularResult, latestResult] = await Promise.allSettled([
    fetchWithSort("popular"),
    fetchWithSort("latest"),
  ]);

  const fulfilled = [popularResult, latestResult].filter(
    (result): result is PromiseFulfilledResult<FeedBatch> => result.status === "fulfilled"
  );

  if (fulfilled.length === 0) {
    if (serverRecommendationError) throw serverRecommendationError;
    if (popularResult.status === "rejected") throw popularResult.reason;
    if (latestResult.status === "rejected") throw latestResult.reason;
    throw new Error("피드를 불러오지 못했어요.");
  }

  const popular = popularResult.status === "fulfilled" ? popularResult.value : { posts: [], hasMore: false };
  const latest = latestResult.status === "fulfilled" ? latestResult.value : { posts: [], hasMore: false };
  const posts = buildRecommendedPosts(latest.posts, popular.posts, options).slice(0, limit);

  return {
    posts,
    hasMore: popular.hasMore || latest.hasMore || posts.length >= limit,
  };
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
  const recommendedSeenPostIdsRef = useRef<Set<string>>(new Set());
  const recommendedRefreshRoundRef = useRef(0);
  const recommendedSessionKeyRef = useRef("");

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

        let batch: FeedBatch;

        if (sort === "recommended" && type !== "following") {
          const sessionKey = baseParams.toString();
          if (recommendedSessionKeyRef.current !== sessionKey) {
            recommendedSessionKeyRef.current = sessionKey;
            recommendedSeenPostIdsRef.current.clear();
            recommendedRefreshRoundRef.current = 0;
          }
          if (reset) recommendedRefreshRoundRef.current += 1;

          batch = await fetchRecommendedBatch(baseParams, offsetRef.current, limit, {
            rotationSeed: recommendedRefreshRoundRef.current,
            seenPostIds: recommendedSeenPostIdsRef.current,
          });
        } else {
          const params = new URLSearchParams(baseParams);
          params.set("offset", String(offsetRef.current));
          batch = await fetchFeedBatch(params, limit);
        }

        setItems((prev) => (reset ? batch.posts : appendUniquePosts(prev, batch.posts)));
        setHasMore(batch.hasMore);
        offsetRef.current += batch.posts.length;

        if (sort === "recommended" && type !== "following") {
          for (const post of batch.posts) {
            recommendedSeenPostIdsRef.current.add(post.id);
          }
          while (recommendedSeenPostIdsRef.current.size > 120) {
            const oldest = recommendedSeenPostIdsRef.current.values().next().value;
            if (!oldest) break;
            recommendedSeenPostIdsRef.current.delete(oldest);
          }
        }
      } catch (e: any) {
        setError(normalizeApiError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
        inflightRef.current = false;
      }
    },
    [baseParams, limit, sort, type]
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
