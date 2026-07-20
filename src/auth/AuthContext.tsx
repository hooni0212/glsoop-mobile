import React from "react";

import { clearBookmarks } from "@/features/bookmarks/bookmarkStore";
import { resetMyCosmeticsSnapshot } from "@/features/cosmetics/useMyCosmetics";
import { clearLikes } from "@/features/likes/likeStore";
import { clearNotificationUnreadCount } from "@/features/notifications/notificationStore";
import { clearBlockedUserIds } from "@/features/safety/blockedUsersStore";
import { apiPost } from "@/lib/api";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authToken";
import { unregisterStoredPushTokenAsync } from "@/lib/pushNotifications";
import { resetToAppRoot } from "@/navigation/rootNavigation";
import { clearSentenceFrameWidgetSnapshot } from "@/services/widgetSnapshotService";

type AuthState = {
  /** persisted auth storage 로드 완료 여부 */
  ready: boolean;
  /** Bearer token (없으면 null) */
  token: string | null;
  /** 현재 앱 세션에서 로그인 완료가 발생한 횟수 */
  signInSerial: number;
  /** token 저장 + state 반영 */
  signIn: (token: string) => Promise<void>;
  /** token 삭제 + state 반영 */
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);
  const [signInSerial, setSignInSerial] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await getAuthToken();
      if (!mounted) return;
      setToken(t);
      setReady(true);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = React.useCallback(async (nextToken: string) => {
    clearLikes();
    clearBookmarks();
    clearBlockedUserIds();
    clearNotificationUnreadCount();
    resetMyCosmeticsSnapshot();
    void clearSentenceFrameWidgetSnapshot();
    await setAuthToken(nextToken);
    setToken(nextToken);
    setSignInSerial((current) => current + 1);
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      await unregisterStoredPushTokenAsync();
    } catch {
      // push token cleanup is best-effort during logout
    }
    try {
      await apiPost("/api/logout", {});
    } catch {
      // local token/session cleanup should still continue
    }
    try {
      await resetToAppRoot();
    } catch {
      // Navigation cleanup must not prevent local logout completion.
    }
    await clearAuthToken();
    setToken(null);
    setSignInSerial(0);
    clearLikes();
    clearBookmarks();
    clearBlockedUserIds();
    clearNotificationUnreadCount();
    resetMyCosmeticsSnapshot();
    void clearSentenceFrameWidgetSnapshot();
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({ ready, token, signInSerial, signIn, signOut }),
    [ready, token, signInSerial, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
