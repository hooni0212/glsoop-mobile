import React from "react";
import { Image } from "expo-image";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { buildAuthRoute } from "@/lib/authRedirect";
import { tokens } from "@/theme/tokens";

const glsoopIcon = require("../../assets/images/icon.png");

export default function AuthWelcome() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const redirect = params?.redirect ? String(params.redirect) : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoFrame}>
            <Image source={glsoopIcon} style={styles.logoImage} contentFit="cover" transition={120} />
          </View>
          <Text style={styles.title}>글숲</Text>
          <Text style={styles.subtitle}>
            일상의 작은 순간들을 기록하고{"\n"}나누는 공간
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push(buildAuthRoute("/(auth)/login", redirect))}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          >
            <Text style={styles.primaryText}>로그인</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push(buildAuthRoute("/(auth)/signup", redirect))}
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
    marginTop: tokens.space.xl * 1.4,
    gap: tokens.space.md as any,
  },
  logoFrame: {
    width: 122,
    height: 122,
    borderRadius: 30,
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
