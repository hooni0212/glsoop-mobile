import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { AppErrorModel } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type AppErrorDisplay = Pick<AppErrorModel, "title" | "description">;

type Props = {
  error: AppErrorDisplay;
  onRetry?: () => void;
  retryLabel?: string;
};

export function AppError({ error, onRetry, retryLabel = "다시 시도" }: Props) {
  const showRetry = Boolean(onRetry);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{error.title}</Text>
      {error.description ? <Text style={styles.description}>{error.description}</Text> : null}
      {showRetry ? (
        <Pressable
          onPress={onRetry}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
        >
          <Text style={styles.retryText}>{retryLabel}</Text>
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
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
    elevation: 2,
  },
  title: {
    fontSize: tokens.font.body,
    fontWeight: "800",
    color: tokens.colors.text,
    textAlign: "center",
  },
  description: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    marginTop: tokens.space.sm,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
  },
  retryText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
});
