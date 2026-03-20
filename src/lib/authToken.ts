import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "glsoop:auth:token:v1";
export const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";
let cachedToken: string | null = null;

export async function getAuthToken(): Promise<string | null> {
  try {
    if (cachedToken) return cachedToken;
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    cachedToken = token || null;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function setAuthToken(token: string): Promise<void> {
  cachedToken = token;
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearAuthToken(): Promise<void> {
  cachedToken = null;
  await AsyncStorage.removeItem(TOKEN_KEY);
}
