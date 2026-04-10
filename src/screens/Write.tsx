import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  Modal,
} from "react-native";

import { WriteActionBar } from "@/components/write/WriteActionBar";
import { WriteEditor } from "@/components/write/WriteEditor";
import { WriteLayoutSection } from "@/components/write/WriteLayoutSection";
import { WriteMetaSection } from "@/components/write/WriteMetaSection";
import { WritePreviewCard } from "@/components/write/WritePreviewCard";
import { WriteStates } from "@/components/write/WriteStates";
import { WriteTopBar } from "@/components/write/WriteTopBar";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { PostFontKey } from "@/lib/postContent";
import {
  DEFAULT_WRITE_LAYOUT,
  buildLayoutPayload,
  parseLayoutJson,
  updateLayoutBox,
  type LayoutAlign,
  type LayoutBoxId,
  type WriteLayoutModel,
} from "@/lib/postLayout";
import {
  deleteWriteDraft,
  listWriteDrafts,
  loadWriteDraftById,
  upsertWriteDraft,
  clearAllWriteDrafts,
} from "@/services/draftStorage";
import { createPost, getEditablePost, updatePost } from "@/services/postService";
import type { PostType } from "@/types/post";
import { ConfirmState, useConfirmBeforeLeave } from "@/hooks/useConfirmBeforeLeave";

import { createWriteStyles } from "./Write.styles";

