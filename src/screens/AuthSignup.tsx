import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { AppError } from "@/components/state/AppError";
import { apiPost } from "@/lib/api";
import {
  buildEmailVerificationNotice,
  isEmailVerificationRequired,
} from "@/lib/authMessages";
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

export default function AuthSignup() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = React.useState<"form" | "otp">("form");
  const [name, setName] = React.useState("");
  const [nickname, setNickname] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [emailMasked, setEmailMasked] = React.useState<string | null>(null);
  const [otpTtl, setOtpTtl] = React.useState<number | null>(null);
  const [resendAfter, setResendAfter] = React.useState(0);
  const [resendCountdown, setResendCountdown] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [resendBusy, setResendBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

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
          const rawMessage = err.message || "요청을 처리할 수 없어요.";
          if (isEmailVerificationRequired(rawMessage)) {
            setMessage(buildEmailVerificationNotice(email));
          } else {
            setMessage(rawMessage);
          }
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
    [email, setError]
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

    try {
      const res = await apiPost<SignupResponse>("/api/signup", {
        name,
        nickname,
        email,
        pw,
      });

      if (!res?.ok) {
        const rawMessage = res?.message || "회원가입에 실패했어요.";
        if (isEmailVerificationRequired(rawMessage)) {
          setMessage(buildEmailVerificationNotice(email));
        } else {
          setMessage(rawMessage);
        }
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

    try {
      const res = await apiPost<VerifyEmailResponse>("/api/verify-email", {
        pending_id: pendingId,
        verification_code: otp,
      });

      if (!res?.ok) {
        const rawMessage = res?.message || "인증번호 확인에 실패했어요.";
        if (isEmailVerificationRequired(rawMessage)) {
          setMessage(buildEmailVerificationNotice(email));
        } else {
          setMessage(rawMessage);
        }
        return;
      }

      const loginRes = await apiPost<LoginResponse>("/api/login", { email, pw });
      if (!loginRes?.ok) {
        const rawMessage = loginRes?.message || "로그인에 실패했어요.";
        if (isEmailVerificationRequired(rawMessage)) {
          setMessage(buildEmailVerificationNotice(email));
        } else {
          setMessage(rawMessage);
        }
        return;
      }
      if (!loginRes.token) {
        setMessage("서버가 token을 응답하지 않았어요. (Bearer 계약 필요)");
        return;
      }

      await signIn(loginRes.token);
      router.replace("/(tabs)");
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

  const canSubmitForm = Boolean(name && nickname && email && pw);
  const canSubmitOtp = otp.length === 6;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.h1}>회원가입</Text>
            <View style={{ width: 36 }} />
          </View>

          <Text style={styles.sub}>
            {step === "form" ? "이메일로 간단히 시작해요." : "인증번호를 입력해 주세요."}
          </Text>

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
                  placeholder="이름"
                  style={styles.input}
                />
                <TextInput
                  value={nickname}
                  onChangeText={setNickname}
                  placeholder="닉네임"
                  style={styles.input}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="이메일"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <TextInput
                  value={pw}
                  onChangeText={setPw}
                  placeholder="비밀번호"
                  secureTextEntry
                  style={styles.input}
                />

                <Pressable
                  onPress={onSignup}
                  disabled={busy || !canSubmitForm}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    (busy || !canSubmitForm) && styles.primaryBtnDisabled,
                    pressed && !busy && styles.primaryBtnPressed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>{busy ? "가입 중..." : "회원가입"}</Text>
                </Pressable>

                {message ? <Text style={styles.helper}>{message}</Text> : null}

                <Pressable onPress={() => router.push("/(auth)/login")}>
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
                  maxLength={6}
                  style={styles.input}
                />

                <Pressable
                  onPress={onVerifyOtp}
                  disabled={busy || !canSubmitOtp}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.lg,
    gap: tokens.space.lg as any,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  sub: { fontSize: tokens.font.body, color: tokens.colors.textMuted },
  block: { marginTop: tokens.space.sm },
  form: { gap: tokens.space.sm as any },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surfaceStrong,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.lg,
    paddingVertical: 12,
    fontSize: tokens.font.body,
    color: tokens.colors.text,
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
  link: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    fontWeight: "800",
    marginTop: tokens.space.sm,
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
