import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { tokens } from "@/theme/tokens";

type Props = {
  message?: string;
};

export function AppLoading({ message = "불러오는 중…" }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator />
      <Text style={styles.label}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
});
