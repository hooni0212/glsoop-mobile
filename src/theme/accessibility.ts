import type { ViewStyle } from "react-native";

import { tokens } from "@/theme/tokens";

export const keyboardFocusRingStyle = {
  outlineColor: tokens.colors.focus,
  outlineOffset: 3,
  outlineStyle: "solid",
  outlineWidth: 2,
} satisfies ViewStyle;
