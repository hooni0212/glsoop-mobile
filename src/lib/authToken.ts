import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { logger } from "@/lib/logger";

const TOKEN_KEY = "glsoop_auth_token_v1";
const NATIVE_FALLBACK_TOKEN_KEY = "glsoop_auth_token_v1_async_fallback";
export const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";
let cachedToken: string | null = null;
let secureStoreAvailability: Promise<boolean> | null = null;

function canUseNativeAsyncFallback() {
  return Platform.OS === "android";
}

async function isSecureStoreAvailable() {
  if (Platform.OS === "web") return false;
  if (!secureStoreAvailability) {
    secureStoreAvailability = SecureStore.isAvailableAsync().catch(() => false);
  }
  return secureStoreAvailability;
}

async function readNativeFallbackToken() {
  if (!canUseNativeAsyncFallback()) return null;
  const token = await AsyncStorage.getItem(NATIVE_FALLBACK_TOKEN_KEY);
  return token || null;
}

async function clearNativeFallbackToken() {
  if (!canUseNativeAsyncFallback()) return;
  await AsyncStorage.removeItem(NATIVE_FALLBACK_TOKEN_KEY);
}

async function clearNativeFallbackTokenSafely(reason: "persist" | "remove") {
  try {
    await clearNativeFallbackToken();
  } catch (error) {
    logger.warn("[auth] fallback token cleanup failed", {
      platform: Platform.OS,
      reason,
      error,
    });
  }
}

async function loadStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token || null;
  }

  const secureStoreReady = await isSecureStoreAvailable();
  if (!secureStoreReady) {
    return readNativeFallbackToken();
  }

  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return token || (await readNativeFallbackToken());
  } catch (error) {
    logger.warn("[auth] secure store read failed; falling back to async storage", {
      platform: Platform.OS,
      error,
    });
    return readNativeFallbackToken();
  }
}

async function persistToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }

  const secureStoreReady = await isSecureStoreAvailable();
  if (secureStoreReady) {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await clearNativeFallbackTokenSafely("persist");
      return;
    } catch (error) {
      logger.warn("[auth] secure store persist failed", {
        platform: Platform.OS,
        error,
      });
    }
  }

  if (canUseNativeAsyncFallback()) {
    await AsyncStorage.setItem(NATIVE_FALLBACK_TOKEN_KEY, token);
    return;
  }

  throw new Error("Secure token storage is unavailable on this device.");
}

async function removeStoredToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }

  const secureStoreReady = await isSecureStoreAvailable();
  if (secureStoreReady) {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      logger.warn("[auth] secure store delete failed", {
        platform: Platform.OS,
        error,
      });
    }
  }
  await clearNativeFallbackTokenSafely("remove");
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (cachedToken) return cachedToken;
    const token = await loadStoredToken();
    cachedToken = token || null;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  try {
    await persistToken(token);
    cachedToken = token;
  } catch (error) {
    cachedToken = null;
    throw error;
  }
}

export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  await removeStoredToken();
}
