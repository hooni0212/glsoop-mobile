import React from "react";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { tokens } from "@/theme/tokens";

type RightAction = {
  onPress: () => void;
  testID?: string;
  accessibilityLabel?: string;
  iconName?: "ellipsis-horizontal" | "ellipsis-vertical";
};

export type PostTopBarProps = {
  onPressBack: () => void;
  backButtonTestID?: string;
  rightAction?: RightAction;
  styles: {
    topBar: any;
    backBtn: any;
    topBarSpacer: any;
  };
};

export function PostTopBar({
  onPressBack,
  backButtonTestID,
  rightAction,
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

      {rightAction ? (
        <Pressable
          onPress={rightAction.onPress}
          hitSlop={12}
          style={styles.backBtn}
          testID={rightAction.testID}
          accessibilityRole="button"
          accessibilityLabel={rightAction.accessibilityLabel}
        >
          <Ionicons
            name={rightAction.iconName ?? "ellipsis-horizontal"}
            size={20}
            color={tokens.colors.text}
          />
        </Pressable>
      ) : (
        <View style={styles.topBarSpacer} />
      )}
    </View>
  );
}
