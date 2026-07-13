import AsyncStorage from "@react-native-async-storage/async-storage";

const HOME_DISCOVERY_DISMISSED_AT_KEY = "glsoop:premium:home-discovery-dismissed-at";
const HOME_DISCOVERY_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export async function canShowPremiumHomeDiscovery(nowMs = Date.now()) {
  const value = await AsyncStorage.getItem(HOME_DISCOVERY_DISMISSED_AT_KEY);
  if (!value) return true;
  const dismissedAt = Number(value);
  return !Number.isFinite(dismissedAt) || nowMs - dismissedAt >= HOME_DISCOVERY_COOLDOWN_MS;
}

export async function dismissPremiumHomeDiscovery(nowMs = Date.now()) {
  await AsyncStorage.setItem(HOME_DISCOVERY_DISMISSED_AT_KEY, String(nowMs));
}
