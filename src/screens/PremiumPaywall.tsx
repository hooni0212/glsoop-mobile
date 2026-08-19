import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { getLegalDocumentUrl } from "@/config/release";
import { useToast } from "@/feedback/ToastProvider";
import { buildAuthRoute } from "@/lib/authRedirect";
import { navigateFromAppRoot } from "@/navigation/rootNavigation";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { openExternalUrl } from "@/lib/externalLinks";
import {
  normalizePremiumEntrySource,
  trackPremiumFunnelEvent,
} from "@/lib/premiumDiscovery";
import {
  hasActiveEntitlement,
  listMyEntitlements,
} from "@/services/entitlementService";
import {
  getPremiumPlans,
  getPremiumIosSupportReason,
  isPremiumIosSupported,
  openPremiumSubscriptionManagement,
  requestPremiumPurchase,
  restorePremiumPurchases,
  subscribeToPremiumPurchases,
  verifyPremiumPurchase,
  type PremiumPlan,
} from "@/services/premiumStoreService";
import { clearSentenceFrameWidgetSnapshot } from "@/services/widgetSnapshotService";
import { tokens } from "@/theme/tokens";

const BENEFITS = [
  {
    icon: "download-outline",
    title: "광고 없이 사진 저장",
    body: "글 이미지 저장 흐름에서 보상형 광고를 건너뛰어요.",
  },
  {
    icon: "person-circle-outline",
    title: "프로필 사진 업로드",
    body: "기본 이니셜 대신 나를 보여주는 사진을 사용할 수 있어요.",
  },
  {
    icon: "create-outline",
    title: "글 이미지 작가 서명",
    body: "내 글이 저장되거나 공유될 때 모든 이미지에 글숲 닉네임이 자동으로 남아요.",
  },
  {
    icon: "albums-outline",
    title: "문장 액자 위젯",
    body: "직접 고른 글 사진을 홈 화면 위젯에 조용히 담아둘 수 있어요.",
  },
] as const;

function isPurchaseCancellation(error: unknown) {
  const row = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const code = String(row.code || "").toLowerCase();
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return code.includes("cancel") || message.includes("cancel") || message.includes("취소");
}

