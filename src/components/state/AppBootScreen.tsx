import React from "react";
import { Image } from "expo-image";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { tokens } from "@/theme/tokens";

const glsoopIcon = require("../../../assets/images/icon.png");

type Props = {
  title?: string;
  message?: string;
};

export function AppBootScreen({
  title = "글숲",
  message = "잠시만 기다려주세요.",
}: Props) {
  return (
    <SafeAreaView style={styles.safe} testID="app-boot-screen">
      <View style={styles.container}>
        <View style={styles.logoFrame}>
          <Image source={glsoopIcon} style={styles.logoImage} contentFit="cover" />
        </View>

        <View style={styles.copyBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
        </View>

        <ActivityIndicator color={tokens.colors.green700} size="small" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: tokens.space.lg as any,
  },
  logoFrame: {
    width: 116,
    height: 116,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#f4eedf",
    borderWidth: 1,
    borderColor: "rgba(45,90,61,0.08)",
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  copyBlock: {
    alignItems: "center",
    gap: tokens.space.xs as any,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.text,
    textAlign: "center",
  },
  message: {
    fontSize: tokens.font.body,
    lineHeight: 22,
    color: tokens.colors.textMuted,
    textAlign: "center",
  },
});
