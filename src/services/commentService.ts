import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export type CommentAuthor = {
  id: number;
  nickname: string | null;
  displayName: string;
};

export type PostComment = {
  id: number;
  postId: string;
  parentCommentId: number | null;
  status: "active" | "deleted";
  content: string | null;
  author: CommentAuthor | null;
  replyCount: number;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

type CommentApiRow = {
  id?: number | string;
  post_id?: number | string;
  parent_comment_id?: number | string | null;
  status?: string;
  content?: string | null;
  author?: {
    id?: number | string;
    nickname?: string | null;
    display_name?: string | null;
    displayName?: string | null;
  } | null;
  reply_count?: number | string;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

type CommentListResponse = {
  ok: boolean;
  comments?: CommentApiRow[];
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
    has_more?: boolean;
  };
};

type CommentResponse = {
  ok: boolean;
  comment?: CommentApiRow;
};

export type CommentListResult = {
  comments: PostComment[];
  total: number;
  hasMore: boolean;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNullableNumber(value: unknown) {
  const parsed = toNumber(value, 0);
  return parsed > 0 ? parsed : null;
}

function normalizeComment(row: CommentApiRow): PostComment {
  const authorId = toNullableNumber(row?.author?.id);
  const displayName =
    typeof row?.author?.display_name === "string"
      ? row.author.display_name
      : typeof row?.author?.displayName === "string"
        ? row.author.displayName
        : typeof row?.author?.nickname === "string"
          ? row.author.nickname
          : "익명";

  return {
    id: toNumber(row?.id),
    postId: String(row?.post_id ?? ""),
    parentCommentId: toNullableNumber(row?.parent_comment_id),
    status: row?.status === "deleted" ? "deleted" : "active",
    content: typeof row?.content === "string" ? row.content : null,
    author: authorId
      ? {
          id: authorId,
          nickname: typeof row?.author?.nickname === "string" ? row.author.nickname : null,
          displayName,
        }
      : null,
    replyCount: toNumber(row?.reply_count),
    createdAt: typeof row?.created_at === "string" ? row.created_at : null,
    updatedAt: typeof row?.updated_at === "string" ? row.updated_at : null,
    deletedAt: typeof row?.deleted_at === "string" ? row.deleted_at : null,
  };
}

export async function listPostComments(params: {
  postId: string;
  limit?: number;
  offset?: number;
}): Promise<CommentListResult> {
  const query = new URLSearchParams();
  query.set("limit", String(params.limit ?? 50));
  query.set("offset", String(params.offset ?? 0));

  const res = await apiGet<CommentListResponse>(
    `/api/posts/${encodeURIComponent(params.postId)}/comments?${query.toString()}`
  );
  const comments = Array.isArray(res?.comments) ? res.comments.map(normalizeComment) : [];

  return {
    comments,
    total: toNumber(res?.pagination?.total, comments.length),
    hasMore: Boolean(res?.pagination?.has_more),
  };
}

export async function createPostComment(params: {
  postId: string;
  content: string;
  parentCommentId?: number | null;
}): Promise<PostComment> {
  const res = await apiPost<CommentResponse>(
    `/api/posts/${encodeURIComponent(params.postId)}/comments`,
    {
      content: params.content,
      parent_comment_id: params.parentCommentId || undefined,
    }
  );

  return normalizeComment(res?.comment ?? {});
}

export async function updateComment(params: {
  commentId: number;
  content: string;
}): Promise<PostComment> {
  const res = await apiPatch<CommentResponse>(
    `/api/comments/${encodeURIComponent(String(params.commentId))}`,
    { content: params.content }
  );

  return normalizeComment(res?.comment ?? {});
}

export async function deleteComment(commentId: number): Promise<void> {
  await apiDelete(`/api/comments/${encodeURIComponent(String(commentId))}`);
}
