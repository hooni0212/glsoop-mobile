import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { buildAuthRoute } from "@/lib/authRedirect";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { apiPost } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type PasswordResetValidateResponse = {
  ok?: boolean;
  message?: string;
};

type PasswordResetResponse = {
  ok?: boolean;
  message?: string;
};

export default function AuthResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string; redirect?: string }>();
  const token = params?.token ? String(params.token) : "";
  const redirect = params?.redirect ? String(params.redirect) : undefined;

  const [newPw, setNewPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [validating, setValidating] = React.useState(Boolean(token));
  const [tokenValid, setTokenValid] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    if (!token) {
      setValidating(false);
      setTokenValid(false);
      return;
    }

    void (async () => {
      setValidating(true);
      setError(null);
      try {
        await apiPost<PasswordResetValidateResponse>("/api/password-reset/validate", { token });
        if (!cancelled) setTokenValid(true);
      } catch (e) {
        if (!cancelled) {
          setTokenValid(false);
          setError(normalizeApiError(e));
        }
      } finally {
        if (!cancelled) setValidating(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit() {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await apiPost<PasswordResetResponse>("/api/password-reset", {
        token,
        newPw,
      });
      setMessage(res?.message || "비밀번호가 변경되었어요. 다시 로그인해주세요.");
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppEmpty
            title="재설정 토큰이 없어요"
            description="메일에서 다시 진입하거나 새로 요청해주세요."
            primaryAction={{
              label: "비밀번호 찾기",
              onPress: () => router.replace(buildAuthRoute("/(auth)/forgot-password", redirect)),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (validating) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppLoading message="링크를 확인하는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (!tokenValid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          {error ? (
            <AppError error={error} />
          ) : (
            <AppEmpty title="유효하지 않은 링크예요" description="새로 요청해주세요." />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
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
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>←</Text>
              </Pressable>
              <Text style={styles.h1}>비밀번호 재설정</Text>
              <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.sub}>새 비밀번호를 입력하고 다시 로그인해주세요.</Text>

            {error ? (
              <View style={styles.block}>
                <AppError error={error} />
              </View>
            ) : null}

            <View style={styles.form}>
              <TextInput
                value={newPw}
                onChangeText={setNewPw}
                placeholder="새 비밀번호"
                secureTextEntry
                style={styles.input}
              />

              <Pressable
                onPress={onSubmit}
                disabled={busy || !newPw.trim()}
                style={[
                  styles.primaryBtn,
                  (busy || !newPw.trim()) && styles.primaryBtnDisabled,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {busy ? "변경 중..." : "비밀번호 변경"}
                </Text>
              </Pressable>

              {message ? <Text style={styles.helper}>{message}</Text> : null}

              {message ? (
                <Pressable onPress={() => router.replace(buildAuthRoute("/(auth)/login", redirect))}>
                  <Text style={styles.link}>로그인 하러가기</Text>
                </Pressable>
              ) : null}
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
    maxWidth: 420,
    alignSelf: "center",
    gap: tokens.space.lg as any,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSpacer: { width: 36 },
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
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "white", fontSize: 15, fontWeight: "800" },
  helper: { fontSize: tokens.font.small, color: tokens.colors.textMuted, lineHeight: 20 },
  link: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    fontWeight: "800",
    marginTop: tokens.space.sm,
  },
});
