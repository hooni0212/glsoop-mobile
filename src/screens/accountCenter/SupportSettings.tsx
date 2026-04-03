import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  getLegalDocumentUrl,
  getSupportEmail,
  getSupportUrl,
} from "@/config/release";
import { useToast } from "@/feedback/ToastProvider";
import { openExternalUrl, openSupportMail } from "@/lib/externalLinks";
import { tokens } from "@/theme/tokens";

const SUPPORT_EMAIL = getSupportEmail();
const SUPPORT_URL = getSupportUrl();

const LEGAL_LINKS = [
  { key: "terms", label: "이용약관" },
  { key: "privacy", label: "개인정보 처리방침" },
  { key: "guidelines", label: "커뮤니티 가이드라인" },
] as const;

export default function AccountCenterSupportSettingsScreen() {
  const { showToast } = useToast();

  const handleOpenSupportMail = React.useCallback(async () => {
    try {
      await openSupportMail(SUPPORT_EMAIL, { subject: "글숲 앱 문의" });
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "메일 앱을 열지 못했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    }
  }, [showToast]);

  const handleOpenSupportPage = React.useCallback(async () => {
    try {
      await openExternalUrl(SUPPORT_URL);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "지원 페이지를 열지 못했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    }
  }, [showToast]);

  const handleOpenLegalDocument = React.useCallback(
    async (key: "terms" | "privacy" | "guidelines") => {
      try {
        await openExternalUrl(getLegalDocumentUrl(key));
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "문서를 열지 못했어요. 잠시 후 다시 시도해주세요.",
          { tone: "error" }
        );
      }
    },
    [showToast]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="도움말 및 지원" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>지원 정보를 한 곳에서 확인해요</Text>
          <Text style={styles.heroDescription}>
            문의 메일, 공개 지원 페이지, 정책 문서를 이 화면에서 바로 열 수 있어요.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>문의하기</Text>
          <Text style={styles.cardDescription}>
            앱 사용 중 도움이 필요하거나 신고 처리 관련 문의가 있으면 아래 경로를 이용해 주세요.
          </Text>
          <View style={styles.contactBox}>
            <Text style={styles.contactLabel}>지원 이메일</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
            <Text style={styles.contactHint}>
              안전 신고는 운영 검토 큐로 접수된 뒤 24시간 이내 1차 검토를 원칙으로 해요.
            </Text>
          </View>

          <View style={styles.actionList}>
            <Pressable onPress={() => void handleOpenSupportMail()} style={styles.primaryAction}>
              <View style={styles.actionIconWrap}>
                <Ionicons name="mail-outline" size={20} color={tokens.colors.bg} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.primaryActionTitle}>이메일로 문의하기</Text>
                <Text style={styles.primaryActionDescription}>
                  메일 앱을 열어 바로 문의를 보낼 수 있어요.
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color={tokens.colors.bg} />
            </Pressable>

            <Pressable onPress={() => void handleOpenSupportPage()} style={styles.secondaryAction}>
              <View style={[styles.actionIconWrap, styles.secondaryActionIconWrap]}>
                <Ionicons name="globe-outline" size={20} color={tokens.colors.text} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.secondaryActionTitle}>공개 지원 페이지 열기</Text>
                <Text style={styles.secondaryActionDescription}>
                  support URL에서 신고, 차단, 계정 관리 안내를 확인해요.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={tokens.colors.textMuted} />
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>정책 문서</Text>
          <Text style={styles.cardDescription}>
            App Review와 사용자 안내에 필요한 주요 문서를 바로 열 수 있어요.
          </Text>

          <View style={styles.linkList}>
            {LEGAL_LINKS.map((item) => (
              <Pressable
                key={item.key}
                onPress={() => void handleOpenLegalDocument(item.key)}
                style={styles.linkRow}
              >
                <Text style={styles.linkLabel}>{item.label}</Text>
                <Ionicons name="open-outline" size={18} color={tokens.colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>계정 및 안전 기능 안내</Text>
          <Text style={styles.noteBody}>
            차단한 사용자는 계정 센터에서 다시 확인하고 해제할 수 있어요. 계정 비활성화와 회원 탈퇴는
            계정 관리 화면에서 직접 진행할 수 있습니다.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()} style={styles.topBarBtn}>
        <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
      <View style={styles.topBarSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  topBar: {
    paddingTop: tokens.space.xs,
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarBtn: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.lg as any,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  heroDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  cardDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  contactBox: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.space.md,
    gap: 6,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4,
    color: tokens.colors.textFaint,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  contactHint: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  actionList: {
    gap: tokens.space.sm as any,
  },
  primaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
    padding: tokens.space.md,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.green700,
  },
  secondaryAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
    padding: tokens.space.md,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  actionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  secondaryActionIconWrap: {
    backgroundColor: tokens.colors.green050,
  },
  actionCopy: {
    flex: 1,
    gap: 4,
  },
  primaryActionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.bg,
  },
  primaryActionDescription: {
    fontSize: tokens.font.small,
    color: "rgba(255,255,255,0.84)",
    lineHeight: 18,
  },
  secondaryActionTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  secondaryActionDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  linkList: {
    gap: tokens.space.sm as any,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.colors.border,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: tokens.colors.text,
  },
  noteCard: {
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  noteBody: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
});
