import { apiPost } from "@/lib/api";

type ToggleFollowResponse = {
  ok?: boolean;
  message?: string;
  following?: boolean;
  follower_count?: number;
};

export async function toggleFollowUser(
  userId: string
): Promise<{ following: boolean; followerCount: number }> {
  const res = await apiPost<ToggleFollowResponse>(
    `/api/users/${encodeURIComponent(userId)}/follow`
  );

  if (!res?.ok) {
    throw new Error(res?.message || "팔로우 처리에 실패했어요.");
  }

  return {
    following: Boolean(res.following),
    followerCount: Number(res.follower_count ?? 0),
  };
}
