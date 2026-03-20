import type { PostType } from "@/types/post";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";

export type CreatePostInput = {
  type: PostType;
  category?: PostType;
  title?: string;
  content: string;
  contentFormat?: "plain";
  hashtags?: string[];
};

type CreatePostResponse = {
  ok: boolean;
  message?: string;
  post_id?: string;
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
    category?: PostType;
    hashtags?: string[];
  };
};

type UpdatePostResponse = {
  ok?: boolean;
  message?: string;
};

export async function createPost(input: CreatePostInput): Promise<{ postId: string }> {
  const payload: Record<string, unknown> = {
    type: input.type,
    category: input.category ?? input.type,
    content: input.content,
    content_format: input.contentFormat ?? "plain",
  };

  if (input.title) payload.title = input.title;
  if (input.hashtags && input.hashtags.length > 0) payload.hashtags = input.hashtags;

  const res = await apiPost<CreatePostResponse>("/api/posts", payload);

  if (!res?.ok) {
    throw new Error(res?.message || "글 작성에 실패했어요.");
  }

  if (!res.post_id) {
    throw new Error("서버가 post_id를 응답하지 않았어요.");
  }

  return { postId: res.post_id };
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
  category: PostType;
  hashtags: string[];
}> {
  const res = await apiGet<EditablePostResponse>(`/api/posts/${encodeURIComponent(postId)}/edit`);

  if (!res?.ok || !res.post?.id) {
    throw new Error(res?.message || "편집할 글을 불러오지 못했어요.");
  }

  return {
    id: String(res.post.id),
    title: typeof res.post.title === "string" ? res.post.title : "",
    content: typeof res.post.content === "string" ? res.post.content : "",
    category: (res.post.category ?? "short") as PostType,
    hashtags: Array.isArray(res.post.hashtags)
      ? res.post.hashtags.map(String).filter(Boolean)
      : [],
  };
}

export async function updatePost(input: {
  postId: string;
  type: PostType;
  title?: string;
  content: string;
  hashtags?: string[];
}): Promise<void> {
  const res = await apiPut<UpdatePostResponse>(`/api/posts/${encodeURIComponent(input.postId)}`, {
    title: input.title,
    content: input.content,
    category: input.type,
    hashtags: input.hashtags ?? [],
  });

  if (res?.ok === false) {
    throw new Error(res.message || "글 수정에 실패했어요.");
  }
}
