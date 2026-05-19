import type { PostCommentPolicy, PostType, PostVisibility } from "@/types/post";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import {
  extractPostFontKey,
  normalizePostEditorText,
  type PostFontKey,
  withPostFontMeta,
} from "@/lib/postContent";

export type CreatePostInput = {
  type: PostType;
  category?: PostType;
  title?: string;
  content: string;
  contentPages?: string[];
  contentFormat?: "plain";
  hashtags?: string[];
  layoutJson?: unknown;
  fontKey?: PostFontKey;
  visibility?: PostVisibility;
  commentPolicy?: PostCommentPolicy;
  questContext?: {
    stateId: number;
    promptKey: string;
  };
};

type CreatePostResponse = {
  ok: boolean;
  message?: string;
  post_id?: string;
  quest_completion?: {
    state_id?: number;
    status?: string;
    progress?: number;
    target?: number;
    completed_at?: string | null;
  };
};

type DeletePostResponse = {
  ok?: boolean;
  message?: string;
};

type EditablePostResponse = {
  ok?: boolean;
  message?: string;
  post?: {
    id?: string | number;
    title?: string;
    content?: string;
    content_pages?: string[];
    category?: PostType;
    hashtags?: string[];
    layout_json?: unknown;
    visibility?: PostVisibility;
    comment_policy?: PostCommentPolicy;
  };
};

type UpdatePostResponse = {
  ok?: boolean;
  message?: string;
};

export async function createPost(input: CreatePostInput): Promise<{
  postId: string;
  questCompletion?: NonNullable<CreatePostResponse["quest_completion"]>;
}> {
  const payload: Record<string, unknown> = {
    type: input.type,
    category: input.category ?? input.type,
    content: withPostFontMeta(input.content, input.fontKey ?? "serif"),
    content_format: input.contentFormat ?? "plain",
  };

  if (input.title) payload.title = input.title;
  if (input.contentPages && input.contentPages.length > 0) {
    payload.content_pages = input.contentPages;
  }
  if (input.hashtags && input.hashtags.length > 0) payload.hashtags = input.hashtags;
  if (input.layoutJson) payload.layout_json = input.layoutJson;
  if (input.visibility) payload.visibility = input.visibility;
  if (input.commentPolicy) payload.comment_policy = input.commentPolicy;
  if (input.questContext) {
    payload.quest_context = {
      state_id: input.questContext.stateId,
      prompt_key: input.questContext.promptKey,
    };
  }

  const res = await apiPost<CreatePostResponse>("/api/posts", payload);

  if (!res?.ok) {
    throw new Error(res?.message || "글 작성에 실패했어요.");
  }

  if (!res.post_id) {
    throw new Error("서버가 post_id를 응답하지 않았어요.");
  }

  return { postId: res.post_id, questCompletion: res.quest_completion };
}

export async function deletePost(postId: string): Promise<void> {
  const res = await apiDelete<DeletePostResponse>(`/api/posts/${encodeURIComponent(postId)}`);

  if (res?.ok === false) {
    throw new Error(res.message || "글 삭제에 실패했어요.");
  }
}

export async function getEditablePost(postId: string): Promise<{
  id: string;
  title: string;
  content: string;
  contentPages: string[];
  category: PostType;
  hashtags: string[];
  layoutJson: unknown;
  fontKey: PostFontKey;
  visibility: PostVisibility;
  commentPolicy: PostCommentPolicy;
}> {
  const res = await apiGet<EditablePostResponse>(`/api/posts/${encodeURIComponent(postId)}/edit`);

  if (!res?.ok || !res.post?.id) {
    throw new Error(res?.message || "편집할 글을 불러오지 못했어요.");
  }

  return {
    id: String(res.post.id),
    title: typeof res.post.title === "string" ? res.post.title : "",
    content: normalizePostEditorText(res.post.content),
    contentPages: Array.isArray(res.post.content_pages)
      ? res.post.content_pages.map(normalizePostEditorText)
      : [],
    category: (res.post.category ?? "short") as PostType,
    hashtags: Array.isArray(res.post.hashtags)
      ? res.post.hashtags.map(String).filter(Boolean)
      : [],
    layoutJson: res.post.layout_json ?? null,
    fontKey: extractPostFontKey(res.post.content),
    visibility: res.post.visibility ?? "public",
    commentPolicy: res.post.comment_policy ?? "logged_in",
  };
}

export async function updatePost(input: {
  postId: string;
  type: PostType;
  title?: string;
  content: string;
  contentPages?: string[];
  hashtags?: string[];
  layoutJson?: unknown;
  fontKey?: PostFontKey;
  visibility?: PostVisibility;
  commentPolicy?: PostCommentPolicy;
}): Promise<void> {
  const res = await apiPut<UpdatePostResponse>(`/api/posts/${encodeURIComponent(input.postId)}`, {
    title: input.title,
    content: withPostFontMeta(input.content, input.fontKey ?? "serif"),
    ...(input.contentPages && input.contentPages.length > 0
      ? { content_pages: input.contentPages }
      : {}),
    category: input.type,
    hashtags: input.hashtags ?? [],
    layout_json: input.layoutJson,
    visibility: input.visibility ?? "public",
    comment_policy: input.commentPolicy ?? "logged_in",
  });

  if (res?.ok === false) {
    throw new Error(res.message || "글 수정에 실패했어요.");
  }
}
