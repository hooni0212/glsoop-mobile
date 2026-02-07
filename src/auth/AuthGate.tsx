import React from "react";
import { Redirect, useRouter, useSegments } from "expo-router";
import { Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { apiGet } from "@/lib/api";
import { ApiError } from "@/lib/errors";

/**
 * 전역 인증 게이트
 * - 로그인 전에는 (auth) 그룹만 접근 가능
 * - 로그인 후에는 (tabs) 그룹으로 보냄
 */
export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { ready, token, signOut } = useAuth();
  const [validating, setValidating] = React.useState(false);
  const lastValidatedTokenRef = React.useRef<string | null>(null);

  const inAuthGroup = segments[0] === "(auth)";

  React.useEffect(() => {
    if (!ready) return;

    if (!token) {
      lastValidatedTokenRef.current = null;
      if (!inAuthGroup) {
        router.replace("/(auth)");
      }
      return;
    }

    if (lastValidatedTokenRef.current === token) {
      if (inAuthGroup) {
        router.replace("/(tabs)");
      }
      return;
    }

    let cancelled = false;
    setValidating(true);
    (async () => {
      try {
        await apiGet("/api/me");
        if (cancelled) return;
        lastValidatedTokenRef.current = token;
        router.replace("/(tabs)");
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await signOut();
          lastValidatedTokenRef.current = null;
          router.replace("/(auth)");
          return;
        }
        router.replace("/(auth)");
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token, inAuthGroup, router, signOut]);

  // 최초 로딩 중에는 화면 전환을 막기 위해 아무것도 렌더링하지 않음
  if (!ready) {
    return null;
  }

  if (validating) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>Checking session...</Text>
      </View>
    );
  }

  // 토큰이 없고 auth 그룹 밖이면 즉시 리다이렉트(깜빡임 최소화)
  if (!token && !inAuthGroup) {
    return <Redirect href="/(auth)" />;
  }

  return null;
}
