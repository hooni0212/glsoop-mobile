import React from "react";
import { type Href, usePathname, useSegments } from "expo-router";
import { AppState, StyleSheet, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { AppBootScreen } from "@/components/state/AppBootScreen";
import { buildAuthRoute } from "@/lib/authRedirect";
import { apiGet } from "@/lib/api";
import { ApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { APP_ROOT_HREF, navigateFromAppRoot } from "@/navigation/rootNavigation";
import { isProtectedRoute, isPublicUgcRoute } from "@/lib/routeAccess";

import { PublicUgcNoticeGate } from "./PublicUgcNoticeGate";

function shouldLoginReturnHome(path: string) {
  return path.split("?")[0]?.startsWith("/account-center") === true;
}

/**
 * 전역 인증 게이트
 * - 일부 공개 화면(Home/Search/Post/Author)은 비로그인 접근 허용
 * - 개인화 화면(Growth/Bookmarks/Me/Write 등)은 로그인 필요
 * - 로그인 후 auth 그룹으로 들어오면 홈으로 돌려보냄
 */
export function AuthGate() {
  const pathname = usePathname();
  const segments = useSegments();
  const { ready, token, signInSerial, signOut } = useAuth();
  const [validating, setValidating] = React.useState(false);
  const [validationTick, setValidationTick] = React.useState(0);
  const [validatedKey, setValidatedKey] = React.useState<string | null>(null);
  const latestRouteRef = React.useRef({
    inAuthGroup: false,
    needsAuth: false,
    pathname: "/",
  });
  const rootNavigationInFlightRef = React.useRef(false);

  const inAuthGroup = segments[0] === "(auth)";
  const needsAuth = isProtectedRoute(pathname, segments as string[]);
  const isPublicUgc = isPublicUgcRoute(pathname, segments as string[]);
  const shouldBlockForValidation = needsAuth && validating && validatedKey === null;

  React.useEffect(() => {
    latestRouteRef.current = { inAuthGroup, needsAuth, pathname };
  }, [inAuthGroup, needsAuth, pathname]);

  const navigateFromRootOnce = React.useCallback(async (href: Href) => {
    if (rootNavigationInFlightRef.current) return;

    rootNavigationInFlightRef.current = true;
    try {
      await navigateFromAppRoot(href);
    } finally {
      rootNavigationInFlightRef.current = false;
    }
  }, []);

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

    // Persisted sessions can boot into an auth deep link. Interactive login and
    // signup flows own their redirect and therefore skip this fallback.
    if (validatedKey && inAuthGroup && signInSerial === 0) {
      void navigateFromRootOnce(APP_ROOT_HREF);
    }
  }, [ready, token, validatedKey, inAuthGroup, signInSerial, navigateFromRootOnce]);

  React.useEffect(() => {
    if (!ready) return;

    if (!token) {
      if (needsAuth && !inAuthGroup) {
        void navigateFromRootOnce(
          buildAuthRoute("/(auth)/login", shouldLoginReturnHome(pathname) ? undefined : pathname)
        );
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
            await navigateFromRootOnce(
              buildAuthRoute(
                "/(auth)/login",
                shouldLoginReturnHome(latestRoute.pathname) ? undefined : latestRoute.pathname
              )
            );
          }
          return;
        }
        logger.warn("[auth] session validation failed without auth error", {
          pathname: latestRoute.pathname,
          inAuthGroup: latestRoute.inAuthGroup,
          needsAuth: latestRoute.needsAuth,
          status: error instanceof ApiError ? error.status : undefined,
          error,
        });
      } finally {
        if (!cancelled) {
          setValidating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    token,
    validatedKey,
    signOut,
    validationTick,
    inAuthGroup,
    needsAuth,
    pathname,
    navigateFromRootOnce,
  ]);

  // 최초 로딩 중에는 화면 전환을 막기 위해 아무것도 렌더링하지 않음
  if (!ready) {
    return null;
  }

  if (shouldBlockForValidation) {
    return (
      <View pointerEvents="auto" style={styles.blockingOverlay}>
        <AppBootScreen
          title="글숲"
          message="이어 읽을 공간을 준비하고 있어요."
        />
      </View>
    );
  }

  // 루트 스택을 정리하는 동안 보호 화면의 상호작용과 깜빡임을 막습니다.
  if (!token && needsAuth && !inAuthGroup) {
    return (
      <View pointerEvents="auto" style={styles.blockingOverlay}>
        <AppBootScreen title="글숲" message="로그인 화면을 준비하고 있어요." />
      </View>
    );
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
