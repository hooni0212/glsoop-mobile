import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tokens } from "@/theme/tokens";

const MENU_ITEMS = [
  {
    title: "프로필 및 공개 정보",
    description: "닉네임, 소개를 수정하고 프로필 꾸미기로 이동해요.",
    route: "/account-center/profile" as const,
    icon: "person-circle-outline" as const,
  },
  {
    title: "보안 및 로그인",
    description: "로그인 유지, 활성 세션, 전체 로그아웃을 관리해요.",
    route: "/account-center/security" as const,
    icon: "shield-checkmark-outline" as const,
  },
  {
    title: "차단한 사용자",
    description: "내 화면에서 숨긴 사용자를 확인하고 차단을 해제해요.",
    route: "/account-center/blocked-users" as const,
    icon: "ban-outline" as const,
  },
  {
    title: "도움말 및 지원",
    description: "지원 메일, 지원 페이지, 정책 문서를 한 곳에서 확인해요.",
    route: "/account-center/support" as const,
    icon: "help-circle-outline" as const,
  },
  {
    title: "계정 관리",
    description: "계정 비활성화와 회원 탈퇴를 진행해요.",
    route: "/account-center/account-closure" as const,
    icon: "warning-outline" as const,
  },
] as const;

export default function AccountCenterEntryScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.safe}>
      <Pressable style={styles.overlay} onPress={() => router.back()}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom + 8) }]}
          onPress={() => {}}
        >
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.handle} />
            <View style={styles.headerRow}>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>ACCOUNT CENTER</Text>
                <Text style={styles.title}>계정 센터</Text>
                <Text style={styles.description}>
                  내 정보 화면에서 분리한 설정 항목을 여기서 정리해서 관리해요.
                </Text>
              </View>
              <Pressable
                onPress={() => router.back()}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="계정 센터 닫기"
              >
                <Ionicons name="close" size={18} color={tokens.colors.text} />
              </Pressable>
            </View>

            <View style={styles.menuList}>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  key={item.route}
                  onPress={() => router.push(item.route as never)}
                  style={styles.menuItem}
                >
                  <View style={styles.menuIconWrap}>
                    <Ionicons name={item.icon} size={20} color={tokens.colors.text} />
                  </View>
                  <View style={styles.menuCopy}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuDescription}>{item.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={tokens.colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "transparent",
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.26)",
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    maxHeight: "88%",
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    gap: tokens.space.lg as any,
    minHeight: 360,
  },
  sheetContent: {
    gap: tokens.space.lg as any,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.borderStrong,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.md as any,
  },
  headerCopy: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: tokens.colors.textFaint,
    letterSpacing: 1.1,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  description: {
    fontSize: tokens.font.body,
    color: tokens.colors.textMuted,
    lineHeight: 22,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  menuList: {
    gap: tokens.space.sm as any,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
    padding: tokens.space.md,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  menuCopy: {
    flex: 1,
    gap: 4,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  menuDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
});
