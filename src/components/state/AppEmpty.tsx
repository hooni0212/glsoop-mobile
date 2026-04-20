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
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingVertical: tokens.space.lg + 2,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.space.xs as any,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  actionButton: {
    marginTop: tokens.space.xs,
    minHeight: 36,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  actionText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
});
