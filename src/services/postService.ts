import type { PostType } from "@/types/post";
import { apiDelete, apiPost } from "@/lib/api";

export type CreatePostInput = {
  type: PostType;
  category?: PostType;
  title?: string;
  content: string;
  contentFormat?: "plain";
  tags?: string[];
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

export async function createPost(input: CreatePostInput): Promise<{ postId: string }> {
  const payload: Record<string, unknown> = {
    type: input.type,
    category: input.category ?? input.type,
    content: input.content,
    content_format: input.contentFormat ?? "plain",
  };

  if (input.title) payload.title = input.title;
  if (input.tags && input.tags.length > 0) payload.tags = input.tags;

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
