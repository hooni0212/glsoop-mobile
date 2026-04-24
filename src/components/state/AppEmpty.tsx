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
    maxWidth: 357,
    alignSelf: "center",
    paddingVertical: 24,
    paddingHorizontal: 26,
    borderRadius: tokens.radius.xl,
    backgroundColor: "#fdfcf7",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.text,
    textAlign: "center",
    lineHeight: 24,
  },
  subtitle: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "600",
  },
  actionButton: {
    marginTop: 8,
    minHeight: 46,
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green700,
    borderWidth: 1,
    borderColor: tokens.colors.green700,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
});
