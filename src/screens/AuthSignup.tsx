import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { AuthLegalLinks } from "@/components/auth/AuthLegalLinks";
import { AppError } from "@/components/state/AppError";
import { extractAuthToken } from "@/lib/authResponse";
import { buildAuthRoute, resolvePostAuthRedirect } from "@/lib/authRedirect";
import { apiGet, apiPost } from "@/lib/api";
import { COOKIE_SESSION_TOKEN } from "@/lib/authToken";
import { ApiError, normalizeApiError } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type SignupResponse = {
  ok: boolean;
  message?: string;
  pending_id?: string;
  email_masked?: string;
  otp_ttl_seconds?: number;
  otp_ttl?: number;
  resend_after?: number;
  retry_after?: number;
};

type VerifyEmailResponse = {
  ok: boolean;
  message?: string;
  user_id?: string;
};

type LoginResponse = {
  ok: boolean;
  message?: string;
  token?: string;
};

type ResendResponse = {
  ok: boolean;
  message?: string;
  resend_after?: number;
  retry_after?: number;
};

type SignupFieldErrors = Partial<
  Record<
    | "name"
    | "nickname"
    | "email"
    | "pw"
    | "age_confirmed"
    | "terms_agreed"
    | "privacy_agreed"
    | "terms_version"
    | "privacy_version",
    string
  >
>;

type RuntimeConfigResponse = {
  ok: boolean;
  legal?: {
    versions?: {
      terms?: string;
      privacy?: string;
    };
  };
};

