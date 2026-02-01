import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@/theme/tokens";

export type PostTopBarProps = {
  onPressBack: () => void;
  backButtonTestID?: string;
  styles: {
    topBar: any;
    backBtn: any;
    topBarSpacer: any;
  };
};

export function PostTopBar({
  onPressBack,
  backButtonTestID,
  styles,
}: PostTopBarProps) {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={onPressBack}
        hitSlop={12}
        style={styles.backBtn}
        testID={backButtonTestID}
      >
        <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
      </Pressable>

      {/* right side spacer (keeps center alignment if we add actions later) */}
      <View style={styles.topBarSpacer} />
    </View>
  );
}
