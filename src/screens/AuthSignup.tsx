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
import { normalizeApiError } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type SignupResponse = {
  ok: boolean;
  message?: string;
  token?: string;
};

export default function AuthSignup() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

  async function onSignup() {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const res = await apiPost<SignupResponse>("/api/signup", { name, email, pw });

      if (!res?.ok) {
        setMessage(res?.message || "회원가입에 실패했어요.");
        return;
      }

      // 서버가 token을 바로 주면 로그인까지 처리
      if (res.token) {
        await signIn(res.token);
        router.replace("/(tabs)");
        return;
      }

      // token이 없으면 로그인 화면으로
      setMessage("회원가입 완료! 로그인해 주세요.");
      router.replace("/(auth)/login");
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>←</Text>
            </Pressable>
            <Text style={styles.h1}>회원가입</Text>
            <View style={{ width: 36 }} />
          </View>

          <Text style={styles.sub}>이메일로 간단히 시작해요.</Text>

          {error ? (
            <View style={styles.block}>
              <AppError error={error} />
            </View>
          ) : null}

          <View style={styles.form}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="이름"
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
              disabled={busy || !name || !email || !pw}
              style={({ pressed }) => [
                styles.primaryBtn,
                (busy || !name || !email || !pw) && styles.primaryBtnDisabled,
                pressed && !busy && styles.primaryBtnPressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>{busy ? "가입 중..." : "회원가입"}</Text>
            </Pressable>

            {message ? <Text style={styles.helper}>{message}</Text> : null}

            <Pressable onPress={() => router.replace("/(auth)/login")}>
              <Text style={styles.link}>이미 계정이 있나요? 로그인</Text>
            </Pressable>
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
  helper: { fontSize: tokens.font.small, color: tokens.colors.textMuted, marginTop: 4 },
  link: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    fontWeight: "800",
    marginTop: tokens.space.sm,
  },
});
