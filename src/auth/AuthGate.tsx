import React from "react";
import { Redirect, useRouter, useSegments } from "expo-router";

import { useAuth } from "@/auth/AuthContext";

/**
 * 전역 인증 게이트
 * - 로그인 전에는 (auth) 그룹만 접근 가능
 * - 로그인 후에는 (tabs) 그룹으로 보냄
 */
export function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { ready, token } = useAuth();

  const inAuthGroup = segments[0] === "(auth)";

  React.useEffect(() => {
    if (!ready) return;

    if (!token && !inAuthGroup) {
      router.replace("/(auth)");
      return;
    }

    if (token && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [ready, token, inAuthGroup, router]);

  // 최초 로딩 중에는 화면 전환을 막기 위해 아무것도 렌더링하지 않음
  if (!ready) {
    return null;
  }

  // 토큰이 없고 auth 그룹 밖이면 즉시 리다이렉트(깜빡임 최소화)
  if (!token && !inAuthGroup) {
    return <Redirect href="/(auth)" />;
  }

  return null;
}
