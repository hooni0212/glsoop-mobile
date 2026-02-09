import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "@/theme/tokens";

type Props = {
  title: string;
  subtitle?: string;
  onPressBack: () => void;
  onPressRefresh?: () => void;
};

export function GrowthDetailTopBar({ title, subtitle, onPressBack, onPressRefresh }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onPressBack}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <Pressable
          onPress={onPressRefresh}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="새로고침"
          disabled={!onPressRefresh}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={onPressRefresh ? tokens.colors.textMuted : "transparent"}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.sm,
    paddingBottom: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    backgroundColor: tokens.colors.bg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  subtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
});
