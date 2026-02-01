import React from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { apiGet } from "@/lib/api";
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

export default function MeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<MeResponse>("/api/me");
      setMe(data);
    } catch (e) {
      const normalized = normalizeApiError(e);
      setError(normalized);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadMe();
  }, [loadMe]);

  async function onLogout() {
    await signOut();
    router.replace("/(auth)");
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

  // 인증 만료/미로그인 등
  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="내 정보를 보려면 로그인해 주세요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => router.replace("/(auth)"),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

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
          <AppEmpty
            title="표시할 정보가 없어요"
            description="잠시 후 다시 시도해 주세요."
            primaryAction={{ label: "새로고침", onPress: loadMe }}
          />
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
  h1: { fontSize: tokens.font.h1, fontWeight: "900", color: tokens.colors.text },
  card: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  name: { fontSize: 20, fontWeight: "900", color: tokens.colors.text },
  meta: { fontSize: tokens.font.small, color: tokens.colors.textMuted },
  row: { flexDirection: "row", gap: tokens.space.sm as any, flexWrap: "wrap" },
  badge: {
    fontSize: tokens.font.small,
    color: tokens.colors.green900,
    backgroundColor: tokens.colors.green100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
  },
  secondaryBtn: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: { color: tokens.colors.text, fontSize: 15, fontWeight: "800" },
  ghostBtn: { paddingVertical: 10, alignItems: "center" },
  ghostBtnText: { color: tokens.colors.textMuted, fontSize: tokens.font.small, fontWeight: "800" },
});
