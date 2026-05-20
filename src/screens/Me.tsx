import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { MeResponse } from "@/features/me/accountCenter";
import { apiGet } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import Author from "@/screens/Author";
import { tokens } from "@/theme/tokens";

export default function MeScreen() {
  const router = useRouter();
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
      setError(normalizeApiError(e));
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadMe();
  }, [loadMe]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppLoading message="내 프로필을 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="내 프로필을 보려면 로그인해 주세요."
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

  const userId = me?.id ? String(me.id) : "";
  if (!userId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppEmpty
            title="표시할 프로필이 없어요"
            description="잠시 후 다시 시도해 주세요."
            primaryAction={{ label: "새로고침", onPress: loadMe }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <Author
      userIdOverride={userId}
      hideTopBar
      reserveBottomDock
      forceOwnProfile
    />
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: tokens.space.xl,
  },
});
