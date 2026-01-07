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

import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { apiGet, apiPost } from "@/lib/api";
import { clearAuthToken, setAuthToken } from "@/lib/authToken";
import { normalizeApiError } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

type MeResponse = {
  ok: true;
  id: number;
  name: string;
  nickname: string | null;
  email: string;
  bio: string | null;
  about: string | null;
  isAdmin: boolean;
  isVerified: boolean;
  level: number;
  xp: number;
  streak_days: number;
  max_streak_days: number;
  followerCount: number;
  followingCount: number;
};

type LoginResponse = {
  ok: boolean;
  message?: string;
  name?: string;
  nickname?: string | null;
  token?: string;
};

export default function MeScreen() {
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [needsLogin, setNeedsLogin] = React.useState(false);

  const [email, setEmail] = React.useState("");
  const [pw, setPw] = React.useState("");
  const [loginBusy, setLoginBusy] = React.useState(false);
  const [loginMessage, setLoginMessage] = React.useState<string | null>(null);

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setLoginMessage(null);

    try {
      const data = await apiGet<MeResponse>("/api/me");
      setMe(data);
      setNeedsLogin(false);
    } catch (e) {
      const normalized = normalizeApiError(e);
      setError(normalized);
      setMe(null);
      // auth 에러면 로그인 폼 노출
      setNeedsLogin(normalized.kind === "auth");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function onLogin() {
    setLoginBusy(true);
    setLoginMessage(null);
    setError(null);

    try {
      const res = await apiPost<LoginResponse>("/api/login", { email, pw });

      if (!res?.ok) {
        setLoginMessage(res?.message || "로그인에 실패했어요.");
        return;
      }

      // ✅ Bearer 계약: token을 응답으로 받는 경우
      if (res.token) {
        await setAuthToken(res.token);
        setLoginMessage("로그인 완료!");
        await loadMe();
        return;
      }

      // ⚠️ 서버가 쿠키 only면 여기로 옴
      setLoginMessage(
        "서버가 token을 응답하지 않았어요. (쿠키 기반 only일 수 있음) 서버에서 Bearer 계약을 켜주면 모바일이 안정적으로 동작해요."
      );
    } catch (e) {
      setError(normalizeApiError(e));
    } finally {
      setLoginBusy(false);
    }
  }

  async function onLogout() {
    await clearAuthToken();
    setMe(null);
    setNeedsLogin(true);
    setLoginMessage("로그아웃 되었어요.");
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppLoading message="내 정보를 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  // 로그인 필요(401/403)
  if (needsLogin) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.container}>
            <Text style={styles.h1}>내 정보</Text>
            <Text style={styles.sub}>로그인하면 마이페이지를 볼 수 있어요.</Text>

            {error ? (
              <View style={styles.block}>
                <AppError error={error} />
              </View>
            ) : null}

            <View style={styles.form}>
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
                onPress={onLogin}
                disabled={loginBusy || !email || !pw}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  (loginBusy || !email || !pw) && styles.primaryBtnDisabled,
                  pressed && !loginBusy && styles.primaryBtnPressed,
                ]}
              >
                <Text style={styles.primaryBtnText}>
                  {loginBusy ? "로그인 중..." : "로그인"}
                </Text>
              </Pressable>

              {loginMessage ? <Text style={styles.helper}>{loginMessage}</Text> : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // 일반 에러
  if (error && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppError error={error} onRetry={error.canRetry ? loadMe : undefined} />
        </View>
      </SafeAreaView>
    );
  }

  if (!me) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.sub}>표시할 정보가 없어요.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.h1}>내 정보</Text>

        <View style={styles.card}>
          <Text style={styles.name}>{me.nickname || me.name}</Text>
          <Text style={styles.meta}>{me.email}</Text>
          <View style={styles.row}>
            <Text style={styles.badge}>Lv. {me.level}</Text>
            <Text style={styles.badge}>XP {me.xp}</Text>
            <Text style={styles.badge}>연속 {me.streak_days}일</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.badge}>팔로워 {me.followerCount}</Text>
            <Text style={styles.badge}>팔로잉 {me.followingCount}</Text>
          </View>
          <Text style={styles.meta}>{me.isVerified ? "✅ 이메일 인증 완료" : "⚠️ 이메일 미인증"}</Text>
        </View>

        <Pressable onPress={onLogout} style={styles.secondaryBtn}>
          <Text style={styles.secondaryBtnText}>로그아웃</Text>
        </Pressable>

        <Pressable onPress={loadMe} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnText}>새로고침</Text>
        </Pressable>
      </View>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
  h1: { fontSize: 22, fontWeight: "900", color: tokens.colors.text },
  sub: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  block: { marginTop: tokens.space.md },
  form: { gap: tokens.space.sm as any },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    fontSize: tokens.font.body,
    color: tokens.colors.text,
  },
  primaryBtn: {
    marginTop: tokens.space.sm,
    backgroundColor: tokens.colors.green900,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.space.md,
    alignItems: "center",
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "white", fontWeight: "900", fontSize: tokens.font.body },
  helper: { marginTop: tokens.space.xs, fontSize: tokens.font.small, color: tokens.colors.textMuted },
  card: {
    padding: tokens.space.lg,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    gap: tokens.space.sm as any,
  },
  name: { fontSize: 20, fontWeight: "900", color: tokens.colors.text },
  meta: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  row: { flexDirection: "row", flexWrap: "wrap", gap: tokens.space.xs as any },
  badge: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    fontSize: tokens.font.small,
    color: tokens.colors.text,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: tokens.space.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    alignItems: "center",
  },
  secondaryBtnText: { fontWeight: "900", color: tokens.colors.text },
  ghostBtn: { alignItems: "center", paddingVertical: tokens.space.sm },
  ghostBtnText: { fontWeight: "800", color: tokens.colors.textMuted },
});