export default function PremiumPaywallScreen() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ source?: string }>();
  const entrySource = normalizePremiumEntrySource(params.source);
  const { token } = useAuth();
  const { showToast } = useToast();
  const [plans, setPlans] = React.useState<PremiumPlan[]>([]);
  const [isPremium, setIsPremium] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<AppErrorModel | null>(null);
  const [busySku, setBusySku] = React.useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = React.useState(false);
  const [manageBusy, setManageBusy] = React.useState(false);
  const [processingPurchase, setProcessingPurchase] = React.useState(false);
  const paywallViewTrackedRef = React.useRef(false);

  React.useEffect(() => {
    if (paywallViewTrackedRef.current) return;
    paywallViewTrackedRef.current = true;
    void trackPremiumFunnelEvent("premium_paywall_view", entrySource);
  }, [entrySource]);

  const loadEntitlementState = React.useCallback(async () => {
    if (!token) {
      setIsPremium(false);
      void clearSentenceFrameWidgetSnapshot();
      return false;
    }
    const entitlements = await listMyEntitlements();
    const active = hasActiveEntitlement(entitlements);
    setIsPremium(active);
    if (!active) {
      void clearSentenceFrameWidgetSnapshot();
    }
    return active;
  }, [token]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPlans] = await Promise.all([
        getPremiumPlans(),
        loadEntitlementState(),
      ]);
      setPlans(nextPlans);
    } catch (e) {
      setError(normalizeApiError(e));
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [loadEntitlementState]);

  const handleVerifiedPurchase = React.useCallback(
    async (purchase: Parameters<typeof verifyPremiumPurchase>[0]) => {
      setProcessingPurchase(true);
      try {
        const result = await verifyPremiumPurchase(purchase);
        const active = await loadEntitlementState();

        if (result.entitlementActive || active) {
          void trackPremiumFunnelEvent("premium_purchase_success", entrySource, {
            store_sku: purchase.productId || null,
          });
          showToast("글숲 프리미엄이 활성화됐어요.", { tone: "success" });
        } else if (result.purchaseStatus === "pending") {
          showToast("결제 검증이 접수됐어요. 잠시 후 다시 확인해주세요.", {
            tone: "success",
          });
        } else {
          showToast(result.response.message || "결제 상태를 확인했어요.", {
            tone: "success",
          });
        }
      } catch (e) {
        const normalized = normalizeApiError(e);
        void trackPremiumFunnelEvent("premium_purchase_error", entrySource, {
          stage: "verify",
          error_kind: normalized.kind,
        });
        if (normalized.kind === "auth") {
          await navigateFromAppRoot(buildAuthRoute("/(auth)/login", pathname));
          return;
        }
        showToast(normalized.description || normalized.title, { tone: "error" });
      } finally {
        setProcessingPurchase(false);
        setBusySku(null);
      }
    },
    [entrySource, loadEntitlementState, pathname, showToast]
  );

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!isPremiumIosSupported()) return;
    return subscribeToPremiumPurchases({
      onPurchase: (purchase) => {
        void handleVerifiedPurchase(purchase);
      },
      onError: (purchaseError) => {
        const code = String(purchaseError.code || "");
        if (code.toLowerCase().includes("cancel")) {
          void trackPremiumFunnelEvent("premium_purchase_cancel", entrySource, {
            stage: "store",
          });
          setBusySku(null);
          return;
        }
        void trackPremiumFunnelEvent("premium_purchase_error", entrySource, {
          stage: "store",
          error_code: code || null,
        });
        setBusySku(null);
        showToast(purchaseError.message || "결제를 시작하지 못했어요.", {
          tone: "error",
        });
      },
    });
  }, [entrySource, handleVerifiedPurchase, showToast]);

  async function onPurchase(plan: PremiumPlan) {
    if (isPremium || busySku || processingPurchase) return;
    if (!token) {
      await navigateFromAppRoot(buildAuthRoute("/(auth)/login", pathname));
      return;
    }
    if (!plan.availableInStore) {
      showToast("App Store 상품 정보를 불러오지 못했어요.", { tone: "error" });
      return;
    }

    void trackPremiumFunnelEvent("premium_plan_select", entrySource, {
      store_sku: plan.storeSku,
      billing_period: plan.billingPeriod,
    });
    setBusySku(plan.storeSku);
    try {
      void trackPremiumFunnelEvent("premium_purchase_start", entrySource, {
        store_sku: plan.storeSku,
        billing_period: plan.billingPeriod,
      });
      await requestPremiumPurchase(plan.storeSku);
    } catch (e) {
      setBusySku(null);
      if (isPurchaseCancellation(e)) {
        void trackPremiumFunnelEvent("premium_purchase_cancel", entrySource, {
          stage: "request",
          store_sku: plan.storeSku,
        });
        return;
      }
      const normalized = normalizeApiError(e);
      void trackPremiumFunnelEvent("premium_purchase_error", entrySource, {
        stage: "request",
        store_sku: plan.storeSku,
        error_kind: normalized.kind,
      });
      showToast(normalized.description || normalized.title, { tone: "error" });
    }
  }

  async function onRestore() {
    if (restoreBusy || processingPurchase) return;
    if (!token) {
      await navigateFromAppRoot(buildAuthRoute("/(auth)/login", pathname));
      return;
    }

    setRestoreBusy(true);
    try {
      const restoreSummary = await restorePremiumPurchases();
      const active = await loadEntitlementState();
      const hasVerifiedPremium = restoreSummary.verified.some(
        (result) => result.entitlementActive
      );
      const hasOwnershipConflict = restoreSummary.failures.some(
        (failure) => failure.ownershipConflict
      );

      if (active || hasVerifiedPremium) {
        showToast("구매 내역을 복원했어요.", { tone: "success" });
      } else if (hasOwnershipConflict) {
        showToast(
          "이 Apple 구독은 다른 글숲 계정에 연결되어 있어요. 연결된 계정으로 로그인해 주세요.",
          { tone: "error" }
        );
      } else if (restoreSummary.verified.length > 0) {
        showToast("복원된 구매의 검증이 접수됐어요.", { tone: "success" });
      } else if (restoreSummary.totalPremiumPurchases > 0) {
        showToast(
          restoreSummary.failures[0]?.message || "구매 내역을 복원하지 못했어요.",
          { tone: "error" }
        );
      } else {
        showToast("복원할 프리미엄 구매 내역이 없어요.", { tone: "error" });
      }
    } catch (e) {
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        await navigateFromAppRoot(buildAuthRoute("/(auth)/login", pathname));
        return;
      }
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setRestoreBusy(false);
    }
  }

  async function onManageSubscriptions() {
    if (manageBusy || processingPurchase) return;
    setManageBusy(true);
    try {
      await openPremiumSubscriptionManagement();
      await loadEntitlementState();
    } catch (e) {
      const normalized = normalizeApiError(e);
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setManageBusy(false);
    }
  }

  if (!isPremiumIosSupported()) {
    const supportReason = getPremiumIosSupportReason();
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar />
        <View style={styles.center}>
          <AppEmpty
            title={
              supportReason === "native_module_unavailable"
                ? "이 빌드에서는 결제를 열 수 없어요"
                : "iOS 결제부터 준비 중이에요"
            }
            description={
              supportReason === "native_module_unavailable"
                ? "현재 앱에 App Store 결제 모듈이 포함되어 있지 않아요. 최신 개발 빌드나 TestFlight 앱에서 다시 확인해주세요."
                : "프리미엄 결제는 iOS 앱내 구입으로 먼저 연결하고, Android 결제는 추후 반영할 예정이에요."
            }
            primaryAction={
              supportReason === "native_module_unavailable"
                ? {
                    label: "App Store 구독 관리",
                    onPress: () =>
                      void openExternalUrl("https://apps.apple.com/account/subscriptions"),
                  }
                : undefined
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="프리미엄 구독과 구매 복원은 로그인 후 이용할 수 있어요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => void navigateFromAppRoot(buildAuthRoute("/(auth)/login", pathname)),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar />
        <View style={styles.center}>
          <AppLoading message="프리미엄 상품을 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar />
        <View style={styles.center}>
          <AppError error={error} onRetry={load} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={14} color={tokens.colors.green900} />
            <Text style={styles.badgeText}>{isPremium ? "사용 중" : "프리미엄"}</Text>
          </View>
          <Text style={styles.title}>글숲 프리미엄</Text>
          <Text style={styles.description}>
            광고 없이 글을 저장하고, 내 글에 출처를 남기며 문장을 더 오래 간직해요.
          </Text>
        </View>

        <View style={styles.benefitList}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefitItem}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={19} color={tokens.colors.green900} />
              </View>
              <View style={styles.benefitCopy}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitBody}>{benefit.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.planList}>
          {plans.length === 0 ? (
            <View style={styles.notice}>
              <Ionicons name="alert-circle-outline" size={18} color={tokens.colors.textMuted} />
              <Text style={styles.noticeText}>현재 표시할 프리미엄 상품이 없어요.</Text>
            </View>
          ) : (
            plans.map((plan) => (
              <PlanRow
                key={plan.storeSku}
                plan={plan}
                isPremium={isPremium}
                busy={busySku === plan.storeSku || processingPurchase}
                onPress={() => void onPurchase(plan)}
              />
            ))
          )}
        </View>

        <Pressable
          onPress={() => void onRestore()}
          disabled={restoreBusy || processingPurchase}
          style={({ pressed }) => [
            styles.restoreBtn,
            (restoreBusy || processingPurchase) && styles.disabledBtn,
            pressed && !restoreBusy && !processingPurchase && styles.pressed,
          ]}
        >
          <Ionicons name="refresh-outline" size={17} color={tokens.colors.text} />
          <Text style={styles.restoreBtnText}>
            {restoreBusy ? "복원 중..." : "구매 복원"}
          </Text>
        </Pressable>

        <View style={styles.subscriptionNotice}>
          <Text style={styles.subscriptionNoticeText}>
            구독은 Apple ID로 결제되며 현재 기간 종료 24시간 전까지 해지하지 않으면 자동
            갱신돼요. 결제 후 구독 관리는 App Store 계정 설정에서 할 수 있어요.
          </Text>
          <View style={styles.legalLinks}>
            <LegalLink
              label="이용약관"
              onPress={() => void openExternalUrl(getLegalDocumentUrl("terms"))}
            />
            <LegalLink
              label="개인정보 처리방침"
              onPress={() => void openExternalUrl(getLegalDocumentUrl("privacy"))}
            />
            <LegalLink
              label={manageBusy ? "관리 여는 중..." : "구독 관리"}
              onPress={() => void onManageSubscriptions()}
              disabled={manageBusy || processingPurchase}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegalLink({
  label,
  disabled,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.legalLink,
        disabled && styles.disabledBtn,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={styles.legalLinkText}>{label}</Text>
    </Pressable>
  );
}

