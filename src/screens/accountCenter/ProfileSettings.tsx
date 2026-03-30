import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useToast } from "@/feedback/ToastProvider";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { buildAuthRoute } from "@/lib/authRedirect";
import { apiGet, apiPut } from "@/lib/api";
import { normalizeApiError } from "@/lib/errors";
import { type MeResponse, type UpdateMeResponse } from "@/features/me/accountCenter";
import { tokens } from "@/theme/tokens";

export default function AccountCenterProfileSettingsScreen() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const [me, setMe] = React.useState<MeResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<ReturnType<typeof normalizeApiError> | null>(null);
  const [nickname, setNickname] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [about, setAbout] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<MeResponse>("/api/me");
      setMe(response);
      setNickname(response.nickname ?? "");
      setBio(response.bio ?? "");
      setAbout(response.about ?? "");
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

  async function onSave() {
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      setMessage("닉네임을 입력해주세요.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const response = await apiPut<UpdateMeResponse>("/api/me", {
        nickname: trimmedNickname,
        bio: bio.trim(),
        about: about.trim(),
      });
      if (response?.ok === false) {
        throw new Error(response.message || "프로필 저장에 실패했어요.");
      }
      setMessage(response?.message || "프로필을 저장했어요.");
      showToast("프로필을 저장했어요.", { tone: "success" });
      await loadMe();
    } catch (e) {
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        router.replace(buildAuthRoute("/(auth)", pathname));
        return;
      }
      setMessage(normalized.description || normalized.title);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="프로필 및 공개 정보" />
        <View style={styles.center}>
          <AppLoading message="프로필 정보를 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (error?.kind === "auth") {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="프로필 및 공개 정보" />
        <View style={styles.center}>
          <AppEmpty
            title="로그인이 필요해요"
            description="계정 센터는 로그인 후 이용할 수 있어요."
            primaryAction={{
              label: "로그인 하러가기",
              onPress: () => router.replace(buildAuthRoute("/(auth)", pathname)),
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !me) {
    return (
      <SafeAreaView style={styles.safe}>
        <TopBar title="프로필 및 공개 정보" />
        <View style={styles.center}>
          <AppError error={error} onRetry={loadMe} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <TopBar title="프로필 및 공개 정보" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>공개 프로필 편집</Text>
          <Text style={styles.cardDescription}>
            내 정보 탭에서 바로 보이는 소개 정보만 여기서 정리해요.
          </Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>한 줄 소개</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="한 줄 소개"
              style={styles.input}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>자기소개</Text>
            <TextInput
              value={about}
              onChangeText={setAbout}
              placeholder="자기소개"
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.textArea]}
            />
          </View>

          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => void onSave()}
              style={[styles.primaryBtn, saving && styles.disabledBtn]}
              disabled={saving}
            >
              <Text style={styles.primaryBtnText}>{saving ? "저장 중..." : "저장하기"}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/profile-customize")}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>프로필 꾸미기</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={() => router.back()} style={styles.topBarBtn}>
        <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
      </Pressable>
      <Text style={styles.topBarTitle}>{title}</Text>
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
    fontWeight: "900",
    color: tokens.colors.text,
  },
  topBarSpacer: {
    width: 40,
    height: 40,
  },
  content: {
    paddingHorizontal: tokens.space.xl,
    paddingTop: tokens.space.md,
    paddingBottom: tokens.space.xl,
    gap: tokens.space.lg as any,
  },
  card: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  cardDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: tokens.colors.text,
  },
  textArea: {
    minHeight: 110,
  },
  message: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 20,
  },
  actionRow: {
    gap: tokens.space.sm as any,
  },
  primaryBtn: {
    backgroundColor: tokens.colors.green900,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryBtnText: {
    color: tokens.colors.textInverse,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryBtn: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: tokens.colors.text,
    fontSize: 15,
    fontWeight: "800",
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
