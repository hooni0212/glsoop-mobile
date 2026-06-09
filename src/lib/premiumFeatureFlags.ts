import { Platform } from "react-native";

export function isPremiumIapEnabled() {
  const flag = process.env.EXPO_PUBLIC_PREMIUM_IAP_ENABLED?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;

  return Platform.OS === "ios";
}
