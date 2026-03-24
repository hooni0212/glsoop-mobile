import React from "react";
import { Redirect, usePathname, useRouter, useSegments } from "expo-router";
import { AppState, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { buildAuthRoute } from "@/lib/authRedirect";
import { apiGet } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { isProtectedRoute } from "@/lib/routeAccess";

/**
 * 전역 인증 게이트
 * - 로그인 전에는 (auth) 그룹만 접근 가능
 * - 로그인 후에는 (tabs) 그룹으로 보냄
 */
export function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { ready, token, signOut } = useAuth();
  const [validating, setValidating] = React.useState(false);
  const [validationTick, setValidationTick] = React.useState(0);
  const lastValidatedTokenRef = React.useRef<string | null>(null);

  const inAuthGroup = segments[0] === "(auth)";
  const needsAuth = isProtectedRoute(pathname, segments as string[]);
  const shouldBlockForValidation = validating && lastValidatedTokenRef.current === null;

  React.useEffect(() => {
    if (!ready || !token) return;

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setValidationTick((current) => current + 1);
      }
    });
    const intervalId = setInterval(() => {
      setValidationTick((current) => current + 1);
    }, 20000);

    return () => {
      appStateSub.remove();
      clearInterval(intervalId);
    };
  }, [ready, token]);

  React.useEffect(() => {
    if (!ready) return;

    if (!token) {
      lastValidatedTokenRef.current = null;
      if (needsAuth && !inAuthGroup) {
        router.replace(buildAuthRoute("/(auth)", pathname));
      }
      return;
    }

    const validationKey = `${token}:${pathname}:${validationTick}`;

    if (lastValidatedTokenRef.current === validationKey) {
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
        lastValidatedTokenRef.current = validationKey;
        if (inAuthGroup) {
          router.replace("/(tabs)");
        }
      } catch (error) {
        if (cancelled) return;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await signOut();
          lastValidatedTokenRef.current = null;
          if (needsAuth || inAuthGroup) {
            router.replace(buildAuthRoute("/(auth)", pathname));
          }
          return;
        }
        if (needsAuth) {
          router.replace(buildAuthRoute("/(auth)", pathname));
        }
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token, inAuthGroup, needsAuth, pathname, router, signOut, validationTick]);

  // 최초 로딩 중에는 화면 전환을 막기 위해 아무것도 렌더링하지 않음
  if (!ready) {
    return null;
  }

  if (shouldBlockForValidation) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text>로그인 상태를 확인하고 있어요...</Text>
      </View>
    );
  }

  // 토큰이 없고 auth 그룹 밖이면 즉시 리다이렉트(깜빡임 최소화)
  if (!token && needsAuth && !inAuthGroup) {
    return <Redirect href={buildAuthRoute("/(auth)", pathname)} />;
  }

  return null;
}
