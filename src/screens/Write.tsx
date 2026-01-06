import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  View,
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
  loadLatestWriteDraft,
  loadWriteDraftById,
  upsertWriteDraft,
} from "@/services/draftStorage";

import { createWriteStyles } from "./Write.styles";

const AUTOSAVE_DEBOUNCE_MS = 800;

type ConfirmState =
  | {
      visible: true;
      title: string;
      message?: string;
      buttons: Array<{
        text: string;
        variant?: "default" | "destructive" | "cancel";
        onPress: () => void;
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

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownRestorePromptRef = useRef(false);

  const hasChanges = title.trim().length > 0 || body.trim().length > 0;
  const canSubmit = hasChanges;

  const closeConfirm = useCallback(() => setConfirm(null), []);

  const openConfirm = useCallback(
    (next: Omit<NonNullable<ConfirmState>, "visible">) => {
      console.log("[WRITE][confirm] open:", next.title);
      setConfirm({ visible: true, ...next });
    },
    []
  );

  const saveDraftNow = useCallback(async () => {
    console.log("[WRITE][draft] saveDraftNow called", {
      hasChanges,
      draftId,
      titleLen: title.length,
      bodyLen: body.length,
    });

    if (!hasChanges) {
      // If user cleared everything, remove current draft (if any)
      if (draftId) {
        await deleteWriteDraft(draftId);
        setDraftId(null);
      }
      return;
    }

    const id = await upsertWriteDraft({ id: draftId, title, body });
    if (!draftId) setDraftId(id);
  }, [title, body, hasChanges, draftId]);

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
        title: "작성 중인 내용이 있어요",
        message: "닫으면 입력 내용이 사라질 수 있어요. 어떻게 할까요?",
        buttons: [
          {
            text: "취소",
            variant: "cancel",
            onPress: () => closeConfirm(),
          },
          {
            text: "그냥 닫기",
            variant: "destructive",
            onPress: () => {
              closeConfirm();
              proceedNavigation(opts?.action);
            },
          },
          {
            text: "저장하고 닫기",
            onPress: () => {
              closeConfirm();
              void (async () => {
                await saveDraftNow();
                proceedNavigation(opts?.action);
              })();
            },
          },
        ],
      });
    },
    [hasChanges, proceedNavigation, saveDraftNow, openConfirm, closeConfirm]
  );

  const onPressClose = useCallback(() => {
    console.log("[WRITE][ui] topbar close press");
    confirmClose();
  }, [confirmClose]);

  const onPressDrafts = useCallback(() => {
    console.log("[WRITE][ui] open draft list");
    router.push("/write-drafts");
  }, []);

  const onPressSubmit = useCallback(async () => {
    console.log("[WRITE] submit", { draftId, titleLen: title.length, bodyLen: body.length });

    // ✅ 게시 성공(가정) 시 해당 draft 삭제
    if (draftId) {
      await deleteWriteDraft(draftId);
      setDraftId(null);
    }
    router.back();
  }, [draftId, title.length, body.length]);

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

  // 2) 자동 임시저장 (debounce)
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    autosaveTimerRef.current = setTimeout(() => {
      void saveDraftNow();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [title, body, saveDraftNow]);

  // 3) Write 진입 시: (a) 파라미터로 draftId가 오면 해당 draft 복구, (b) 아니면 draft 존재 여부에 따라 UX 제공
  useEffect(() => {
    if (hasShownRestorePromptRef.current) return;
    hasShownRestorePromptRef.current = true;

    void (async () => {
      const paramDraftId =
        params && (params as any).draftId ? String((params as any).draftId) : null;

      // 현재 입력이 비어있을 때만 복구 제안
      const isEmptyNow = title.trim().length === 0 && body.trim().length === 0;
      if (!isEmptyNow) return;

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

      // ✅ 요구사항: 임시저장 한 상태에서 글쓰기 진입 → 복구 여부 물어보기
      openConfirm({
        title: "임시저장된 글이 있어요",
        message: drafts.length === 1 ? "이어서 작성할까요?" : "최근 임시저장을 이어쓰거나, 목록에서 선택할 수 있어요.",
        buttons: [
          {
            text: "새로 쓰기",
            variant: "cancel",
            onPress: () => closeConfirm(),
          },
          {
            text: "목록 보기",
            onPress: () => {
              closeConfirm();
              router.push("/write-drafts");
            },
          },
          {
            text: "최근 이어쓰기",
            onPress: () => {
              closeConfirm();
              void (async () => {
                const latest = await loadLatestWriteDraft();
                if (!latest) return;
                console.log("[WRITE][draft] restore latest", { id: latest.id });
                setDraftId(latest.id);
                setTitle(latest.title);
                setBody(latest.body);
              })();
            },
          },
        ],
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 4) 뒤로가기/닫기 정책: 네비게이션 이벤트(beforeRemove) 가로채기
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e: any) => {
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
