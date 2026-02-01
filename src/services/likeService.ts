import { apiPost } from "@/lib/api";

export type ToggleLikeResponse = {
  ok: boolean;
  liked: boolean;
  like_count: number;
  message?: string;
};

export async function togglePostLike(
  postId: string
): Promise<{ liked: boolean; likeCount: number }> {
  const res = await apiPost<ToggleLikeResponse>(
    `/api/posts/${encodeURIComponent(postId)}/toggle-like`
  );

  if (!res?.ok) {
    throw new Error(res?.message || "좋아요 요청에 실패했어요.");
  }

  return { liked: res.liked, likeCount: res.like_count };
}
