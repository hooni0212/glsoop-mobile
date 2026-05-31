import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
import {
  deleteProfilePhoto,
  normalizeMeProfilePhoto,
  uploadProfilePhoto,
  type ProfilePhoto,
} from "@/services/profilePhotoService";
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
  const [profilePhoto, setProfilePhoto] = React.useState<ProfilePhoto | null>(null);
  const [photoUploadAllowed, setPhotoUploadAllowed] = React.useState(false);
  const [photoBusy, setPhotoBusy] = React.useState(false);

  const loadMe = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiGet<MeResponse>("/api/me");
      setMe(response);
      setNickname(response.nickname ?? "");
      setBio(response.bio ?? "");
      setAbout(response.about ?? "");
      setProfilePhoto(normalizeMeProfilePhoto(response));
      setPhotoUploadAllowed(Boolean(response.profile_photo_upload_allowed));
    } catch (e) {
      setError(normalizeApiError(e));
      setMe(null);
      setProfilePhoto(null);
      setPhotoUploadAllowed(false);
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
        router.replace(buildAuthRoute("/(auth)/login", pathname));
        return;
      }
      setMessage(normalized.description || normalized.title);
    } finally {
      setSaving(false);
    }
  }

  async function onPickProfilePhoto() {
    if (!photoUploadAllowed) {
      showToast("프로필 사진 업로드는 프리미엄에서 사용할 수 있어요.", { tone: "error" });
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "사진 접근 권한이 필요해요",
        "프로필 사진으로 사용할 이미지를 선택하려면 사진 접근 권한을 허용해주세요."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      selectionLimit: 1,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset?.uri) {
      showToast("선택한 사진을 읽지 못했어요.", { tone: "error" });
      return;
    }

    setPhotoBusy(true);
    setMessage(null);
    try {
      const response = await uploadProfilePhoto({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
      });
      const nextPhoto = response.profile_photo ?? null;
      setProfilePhoto(nextPhoto);
      setMe((prev) =>
        prev
          ? {
              ...prev,
              profile_photo_url: nextPhoto?.url ?? null,
              profile_photo_thumbnail_url: nextPhoto?.thumbnail_url ?? null,
              profile_photo_updated_at: nextPhoto?.updated_at ?? null,
            }
          : prev
      );
      showToast("프로필 사진을 저장했어요.", { tone: "success" });
    } catch (e) {
      const normalized = normalizeApiError(e);
      if (normalized.kind === "auth") {
        router.replace(buildAuthRoute("/(auth)/login", pathname));
        return;
      }
      showToast(normalized.description || normalized.title, { tone: "error" });
    } finally {
      setPhotoBusy(false);
    }
  }

  function onDeleteProfilePhoto() {
    if (!profilePhoto || photoBusy) return;

    Alert.alert("프로필 사진을 삭제할까요?", "현재 프로필 사진이 기본 이니셜로 돌아갑니다.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          setPhotoBusy(true);
          setMessage(null);
          try {
            await deleteProfilePhoto();
            setProfilePhoto(null);
            setMe((prev) =>
              prev
                ? {
                    ...prev,
                    profile_photo_url: null,
                    profile_photo_thumbnail_url: null,
                    profile_photo_updated_at: null,
                  }
                : prev
            );
            showToast("프로필 사진을 삭제했어요.", { tone: "success" });
          } catch (e) {
            const normalized = normalizeApiError(e);
            if (normalized.kind === "auth") {
              router.replace(buildAuthRoute("/(auth)/login", pathname));
              return;
            }
            showToast(normalized.description || normalized.title, { tone: "error" });
          } finally {
            setPhotoBusy(false);
          }
        },
      },
    ]);
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
              onPress: () => router.replace(buildAuthRoute("/(auth)/login", pathname)),
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
          <View style={styles.photoHeaderRow}>
            <View style={styles.photoHeaderCopy}>
              <Text style={styles.cardTitle}>프로필 사진</Text>
              <Text style={styles.cardDescription}>
                JPG, PNG, WebP 이미지를 정사각형으로 맞춰 저장해요.
              </Text>
            </View>
            {photoUploadAllowed ? (
              <View style={styles.premiumPill}>
                <Ionicons name="sparkles" size={13} color={tokens.colors.green700} />
                <Text style={styles.premiumPillText}>프리미엄</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.photoRow}>
            <View style={styles.photoPreview}>
              {profilePhoto?.thumbnail_url || profilePhoto?.url ? (
                <Image
                  source={{ uri: profilePhoto.thumbnail_url || profilePhoto.url }}
                  style={styles.photoImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.photoInitial}>
                  {(nickname.trim() || me?.name || "글").slice(0, 1)}
                </Text>
              )}
            </View>

            <View style={styles.photoActionColumn}>
              {!photoUploadAllowed ? (
                <Text style={styles.photoHint}>
                  프리미엄 계정에서 프로필 사진을 사용할 수 있어요.
                </Text>
              ) : null}
              <View style={styles.photoButtonRow}>
                <Pressable
                  onPress={() => void onPickProfilePhoto()}
                  disabled={photoBusy || !photoUploadAllowed}
                  style={({ pressed }) => [
                    styles.photoPrimaryBtn,
                    (photoBusy || !photoUploadAllowed) && styles.disabledBtn,
                    pressed && !photoBusy && photoUploadAllowed && styles.photoBtnPressed,
                  ]}
                >
                  <Ionicons name="camera-outline" size={17} color="#fff" />
                  <Text style={styles.photoPrimaryBtnText}>
                    {photoBusy ? "처리 중..." : profilePhoto ? "사진 변경" : "사진 선택"}
                  </Text>
                </Pressable>

                {profilePhoto ? (
                  <Pressable
                    onPress={onDeleteProfilePhoto}
                    disabled={photoBusy}
                    style={({ pressed }) => [
                      styles.photoSecondaryBtn,
                      photoBusy && styles.disabledBtn,
                      pressed && !photoBusy && styles.photoBtnPressed,
                    ]}
                  >
                    <Ionicons name="trash-outline" size={17} color={tokens.colors.text} />
                    <Text style={styles.photoSecondaryBtnText}>삭제</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        </View>

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
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
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
  photoHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.md as any,
  },
  photoHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  premiumPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  premiumPillText: {
    color: tokens.colors.green700,
    fontSize: 12,
    fontWeight: "900",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md as any,
  },
  photoPreview: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.green050,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoInitial: {
    color: tokens.colors.green900,
    fontSize: 30,
    fontWeight: "900",
  },
  photoActionColumn: {
    flex: 1,
    gap: tokens.space.sm as any,
  },
  photoHint: {
    color: tokens.colors.textMuted,
    fontSize: tokens.font.small,
    lineHeight: 19,
  },
  photoButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
  },
  photoPrimaryBtn: {
    minHeight: 44,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.green900,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  photoPrimaryBtnText: {
    color: tokens.colors.textInverse,
    fontSize: 14,
    fontWeight: "900",
  },
  photoSecondaryBtn: {
    minHeight: 44,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  photoSecondaryBtnText: {
    color: tokens.colors.text,
    fontSize: 14,
    fontWeight: "900",
  },
  photoBtnPressed: {
    opacity: 0.82,
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
