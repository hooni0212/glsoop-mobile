import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { tokens } from "@/theme/tokens";

export default function AuthWelcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>글</Text>
          </View>
          <Text style={styles.title}>글숲</Text>
          <Text style={styles.subtitle}>
            일상의 작은 순간들을 기록하고{"\n"}나누는 공간
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          >
            <Text style={styles.primaryText}>로그인</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push("/(auth)/signup")}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
          >
            <Text style={styles.secondaryText}>회원가입</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.xl,
    paddingBottom: tokens.space.xl,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    marginTop: tokens.space.xl,
    gap: tokens.space.md as any,
  },
  logo: {
    width: 88,
    height: 88,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.green700,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
  },
  logoText: { color: "white", fontSize: 34, fontWeight: "900" },
  title: { fontSize: tokens.font.title, fontWeight: "900", color: tokens.colors.text },
  subtitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  actions: { gap: tokens.space.md as any },
  primaryBtn: {
    backgroundColor: tokens.colors.green700,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryText: { color: "white", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnPressed: { opacity: 0.92 },
  secondaryText: { color: tokens.colors.text, fontSize: 15, fontWeight: "800" },
});
