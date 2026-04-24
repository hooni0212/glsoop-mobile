import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import * as haptics from "@/lib/haptics";
import { logger } from "@/lib/logger";
import { registerPushToken, unregisterPushToken } from "@/services/pushTokenService";

type ShowToast = (message: string, options?: { tone?: "default" | "success" | "error"; durationMs?: number }) => void;

const PUSH_TOKEN_KEY = "glsoop.pushToken.v1";
const DEVICE_ID_KEY = "glsoop.deviceId.v1";
const ANDROID_CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

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

function openNotificationTarget(data: Record<string, unknown>) {
  const postId = asPostId(data.post_id);
  if (postId) {
    router.push(`/posts/${postId}`);
  }
}

export async function registerForPushNotificationsAsync() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;

  const projectId = getProjectId();
  if (!projectId) {
    logger.warn("[push] Expo projectId is missing; push token registration skipped.");
    return null;
  }

  await ensureAndroidChannel();

  const currentPermission = await Notifications.getPermissionsAsync();
  let finalStatus = currentPermission.status;
  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== "granted") return null;

  const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResult.data;
  await registerPushToken({
    token,
    platform: Platform.OS,
    deviceId: await getDeviceId(),
    appVersion: getAppVersion(),
  });
  await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

export async function unregisterStoredPushTokenAsync() {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (!token) return;

  try {
    await unregisterPushToken(token);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  }
}

export function usePushNotifications(authToken: string | null, showToast: ShowToast) {
  React.useEffect(() => {
    if (!authToken) return;
    let cancelled = false;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (!cancelled && token) {
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
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;

    const received = Notifications.addNotificationReceivedListener((notification) => {
      haptics.light();
      const title = notification.request.content.title || "새 알림";
      showToast(title, { durationMs: 1800 });
    });
    const responded = Notifications.addNotificationResponseReceivedListener((response) => {
      haptics.selection();
      openNotificationTarget(response.notification.request.content.data || {});
    });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) openNotificationTarget(response.notification.request.content.data || {});
      })
      .catch(() => {
        // no-op
      });

    return () => {
      received.remove();
      responded.remove();
    };
  }, [showToast]);
}
