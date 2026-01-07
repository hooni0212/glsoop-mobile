import React from "react";

import { apiGet } from "@/lib/api";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/lib/authToken";
import { normalizeApiError } from "@/lib/errors";

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

  // 앱 최초 실행 시
  // 1) AsyncStorage에서 토큰 로드
  // 2) 토큰이 있다면 /api/me 호출로 유효성(만료/폐기) 1회 검증
  React.useEffect(() => {
    let mounted = true;

    (async () => {
      const t = await getAuthToken();
      if (!mounted) return;

      if (!t) {
        setToken(null);
        setReady(true);
        return;
      }

      // 토큰이 있으면 1회 검증 (401/403이면 자동 로그아웃)
      try {
        await apiGet<any>("/api/me");
        if (!mounted) return;
        setToken(t);
      } catch (e) {
        const normalized = normalizeApiError(e);
        if (normalized.kind === "auth") {
          await clearAuthToken();
          if (!mounted) return;
          setToken(null);
        } else {
          // 네트워크/서버 오류 등은 토큰을 유지하고 UI에서 재시도할 수 있게 둠
          if (!mounted) return;
          setToken(t);
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const signIn = React.useCallback(async (nextToken: string) => {
    await setAuthToken(nextToken);
    setToken(nextToken);
  }, []);

  const signOut = React.useCallback(async () => {
    await clearAuthToken();
    setToken(null);
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
