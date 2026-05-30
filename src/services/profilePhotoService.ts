import { apiDelete, apiFormData, apiGet } from "@/lib/api";
import { toAbsoluteProfilePhotoUrl } from "@/lib/profilePhoto";

export type ProfilePhoto = {
  url: string;
  thumbnailUrl: string;
  updatedAt: string | null;
};

export type ProfilePhotoStatus = {
  profilePhoto: ProfilePhoto | null;
  canUpload: boolean;
  entitlementKey: string;
  maxBytes: number;
  allowedContentTypes: string[];
};

type RawProfilePhoto = {
  url?: unknown;
  thumbnail_url?: unknown;
  thumbnailUrl?: unknown;
  updated_at?: unknown;
  updatedAt?: unknown;
};

type ProfilePhotoStatusResponse = {
  ok?: boolean;
  message?: string;
  profile_photo?: RawProfilePhoto | null;
  profilePhoto?: RawProfilePhoto | null;
  can_upload?: boolean;
  canUpload?: boolean;
  entitlement_key?: string;
  entitlementKey?: string;
  max_bytes?: number;
  maxBytes?: number;
  allowed_content_types?: unknown;
  allowedContentTypes?: unknown;
};

type UploadProfilePhotoResponse = {
  ok?: boolean;
  message?: string;
  profile_photo?: RawProfilePhoto | null;
  profilePhoto?: RawProfilePhoto | null;
};

function toStringList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
}

export function normalizeProfilePhoto(value: unknown): ProfilePhoto | null {
  if (!value || typeof value !== "object") return null;
  const row = value as RawProfilePhoto;
  const url = toAbsoluteProfilePhotoUrl(row.url);
  if (!url) return null;
  const thumbnailUrl = toAbsoluteProfilePhotoUrl(row.thumbnail_url, row.thumbnailUrl) || url;
  const updatedAt =
    typeof row.updated_at === "string"
      ? row.updated_at
      : typeof row.updatedAt === "string"
        ? row.updatedAt
        : null;

  return {
    url,
    thumbnailUrl,
    updatedAt,
  };
}

export async function getProfilePhotoStatus(): Promise<ProfilePhotoStatus> {
  const response = await apiGet<ProfilePhotoStatusResponse>("/api/me/profile-photo");
  if (response?.ok === false) {
    throw new Error(response.message || "프로필 사진 정보를 불러오지 못했어요.");
  }

  return {
    profilePhoto: normalizeProfilePhoto(response.profile_photo ?? response.profilePhoto),
    canUpload: Boolean(response.can_upload ?? response.canUpload),
    entitlementKey: String(response.entitlement_key ?? response.entitlementKey ?? "premium:glsoop"),
    maxBytes: Number(response.max_bytes ?? response.maxBytes ?? 5 * 1024 * 1024),
    allowedContentTypes: toStringList(
      response.allowed_content_types ?? response.allowedContentTypes
    ),
  };
}

export async function uploadProfilePhoto({
  uri,
  fileName,
  mimeType,
}: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
}) {
  const formData = new FormData();
  formData.append("photo", {
    uri,
    name: fileName || "profile-photo.jpg",
    type: mimeType || "image/jpeg",
  } as any);

  const response = await apiFormData<UploadProfilePhotoResponse>(
    "/api/me/profile-photo",
    formData,
    { method: "POST", timeoutMs: 45000 }
  );

  if (response?.ok === false) {
    throw new Error(response.message || "프로필 사진 업로드에 실패했어요.");
  }

  return normalizeProfilePhoto(response.profile_photo ?? response.profilePhoto);
}

export async function deleteProfilePhoto() {
  const response = await apiDelete<UploadProfilePhotoResponse>("/api/me/profile-photo");
  if (response?.ok === false) {
    throw new Error(response.message || "프로필 사진 삭제에 실패했어요.");
  }
  return null;
}
