import { apiDelete, apiFormData, apiGet, buildApiUrl } from "@/lib/api";

export type ProfilePhoto = {
  url: string;
  thumbnail_url?: string | null;
  updated_at?: string | null;
};

export type ProfilePhotoStatusResponse = {
  ok?: boolean;
  message?: string;
  profile_photo?: ProfilePhoto | null;
  can_upload?: boolean;
  entitlement_key?: string;
  max_bytes?: number;
  allowed_content_types?: string[];
};

export type ProfilePhotoUploadResponse = {
  ok?: boolean;
  message?: string;
  profile_photo?: ProfilePhoto | null;
};

export type ProfilePhotoUploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function pickFirstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function toProfilePhotoDisplayUrl(value: unknown) {
  const raw = pickFirstString(value);
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("file:")) {
    return raw;
  }
  if (raw.startsWith("/")) return buildApiUrl(raw);
  return buildApiUrl(`/${raw}`);
}

export function normalizeProfilePhoto(value: unknown): ProfilePhoto | null {
  const row = value && typeof value === "object" ? (value as any) : null;
  const url = toProfilePhotoDisplayUrl(
    row?.url ?? row?.profile_photo_url ?? row?.public_url
  );
  if (!url) return null;

  return {
    url,
    thumbnail_url: toProfilePhotoDisplayUrl(
      row?.thumbnail_url ?? row?.profile_photo_thumbnail_url
    ),
    updated_at: pickFirstString(
      row?.updated_at,
      row?.profile_photo_updated_at
    ) || null,
  };
}

export function normalizeMeProfilePhoto(value: unknown): ProfilePhoto | null {
  const row = value && typeof value === "object" ? (value as any) : null;
  if (!row) return null;
  return normalizeProfilePhoto({
    profile_photo_url: row.profile_photo_url,
    profile_photo_thumbnail_url: row.profile_photo_thumbnail_url,
    profile_photo_updated_at: row.profile_photo_updated_at,
  });
}

function inferMimeType(uri: string, explicit?: string | null) {
  const normalized = pickFirstString(explicit).toLowerCase();
  if (normalized) return normalized;
  const path = uri.split("?")[0]?.toLowerCase() || "";
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function inferFileName(uri: string, explicit?: string | null, mimeType?: string) {
  const normalized = pickFirstString(explicit);
  if (normalized) return normalized;

  const fromUri = decodeURIComponent(uri.split("?")[0]?.split("/").pop() || "");
  if (fromUri && /\.[a-z0-9]+$/i.test(fromUri)) return fromUri;

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  return `profile-photo.${ext}`;
}

export async function getProfilePhotoStatus() {
  const response = await apiGet<ProfilePhotoStatusResponse>("/api/me/profile-photo");
  return {
    ...response,
    profile_photo: normalizeProfilePhoto(response.profile_photo),
  };
}

export async function uploadProfilePhoto(asset: ProfilePhotoUploadAsset) {
  const mimeType = inferMimeType(asset.uri, asset.mimeType);
  const fileName = inferFileName(asset.uri, asset.fileName, mimeType);
  const formData = new FormData();

  formData.append("photo", {
    uri: asset.uri,
    name: fileName,
    type: mimeType,
  } as any);

  const response = await apiFormData<ProfilePhotoUploadResponse>(
    "/api/me/profile-photo",
    formData
  );

  return {
    ...response,
    profile_photo: normalizeProfilePhoto(response.profile_photo),
  };
}

export async function deleteProfilePhoto() {
  const response = await apiDelete<ProfilePhotoUploadResponse>("/api/me/profile-photo");
  return {
    ...response,
    profile_photo: normalizeProfilePhoto(response.profile_photo),
  };
}