export default function Write() {
  const styles = useMemo(() => createWriteStyles(), []);
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [fontKey, setFontKey] = useState<PostFontKey>("serif");
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [layout, setLayout] = useState<WriteLayoutModel>(DEFAULT_WRITE_LAYOUT);
  const [activeBoxId, setActiveBoxId] = useState<LayoutBoxId>("text_box");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<AppErrorModel | null>(null);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState<ConfirmState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [createdPostId, setCreatedPostId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<AppErrorModel | null>(null);

  const hasShownRestorePromptRef = useRef(false);
  const isEditMode = Boolean(editPostId);

  const hashtagChips = useMemo(() => {
    return hashtagsInput
      .split(/[\s,]+/)
      .map((item) => item.trim().replace(/^#+/, "").toLowerCase())
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .slice(0, 12);
  }, [hashtagsInput]);

  const hasChanges = title.trim().length > 0 || body.trim().length > 0 || selectedType !== null;
  const canSubmit =
    title.trim().length > 0 && body.trim().length > 0 && selectedType !== null;
  const submissionLayout = useMemo(
    () => ({
      ...layout,
      showFooter: true,
    }),
    [layout]
  );
  const primaryActionLabel = previewOpen ? "제출" : "미리보기";
  const primaryActionAccessibilityLabel = previewOpen
    ? "글 제출"
    : "미리보기로 이동";
  const canAdvanceToPreview = title.trim().length > 0 || body.trim().length > 0;
  const canPrimaryAction = previewOpen ? canSubmit : canAdvanceToPreview;

  const closeDraftPrompt = useCallback(() => setDraftPrompt(null), []);
  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);

  const openDraftPrompt = useCallback((next: Omit<NonNullable<ConfirmState>, "visible">) => {
    logger.debug("[write] confirm open", { title: next.title });
    setDraftPrompt({ visible: true, ...next });
  }, []);

  const saveDraftExplicit = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle && !trimmedBody) return;

    logger.debug("[write] draft explicit save", {
      draftId,
      titleLen: trimmedTitle.length,
      bodyLen: trimmedBody.length,
      category: selectedType,
    });

    const id = await upsertWriteDraft({
      id: draftId,
      title: trimmedTitle,
      body: trimmedBody,
      category: selectedType ?? undefined,
      fontKey,
      layoutJson: buildLayoutPayload(layout),
      mode: editPostId ? "edit" : "create",
      postId: editPostId,
    });
    if (!draftId) setDraftId(id);
  }, [title, body, draftId, editPostId, selectedType, fontKey, layout]);

  const { confirm: leaveConfirm, requestLeave, allowNextLeave } = useConfirmBeforeLeave({
    hasChanges,
    onLeave: () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      router.replace("/(tabs)");
    },
    buildConfirm: ({ action, proceed, dismiss }) => ({
      title: "작성중인 내용이 있어요.",
      message: "닫으면 입력 내용이 사라질 수 있어요.\n어떻게 할까요?",
      buttons: [
        {
          text: "취소",
          variant: "cancel",
          onPress: () => dismiss(),
          testID: "confirm-close-cancel",
        },
        {
          text: "그냥 닫기",
          variant: "destructive",
          onPress: () => {
            dismiss();
            void (async () => {
              if (draftId) await deleteWriteDraft(draftId);
              proceed(action);
            })();
          },
          testID: "confirm-close-discard",
        },
        {
          text: "임시 저장하기",
          onPress: () => {
            dismiss();
            void (async () => {
              await saveDraftExplicit();
              proceed(action);
            })();
          },
          testID: "confirm-close-save",
        },
      ],
    }),
  });

  const onPressClose = useCallback(() => {
    logger.debug("[write] topbar close press");
    requestLeave();
  }, [requestLeave]);

  const onPressBackFromPreview = useCallback(() => {
    dismissKeyboard();
    setPreviewOpen(false);
  }, [dismissKeyboard]);

  const onPressDrafts = useCallback(() => {
    logger.debug("[write] open draft list");
    router.push("/write-drafts");
  }, []);

  const clearDraftsForDev = useCallback(async () => {
    if (!__DEV__) return;
    await clearAllWriteDrafts();
    setDraftId(null);
    setTitle("");
    setBody("");
    setSelectedType(null);
    setFontKey("serif");
    setLayout(DEFAULT_WRITE_LAYOUT);
  }, []);

  const updateTitleAlign = useCallback((value: LayoutAlign) => {
    setLayout((current) => ({
      ...current,
      titleStyle: { ...current.titleStyle, align: value },
    }));
  }, []);

  const updateBodyAlign = useCallback((value: LayoutAlign) => {
    setLayout((current) => ({
      ...current,
      bodyStyle: { ...current.bodyStyle, align: value },
    }));
  }, []);

  const updateTitleScale = useCallback((value: number) => {
    setLayout((current) => ({
      ...current,
      titleStyle: { ...current.titleStyle, fontScale: value },
    }));
  }, []);

  const updateBodyScale = useCallback((value: number) => {
    setLayout((current) => ({
      ...current,
      bodyStyle: { ...current.bodyStyle, fontScale: value },
    }));
  }, []);

  const updateTitleLineHeight = useCallback((value: number) => {
    setLayout((current) => ({
      ...current,
      titleStyle: { ...current.titleStyle, lineHeight: value },
    }));
  }, []);

  const updateBodyLineHeight = useCallback((value: number) => {
    setLayout((current) => ({
      ...current,
      bodyStyle: { ...current.bodyStyle, lineHeight: value },
    }));
  }, []);

  const updateTitleLetterSpacing = useCallback((value: number) => {
    setLayout((current) => ({
      ...current,
      titleStyle: { ...current.titleStyle, letterSpacing: value },
    }));
  }, []);

  const updateBodyLetterSpacing = useCallback((value: number) => {
    setLayout((current) => ({
      ...current,
      bodyStyle: { ...current.bodyStyle, letterSpacing: value },
    }));
  }, []);

  const nudgeBox = useCallback((boxId: LayoutBoxId, axis: "x" | "y", delta: number) => {
    setLayout((current) => {
      const box = boxId === "title_box" ? current.titleBox : boxId === "text_box" ? current.bodyBox : current.footerBox;
      return updateLayoutBox(current, boxId, { [axis]: box[axis] + delta });
    });
  }, []);

  const resizeBox = useCallback((boxId: LayoutBoxId, axis: "w" | "h", delta: number) => {
    setLayout((current) => {
      const box = boxId === "title_box" ? current.titleBox : boxId === "text_box" ? current.bodyBox : current.footerBox;
      return updateLayoutBox(current, boxId, { [axis]: box[axis] + delta });
    });
  }, []);

  const dragBox = useCallback((boxId: LayoutBoxId, deltaX: number, deltaY: number) => {
    setLayout((current) => {
      const box = boxId === "title_box" ? current.titleBox : boxId === "text_box" ? current.bodyBox : current.footerBox;
      return updateLayoutBox(current, boxId, {
        x: box.x + deltaX,
        y: box.y + deltaY,
      });
    });
  }, []);

  const onPressSubmit = useCallback(async () => {
    if (!previewOpen) {
      dismissKeyboard();
      setPreviewOpen(true);
      return;
    }

    if (!selectedType) return;

    logger.debug("[write] submit start", { draftId, titleLen: title.length, bodyLen: body.length });

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    logger.debug("[write] submit payload", {
      type: selectedType,
      category: selectedType,
      titleLen: trimmedTitle.length,
      contentLen: trimmedBody.length,
    });

    setSubmitError(null);
    setCreatedPostId(null);
    setIsSubmitting(true);
    try {
      if (editPostId) {
        await updatePost({
          postId: editPostId,
          type: selectedType,
          title: trimmedTitle || undefined,
          content: trimmedBody,
          hashtags: hashtagChips,
          layoutJson: buildLayoutPayload(submissionLayout),
          fontKey,
        });
        setCreatedPostId(editPostId);
        logger.debug("[write] update success", { postId: editPostId });
      } else {
        const created = await createPost({
          type: selectedType,
          category: selectedType,
          title: trimmedTitle || undefined,
          content: trimmedBody,
          contentFormat: "plain",
          hashtags: hashtagChips,
          layoutJson: buildLayoutPayload(submissionLayout),
          fontKey,
        });

        if (draftId) {
          await deleteWriteDraft(draftId);
          setDraftId(null);
        }
        setCreatedPostId(created.postId);
        logger.debug("[write] submit success", { postId: created.postId });
      }
      setSubmitSuccess(true);
    } catch (err) {
      logger.warn("[write] submit error", err);
      setSubmitError(normalizeApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [
    selectedType,
    draftId,
    editPostId,
    hashtagChips,
    submissionLayout,
    title,
    body,
    fontKey,
    previewOpen,
    dismissKeyboard,
  ]);

  const onSuccessGoHome = useCallback(() => {
    setSubmitSuccess(false);
    allowNextLeave();
    router.replace("/(tabs)");
  }, [allowNextLeave]);

  const onSuccessViewPost = useCallback(() => {
    if (!createdPostId) return;
    setSubmitSuccess(false);
    allowNextLeave();
    router.replace(`/posts/${createdPostId}`);
  }, [createdPostId, allowNextLeave]);

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
      const paramPostId =
        params && (params as any).postId ? String((params as any).postId) : null;

      if (paramPostId) {
        setEditLoading(true);
        setEditError(null);
        try {
          const editable = await getEditablePost(paramPostId);
          logger.debug("[write] edit post restored", { postId: editable.id });
          setEditPostId(editable.id);
          setTitle(editable.title);
          setBody(editable.content);
          setSelectedType(editable.category ?? null);
          setHashtagsInput(editable.hashtags.join(", "));
          setFontKey(editable.fontKey ?? "serif");
          setLayout(parseLayoutJson(editable.layoutJson));
          setActiveBoxId("text_box");
        } catch (err) {
          logger.warn("[write] edit post load error", err);
          setEditError(normalizeApiError(err));
        } finally {
          setEditLoading(false);
        }
        return;
      }

      const paramDraftId =
        params && (params as any).draftId ? String((params as any).draftId) : null;

      if (paramDraftId) {
        const d = await loadWriteDraftById(paramDraftId);
        if (d) {
          logger.debug("[write] draft restored by param", { draftId: d.id });
          setDraftId(d.id);
          setTitle(d.title);
          setBody(d.body);
          setSelectedType(d.category ?? null);
          setHashtagsInput("");
          setFontKey(d.fontKey ?? "serif");
          setLayout(parseLayoutJson(d.layoutJson));
          setActiveBoxId("text_box");
        }
        return;
      }

      const drafts = await listWriteDrafts();
      if (drafts.length === 0) return;

      // ✅ 임시저장 존재 시 먼저 선택 Alert
      openDraftPrompt({
        title: "임시저장한 글이 있어요. 어떻게 할까요?",
        buttons: [
          {
            text: "새로 쓰기",
            variant: "cancel",
            onPress: () => closeDraftPrompt(),
            testID: "confirm-draft-new",
          },
          {
            text: "임시저장함",
            onPress: () => {
              closeDraftPrompt();
              router.push("/write-drafts");
            },
            testID: "confirm-draft-list",
          },
        ],
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeConfirm = draftPrompt ?? leaveConfirm;

  if (editLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppLoading message="편집할 글을 불러오는 중..." />
        </View>
      </SafeAreaView>
    );
  }

  if (editError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <AppError error={editError} onRetry={editError.canRetry ? () => router.replace(`/write?postId=${params?.postId}`) : undefined} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <WriteTopBar
          title={previewOpen ? "미리보기" : isEditMode ? "글 수정" : "글쓰기"}
          canSubmit={canPrimaryAction}
          onPressClose={previewOpen ? onPressBackFromPreview : onPressClose}
          onPressSubmit={onPressSubmit}
          submitLabel={primaryActionLabel}
          submitAccessibilityLabel={primaryActionAccessibilityLabel}
          onPressDrafts={onPressDrafts}
          previewOpen={previewOpen}
          isKeyboardVisible={isKeyboardVisible}
          onPressHideKeyboard={dismissKeyboard}
          styles={styles}
        />

        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            isLargeScreen && styles.scrollContentWide,
          ]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.contentStack, isLargeScreen && styles.contentStackWide]}>
            {submitError ? (
              <View style={styles.center}>
                <AppError
                  error={submitError}
                  onRetry={submitError.canRetry ? onPressSubmit : undefined}
                />
              </View>
            ) : null}
            {previewOpen ? (
              <WritePreviewCard
                title={title}
                body={body}
                selectedType={selectedType}
                layout={submissionLayout}
                fontKey={fontKey}
              />
            ) : (
              <WriteEditor
                title={title}
                body={body}
                fontKey={fontKey}
                layout={layout}
                activeBoxId={activeBoxId}
                onSelectBox={setActiveBoxId}
                onDragBox={dragBox}
                onChangeTitle={setTitle}
                onChangeBody={setBody}
                onPressBackground={dismissKeyboard}
                styles={styles}
              >
                <WriteLayoutSection
                  styles={styles}
                  layout={layout}
                  activeBoxId={activeBoxId}
                  onSelectBox={setActiveBoxId}
                  onChangeTitleAlign={updateTitleAlign}
                  onChangeBodyAlign={updateBodyAlign}
                  onChangeTitleScale={updateTitleScale}
                  onChangeBodyScale={updateBodyScale}
                  onChangeTitleLineHeight={updateTitleLineHeight}
                  onChangeBodyLineHeight={updateBodyLineHeight}
                  onChangeTitleLetterSpacing={updateTitleLetterSpacing}
                  onChangeBodyLetterSpacing={updateBodyLetterSpacing}
                  onNudgeBox={nudgeBox}
                  onResizeBox={resizeBox}
                />
              </WriteEditor>
            )}

            {!previewOpen ? (
              <WriteMetaSection
                styles={styles}
                selectedType={selectedType}
                onSelectType={setSelectedType}
                hashtagsInput={hashtagsInput}
                hashtagChips={hashtagChips}
                onChangeHashtagsInput={setHashtagsInput}
                fontKey={fontKey}
                onChangeFontKey={setFontKey}
                showCategory={false}
              />
            ) : (
              <WriteMetaSection
                styles={styles}
                selectedType={selectedType}
                onSelectType={setSelectedType}
                hashtagsInput={hashtagsInput}
                hashtagChips={hashtagChips}
                onChangeHashtagsInput={setHashtagsInput}
                fontKey={fontKey}
                onChangeFontKey={setFontKey}
                showFont={false}
                showHashtags={false}
              />
            )}

            <WriteStates styles={styles} confirm={activeConfirm} />
          </View>
        </ScrollView>

        {/* ✅ 키보드 ON 시 ActionBar 숨김 */}
        {!isKeyboardVisible && <WriteActionBar styles={styles} />}

        <Modal visible={isSubmitting} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <AppLoading message="전송 중..." />
            </View>
          </View>
        </Modal>

        <Modal visible={submitSuccess} transparent animationType="fade">
          <View style={styles.successOverlay}>
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>완료되었어요</Text>
              <Text style={styles.successMessage}>
                {isEditMode ? "수정한 글을 확인할까요?" : "어디로 이동할까요?"}
              </Text>
              <View style={styles.successActions}>
                <Pressable
                  onPress={onSuccessViewPost}
                  style={[styles.modalBtn, styles.modalBtnPrimary]}
                  accessibilityRole="button"
                  accessibilityLabel="방금 작성한 글 보기"
                  testID="write-success-view-post"
                >
                  <Text style={[styles.modalBtnText, styles.modalBtnTextPrimary]}>방금 글 보기</Text>
                </Pressable>
                <Pressable
                  onPress={onSuccessGoHome}
                  style={styles.modalBtn}
                  accessibilityRole="button"
                  accessibilityLabel="홈으로 이동"
                  testID="write-success-go-home"
                >
                  <Text style={styles.modalBtnText}>홈으로</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {__DEV__ && (
          <View style={styles.devWrap}>
            <View style={styles.devCard}>
              <View style={styles.devRow}>
                <View>
                  <Text style={styles.devTitle}>DEV: Draft helpers</Text>
                  <Text style={styles.devDescription}>테스트 전 임시저장 비우기</Text>
                </View>
                <Pressable
                  onPress={clearDraftsForDev}
                  hitSlop={8}
                  style={[styles.chip, styles.chipCompact]}
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
