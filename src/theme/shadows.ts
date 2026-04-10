import { Platform, type ViewStyle } from "react-native";

function androidShadow(boxShadow: string, elevationFallback: number, shadowColor = "#000"): ViewStyle {
  const androidVersion =
    Platform.OS === "android" && typeof Platform.Version === "number"
      ? Platform.Version
      : null;

  if (androidVersion != null && androidVersion >= 28) {
    return {
      elevation: 0,
      boxShadow,
    };
  }

  return {
    elevation: elevationFallback,
    shadowColor,
  };
}

export const softCardShadowStyle: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.035,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
    android: androidShadow("0px 8px 24px rgba(23, 34, 27, 0.08)", 1),
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.035,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
    },
  }) ?? {};

export const softPanelShadowStyle: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: androidShadow("0px 8px 18px rgba(23, 34, 27, 0.10)", 2),
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
  }) ?? {};

export const softChipShadowStyle: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: androidShadow("0px 4px 12px rgba(23, 34, 27, 0.10)", 1),
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
  }) ?? {};

export const floatingShadowStyle: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
    android: androidShadow("0px 12px 28px rgba(0, 0, 0, 0.18)", 6),
    default: {
      shadowColor: "#000",
      shadowOpacity: 0.14,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
    },
  }) ?? {};

export const paperFrameShadowStyle: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#4d3920",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
    },
    android: androidShadow("0px 14px 30px rgba(77, 57, 32, 0.14)", 3, "#4d3920"),
    default: {
      shadowColor: "#4d3920",
      shadowOpacity: 0.12,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 14 },
    },
  }) ?? {};

export const paperInnerShadowStyle: ViewStyle =
  Platform.select<ViewStyle>({
    ios: {
      shadowColor: "#8c6a3c",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
    android: androidShadow("0px 8px 18px rgba(140, 106, 60, 0.10)", 2, "#8c6a3c"),
    default: {
      shadowColor: "#8c6a3c",
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
    },
  }) ?? {};
