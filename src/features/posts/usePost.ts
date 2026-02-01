import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import type { Post } from "@/types/post";
import { useCallback, useEffect, useRef, useState } from "react";

type PostDetailResponse = {
  ok: boolean;
  post?: any;
  message?: string;
};

function stripHtml(s: string) {
  return s
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function normalizePostDetail(row: any): any {
  const id = String(row?.id ?? row?.post_id ?? "");
  const title = pickFirstString(row?.title, row?.post_title);
  const contentRaw = pickFirstString(row?.content, row?.body, row?.html, row?.text);
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
    createdAt,
    author: { id: authorId || undefined, name: authorName || "익명" },
    stats: { likeCount, bookmarkCount },
    tags: parseTags(row),
    viewer: { isLiked: userLiked, isBookmarked: userBookmarked },
    content: stripHtml(contentRaw),
    contentRaw,
  };

  return post as Post & { content?: string; contentRaw?: string };
}

export function usePost(id: string | undefined) {
  const [post, setPost] = useState<(Post & { content?: string; contentRaw?: string }) | null>(null);
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
        prev: Post & { content?: string; contentRaw?: string }
      ) => Post & { content?: string; contentRaw?: string }
    ) => {
      setPost((prev) => (prev ? updater(prev) : prev));
    },
    []
  );

  return { post, loading, error, refetch: fetchPost, mutatePost };
}
