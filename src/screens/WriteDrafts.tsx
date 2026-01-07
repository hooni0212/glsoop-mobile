import React, { useCallback, useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { deleteWriteDraft, listWriteDrafts, WriteDraft } from "@/services/draftStorage";
import { useConfirmBeforeLeave } from "@/hooks/useConfirmBeforeLeave";
import { createWriteStyles } from "./Write.styles";

function formatDate(ts: number) {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export default function WriteDrafts() {
  const styles = useMemo(() => createWriteStyles(), []);
  const [drafts, setDrafts] = useState<WriteDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppErrorModel | null>(null);
  const hasChanges = false;

  const { requestLeave } = useConfirmBeforeLeave({
    hasChanges,
    onLeave: () => router.back(),
    buildConfirm: () => ({
      title: "",
      buttons: [],
    }),
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listWriteDrafts();
      setDrafts(items);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onPressOpen = useCallback((id: string) => {
    router.push({ pathname: "/write", params: { draftId: id } });
  }, []);

  const onPressDelete = useCallback(async (id: string) => {
    await deleteWriteDraft(id);
    await refresh();
  }, [refresh]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => requestLeave()}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="임시저장 목록 닫기"
          testID="drafts-back-btn"
        >
          <Text style={styles.iconText}>←</Text>
        </Pressable>

        <Text style={styles.screenTitle}>임시저장</Text>

        <Pressable
          onPress={() => router.push("/write")}
          hitSlop={12}
          style={styles.doneBtn}
          accessibilityRole="button"
          accessibilityLabel="새 글 작성"
          testID="drafts-new-btn"
        >
          <Text style={styles.doneText}>새 글</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        {loading ? (
          <View style={styles.center}>
            <AppLoading message="임시저장함을 불러오는 중…" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <AppError error={error} onRetry={error.canRetry ? refresh : undefined} />
          </View>
        ) : drafts.length === 0 ? (
          <View style={styles.center}>
            <AppEmpty
              title="임시저장한 글이 없어요"
              description="새 글을 작성하거나 자유롭게 기록해보세요."
              primaryAction={{ label: "글 작성하기", onPress: () => router.push("/write") }}
            />
          </View>
        ) : (
          drafts.map((d) => {
            const preview = (d.body || "").replace(/\s+/g, " ").slice(0, 90);
            const title = d.title?.trim() ? d.title.trim() : "(제목 없음)";
            return (
              <View key={d.id} style={styles.metaCard} testID={`draft-item-${d.id}`}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: "#2B2B2B" }}>{title}</Text>
                <Text style={{ marginTop: 6, fontSize: 12, color: "#6C6C6C", fontWeight: "700" }}>
                  {formatDate(d.updatedAt)}
                </Text>
                {!!preview && (
                  <Text style={{ marginTop: 10, fontSize: 13, color: "#2B2B2B", lineHeight: 18 }}>
                    {preview}
                  </Text>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => onPressOpen(d.id)}
                    style={[styles.chip, { flex: 1 }]}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="임시저장 열기"
                    testID={`draft-open-${d.id}`}
                  >
                    <Text style={styles.chipText}>열기</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onPressDelete(d.id)}
                    style={[styles.chip, { flex: 1, borderColor: "rgba(180,50,50,0.35)" }]}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel="임시저장 삭제"
                    testID={`draft-delete-${d.id}`}
                  >
                    <Text style={[styles.chipText, { color: "rgba(180,50,50,0.95)" }]}>삭제</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
