import { Platform } from "react-native";

export function blurActiveElementBeforeRouteChange() {
  if (Platform.OS !== "web") return;
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement as { blur?: () => void } | null;
  if (!activeElement || typeof activeElement.blur !== "function") return;

  activeElement.blur();
}
