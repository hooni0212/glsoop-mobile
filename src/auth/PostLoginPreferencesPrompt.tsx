import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useSegments } from "expo-router";
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { useToast } from "@/feedback/ToastProvider";
import { type MeResponse, type UpdateMeResponse, parseFlag } from "@/features/me/accountCenter";
import { apiGet, apiPut } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  describePushRegistrationResult,
  registerForPushNotificationsAsync,
} from "@/lib/pushNotifications";
import {
  getMarketingPushConsent,
  updateMarketingPushConsent,
  type MarketingPushConsent,
} from "@/services/marketingPushService";
import { tokens } from "@/theme/tokens";

const PROMPT_VERSION = "post-login-preferences.v1";
const PROMPT_STORAGE_PREFIX = "glsoop.postLoginPreferencesPrompt.v1";
const PROMPT_PENDING_STORAGE_PREFIX = "glsoop.postLoginPreferencesPrompt.pending.v1";

type PromptState = {
  userId: string;
  rememberLoginEnabled: boolean;
  marketingConsent: MarketingPushConsent;
};

type PromptStoragePayload = {
  version?: string;
  completedAt?: string;
};

function getPromptStorageKey(userId: string) {
  return `${PROMPT_STORAGE_PREFIX}.${userId}`;
}

function getPromptPendingStorageKey(userId: string) {
  return `${PROMPT_PENDING_STORAGE_PREFIX}.${userId}`;
}

async function hasCompletedPrompt(userId: string) {
  try {
    const raw = await AsyncStorage.getItem(getPromptStorageKey(userId));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as PromptStoragePayload;
    return parsed?.version === PROMPT_VERSION && typeof parsed.completedAt === "string";
  } catch {
    return false;
  }
}

async function hasPendingPrompt(userId: string) {
  try {
    const raw = await AsyncStorage.getItem(getPromptPendingStorageKey(userId));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as PromptStoragePayload;
    return parsed?.version === PROMPT_VERSION;
  } catch {
    return false;
  }
}

async function markPromptCompleted(userId: string) {
  const payload: PromptStoragePayload = {
    version: PROMPT_VERSION,
    completedAt: new Date().toISOString(),
  };
  await Promise.all([
    AsyncStorage.setItem(getPromptStorageKey(userId), JSON.stringify(payload)),
    AsyncStorage.removeItem(getPromptPendingStorageKey(userId)),
  ]);
}