function PlanRow({
  plan,
  isPremium,
  busy,
  onPress,
}: {
  plan: PremiumPlan;
  isPremium: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const disabled = isPremium || busy || !plan.availableInStore;
  const periodLabel =
    plan.billingPeriod === "monthly"
      ? "월간"
      : plan.billingPeriod === "yearly"
        ? "연간"
        : "구독";
  const actionLabel = isPremium
    ? "사용 중"
    : busy
      ? "진행 중..."
      : plan.availableInStore
        ? "구독하기"
        : "상품 준비 중";

  return (
    <View style={styles.planRow}>
      <View style={styles.planCopy}>
        <View style={styles.planTitleRow}>
          <Text style={styles.planTitle}>{periodLabel}</Text>
          {plan.billingPeriod === "yearly" ? (
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>추천</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.planName}>{plan.displayTitle}</Text>
        <Text style={styles.planDescription}>{plan.displayDescription}</Text>
      </View>
      <View style={styles.planAction}>
        <Text style={styles.price}>{plan.displayPrice || "-"}</Text>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => [
            styles.purchaseBtn,
            disabled && styles.disabledBtn,
            pressed && !disabled && styles.pressed,
          ]}
        >
          <Text style={styles.purchaseBtnText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TopBar() {
  return (
    <View style={styles.topBar}>
      <Pressable
        onPress={() => router.back()}
        style={styles.topBarBtn}
        accessibilityRole="button"
        accessibilityLabel="뒤로 가기"
      >
        <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
      </Pressable>
      <Text style={styles.topBarTitle}>프리미엄</Text>
      <View style={styles.topBarSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
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
    fontWeight: "600",
    color: tokens.colors.text,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.lg as any,
  },
  header: {
    gap: tokens.space.sm as any,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.green900,
  },
  title: {
    fontSize: 28,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  description: {
    fontSize: 15,
    lineHeight: 23,
    color: tokens.colors.textMuted,
  },
  benefitList: {
    gap: tokens.space.sm as any,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
  },
  benefitIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
  },
  benefitCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  benefitBody: {
    fontSize: tokens.font.small,
    lineHeight: 19,
    color: tokens.colors.textMuted,
  },
  planList: {
    gap: tokens.space.sm as any,
  },
  planRow: {
    flexDirection: "row",
    gap: tokens.space.md as any,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.green700,
  },
  valuePill: {
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  valuePillText: {
    fontSize: 11,
    fontWeight: "600",
    color: tokens.colors.green900,
  },
  planName: {
    fontSize: 16,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  planDescription: {
    fontSize: tokens.font.small,
    lineHeight: 19,
    color: tokens.colors.textMuted,
  },
  planAction: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: tokens.space.sm as any,
  },
  price: {
    fontSize: 15,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  purchaseBtn: {
    minHeight: 42,
    minWidth: 92,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green900,
    paddingHorizontal: 14,
  },
  purchaseBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.textInverse,
  },
  restoreBtn: {
    minHeight: 44,
    alignSelf: "stretch",
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  restoreBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  subscriptionNotice: {
    gap: tokens.space.sm as any,
  },
  subscriptionNoticeText: {
    fontSize: 12,
    lineHeight: 18,
    color: tokens.colors.textMuted,
  },
  legalLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legalLink: {
    minHeight: 36,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  legalLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  disabledBtn: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.84,
  },
  notice: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.md,
  },
  noticeText: {
    flex: 1,
    fontSize: tokens.font.small,
    lineHeight: 19,
    color: tokens.colors.textMuted,
  },
});
