export function isPremiumIapEnabled() {
  return process.env.EXPO_PUBLIC_PREMIUM_IAP_ENABLED === "true";
}
