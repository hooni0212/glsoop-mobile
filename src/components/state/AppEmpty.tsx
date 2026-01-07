import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { tokens } from "@/theme/tokens";

type Props = {
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
};

export function AppEmpty({ title, description, primaryAction }: Props) {
  const showAction = Boolean(primaryAction);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.subtitle}>{description}</Text> : null}
      {showAction ? (
        <Pressable
          onPress={primaryAction?.onPress}
          style={styles.actionButton}
          accessibilityRole="button"
          accessibilityLabel={primaryAction?.label}
        >
          <Text style={styles.actionText}>{primaryAction?.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: tokens.space.lg,
    paddingHorizontal: tokens.space.xl,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.sm as any,
  },
  title: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    textAlign: "center",
  },
  actionButton: {
    marginTop: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
  },
  actionText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
});
