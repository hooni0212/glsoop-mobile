import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBootScreen } from "@/components/state/AppBootScreen";
import { getLegalDocumentUrl } from "@/config/release";
import { useToast } from "@/feedback/ToastProvider";
import { openExternalUrl } from "@/lib/externalLinks";
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
  }, [currentVersionKey, showToast]);

  if (!shouldShow) {
    return null;
  }

  if (loading || !ready) {
    return (
      <View pointerEvents="auto" style={styles.overlay}>
        <AppBootScreen
          title="이용 안내를 준비하고 있어요"
          message="공개 글을 보기 전에 필요한 문서를 먼저 정리하고 있어요."
        />
      </View>
    );
  }

  return (
    <View pointerEvents="auto" style={styles.overlay}>
      <SafeAreaView style={styles.safe} testID="public-ugc-notice-gate">
        <View style={styles.backdrop}>
          <View style={styles.card} testID="public-ugc-notice-card">
            <Text style={styles.eyebrow}>BEFORE YOU READ</Text>
            <Text style={styles.title}>공개 글을 보기 전에 확인해 주세요</Text>
            <Text style={styles.description}>
              글숲의 홈, 검색, 글 상세, 작가 화면은 로그인 없이 볼 수 있어요. 계속하기 전에 아래
              문서를 확인하고 커뮤니티 운영 기준을 먼저 살펴봐 주세요.
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

            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>안전 안내</Text>
              <Text style={styles.noticeBody}>
                신고는 운영 검토 큐로 접수되고, 차단하면 해당 사용자의 글과 프로필이 내 화면에서 즉시
                숨겨집니다.
              </Text>
            </View>

            <Pressable
              onPress={() => void handleContinue()}
              disabled={submitting}
              style={[styles.continueBtn, submitting && styles.continueBtnDisabled]}
              testID="public-ugc-notice-continue"
            >
              <Text style={styles.continueBtnText}>
                {submitting ? "저장 중..." : "문서를 확인했고 계속할게요"}
              </Text>
            </Pressable>
          </View>
        </View>
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
  backdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: tokens.space.xl,
    paddingVertical: tokens.space.xl,
  },
  card: {
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
