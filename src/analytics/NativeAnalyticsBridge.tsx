import { usePathname } from "expo-router";
import React from "react";
import { AppState, type AppStateStatus } from "react-native";

import { trackNativeUxEvent } from "@/lib/nativeAnalytics";

export function NativeAnalyticsBridge({ navigationReady }: { navigationReady: boolean }) {
  const pathname = usePathname();
  const lastPathRef = React.useRef<string | null>(null);
  const backgroundedAtRef = React.useRef<number | null>(null);
  const appOpenTrackedRef = React.useRef(false);

  React.useEffect(() => {
    if (!navigationReady || appOpenTrackedRef.current) return;
    appOpenTrackedRef.current = true;
    void trackNativeUxEvent("native_app_open", {
      pagePath: pathname || null,
    });
  }, [navigationReady, pathname]);

  React.useEffect(() => {
    if (!navigationReady || !pathname || lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    void trackNativeUxEvent("native_screen_view", {
      pagePath: pathname,
      properties: { screen_path: pathname },
    });
  }, [navigationReady, pathname]);

  React.useEffect(() => {
    if (!navigationReady) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "background") {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (nextState !== "active" || backgroundedAtRef.current === null) return;
      const backgroundDurationMs = Math.max(0, Date.now() - backgroundedAtRef.current);
      backgroundedAtRef.current = null;
      void trackNativeUxEvent("native_app_foreground", {
        pagePath: pathname || null,
        properties: { background_duration_ms: backgroundDurationMs },
      });
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [navigationReady, pathname]);

  return null;
}
