import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBootScreen } from "@/components/state/AppBootScreen";
import {
  getLegalDocumentUrl,
  getSupportEmail,
  getSupportUrl,
} from "@/config/release";
import { useToast } from "@/feedback/ToastProvider";
import { openExternalUrl, openSupportMail } from "@/lib/externalLinks";
import {
  fetchRuntimeLegalConfig,
  resolveRuntimeLegalDocumentUrl,
  type RuntimeLegalConfig,
} from "@/services/runtimeConfigService";
import { tokens } from "@/theme/tokens";

import {
  acknowledgePublicUgcNotice,
  getAcknowledgedPublicUgcNoticeVersion,
} from "./publicUgcNoticeStorage";

type Props = {
  active: boolean;
};

const NOTICE_FALLBACK_VERSION = "public-ugc-notice.v1";
const SUPPORT_EMAIL = getSupportEmail();
const SUPPORT_URL = getSupportUrl();

const DOCUMENT_ITEMS = [
  { key: "terms", label: "이용약관" },
  { key: "privacy", label: "개인정보 처리방침" },
  { key: "guidelines", label: "커뮤니티 가이드라인" },
] as const;

function buildPublicUgcNoticeVersionKey(config: RuntimeLegalConfig | null) {
  const versions = config?.versions;
  const versionParts = [versions?.terms, versions?.privacy, versions?.guidelines].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  if (versionParts.length === 0) {
    return NOTICE_FALLBACK_VERSION;
  }

  return `public-ugc-notice:${versionParts.join("|")}`;
}

