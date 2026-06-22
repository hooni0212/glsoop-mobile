import Constants from "expo-constants";
import { Dimensions, Platform } from "react-native";

export type NativeDeviceClass = "mobile" | "tablet";
export type NativePlatformFamily = "ios" | "android";

export function isNativeAppPlatform(): boolean {
  return Platform.OS === "ios" || Platform.OS === "android";
}

export function getNativePlatformFamily(): NativePlatformFamily | null {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  return null;
}

export function getNativeDeviceClass(): NativeDeviceClass | null {
  if (!isNativeAppPlatform()) return null;

  const screen = Dimensions.get("screen");
  const shortestSide = Math.min(screen.width, screen.height);
  const isTablet = (Platform.OS === "ios" && Platform.isPad) || shortestSide >= 600;
  return isTablet ? "tablet" : "mobile";
}

export function getGlsoopClientHeaders(): Record<string, string> {
  const platformFamily = getNativePlatformFamily();
  const deviceClass = getNativeDeviceClass();
  if (!platformFamily || !deviceClass) return {};

  return {
    "X-Glsoop-Client": "native_app",
    "X-Glsoop-Platform": platformFamily,
    "X-Glsoop-Device-Class": deviceClass,
  };
}

export function getNativeAppVersionContext() {
  return {
    app_version: Constants.expoConfig?.version ?? null,
    app_build:
      Constants.nativeBuildVersion ?? Constants.expoConfig?.extra?.mobileBuildNumber ?? null,
  };
}
