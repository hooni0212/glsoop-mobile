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
  iconColor?: string;
  rightAction?: RightAction;
  styles: {
    topBar: any;
    backBtn: any;
    rightActionBtn?: any;
    topBarSpacer: any;
  };
};

export function PostTopBar({
  onPressBack,
  backButtonTestID,
  iconColor = tokens.colors.text,
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
        <Ionicons name="chevron-back" size={22} color={iconColor} />
      </Pressable>

      {rightAction ? (
        <Pressable
          onPress={rightAction.onPress}
          hitSlop={16}
          style={styles.rightActionBtn ?? styles.backBtn}
          testID={rightAction.testID}
          accessibilityRole="button"
          accessibilityLabel={rightAction.accessibilityLabel}
        >
          <Ionicons
            name={rightAction.iconName ?? "ellipsis-horizontal"}
            size={20}
            color={iconColor}
          />
        </Pressable>
      ) : (
        <View style={styles.topBarSpacer} />
      )}
    </View>
  );
}
