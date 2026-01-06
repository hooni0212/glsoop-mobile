import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Pressable,
  Text,
  View,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import { WriteActionBar } from "@/components/write/WriteActionBar";
import { WriteEditor } from "@/components/write/WriteEditor";
import { WriteMetaSection } from "@/components/write/WriteMetaSection";
import { WriteStates } from "@/components/write/WriteStates";
import { WriteTopBar } from "@/components/write/WriteTopBar";
import {
  deleteWriteDraft,
  listWriteDrafts,
  loadWriteDraftById,
  upsertWriteDraft,
  clearAllWriteDrafts,
} from "@/services/draftStorage";

import { createWriteStyles } from "./Write.styles";

type ConfirmState =
  | {
      visible: true;
      title: string;
      message?: string;
      buttons: Array<{
        text: string;
        variant?: "default" | "destructive" | "cancel";
        onPress: () => void;
        testID?: string;
      }>;
    }
  | null;

export default function Write() {
  const styles = useMemo(() => createWriteStyles(), []);
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const hasShownRestorePromptRef = useRef(false);
  const skipNextBeforeRemoveRef = useRef(false);

  const hasChanges = title.trim().length > 0 || body.trim().length > 0;
  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const closeConfirm = useCallback(() => setConfirm(null), []);

  const openConfirm = useCallback(
    (next: Omit<NonNullable<ConfirmState>, "visible">) => {
      console.log("[WRITE][confirm] open:", next.title);
      setConfirm({ visible: true, ...next });
    },
    []
  );

  const saveDraftExplicit = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle && !trimmedBody) return;

    console.log("[WRITE][draft] explicit save", {
      draftId,
      titleLen: trimmedTitle.length,
      bodyLen: trimmedBody.length,
    });

    const id = await upsertWriteDraft({ id: draftId, title: trimmedTitle, body: trimmedBody });
    if (!draftId) setDraftId(id);
  }, [title, body, draftId]);

  const proceedNavigation = useCallback(
    (action?: any) => {
      console.log("[WRITE][nav] proceed", { hasAction: !!action });
      if (action) navigation.dispatch(action);
      else router.back();
    },
    [navigation]
  );

  const confirmClose = useCallback(
    (opts?: { action?: any }) => {
      console.log("[WRITE][ui] close pressed", { hasChanges });

      if (!hasChanges) {
        proceedNavigation(opts?.action);
        return;
      }

      openConfirm({
        title: "작성중인 내용이 있어요.",
        message: "닫으면 입력 내용이 사라질 수 있어요.\n어떻게 할까요?",
        buttons: [
          {
            text: "취소",
            variant: "cancel",
            onPress: () => closeConfirm(),
            testID: "confirm-close-cancel",
          },
          {
            text: "그냥 닫기",
            variant: "destructive",
            onPress: () => {
              closeConfirm();
              void (async () => {
                if (draftId) await deleteWriteDraft(draftId);
              })();
              skipNextBeforeRemoveRef.current = true;
              proceedNavigation(opts?.action);
            },
            testID: "confirm-close-discard",
          },
          {
            text: "임시 저장하기",
            onPress: () => {
              closeConfirm();
              void (async () => {
                await saveDraftExplicit();
                skipNextBeforeRemoveRef.current = true;
                proceedNavigation(opts?.action);
              })();
            },
            testID: "confirm-close-save",
          },
        ],
      });
    },
    [hasChanges, proceedNavigation, saveDraftExplicit, openConfirm, closeConfirm]
  );

  const onPressClose = useCallback(() => {
    console.log("[WRITE][ui] topbar close press");
    confirmClose();
  }, [confirmClose]);

  const onPressDrafts = useCallback(() => {
    console.log("[WRITE][ui] open draft list");
    router.push("/write-drafts");
  }, []);

  const clearDraftsForDev = useCallback(async () => {
    if (!__DEV__) return;
    await clearAllWriteDrafts();
    setDraftId(null);
    setTitle("");
    setBody("");
  }, []);

  const onPressSubmit = useCallback(async () => {
    console.log("[WRITE] submit", { draftId, titleLen: title.length, bodyLen: body.length });

    const payload = { title, body };
    console.log("[WRITE] submit payload", payload);

    skipNextBeforeRemoveRef.current = true; // 완료 시 beforeRemove confirm 뜨지 않도록 스킵

    setIsSubmitting(true);
    try {
      // TODO: 실제 전송 API 연결 필요 (예: fetch/axios)
      // await fetch("/api/write", { method: "POST", body: JSON.stringify(payload) });

      // ✅ 게시 성공(가정) 시 해당 draft 삭제
      if (draftId) {
        await deleteWriteDraft(draftId);
        setDraftId(null);
      }
      console.log("[WRITE] submit success -> show success and go home");
      setSubmitSuccess(true);
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 600);
    } catch (err) {
      console.log("[WRITE] submit error", err);
    } finally {
      setIsSubmitting(false);
    }
  }, [draftId, title, body]);

  // 1) 키보드 상태 감지
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 2) Write 진입 시: (a) 파라미터로 draftId가 오면 해당 draft 복구, (b) 아니면 draft 존재 여부에 따라 UX 제공
  useEffect(() => {
    if (hasShownRestorePromptRef.current) return;
    hasShownRestorePromptRef.current = true;

    void (async () => {
      const paramDraftId =
        params && (params as any).draftId ? String((params as any).draftId) : null;

      if (paramDraftId) {
        const d = await loadWriteDraftById(paramDraftId);
        if (d) {
          console.log("[WRITE][draft] restore by param", { id: d.id });
          setDraftId(d.id);
          setTitle(d.title);
          setBody(d.body);
        }
        return;
      }

      const drafts = await listWriteDrafts();
      if (drafts.length === 0) return;

      // ✅ 임시저장 존재 시 먼저 선택 Alert
      openConfirm({
        title: "임시저장한 글이 있어요. 어떻게 할까요?",
        buttons: [
          {
            text: "새로 쓰기",
            variant: "cancel",
            onPress: () => closeConfirm(),
            testID: "confirm-draft-new",
          },
          {
            text: "임시저장함",
            onPress: () => {
              closeConfirm();
              router.push("/write-drafts");
            },
            testID: "confirm-draft-list",
          },
        ],
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4) 뒤로가기/닫기 정책: 네비게이션 이벤트(beforeRemove) 가로채기
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
      if (skipNextBeforeRemoveRef.current) {
        skipNextBeforeRemoveRef.current = false;
        return;
      }

      if (!hasChanges) return;

      e.preventDefault();
      confirmClose({ action: e.data.action });
    });

    return unsubscribe;
  }, [navigation, hasChanges, confirmClose]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <WriteTopBar
          title="글쓰기"
          canSubmit={canSubmit}
          onPressClose={onPressClose}
          onPressSubmit={onPressSubmit}
          onPressDrafts={onPressDrafts}
          styles={styles}
        />

        <View style={styles.container}>
          <WriteEditor
            title={title}
            body={body}
            onChangeTitle={setTitle}
            onChangeBody={setBody}
            styles={styles}
          />

          <WriteMetaSection styles={styles} />

          <WriteStates styles={styles} confirm={confirm} />
        </View>

        {/* ✅ 키보드 ON 시 ActionBar 숨김 */}
        {!isKeyboardVisible && <WriteActionBar styles={styles} />}

        <Modal visible={isSubmitting} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.2)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                padding: 20,
                borderRadius: 14,
                backgroundColor: "#fff",
                alignItems: "center",
                width: 200,
              }}
            >
              <ActivityIndicator size="large" color="#2E5A3D" />
              <Text style={{ marginTop: 12, fontWeight: "800", color: "#2B2B2B" }}>
                전송 중...
              </Text>
            </View>
          </View>
        </Modal>

        <Modal visible={submitSuccess} transparent animationType="fade">
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.25)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                padding: 20,
                borderRadius: 14,
                backgroundColor: "#fff",
                alignItems: "center",
                width: 220,
              }}
            >
              <Text style={{ fontWeight: "900", fontSize: 16, color: "#2B2B2B" }}>
                완료되었어요
              </Text>
              <Text style={{ marginTop: 8, fontWeight: "700", color: "#444", textAlign: "center" }}>
                홈으로 이동합니다
              </Text>
            </View>
          </View>
        </Modal>

        {__DEV__ && (
          <View style={{ padding: 12 }}>
            <View
              style={{
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: "rgba(0,0,0,0.2)",
                borderRadius: 10,
                padding: 10,
                backgroundColor: "rgba(0,0,0,0.03)",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <View>
                  <Text style={{ fontWeight: "800", color: "#333" }}>
                    DEV: Draft helpers
                  </Text>
                  <Text style={{ color: "#444", marginTop: 4, fontSize: 12 }}>
                    테스트 전 임시저장 비우기
                  </Text>
                </View>
                <Pressable
                  onPress={clearDraftsForDev}
                  hitSlop={8}
                  style={[styles.chip, { paddingHorizontal: 10 }]}
                  accessibilityRole="button"
                  accessibilityLabel="임시저장 초기화"
                  testID="dev-clear-write-drafts"
                >
                  <Text style={styles.chipText}>초기화</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
