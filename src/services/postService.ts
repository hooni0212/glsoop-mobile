import type { PostType } from "@/types/post";
import { apiPost } from "@/lib/api";

export type CreatePostInput = {
  type: PostType;
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

export async function createPost(input: CreatePostInput): Promise<{ postId: string }> {
  const payload: Record<string, unknown> = {
    type: input.type,
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
