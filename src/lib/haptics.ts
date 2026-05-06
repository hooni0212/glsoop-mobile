import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type HapticTask = () => Promise<void>;

function run(task: HapticTask) {
  if (Platform.OS === "web") return;
  task().catch(() => {
    // Haptics are best-effort and should never block the UI.
  });
}

export function selection() {
  run(() => Haptics.selectionAsync());
}

export function light() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

export function medium() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export function success() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export function warning() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

export function error() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}
