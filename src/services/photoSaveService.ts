import { Platform } from "react-native";

import { apiGet, apiPost } from "@/lib/api";

export type PhotoSavePlatform = "ios" | "android";
export type PhotoSaveAccessMethod = "free" | "rewarded_ad" | "premium";

export type PhotoSavePolicy = {
  enabled: boolean;
  platform: PhotoSavePlatform;
  premium_entitlement_key: string;
  is_premium: boolean;
  free_daily_limit: number | null;
  free_used_today: number | null;
  free_remaining: number | null;
  can_save_without_ad: boolean;
  requires_ad: boolean;
  rewarded_ad_unit_id: string | null;
  rewarded_grant_ttl_minutes: number;
  fallback_reason: string | null;
  server_time: string;
};

export type PhotoSaveRewardGrant = {
  id: number;
  post_id: number;
  platform: PhotoSavePlatform;
  status: "earned" | "consumed" | "expired";
  expires_in_minutes: number;
};

export type PhotoSaveConsumeEvent = {
  id: number;
  post_id: number;
  access_type: PhotoSaveAccessMethod;
  platform: PhotoSavePlatform;
};

type PhotoSavePolicyResponse = {
  ok?: boolean;
  message?: string;
  policy: PhotoSavePolicy;
};

type PhotoSaveRewardGrantResponse = {
  ok?: boolean;
  message?: string;
  grant: PhotoSaveRewardGrant;
};

type PhotoSaveConsumeResponse = {
  ok?: boolean;
  message?: string;
  event: PhotoSaveConsumeEvent;
  policy: PhotoSavePolicy;
};

function assertOk(response: { ok?: boolean; message?: string }) {
  if (response.ok === false) {
    throw new Error(response.message || "사진 저장 요청을 처리하지 못했어요.");
  }
}

export function getPhotoSavePlatform(): PhotoSavePlatform | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}

export async function getPhotoSavePolicy(platform: PhotoSavePlatform) {
  const response = await apiGet<PhotoSavePolicyResponse>(
    `/api/photo-save/policy?platform=${encodeURIComponent(platform)}`
  );
  assertOk(response);
  return response.policy;
}

export async function recordPhotoSaveRewardedGrant(input: {
  postId: string;
  platform: PhotoSavePlatform;
  adUnitId: string;
  rewardType?: string | null;
  rewardAmount?: number | null;
  meta?: Record<string, unknown>;
}) {
  const response = await apiPost<PhotoSaveRewardGrantResponse>(
    "/api/photo-save/rewarded-grants",
    {
      post_id: input.postId,
      platform: input.platform,
      ad_unit_id: input.adUnitId,
      reward_type: input.rewardType || "photo_save",
      reward_amount: input.rewardAmount || 1,
      meta: input.meta,
    }
  );
  assertOk(response);
  return response.grant;
}

export async function consumePhotoSave(input: {
  postId: string;
  platform: PhotoSavePlatform;
  method: PhotoSaveAccessMethod;
  rewardedGrantId?: number | null;
  requestId?: string | null;
  meta?: Record<string, unknown>;
}) {
  const response = await apiPost<PhotoSaveConsumeResponse>("/api/photo-save/consume", {
    post_id: input.postId,
    platform: input.platform,
    method: input.method,
    rewarded_grant_id: input.rewardedGrantId ?? undefined,
    request_id: input.requestId ?? undefined,
    meta: input.meta,
  });
  assertOk(response);
  return response;
}
