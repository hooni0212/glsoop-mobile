import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { type Href, router } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import * as haptics from "@/lib/haptics";
import { logger } from "@/lib/logger";
import { registerPushToken, unregisterPushToken } from "@/services/pushTokenService";

type ShowToast = (
  message: string,
  options?: { tone?: "default" | "success" | "error"; durationMs?: number }
) => void;

export type PushNotificationPermissionState = {
  supported: boolean;
  granted: boolean;
  status: string;
  canAskAgain: boolean;
};

export type PushRegistrationResult =
  | { status: "registered"; token: string }
  | { status: "denied"; canAskAgain: boolean }
  | { status: "missing-project" }
  | { status: "unsupported" };

type PushRegistrationOptions = {
  requestPermission?: boolean;
};

type PushNotificationHookOptions = {
  onNotificationReceived?: () => void;
};

const PUSH_TOKEN_KEY = "glsoop.pushToken.v1";
const DEVICE_ID_KEY = "glsoop.deviceId.v1";
const ANDROID_CHANNEL_ID = "default";
const PUSH_NOTIFICATIONS_SUPPORTED = Platform.OS === "ios" || Platform.OS === "android";

if (PUSH_NOTIFICATIONS_SUPPORTED) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

function getAppVersion() {
  return Constants.expoConfig?.version || null;
}

export function isPushNotificationSupported() {
  return PUSH_NOTIFICATIONS_SUPPORTED;
}

export async function getPushNotificationPermissionStateAsync(): Promise<PushNotificationPermissionState> {
  if (!isPushNotificationSupported()) {
    return {
      supported: false,
      granted: false,
      status: "unsupported",
      canAskAgain: false,
    };
  }

  const permission = await Notifications.getPermissionsAsync();
  return {
    supported: true,
    granted: permission.granted || permission.status === "granted",
    status: permission.status,
    canAskAgain: permission.canAskAgain !== false,
  };
}

async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: "글숲 알림",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 180, 120, 180],
    lightColor: "#2D5A3D",
  });
}

function asPostId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asInternalRoute(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.startsWith("/(auth)")) return null;
  return trimmed as Href;
}

function openNotificationTarget(data: Record<string, unknown>) {
  const targetPath = asInternalRoute(data.target_path ?? data.targetPath ?? data.path ?? data.url);
  if (targetPath) {
    router.push(targetPath);
    return true;
  }

  const postId = asPostId(data.post_id ?? data.postId ?? data.postID ?? data.id);
  if (postId) {
    router.push(`/posts/${postId}`);
    return true;
  }

  return false;
}

export async function registerForPushNotificationsAsync(
  options: PushRegistrationOptions = {}
): Promise<PushRegistrationResult> {
  if (!isPushNotificationSupported()) return { status: "unsupported" };

  const projectId = getProjectId();
  if (!projectId) {
    logger.warn("[push] Expo projectId is missing; push token registration skipped.");
    return { status: "missing-project" };
  }

  await ensureAndroidChannel();

  let permission = await Notifications.getPermissionsAsync();
  const shouldRequest = options.requestPermission !== false;
  if (!permission.granted && shouldRequest && permission.canAskAgain !== false) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted && permission.status !== "granted") {
    return { status: "denied", canAskAgain: permission.canAskAgain !== false };
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data;
  const previousToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  const platform = Platform.OS === "ios" ? "ios" : "android";

  if (previousToken && previousToken !== token) {
    try {
      await unregisterPushToken(previousToken);
    } catch {
      // old token cleanup is best-effort; registering the current token matters more
    }
  }

  await registerPushToken({
    token,
    platform,
    deviceId: await getDeviceId(),
    appVersion: getAppVersion(),
  });
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return { status: "registered", token };
}

export async function unregisterStoredPushTokenAsync() {
  if (!isPushNotificationSupported()) return;
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await unregisterPushToken(token);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

export function usePushNotifications(
  authToken: string | null,
  showToast: ShowToast,
  options: PushNotificationHookOptions = {}
) {
  const handledResponseRef = React.useRef<string | null>(null);
  const onNotificationReceivedRef = React.useRef(options.onNotificationReceived);

  React.useEffect(() => {
    onNotificationReceivedRef.current = options.onNotificationReceived;
  }, [options.onNotificationReceived]);

  const handleNotificationResponse = React.useCallback(
    (response: Notifications.NotificationResponse) => {
      const request = response.notification.request;
      const key = request.identifier || JSON.stringify(request.content.data ?? {});
      if (handledResponseRef.current === key) return;

      handledResponseRef.current = key;
      const opened = openNotificationTarget(request.content.data || {});
      onNotificationReceivedRef.current?.();
      if (opened) {
        haptics.selection();
      }
    },
    []
  );

  React.useEffect(() => {
    if (!authToken) return;
    let cancelled = false;

    registerForPushNotificationsAsync({ requestPermission: false })
      .then((result) => {
        if (!cancelled && result.status === "registered") {
          logger.debug("[push] token registered");
        }
      })
      .catch((error) => {
        logger.warn("[push] token registration failed", { error });
      });

    return () => {
      cancelled = true;
    };
  }, [authToken]);

  React.useEffect(() => {
    if (!isPushNotificationSupported()) return;

    const received = Notifications.addNotificationReceivedListener((notification) => {
      haptics.light();
      const title = notification.request.content.title || "새 알림";
      showToast(title, { durationMs: 1800 });
      onNotificationReceivedRef.current?.();
    });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationResponse(response);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleNotificationResponse(response);
      })
      .catch(() => {
        // no-op
      });

    return () => {
      received.remove();
      responded.remove();
    };
  }, [handleNotificationResponse, showToast]);
}
