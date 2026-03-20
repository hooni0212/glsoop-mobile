import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Pressable,
  Text,
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
import {
  DEFAULT_WRITE_LAYOUT,
  buildLayoutPayload,
  parseLayoutJson,
  type LayoutAlign,
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

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [layout, setLayout] = useState<WriteLayoutModel>(DEFAULT_WRITE_LAYOUT);
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

  const categoryLabel = useMemo(() => {
    if (selectedType === "poem") return "시";
    if (selectedType === "essay") return "에세이";
    return "짧은 구절";
  }, [selectedType]);

  const closeDraftPrompt = useCallback(() => setDraftPrompt(null), []);

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
      mode: editPostId ? "edit" : "create",
      postId: editPostId,
    });
    if (!draftId) setDraftId(id);
  }, [title, body, draftId, editPostId, selectedType]);

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

  const toggleFooter = useCallback(() => {
    setLayout((current) => ({
      ...current,
      showFooter: !current.showFooter,
    }));
  }, []);

  const onPressSubmit = useCallback(async () => {
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
          layoutJson: buildLayoutPayload(layout),
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
          layoutJson: buildLayoutPayload(layout),
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
  }, [selectedType, draftId, editPostId, hashtagChips, layout, title, body]);

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
          setLayout(parseLayoutJson(editable.layoutJson));
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
          title={isEditMode ? "글 수정" : "글쓰기"}
          canSubmit={canSubmit}
          onPressClose={onPressClose}
          onPressSubmit={onPressSubmit}
          onPressDrafts={onPressDrafts}
          previewOpen={previewOpen}
          onPressPreview={() => setPreviewOpen((current) => !current)}
          styles={styles}
        />

        <View style={styles.container}>
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
              styles={styles}
              title={title}
              body={body}
              hashtags={hashtagChips}
              categoryLabel={categoryLabel}
              layout={layout}
            />
          ) : (
            <WriteEditor
              title={title}
              body={body}
              onChangeTitle={setTitle}
              onChangeBody={setBody}
              styles={styles}
            />
          )}

          <WriteMetaSection
            styles={styles}
            selectedType={selectedType}
            onSelectType={setSelectedType}
            hashtagsInput={hashtagsInput}
            hashtagChips={hashtagChips}
            onChangeHashtagsInput={setHashtagsInput}
          />

          <WriteLayoutSection
            styles={styles}
            layout={layout}
            onChangeTitleAlign={updateTitleAlign}
            onChangeBodyAlign={updateBodyAlign}
            onChangeTitleScale={updateTitleScale}
            onChangeBodyScale={updateBodyScale}
            onToggleFooter={toggleFooter}
          />

          <WriteStates styles={styles} confirm={activeConfirm} />
        </View>

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
