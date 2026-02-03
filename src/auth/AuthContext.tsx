import React from "react";

import { clearLikes } from "@/features/likes/likeStore";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authToken";

type AuthState = {
  /** AsyncStorage 로드 완료 여부 */
  ready: boolean;
  /** Bearer token (없으면 null) */
  token: string | null;
  /** token 저장 + state 반영 */
  signIn: (token: string) => Promise<void>;
  /** token 삭제 + state 반영 */
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  const [token, setToken] = React.useState<string | null>(null);

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
    await setAuthToken(nextToken);
    setToken(nextToken);
  }, []);

  const signOut = React.useCallback(async () => {
    await clearAuthToken();
    setToken(null);
    clearLikes();
  }, []);

  const value = React.useMemo<AuthState>(
    () => ({ ready, token, signIn, signOut }),
    [ready, token, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
