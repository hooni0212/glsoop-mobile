import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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
  clearWriteDraft,
  loadWriteDraft,
  saveWriteDraft,
} from "@/services/draftStorage";

import { createWriteStyles } from "./Write.styles";

const AUTOSAVE_DEBOUNCE_MS = 800;

export default function Write() {
  const styles = useMemo(() => createWriteStyles(), []);
  const navigation = useNavigation();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasShownRestorePromptRef = useRef(false);

  const hasChanges = title.trim().length > 0 || body.trim().length > 0;
  const canSubmit = hasChanges;

  const saveDraftNow = useCallback(async () => {
    if (!hasChanges) {
      await clearWriteDraft();
      return;
    }

    await saveWriteDraft({ title, body });
  }, [title, body, hasChanges]);

  const proceedNavigation = useCallback(
    (action?: any) => {
      if (action) navigation.dispatch(action);
      else router.back();
    },
    [navigation]
  );

  const confirmClose = useCallback(
    (opts?: { action?: any }) => {
      if (!hasChanges) {
        proceedNavigation(opts?.action);
        return;
      }

      Alert.alert(
        "작성 중인 내용이 있어요",
        "닫으면 입력 내용이 사라질 수 있어요. 어떻게 할까요?",
        [
          { text: "취소", style: "cancel" },
          {
            text: "그냥 닫기",
            style: "destructive",
            onPress: () => proceedNavigation(opts?.action),
          },
          {
            text: "저장하고 닫기",
            onPress: async () => {
              await saveDraftNow();
              proceedNavigation(opts?.action);
            },
          },
        ]
      );
    },
    [hasChanges, proceedNavigation, saveDraftNow]
  );

  const onPressClose = useCallback(() => {
    confirmClose();
  }, [confirmClose]);

  const onPressSubmit = useCallback(async () => {
    // ✅ 기존 동작 유지 (임시 로그 → back)
    console.log("[WRITE] submit", { title, body });

    // ✅ 게시 성공(가정) 시 draft 삭제
    await clearWriteDraft();
    router.back();
  }, [title, body]);

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
    }

    autosaveTimerRef.current = setTimeout(() => {
      // fire and forget
      saveDraftNow();
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [title, body, saveDraftNow]);

  // 3) 진입 시 draft 복구 UX
  useEffect(() => {
    if (hasShownRestorePromptRef.current) return;
    hasShownRestorePromptRef.current = true;

    (async () => {
      const draft = await loadWriteDraft();
      if (!draft) return;

      // 현재 입력이 비어있을 때만 복구 제안
      const isEmptyNow = title.trim().length === 0 && body.trim().length === 0;
      if (!isEmptyNow) return;

      Alert.alert("임시저장된 글이 있어요", "이어서 작성할까요?", [
        { text: "나중에", style: "cancel" },
        {
          text: "버리기",
          style: "destructive",
          onPress: async () => {
            await clearWriteDraft();
          },
        },
        {
          text: "복구",
          onPress: () => {
            setTitle(draft.title);
            setBody(draft.body);
          },
        },
      ]);
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
          styles={styles}
        />

        {/* ✅ 이번 패치에서는 States 로직 건드리지 않음 (DoD 컴포넌트만 존재시키기) */}
        <WriteStates kind="idle" styles={styles} />

        <View style={styles.container}>
          <WriteEditor
            title={title}
            body={body}
            onChangeTitle={setTitle}
            onChangeBody={setBody}
            styles={styles}
          />

          <WriteMetaSection styles={styles} />
        </View>

        {/* ✅ B-1: 키보드 ON → ActionBar 숨김 / OFF → 노출 */}
        {!isKeyboardVisible && <WriteActionBar styles={styles} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
