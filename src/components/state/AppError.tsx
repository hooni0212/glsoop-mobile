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
  description: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  retryButton: {
    marginTop: tokens.space.xs,
    minHeight: 36,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  retryText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
  },
});