export default function AuthSignup() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirect?: string }>();
  const { signIn } = useAuth();
  const redirect = params?.redirect ? String(params.redirect) : undefined;

  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [name, setName] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [ageConfirmed, setAgeConfirmed] = React.useState(false);
  const [termsAgreed, setTermsAgreed] = React.useState(false);
  const [privacyAgreed, setPrivacyAgreed] = React.useState(false);
  const [termsVersion, setTermsVersion] = React.useState<string | null>(null);
  const [privacyVersion, setPrivacyVersion] = React.useState<string | null>(null);
  const [otp, setOtp] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [emailMasked, setEmailMasked] = React.useState<string | null>(null);
  const [otpTtl, setOtpTtl] = React.useState<number | null>(null);
  const [resendAfter, setResendAfter] = React.useState(0);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [resendBusy, setResendBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<SignupFieldErrors>({});
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

  React.useEffect(() => {
    let active = true;

    async function loadRuntimeConfig() {
      try {
        const res = await apiGet<RuntimeConfigResponse>("/api/runtime-config");
        if (!active) return;
        setTermsVersion(res?.legal?.versions?.terms ?? null);
        setPrivacyVersion(res?.legal?.versions?.privacy ?? null);
      } catch (runtimeError) {
        if (!active) return;
        setError(normalizeApiError(runtimeError));
      }
    }

    void loadRuntimeConfig();
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    setResendCountdown(resendAfter);
  }, [resendAfter]);

  React.useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResendCountdown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleApiError = React.useCallback(
    (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status && [400, 409, 429].includes(err.status)) {
          const nextFieldErrors = (err.payload?.error?.field_errors ??
            err.payload?.field_errors ??
            {}) as SignupFieldErrors;
          setFieldErrors(nextFieldErrors);
          setMessage(
            Object.keys(nextFieldErrors).length > 0
              ? (Object.values(nextFieldErrors)[0] ?? err.message ?? "요청을 처리할 수 없어요.")
              : (err.message || "요청을 처리할 수 없어요.")
          );
          if (err.status === 429) {
            const retryAfter = Number(err.payload?.retry_after ?? err.payload?.resend_after);
            if (Number.isFinite(retryAfter)) {
              setResendAfter(retryAfter);
            }
          }
          return;
        }
      }
      setError(normalizeApiError(err));
    },
    [setError]
  );

  function resetOtpState() {
    setPendingId(null);
    setEmailMasked(null);
    setOtpTtl(null);
    setResendAfter(0);
    setResendCountdown(0);
    setOtp("");
  }

  function handleBack() {
    if (step === "otp") {
      setStep("form");
      setMessage(null);
      setError(null);
      resetOtpState();
      return;
    }
    router.back();
  }

  async function onSignup() {
    setBusy(true);
    setMessage(null);
    setError(null);
    setFieldErrors({});

    try {
      const res = await apiPost<SignupResponse>("/api/signup", {
        name,
        nickname,
        email,
        pw,
        age_confirmed: ageConfirmed,
        terms_agreed: termsAgreed,
        privacy_agreed: privacyAgreed,
        terms_version: termsVersion,
        privacy_version: privacyVersion,
      });

      if (!res?.ok) {
        setMessage(res?.message || "회원가입에 실패했어요.");
        return;
      }

      setPendingId(res.pending_id ?? null);
      setEmailMasked(res.email_masked ?? null);
      setOtpTtl(res.otp_ttl_seconds ?? res.otp_ttl ?? null);
      setResendAfter(res.resend_after ?? res.retry_after ?? 0);
      setOtp("");
      setStep("otp");
      setMessage(res?.message || "이메일로 받은 인증번호를 입력해 주세요.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp() {
    if (!pendingId) {
      setMessage("인증 요청 정보가 없어요. 다시 가입을 진행해 주세요.");
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);
    setFieldErrors({});

    try {
      const res = await apiPost<VerifyEmailResponse>("/api/verify-email", {
        pending_id: pendingId,
        verification_code: otp,
      });

      if (!res?.ok) {
        setMessage(res?.message || "인증번호 확인에 실패했어요.");
        return;
      }

      const loginRes = await apiPost<LoginResponse>("/api/login", { email, pw });
      if (!loginRes?.ok) {
        setMessage(loginRes?.message || "로그인에 실패했어요.");
        return;
      }
      const nextAuthToken =
        Platform.OS === "web" ? COOKIE_SESSION_TOKEN : extractAuthToken(loginRes);
      if (!nextAuthToken) {
        setMessage("로그인 응답에 네이티브 인증 토큰이 없어요. 서버 로그인 응답 형식을 확인해 주세요.");
        return;
      }

      await signIn(nextAuthToken);
      router.replace(resolvePostAuthRedirect(redirect));
    } catch (e) {
      handleApiError(e);
    } finally {
      setBusy(false);
    }
  }

  async function onResendOtp() {
    if (resendCountdown > 0 || resendBusy) return;
    setResendBusy(true);
    setMessage(null);
    setError(null);
    setFieldErrors({});

    try {
      const payload = pendingId ? { pending_id: pendingId } : { email };
      const res = await apiPost<ResendResponse>("/api/verify-email/resend", payload);

      if (!res?.ok) {
        setMessage(res?.message || "인증번호 재발송에 실패했어요.");
        return;
      }

      const seconds = res.retry_after ?? res.resend_after ?? 0;
      if (typeof seconds === "number") {
        setResendAfter(seconds);
      }
      setMessage(res?.message || "인증번호를 다시 보냈어요.");
    } catch (e) {
      handleApiError(e);
    } finally {
      setResendBusy(false);
    }
  }

  const canSubmitForm = Boolean(
    name &&
      nickname &&
      email &&
      pw &&
      ageConfirmed &&
      termsAgreed &&
      privacyAgreed &&
      termsVersion &&
      privacyVersion
  );
  const canSubmitOtp = otp.length === 6;

  return (
    <SafeAreaView style={styles.safe} testID="auth-signup-screen">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.headerRow}>
              <Pressable onPress={handleBack} style={styles.backBtn}>
                <Text style={styles.backText}>←</Text>
              </Pressable>
              <Text style={styles.h1}>회원가입</Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.sub}>
              {step === "form" ? "이메일로 간단히 시작해요." : "인증번호를 입력해 주세요."}
            </Text>

            <View style={styles.panel}>
              {step === "form" ? (
                <View style={styles.block}>
                  <AuthLegalLinks compact showAgreementHint={false} />
                </View>
              ) : null}

              {error ? (
                <View style={styles.block}>
                  <AppError error={error} />
                </View>
              ) : null}

              <View style={styles.form}>
                {step === "form" ? (
                  <>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="이름을 입력해 주세요"
                      autoComplete="name"
                      textContentType="name"
                      returnKeyType="next"
                      style={styles.input}
                      testID="signup-name-input"
                    />
                    <Text style={styles.fieldHint}>본명을 입력해 주세요. 예: 홍길동</Text>
                    {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
                    <TextInput
                      value={nickname}
                      onChangeText={setNickname}
                      placeholder="닉네임을 입력해 주세요"
                      returnKeyType="next"
                      style={styles.input}
                      testID="signup-nickname-input"
                    />
                    <Text style={styles.fieldHint}>
                      앱에서 표시될 이름이에요. 예: 글숲러
                    </Text>
                    {fieldErrors.nickname ? (
                      <Text style={styles.fieldError}>{fieldErrors.nickname}</Text>
                    ) : null}
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="이메일 주소를 입력해 주세요"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      style={styles.input}
                      testID="signup-email-input"
                    />
                    <Text style={styles.fieldHint}>
                      로그인과 인증번호 수신에 사용할 이메일이에요. 예: user@example.com
                    </Text>
                    {fieldErrors.email ? <Text style={styles.fieldError}>{fieldErrors.email}</Text> : null}
                    <TextInput
                      value={pw}
                      onChangeText={setPw}
                      placeholder="비밀번호를 입력해 주세요"
                      secureTextEntry
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="go"
                      onSubmitEditing={() => {
                        if (!busy && canSubmitForm) {
                          void onSignup();
                        }
                      }}
                      style={styles.input}
                      testID="signup-password-input"
                    />
                    <Text style={styles.fieldHint}>
                      영문, 숫자 포함 8자 이상으로 설정해 주세요.
                    </Text>
                    {fieldErrors.pw ? <Text style={styles.fieldError}>{fieldErrors.pw}</Text> : null}

                    <View style={styles.consentGroup}>
                      <Pressable
                        onPress={() => setAgeConfirmed((current) => !current)}
                        style={styles.checkboxRow}
                        testID="signup-age-checkbox"
                      >
                        <View style={[styles.checkbox, ageConfirmed && styles.checkboxChecked]}>
                          {ageConfirmed ? <Text style={styles.checkboxMark}>✓</Text> : null}
                        </View>
                        <Text style={styles.checkboxLabel}>만 14세 이상입니다.</Text>
                      </Pressable>
                      {fieldErrors.age_confirmed ? (
                        <Text style={styles.fieldError}>{fieldErrors.age_confirmed}</Text>
                      ) : null}

                      <Pressable
                        onPress={() => setTermsAgreed((current) => !current)}
                        style={styles.checkboxRow}
                        testID="signup-terms-checkbox"
                      >
                        <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
                          {termsAgreed ? <Text style={styles.checkboxMark}>✓</Text> : null}
                        </View>
                        <Text style={styles.checkboxLabel}>서비스 이용약관에 동의합니다.</Text>
                      </Pressable>
                      {fieldErrors.terms_agreed ? (
                        <Text style={styles.fieldError}>{fieldErrors.terms_agreed}</Text>
                      ) : null}
                      {fieldErrors.terms_version ? (
                        <Text style={styles.fieldError}>{fieldErrors.terms_version}</Text>
                      ) : null}

                      <Pressable
                        onPress={() => setPrivacyAgreed((current) => !current)}
                        style={styles.checkboxRow}
                        testID="signup-privacy-checkbox"
                      >
                        <View style={[styles.checkbox, privacyAgreed && styles.checkboxChecked]}>
                          {privacyAgreed ? <Text style={styles.checkboxMark}>✓</Text> : null}
                        </View>
                        <Text style={styles.checkboxLabel}>개인정보 수집 및 이용에 동의합니다.</Text>
                      </Pressable>
                      {fieldErrors.privacy_agreed ? (
                        <Text style={styles.fieldError}>{fieldErrors.privacy_agreed}</Text>
                      ) : null}
                      {fieldErrors.privacy_version ? (
                        <Text style={styles.fieldError}>{fieldErrors.privacy_version}</Text>
                      ) : null}
                    </View>

                    <Pressable
                      onPress={onSignup}
                      disabled={busy || !canSubmitForm}
                      testID="signup-submit-btn"
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        (busy || !canSubmitForm) && styles.primaryBtnDisabled,
                        pressed && !busy && styles.primaryBtnPressed,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>{busy ? "가입 중..." : "회원가입"}</Text>
                    </Pressable>

                    {message ? <Text style={styles.helper}>{message}</Text> : null}

                    <Pressable
                      onPress={() => router.push(buildAuthRoute("/(auth)/login", redirect))}
                      style={styles.linkButton}
                    >
                      <Text style={styles.link}>이미 계정이 있나요? 로그인</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        {emailMasked
                          ? `${emailMasked}로 전송된 인증번호를 입력해주세요.`
                          : "이메일로 전송된 인증번호를 입력해주세요."}
                      </Text>
                      {otpTtl ? (
                        <Text style={styles.infoHint}>인증번호 유효시간: {otpTtl}초</Text>
                      ) : null}
                    </View>
                    <TextInput
                      value={otp}
                      onChangeText={(value) => setOtp(value.replace(/[^0-9]/g, ""))}
                      placeholder="6자리 인증번호"
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      returnKeyType="go"
                      onSubmitEditing={() => {
                        if (!busy && canSubmitOtp) {
                          void onVerifyOtp();
                        }
                      }}
                      maxLength={6}
                      style={styles.input}
                      testID="signup-otp-input"
                    />

                    <Pressable
                      onPress={onVerifyOtp}
                      disabled={busy || !canSubmitOtp}
                      testID="signup-otp-submit-btn"
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        (busy || !canSubmitOtp) && styles.primaryBtnDisabled,
                        pressed && !busy && styles.primaryBtnPressed,
                      ]}
                    >
                      <Text style={styles.primaryBtnText}>{busy ? "확인 중..." : "인증 확인"}</Text>
                    </Pressable>

                    <Pressable
                      onPress={onResendOtp}
                      disabled={resendCountdown > 0 || resendBusy}
                      testID="signup-otp-resend-btn"
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        (resendCountdown > 0 || resendBusy) && styles.secondaryBtnDisabled,
                        pressed && !resendBusy && resendCountdown === 0 && styles.secondaryBtnPressed,
                      ]}
                    >
                      <Text style={styles.secondaryBtnText}>
                        {resendCountdown > 0 ? `재발송 (${resendCountdown}초)` : "재발송"}
                      </Text>
                    </Pressable>

                    {message ? <Text style={styles.helper}>{message}</Text> : null}
                  </>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.xl * 1.5,
  },
  container: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: tokens.space.md as any,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: { width: 36, height: 36 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  backText: { fontSize: 18, fontWeight: "900", color: tokens.colors.text },
  h1: { fontSize: tokens.font.h1, fontWeight: "900", color: tokens.colors.text },
  sub: { fontSize: tokens.font.body, color: tokens.colors.textMuted, lineHeight: 22 },
  panel: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  block: { marginBottom: tokens.space.xs },
  form: { gap: tokens.space.sm as any },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.white,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 12,
    fontSize: tokens.font.body,
    color: tokens.colors.text,
  },
  consentGroup: {
    gap: tokens.space.xs as any,
    paddingVertical: tokens.space.xs,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
  },
  checkboxChecked: {
    backgroundColor: tokens.colors.green700,
    borderColor: tokens.colors.green700,
  },
  checkboxMark: {
    color: "white",
    fontSize: 12,
    fontWeight: "800",
  },
  checkboxLabel: {
    flex: 1,
    color: tokens.colors.text,
    fontSize: tokens.font.small,
  },
  fieldError: {
    fontSize: tokens.font.small,
    color: tokens.colors.danger,
    marginTop: -2,
  },
  fieldHint: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    marginTop: -2,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.green700,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: tokens.space.sm,
  },
  primaryBtnPressed: { opacity: 0.92 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "white", fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderRadius: tokens.radius.lg,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  secondaryBtnPressed: { opacity: 0.9 },
  secondaryBtnDisabled: { opacity: 0.6 },
  secondaryBtnText: { color: tokens.colors.text, fontSize: 14, fontWeight: "700" },
  helper: { fontSize: tokens.font.small, color: tokens.colors.textMuted, marginTop: 4 },
  linkButton: {
    alignItems: "center",
    paddingVertical: tokens.space.xs,
  },
  link: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    fontWeight: "800",
  },
  infoBox: {
    padding: tokens.space.md,
    backgroundColor: tokens.colors.surfaceStrong,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: 4,
  },
  infoText: { fontSize: tokens.font.body, color: tokens.colors.text },
  infoHint: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
});
