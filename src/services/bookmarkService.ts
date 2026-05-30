import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import { buildPostExcerpt } from "@/lib/postContent";
import { normalizePostRenderImageFields } from "@/lib/postRenderImages";
import { toAbsoluteProfilePhotoUrl } from "@/lib/profilePhoto";
import { normalizePublicDisplayName } from "@/lib/publicDisplayName";
import type { Post } from "@/types/post";

type ApiResultBase = {
  ok?: boolean;
  message?: string;
};

export type BookmarkList = {
  id: string;
  name: string;
  description?: string | null;
  itemCount?: number;
  contains?: boolean;
  lastUsedAt?: string | null;
};

type BookmarkListsResponse = ApiResultBase & {
  lists?: any[];
};

type BookmarkListResponse = ApiResultBase & {
  list?: any;
};

type BookmarkItemsResponse = ApiResultBase & {
  posts?: any[];
  has_more?: boolean;
};

function ensureOk(res: ApiResultBase, fallback: string) {
  if (res?.ok === false) {
    throw new Error(res?.message || fallback);
  }
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
  if (Array.isArray(row?.tags)) return row.tags.map(String).filter(Boolean);

  const raw = pickFirstString(row?.hashtags, row?.tag, row?.tagsCsv);
  if (!raw) return [];

  return raw
    .split(",")
    .map((t: string) => t.trim())
    .filter(Boolean);
}

function normalizeBookmarkList(row: any): BookmarkList {
  const id = String(row?.id ?? "");
  return {
    id,
    name: pickFirstString(row?.name) || "이름 없는 폴더",
    description: typeof row?.description === "string" ? row.description : null,
    itemCount: pickFirstNumber(row?.item_count, row?.itemCount),
    contains: parseFlag(row?.contains, row?.isContained, row?.bookmarked),
    lastUsedAt: pickFirstString(row?.last_used_at, row?.lastUsedAt) || null,
  };
}

function normalizeBookmarkPost(row: any): Post {
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

  const likeCount = pickFirstNumber(row?.like_count, row?.likeCount, row?.likes);
  const bookmarkCount = pickFirstNumber(row?.bookmark_count, row?.bookmarkCount, row?.bookmarks);

  const userLiked = parseFlag(row?.user_liked, row?.liked, row?.isLiked);
  const userBookmarked = parseFlag(
    row?.user_bookmarked,
    row?.bookmarked,
    row?.isBookmarked
  );

  const type = pickFirstString(row?.category, row?.type) || "short";

  return {
    id,
    type: type as Post["type"],
    title: title || undefined,
    excerpt: buildPostExcerpt(content, 90),
    tags: parseTags(row),
    createdAt,
    author: {
      id: authorId || "",
      name: authorName,
      profilePhotoUrl: toAbsoluteProfilePhotoUrl(
        row?.author_profile_photo_url,
        row?.authorProfilePhotoUrl
      ),
      profilePhotoThumbnailUrl: toAbsoluteProfilePhotoUrl(
        row?.author_profile_photo_thumbnail_url,
        row?.authorProfilePhotoThumbnailUrl
      ),
    },
    stats: {
      likeCount,
      bookmarkCount,
    },
    viewer: {
      isLiked: userLiked,
      isBookmarked: userBookmarked,
    },
    ...normalizePostRenderImageFields(row, { fallbackPostId: id }),
  };
}

export async function listBookmarkLists(): Promise<BookmarkList[]> {
  const res = await apiGet<BookmarkListsResponse>("/api/bookmarks/lists");
  ensureOk(res, "북마크 폴더를 불러오지 못했어요.");
  return Array.isArray(res?.lists) ? res.lists.map(normalizeBookmarkList) : [];
}

export async function listRecentBookmarkLists(params: {
  postId: string;
  limit?: number;
}): Promise<BookmarkList[]> {
  const q = new URLSearchParams();
  q.set("post_id", params.postId);
  q.set("limit", String(Math.max(1, Math.min(params.limit ?? 5, 20))));
  const res = await apiGet<BookmarkListsResponse>(
    `/api/bookmarks/lists/recent?${q.toString()}`
  );
  ensureOk(res, "최근 사용 북마크 폴더를 불러오지 못했어요.");
  return Array.isArray(res?.lists) ? res.lists.map(normalizeBookmarkList) : [];
}

export async function createBookmarkList(input: {
  name: string;
  description?: string;
}): Promise<BookmarkList> {
  const res = await apiPost<BookmarkListResponse>("/api/bookmarks/lists", {
    name: input.name,
    description: input.description,
  });
  ensureOk(res, "북마크 폴더를 생성하지 못했어요.");
  return normalizeBookmarkList(res?.list ?? {});
}

export async function renameBookmarkList(input: {
  listId: string;
  name: string;
  description?: string;
}): Promise<BookmarkList> {
  const res = await apiPatch<BookmarkListResponse>(
    `/api/bookmarks/lists/${encodeURIComponent(input.listId)}`,
    {
      name: input.name,
      description: input.description,
    }
  );
  ensureOk(res, "북마크 폴더를 수정하지 못했어요.");
  return normalizeBookmarkList(res?.list ?? {});
}

export async function deleteBookmarkList(listId: string): Promise<void> {
  const res = await apiDelete<ApiResultBase>(`/api/bookmarks/lists/${encodeURIComponent(listId)}`);
  ensureOk(res, "북마크 폴더를 삭제하지 못했어요.");
}

export async function listBookmarkItems(params: {
  listId: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: Post[]; hasMore: boolean }> {
  const q = new URLSearchParams();
  q.set("limit", String(params.limit ?? 20));
  q.set("offset", String(params.offset ?? 0));

  const res = await apiGet<BookmarkItemsResponse>(
    `/api/bookmarks/lists/${encodeURIComponent(params.listId)}/items?${q.toString()}`
  );
  ensureOk(res, "북마크 글 목록을 불러오지 못했어요.");

  const items = Array.isArray(res?.posts) ? res.posts.map(normalizeBookmarkPost) : [];
  return { items, hasMore: Boolean(res?.has_more) };
}

export async function addPostToBookmarkList(params: {
  listId: string;
  postId: string;
}): Promise<void> {
  const res = await apiPost<ApiResultBase>(
    `/api/bookmarks/lists/${encodeURIComponent(params.listId)}/items`,
    { postId: params.postId }
  );
  ensureOk(res, "북마크 추가에 실패했어요.");
}

export async function removePostFromBookmarkList(params: {
  listId: string;
  postId: string;
}): Promise<void> {
  const res = await apiDelete<ApiResultBase>(
    `/api/bookmarks/lists/${encodeURIComponent(params.listId)}/items/${encodeURIComponent(params.postId)}`
  );
  ensureOk(res, "북마크 삭제에 실패했어요.");
}

export async function listPostBookmarkLists(postId: string): Promise<BookmarkList[]> {
  const res = await apiGet<BookmarkListsResponse>(
    `/api/posts/${encodeURIComponent(postId)}/bookmarks`
  );
  ensureOk(res, "글의 북마크 정보를 불러오지 못했어요.");
  return Array.isArray(res?.lists) ? res.lists.map(normalizeBookmarkList) : [];
}
