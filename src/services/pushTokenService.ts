import { apiDelete, apiPost } from "@/lib/api";

type PushPlatform = "ios" | "android";

type RegisterPushTokenInput = {
  token: string;
  platform: PushPlatform;
  deviceId: string | null;
  appVersion: string | null;
};

export function registerPushToken(input: RegisterPushTokenInput) {
  return apiPost("/api/push-tokens", {
    token: input.token,
    platform: input.platform,
    device_id: input.deviceId,
    app_version: input.appVersion,
  });
}

export function unregisterPushToken(token: string) {
  return apiDelete(`/api/push-tokens?token=${encodeURIComponent(token)}`);
}