export function PublicUgcNoticeGate({ active }: Props) {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [runtimeConfig, setRuntimeConfig] = React.useState<RuntimeLegalConfig | null>(null);
  const [currentVersionKey, setCurrentVersionKey] = React.useState<string>(NOTICE_FALLBACK_VERSION);
  const [acknowledgedVersionKey, setAcknowledgedVersionKey] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [legalAcknowledged, setLegalAcknowledged] = React.useState(false);
  const [safetyAcknowledged, setSafetyAcknowledged] = React.useState(false);

  React.useEffect(() => {
    if (!active || ready) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const [storedVersionKey, config] = await Promise.all([
          getAcknowledgedPublicUgcNoticeVersion(),
          fetchRuntimeLegalConfig().catch(() => null),
        ]);
        if (cancelled) return;

        setRuntimeConfig(config);
        setCurrentVersionKey(buildPublicUgcNoticeVersionKey(config));
        setAcknowledgedVersionKey(storedVersionKey);
        setReady(true);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, ready]);

  const shouldShow = active && (!ready || acknowledgedVersionKey !== currentVersionKey);
  const canContinue = legalAcknowledged && safetyAcknowledged && !submitting;

  React.useEffect(() => {
    if (!shouldShow) return;
    setLegalAcknowledged(false);
    setSafetyAcknowledged(false);
  }, [currentVersionKey, shouldShow]);

  const handleOpenDocument = React.useCallback(
    async (key: "terms" | "privacy" | "guidelines") => {
      const fallbackUrl = getLegalDocumentUrl(key);
      const resolvedUrl = resolveRuntimeLegalDocumentUrl(runtimeConfig, key, fallbackUrl);

      try {
        await openExternalUrl(resolvedUrl);
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "문서를 열지 못했어요. 잠시 후 다시 시도해주세요.",
          { tone: "error" }
        );
      }
    },
    [runtimeConfig, showToast]
  );

  const handleContinue = React.useCallback(async () => {
    if (!legalAcknowledged || !safetyAcknowledged) {
      showToast("약관, 가이드라인, 지원 안내 확인 항목에 체크해 주세요.", {
        tone: "error",
      });
      return;
    }

    setSubmitting(true);
    try {
      await acknowledgePublicUgcNotice(currentVersionKey);
      setAcknowledgedVersionKey(currentVersionKey);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "안내 확인 상태를 저장하지 못했어요. 잠시 후 다시 시도해주세요.",
        { tone: "error" }
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentVersionKey, legalAcknowledged, safetyAcknowledged, showToast]);

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

  if (!shouldShow) {
    return null;
  }

  if (loading || !ready) {
    return (
      <View pointerEvents="auto" style={styles.overlay}>
        <AppBootScreen
          title="글숲"
          message="읽을 준비를 하고 있어요."
        />
      </View>
    );
  }

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      <SafeAreaView style={styles.safe} testID="public-ugc-notice-gate">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          testID="public-ugc-notice-scroll"
        >
          <View style={styles.card} testID="public-ugc-notice-card">
            <Text style={styles.eyebrow}>BEFORE YOU READ</Text>
            <Text style={styles.title}>공개 글을 보기 전에 확인해 주세요</Text>
            <Text style={styles.description}>
              글숲의 홈, 검색, 글 상세, 작가 화면은 공개 UGC 영역입니다. 계속하기 전에 아래 문서와
              지원 경로를 확인하고, 운영 기준 위반 시 콘텐츠 삭제·계정 제한 또는 영구 정지가
              이루어질 수 있음을 먼저 살펴봐 주세요.
            </Text>

            <View style={styles.linkList}>
              {DOCUMENT_ITEMS.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => void handleOpenDocument(item.key)}
                  style={styles.linkRow}
                  testID={`public-ugc-notice-link-${item.key}`}
                >
                  <View style={styles.linkCopy}>
                    <Text style={styles.linkLabel}>{item.label}</Text>
                    <Text style={styles.linkHint}>새 창으로 열기</Text>
                  </View>
                  <Text style={styles.linkArrow}>열기</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.supportCard}>
              <Text style={styles.supportTitle}>지원 및 문의</Text>
              <Text style={styles.supportBody}>
                안전 신고와 계정 문의는 아래 경로로 접수할 수 있어요. 운영팀은 접수 후 24시간 내
                1차 검토를 원칙으로 합니다.
              </Text>
              <Text style={styles.supportEmail}>{SUPPORT_EMAIL}</Text>
              <View style={styles.supportActions}>
                <Pressable
                  onPress={() => void handleOpenSupportPage()}
                  style={styles.supportActionBtn}
                  testID="public-ugc-notice-support-page"
                >
                  <Text style={styles.supportActionText}>지원 페이지</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleOpenSupportMail()}
                  style={styles.supportActionBtn}
                  testID="public-ugc-notice-support-mail"
                >
                  <Text style={styles.supportActionText}>이메일 문의</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>안전 안내</Text>
              <Text style={styles.noticeBody}>
                신고는 운영 검토 큐로 접수되고, 차단하면 해당 사용자의 글과 프로필이 내 화면에서 즉시
                숨겨집니다. 운영 정책 위반이 확인되면 콘텐츠 삭제와 계정 제재가 이루어질 수 있어요.
              </Text>
            </View>

            <View style={styles.checkList}>
              <Pressable
                onPress={() => setLegalAcknowledged((current) => !current)}
                style={styles.checkRow}
                testID="public-ugc-notice-check-legal"
              >
                <View style={[styles.checkbox, legalAcknowledged && styles.checkboxChecked]}>
                  {legalAcknowledged ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkText}>
                  이용약관, 개인정보 처리방침, 커뮤니티 가이드라인을 확인하고 동의합니다.
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setSafetyAcknowledged((current) => !current)}
                style={styles.checkRow}
                testID="public-ugc-notice-check-safety"
              >
                <View style={[styles.checkbox, safetyAcknowledged && styles.checkboxChecked]}>
                  {safetyAcknowledged ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <Text style={styles.checkText}>
                  신고, 차단, 지원 문의 경로와 24시간 내 운영 검토 원칙을 확인했습니다.
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => void handleContinue()}
              disabled={!canContinue}
              style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
              testID="public-ugc-notice-continue"
            >
              <Text style={styles.continueBtnText}>
                {submitting ? "저장 중..." : "확인 및 동의 후 공개 글 보기를 시작할게요"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30,
    elevation: 30,
  },
  safe: {
    flex: 1,
    backgroundColor: "rgba(12, 18, 14, 0.38)",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.xl,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    borderRadius: 28,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    padding: tokens.space.xl,
    gap: tokens.space.lg as any,
    shadowColor: tokens.shadow.color,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    color: tokens.colors.textFaint,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  description: {
    fontSize: tokens.font.body,
    lineHeight: 23,
    color: tokens.colors.textMuted,
  },
  linkList: {
    gap: tokens.space.sm as any,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md as any,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  linkCopy: {
    flex: 1,
    gap: 4,
  },
  linkLabel: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  linkHint: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  linkArrow: {
    fontSize: 13,
    fontWeight: "800",
    color: tokens.colors.green700,
  },
  supportCard: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.space.md,
    gap: 8,
  },
  supportTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  supportBody: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  supportEmail: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  supportActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
  },
  supportActionBtn: {
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.white,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 9,
  },
  supportActionText: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  noticeBox: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.green050,
    padding: tokens.space.md,
    gap: 6,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  noticeBody: {
    fontSize: tokens.font.small,
    lineHeight: 19,
    color: tokens.colors.textMuted,
  },
  checkList: {
    gap: tokens.space.sm as any,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm as any,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: tokens.colors.green700,
    backgroundColor: tokens.colors.green100,
  },
  checkboxMark: {
    fontSize: 13,
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  checkText: {
    flex: 1,
    fontSize: tokens.font.small,
    color: tokens.colors.text,
    lineHeight: 20,
  },
  continueBtn: {
    minHeight: 54,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
    backgroundColor: tokens.colors.green700,
  },
  continueBtnDisabled: {
    opacity: 0.72,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
});
