import React from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildAuthRoute } from "@/lib/authRedirect";
import { tokens } from "@/theme/tokens";

const glsoopIcon = require("../../assets/images/icon.png");

export default function AuthWelcome() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect = params?.redirect ? String(params.redirect) : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="auth-welcome-screen">
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoFrame}>
            <Image source={glsoopIcon} style={styles.logoImage} contentFit="cover" transition={120} />
          </View>
          <Text style={styles.title}>글숲</Text>
          <Text style={styles.subtitle}>기록하고 나누는 글의 숲</Text>
        </View>

        <View style={styles.actionPanel}>
          <View style={styles.actions}>
            <Pressable
              onPress={() => router.push(buildAuthRoute("/(auth)/login", redirect))}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              testID="auth-welcome-login-btn"
            >
              <Text style={styles.primaryText}>로그인</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(buildAuthRoute("/(auth)/signup", redirect))}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              testID="auth-welcome-signup-btn"
            >
              <Text style={styles.secondaryText}>회원가입</Text>
            </Pressable>
          </View>
          <Text style={styles.actionHint}>회원가입 후 바로 글쓰기를 시작할 수 있어요.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: {
    flex: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.xl,
    paddingBottom: tokens.space.xl,
    justifyContent: "space-between",
  },
  hero: {
    alignItems: "center",
    marginTop: tokens.space.xl * 1.2,
    gap: tokens.space.md as any,
  },
  logoFrame: {
    width: 122,
    height: 122,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    shadowColor: tokens.shadow.color,
    shadowOpacity: tokens.shadow.opacity,
    shadowRadius: tokens.shadow.radius,
    shadowOffset: { width: 0, height: tokens.shadow.offsetY },
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  title: { fontSize: tokens.font.title, fontWeight: "900", color: tokens.colors.text },
  subtitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  actionPanel: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
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
  actionHint: {
    textAlign: "center",
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
});