async function markPromptPending(userId: string) {
  const payload: PromptStoragePayload = {
    version: PROMPT_VERSION,
    completedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(getPromptPendingStorageKey(userId), JSON.stringify(payload));
}

export function PostLoginPreferencesPrompt() {
  const { ready, token, signInSerial } = useAuth();
  const { showToast } = useToast();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [prompt, setPrompt] = React.useState<PromptState | null>(null);
  const [rememberChoice, setRememberChoice] = React.useState<boolean | null>(null);
  const [marketingChoice, setMarketingChoice] = React.useState<boolean | null>(null);
  const [saving, setSaving] = React.useState(false);
  const handledSerialRef = React.useRef(0);
  const handledReentryTokenRef = React.useRef<string | null>(null);
  const loadingSerialRef = React.useRef(0);
  const loadingReentryTokenRef = React.useRef<string | null>(null);

  const inAuthGroup = segments[0] === "(auth)";
  const canSave = rememberChoice !== null && marketingChoice !== null && !saving;

  React.useEffect(() => {
    if (!ready || !token || signInSerial <= 0 || inAuthGroup) {
      if (!token) {
        setPrompt(null);
        handledSerialRef.current = 0;
        handledReentryTokenRef.current = null;
        loadingSerialRef.current = 0;
        loadingReentryTokenRef.current = null;
      }
      return;
    }

    if (
      handledSerialRef.current === signInSerial ||
      loadingSerialRef.current === signInSerial
    ) {
      return;
    }

    let cancelled = false;
    loadingSerialRef.current = signInSerial;

    (async () => {
      try {
        const [me, marketingConsent] = await Promise.all([
          apiGet<MeResponse>("/api/me"),
          getMarketingPushConsent(),
        ]);
        if (cancelled) return;

        const userId = String(me.id);
        const completed = await hasCompletedPrompt(userId);
        if (cancelled) return;

        if (completed) {
          handledSerialRef.current = signInSerial;
          return;
        }

        setRememberChoice(null);
        setMarketingChoice(null);
        setPrompt({
          userId,
          rememberLoginEnabled: parseFlag(me.remember_login_enabled),
          marketingConsent,
        });
      } catch (error) {
        logger.warn("[post-login-preferences] failed to prepare prompt", { error });
        handledSerialRef.current = signInSerial;
      } finally {
        if (loadingSerialRef.current === signInSerial) {
          loadingSerialRef.current = 0;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token, signInSerial, inAuthGroup]);

  React.useEffect(() => {
    if (!ready || !token || signInSerial > 0 || inAuthGroup) return;
    if (
      handledReentryTokenRef.current === token ||
      loadingReentryTokenRef.current === token
    ) {
      return;
    }

    let cancelled = false;
    loadingReentryTokenRef.current = token;

    (async () => {
      try {
        const me = await apiGet<MeResponse>("/api/me");
        if (cancelled) return;

        const userId = String(me.id);
        const [completed, pending] = await Promise.all([
          hasCompletedPrompt(userId),
          hasPendingPrompt(userId),
        ]);
        if (cancelled) return;

        if (completed || !pending) {
          handledReentryTokenRef.current = token;
          return;
        }

        const marketingConsent = await getMarketingPushConsent();
        if (cancelled) return;

        setRememberChoice(null);
        setMarketingChoice(null);
        setPrompt({
          userId,
          rememberLoginEnabled: parseFlag(me.remember_login_enabled),
          marketingConsent,
        });
      } catch (error) {
        logger.warn("[post-login-preferences] failed to prepare reentry prompt", { error });
        handledReentryTokenRef.current = token;
      } finally {
        if (loadingReentryTokenRef.current === token) {
          loadingReentryTokenRef.current = null;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, token, signInSerial, inAuthGroup]);

  const handleRemindLater = React.useCallback(() => {
    if (saving || !prompt) return;
    handledSerialRef.current = signInSerial;
    if (token) {
      handledReentryTokenRef.current = token;
    }
    void markPromptPending(prompt.userId).catch((error) => {
      logger.warn("[post-login-preferences] failed to mark prompt pending", { error });
    });
    setPrompt(null);
    setRememberChoice(null);
    setMarketingChoice(null);
  }, [prompt, saving, signInSerial, token]);

  const handleSave = React.useCallback(async () => {
    if (!prompt || rememberChoice === null || marketingChoice === null || saving) return;

    setSaving(true);
    try {
      const meResponse = await apiPut<UpdateMeResponse>("/api/me", {
        remember_login_enabled: rememberChoice,
      });
      if (meResponse?.ok === false) {
        throw new Error(meResponse.message || "로그인 유지 설정 저장에 실패했어요.");
      }

      await updateMarketingPushConsent({
        marketingPushOptIn: marketingChoice,
        marketingVersion: prompt.marketingConsent.marketingVersion,
      });

      let toastMessage = "설정을 저장했어요. 계정 센터에서 언제든 바꿀 수 있어요.";
      if (marketingChoice) {
        try {
          const pushResult = await registerForPushNotificationsAsync({
            requestPermission: true,
          });
          toastMessage = describePushRegistrationResult(pushResult);
        } catch (error) {
          logger.warn("[post-login-preferences] push registration failed", { error });
          toastMessage = "설정은 저장했어요. 알림 등록은 나중에 다시 시도돼요.";
        }
      }

      await markPromptCompleted(prompt.userId);
      handledSerialRef.current = signInSerial;
      if (token) {
        handledReentryTokenRef.current = token;
      }
      setPrompt(null);
      setRememberChoice(null);
      setMarketingChoice(null);
      showToast(toastMessage, { tone: "success", durationMs: 2600 });
    } catch (error) {
      const normalized = normalizeApiError(error);
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setSaving(false);
    }
  }, [marketingChoice, prompt, rememberChoice, saving, showToast, signInSerial, token]);

  if (!prompt) return null;

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleRemindLater}
    >
      <View style={styles.modalRoot}>
        <Pressable
          style={styles.overlay}
          onPress={handleRemindLater}
          testID="post-login-preferences-backdrop"
        >
          <Pressable
            onPress={() => {}}
            style={[styles.sheet, { paddingBottom: Math.max(18, insets.bottom + 14) }]}
            testID="post-login-preferences-sheet"
          >
            <View style={styles.handle} />
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.content}
            >
              <View style={styles.header}>
                <Text style={styles.eyebrow}>WELCOME SETTINGS</Text>
                <Text style={styles.title}>처음 설정을 골라주세요</Text>
                <Text style={styles.description}>
                  로그인 유지와 알림 수신 여부를 먼저 정해두면 글숲을 더 편하게 이어서
                  사용할 수 있어요.
                </Text>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={tokens.colors.text} />
                </View>
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionTitle}>로그인 유지</Text>
                  <Text style={styles.sectionDescription}>
                    다음 로그인부터 이 기기에서 로그인 상태를 더 오래 유지할지 선택해요.
                    현재 설정은 {prompt.rememberLoginEnabled ? "켜짐" : "꺼짐"}이에요.
                  </Text>
                  <View style={styles.choiceRow}>
                    <ChoiceButton
                      label="켜기"
                      selected={rememberChoice === true}
                      disabled={saving}
                      onPress={() => setRememberChoice(true)}
                      testID="post-login-remember-on-btn"
                    />
                    <ChoiceButton
                      label="끄기"
                      selected={rememberChoice === false}
                      disabled={saving}
                      onPress={() => setRememberChoice(false)}
                      testID="post-login-remember-off-btn"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="notifications-outline" size={18} color={tokens.colors.text} />
                </View>
                <View style={styles.sectionBody}>
                  <Text style={styles.sectionTitle}>푸시/마케팅 알림</Text>
                  <Text style={styles.sectionDescription}>
                    이벤트, 새 기능, 글쓰기 리마인드 같은 광고성 알림 수신 여부를 선택해요.
                    받기를 누르면 기기 알림 권한도 함께 요청해요.
                  </Text>
                  <View style={styles.choiceRow}>
                    <ChoiceButton
                      label="받기"
                      selected={marketingChoice === true}
                      disabled={saving}
                      onPress={() => setMarketingChoice(true)}
                      testID="post-login-marketing-on-btn"
                    />
                    <ChoiceButton
                      label="받지 않기"
                      selected={marketingChoice === false}
                      disabled={saving}
                      onPress={() => setMarketingChoice(false)}
                      testID="post-login-marketing-off-btn"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteText}>
                  선택하지 않고 닫으면 다음 로그인이나 앱 재진입 때 다시 물어볼게요.
                  저장한 설정은 마이페이지 &gt; 계정 센터 &gt; 보안 및 로그인에서 언제든
                  바꿀 수 있어요.
                </Text>
              </View>

              <View style={styles.footer}>
                <Pressable
                  onPress={handleRemindLater}
                  disabled={saving}
                  style={styles.laterBtn}
                  testID="post-login-preferences-later-btn"
                  accessibilityRole="button"
                  accessibilityLabel="나중에 설정하기"
                >
                  <Text style={styles.laterBtnText}>나중에</Text>
                </Pressable>
                <Pressable
                  onPress={() => void handleSave()}
                  disabled={!canSave}
                  style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                  testID="post-login-preferences-save-btn"
                  accessibilityRole="button"
                  accessibilityLabel="초기 설정 저장"
                >
                  <Text style={styles.saveBtnText}>{saving ? "저장 중..." : "설정 저장"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}

function ChoiceButton({
  label,
  selected,
  disabled,
  onPress,
  testID,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[styles.choiceBtn, selected && styles.choiceBtnSelected, disabled && styles.disabled]}
    >
      <Text style={[styles.choiceBtnText, selected && styles.choiceBtnTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
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
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  handle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.borderStrong,
    marginBottom: tokens.space.lg,
  },
  content: {
    gap: tokens.space.lg as any,
  },
  header: {
    gap: 7,
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
  section: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.md as any,
    padding: tokens.space.lg,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  sectionBody: {
    flex: 1,
    gap: tokens.space.sm as any,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  sectionDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  choiceRow: {
    flexDirection: "row",
    gap: tokens.space.xs as any,
    flexWrap: "wrap",
  },
  choiceBtn: {
    minWidth: 88,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surface,
  },
  choiceBtnSelected: {
    backgroundColor: tokens.colors.green100,
    borderColor: tokens.colors.green700,
  },
  choiceBtnText: {
    fontSize: tokens.font.small,
    fontWeight: "900",
    color: tokens.colors.textMuted,
  },
  choiceBtnTextSelected: {
    color: tokens.colors.green900,
  },
  noteBox: {
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bgMuted,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    padding: tokens.space.md,
  },
  noteText: {
    fontSize: 12,
    fontWeight: "700",
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  laterBtn: {
    minHeight: 48,
    paddingHorizontal: tokens.space.md,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  laterBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.textMuted,
  },
  saveBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green900,
  },
  saveBtnDisabled: {
    backgroundColor: tokens.colors.borderStrong,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: "900",
    color: tokens.colors.textInverse,
  },
  disabled: {
    opacity: 0.6,
  },
});
