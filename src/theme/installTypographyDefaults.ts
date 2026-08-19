import type { StyleProp, TextStyle } from "react-native";
import { Text, TextInput } from "react-native";

import { appFontFamily } from "./typography";

type ComponentWithDefaults = {
  defaultProps?: {
    style?: StyleProp<TextStyle>;
  };
};

let installed = false;

export function installTypographyDefaults() {
  if (installed) return;
  installed = true;

  const baseStyle: TextStyle = { fontFamily: appFontFamily.ui };
  const text = Text as unknown as ComponentWithDefaults;
  const input = TextInput as unknown as ComponentWithDefaults;

  text.defaultProps = text.defaultProps ?? {};
  input.defaultProps = input.defaultProps ?? {};
  text.defaultProps.style = [baseStyle, text.defaultProps.style];
  input.defaultProps.style = [baseStyle, input.defaultProps.style];
}
