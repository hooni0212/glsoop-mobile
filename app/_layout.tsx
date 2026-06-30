import React from "react";
import * as SplashScreen from "expo-splash-screen";
import { getLoadedFonts, useFonts } from "expo-font";
import { AuthGate } from "@/auth/AuthGate";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { NativeAnalyticsBridge } from "@/analytics/NativeAnalyticsBridge";
import { PostLoginPreferencesPrompt } from "@/auth/PostLoginPreferencesPrompt";
import { AppBootScreen } from "@/components/state/AppBootScreen";
import { refreshNotificationUnreadCount } from "@/features/notifications/notificationStore";
import { ToastProvider, useToast } from "@/feedback/ToastProvider";
import { logger } from "@/lib/logger";
import { PREVIEW_FONT_ASSETS, PREVIEW_FONT_FAMILY } from "@/lib/previewFonts";
import { usePushNotifications } from "@/lib/pushNotifications";
import { BottomDockProvider } from "@/navigation/bottomDock";
import { AppOnboardingTour } from "@/onboarding/AppOnboardingTour";
import { GuidedHelpProvider } from "@/onboarding/GuidedHelpProvider";
import { Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";

SplashScreen.preventAutoHideAsync().catch(() => {
  // 이미 스플래시 제어 중이면 무시
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <AuthProvider>
          <RootLayoutContent />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent() {
  const { ready } = useAuth();
  const [fontsLoaded, fontLoadError] = useFonts(PREVIEW_FONT_ASSETS);
  const [layoutReady, setLayoutReady] = React.useState(false);
  const splashHiddenRef = React.useRef(false);
  const bootReady = ready && (fontsLoaded || Boolean(fontLoadError));

  React.useEffect(() => {
    if (!fontLoadError) return;
    logger.warn("[preview-fonts] failed to load local preview fonts", { error: fontLoadError });
  }, [fontLoadError]);

  React.useEffect(() => {
    if (!fontsLoaded) return;
    const expectedFonts = new Set(Object.keys(PREVIEW_FONT_ASSETS));
    const selectedFonts = new Set(Object.values(PREVIEW_FONT_FAMILY));
    const loadedFonts = getLoadedFonts().filter(
      (font) => expectedFonts.has(font) || selectedFonts.has(font)
    );
    logger.debug("[preview-fonts] loaded local preview fonts", { fonts: loadedFonts });
  }, [fontsLoaded]);

  React.useEffect(() => {
    if (!bootReady || !layoutReady || splashHiddenRef.current) return;

    splashHiddenRef.current = true;
    SplashScreen.hideAsync().catch(() => {
      splashHiddenRef.current = false;
    });
  }, [bootReady, layoutReady]);

  return (
    <View style={styles.root} onLayout={() => setLayoutReady(true)}>
      <BottomDockProvider>
        <ToastProvider>
          <NotificationBridge navigationReady={bootReady} />
          <NativeAnalyticsBridge navigationReady={bootReady} />
          {!bootReady ? (
            <AppBootScreen />
          ) : (
            <GuidedHelpProvider>
              <AuthGate />
              <Stack screenOptions={{ headerShown: false }}>
                {/* (auth): 로그인 전 랜딩/로그인/회원가입 */}
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />

                {/* (tabs): 로그인 후 앱 본문 */}
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                {/* ✅ FAB로 들어가는 글쓰기: 모달처럼 아래에서 올라오게 */}
                <Stack.Screen
                  name="write"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                    animation: "slide_from_bottom",
                    gestureEnabled: false,
                  }}
                />

                <Stack.Screen
                  name="account-center/index"
                  options={{
                    headerShown: false,
                    presentation: "transparentModal",
                    animation: "fade",
                  }}
                />
                <Stack.Screen
                  name="account-center/profile"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="account-center/security"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="account-center/account-closure"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                    animation: "slide_from_right",
                  }}
                />

                <Stack.Screen name="search" options={{ headerShown: false }} />
                <Stack.Screen
                  name="premium"
                  options={{
                    headerShown: false,
                    presentation: "modal",
                    animation: "slide_from_bottom",
                  }}
                />
                <Stack.Screen
                  name="guide"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen name="notifications" options={{ headerShown: false }} />
                <Stack.Screen name="profile-customize" options={{ headerShown: false }} />
                <Stack.Screen
                  name="me/followings"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen
                  name="me/followers"
                  options={{
                    headerShown: false,
                    animation: "slide_from_right",
                  }}
                />
                <Stack.Screen name="ui-kit" options={{ headerShown: false }} />
              </Stack>
              <PostLoginPreferencesPrompt />
              <AppOnboardingTour />
            </GuidedHelpProvider>
          )}
        </ToastProvider>
      </BottomDockProvider>
    </View>
  );
}

function NotificationBridge({ navigationReady }: { navigationReady: boolean }) {
  const { token } = useAuth();
  const { showToast } = useToast();
  usePushNotifications(token, showToast, {
    navigationReady,
    onNotificationReceived: () => {
      void refreshNotificationUnreadCount().catch(() => undefined);
    },
  });
  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
