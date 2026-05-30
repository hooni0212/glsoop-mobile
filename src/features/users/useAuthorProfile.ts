import { useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { toAbsoluteProfilePhotoUrl } from "@/lib/profilePhoto";

export type AuthorProfile = {
  user: any | null;
  stats: any | null;
  viewer: any | null;
};

type AuthorProfileResponse = {
  ok?: boolean;
  message?: string;
  data?: any;
  user?: any;
  stats?: any;
  viewer?: any;
  profile_cosmetics?: unknown;
  profileCosmetics?: unknown;
};

function extractProfilePayload(res: AuthorProfileResponse) {
  if (res?.ok === false) {
    throw new Error(res?.message || "작가 정보를 불러오지 못했어요.");
  }

  const base = res?.data && typeof res.data === "object" ? res.data : res;
  const user = base?.user ?? base?.profile ?? base?.author ?? base ?? null;
  const stats = base?.stats ?? base?.userStats ?? null;
  const viewer = base?.viewer ?? res?.viewer ?? null;
  const userRecord = user && typeof user === "object" && !Array.isArray(user) ? user : null;
  const profileCosmetics =
    userRecord?.profile_cosmetics ??
    userRecord?.profileCosmetics ??
    base?.profile_cosmetics ??
    base?.profileCosmetics ??
    res?.profile_cosmetics ??
    res?.profileCosmetics ??
    null;

  if (userRecord) {
    return {
      user: {
        ...userRecord,
        profile_photo_url: toAbsoluteProfilePhotoUrl(
          userRecord.profile_photo_url,
          userRecord.profilePhotoUrl
        ),
        profile_photo_thumbnail_url: toAbsoluteProfilePhotoUrl(
          userRecord.profile_photo_thumbnail_url,
          userRecord.profilePhotoThumbnailUrl
        ),
        profile_cosmetics: profileCosmetics,
      },
      stats,
      viewer,
    };
  }

  return { user, stats, viewer };
}

export function useAuthorProfile(userId?: string) {
  const [user, setUser] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [viewer, setViewer] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await apiGet<AuthorProfileResponse>(
        `/api/users/${encodeURIComponent(userId)}/profile`
      );
      const payload = extractProfilePayload(res);

      setUser(payload.user ?? null);
      setStats(payload.stats ?? null);
      setViewer(payload.viewer ?? null);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchProfile();
  }, [fetchProfile, userId]);

  return { user, stats, viewer, loading, error, refetch: fetchProfile };
}
