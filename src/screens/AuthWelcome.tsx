import React from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildAuthRoute } from "@/lib/authRedirect";
import { tokens } from "@/theme/tokens";

const glsoopIcon = require("../../assets/images/icon.png");
const ONBOARDING_ITEMS = [
  { icon: "sparkles-outline" as const, title: "추천", body: "반응과 새 글을 함께 반영해 다양한 글을 보여줘요." },
  { icon: "people-outline" as const, title: "팔로잉", body: "좋아하는 작가의 글을 한곳에서 이어 읽어요." },
  { icon: "bookmark-outline" as const, title: "저장", body: "다시 읽고 싶은 글은 폴더에 담아둘 수 있어요." },
];

export default function AuthWelcome() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect = params?.redirect ? String(params.redirect) : undefined;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="auth-welcome-screen">
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.logoFrame}>
            <Image source={glsoopIcon} style={styles.logoImage} contentFit="cover" transition={120} />
          </View>
          <Text style={styles.title}>글숲</Text>
          <Text style={styles.subtitle}>짧은 글을 읽고, 저장하고, 나만의 글을 남기는 공간</Text>
        </View>

        <View style={styles.onboardingList}>
          {ONBOARDING_ITEMS.map((item) => (
            <View key={item.title} style={styles.onboardingRow}>
              <View style={styles.onboardingIcon}>
                <Ionicons name={item.icon} size={19} color={tokens.colors.green700} />
              </View>
              <View style={styles.onboardingCopy}>
                <Text style={styles.onboardingTitle}>{item.title}</Text>
                <Text style={styles.onboardingBody}>{item.body}</Text>
              </View>
            </View>
          ))}
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
          <Text style={styles.actionHint}>로그인하면 저장, 팔로잉, 성장 기록이 이어져요.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.xl,
    paddingBottom: tokens.space.xl,
    justifyContent: "center",
    gap: tokens.space.xl as any,
  },
  hero: {
    alignItems: "center",
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
  title: { fontSize: 30, fontWeight: "900", color: tokens.colors.text, letterSpacing: 0 },
  subtitle: {
    fontSize: tokens.font.body,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  onboardingList: {
    gap: tokens.space.sm as any,
  },
  onboardingRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  onboardingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  onboardingCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  onboardingTitle: {
    fontSize: tokens.font.body,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  onboardingBody: {
    fontSize: tokens.font.small,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    lineHeight: 19,
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
