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
    maxWidth: 357,
    alignSelf: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.dangerSoft,
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.danger,
    textAlign: "center",
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: tokens.colors.danger,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },
  retryButton: {
    marginTop: 6,
    minHeight: 40,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.white,
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.colors.danger,
  },
});
