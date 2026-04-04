import React from "react";
import { Redirect, usePathname, useRouter, useSegments } from "expo-router";
import { AppState, StyleSheet, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { AppBootScreen } from "@/components/state/AppBootScreen";
import { buildAuthRoute } from "@/lib/authRedirect";
import { apiGet } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { isProtectedRoute, isPublicUgcRoute } from "@/lib/routeAccess";

import { PublicUgcNoticeGate } from "./PublicUgcNoticeGate";

/**
 * 전역 인증 게이트
 * - 일부 공개 화면(Home/Search/Post/Author)은 비로그인 접근 허용
 * - 개인화 화면(Growth/Bookmarks/Me/Write 등)은 로그인 필요
 * - 로그인 후 auth 그룹으로 들어오면 홈으로 돌려보냄
 */
export function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const { ready, token, signOut } = useAuth();
  const [validating, setValidating] = React.useState(false);
  const [validationTick, setValidationTick] = React.useState(0);
  const [validatedKey, setValidatedKey] = React.useState<string | null>(null);
  const latestRouteRef = React.useRef({
    inAuthGroup: false,
    needsAuth: false,
    pathname: "/",
  });

  const inAuthGroup = segments[0] === "(auth)";
  const needsAuth = isProtectedRoute(pathname, segments as string[]);
  const isPublicUgc = isPublicUgcRoute(pathname, segments as string[]);
  const shouldBlockForValidation = validating && validatedKey === null;

  React.useEffect(() => {
    latestRouteRef.current = { inAuthGroup, needsAuth, pathname };
  }, [inAuthGroup, needsAuth, pathname]);

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
      setValidatedKey(null);
      setValidating(false);
      return;
    }

    if (validatedKey && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [ready, token, validatedKey, inAuthGroup, router]);

  React.useEffect(() => {
    if (!ready) return;

    if (!token) {
      if (needsAuth && !inAuthGroup) {
        router.replace(buildAuthRoute("/(auth)", pathname));
      }
      return;
    }

    const validationKey = `${token}:${validationTick}`;

    if (validatedKey === validationKey) {
      return;
    }

    let cancelled = false;
    setValidating(validatedKey === null);
    (async () => {
      try {
        await apiGet("/api/me");
        if (cancelled) return;
        setValidatedKey(validationKey);
      } catch (error) {
        if (cancelled) return;
        const latestRoute = latestRouteRef.current;
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await signOut();
          setValidatedKey(null);
          if (latestRoute.needsAuth || latestRoute.inAuthGroup) {
            router.replace(buildAuthRoute("/(auth)", latestRoute.pathname));
          }
          return;
        }
        if (validatedKey === null && latestRoute.needsAuth) {
          router.replace(buildAuthRoute("/(auth)", latestRoute.pathname));
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
  }, [ready, token, validatedKey, signOut, validationTick, inAuthGroup, needsAuth, pathname, router]);

  // 최초 로딩 중에는 화면 전환을 막기 위해 아무것도 렌더링하지 않음
  if (!ready) {
    return null;
  }

  if (shouldBlockForValidation) {
    return (
      <View pointerEvents="auto" style={styles.blockingOverlay}>
        <AppBootScreen
          title="로그인 상태를 확인하고 있어요"
          message="조금만 기다리면 안정적으로 이어서 열어드릴게요."
        />
      </View>
    );
  }

  // 토큰이 없고 auth 그룹 밖이면 즉시 리다이렉트(깜빡임 최소화)
  if (!token && needsAuth && !inAuthGroup) {
    return <Redirect href={buildAuthRoute("/(auth)", pathname)} />;
  }

  return <PublicUgcNoticeGate active={!inAuthGroup && isPublicUgc} />;
}

const styles = StyleSheet.create({
  blockingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
});
