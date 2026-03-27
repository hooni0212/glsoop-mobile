import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY = "glsoop_auth_token_v1";
export const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";
let cachedToken: string | null = null;

async function loadStoredToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    return token || null;
  }

  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  return token || null;
}

async function persistToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async function removeStoredToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }

  await SecureStore.deleteItemAsync(TOKEN_KEY);
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
  cachedToken = token;
  await persistToken(token);
}

export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  await removeStoredToken();
}
