import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  title: string;
  canSubmit: boolean;
  onPressClose: () => void;
  onPressSubmit: () => void;
  onPressDrafts?: () => void;
  styles: any;
};

export function WriteTopBar({
  title,
  canSubmit,
  onPressClose,
  onPressSubmit,
  onPressDrafts,
  styles,
}: Props) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onPressClose} hitSlop={12} style={styles.iconBtn}>
        <Ionicons name="close" size={22} color="#2B2B2B" />
      </Pressable>

      <Text style={styles.screenTitle}>{title}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {!!onPressDrafts && (
          <Pressable onPress={onPressDrafts} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="file-tray-outline" size={20} color="#2B2B2B" />
          </Pressable>
        )}

        <Pressable
          onPress={onPressSubmit}
          disabled={!canSubmit}
          hitSlop={12}
          style={[styles.doneBtn, !canSubmit && styles.doneBtnDisabled]}
        >
          <Text style={[styles.doneText, !canSubmit && styles.doneTextDisabled]}>
            완료
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
