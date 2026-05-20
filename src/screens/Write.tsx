import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsFocused, useNavigation } from "@react-navigation/native";
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
import { WriteBackgroundSection } from "@/components/write/WriteBackgroundSection";
import { WriteEditor } from "@/components/write/WriteEditor";
import { WriteLayoutSection } from "@/components/write/WriteLayoutSection";
import { WriteMetaSection } from "@/components/write/WriteMetaSection";
import { WritePreviewCard } from "@/components/write/WritePreviewCard";
import { WriteStates } from "@/components/write/WriteStates";
import { WriteTopBar } from "@/components/write/WriteTopBar";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useToast } from "@/feedback/ToastProvider";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { PostBackgroundTemplateId } from "@/lib/postBackgroundTemplates";
import type { PostFontKey } from "@/lib/postContent";
import {
  DEFAULT_WRITE_LAYOUT,
  buildLayoutPayload,
  getFallbackLayoutForPostType,
  parseLayoutJson,
  updateLayoutBox,
  type LayoutAlign,
  type LayoutBoxId,
  type WriteLayoutModel,
} from "@/lib/postLayout";
import { analyzeWriteEditorContent } from "@/lib/writeEditorInsights";
import {
  WRITE_PAGE_MAX_CHARS,
  WRITE_PAGE_MAX_COUNT,
  WRITE_TOTAL_MAX_CHARS,
  createWritePageDraft,
  flattenWritePages,
  getSubmissionContentPages,
  normalizeWritePageDrafts,
  type WritePageDraft,
} from "@/lib/writePages";
import {
  deleteWriteDraft,
  listWriteDrafts,
  loadWriteDraftById,
  upsertWriteDraft,
  clearAllWriteDrafts,
} from "@/services/draftStorage";
import type { WriteDraftQuestContext } from "@/services/draftStorage";
import { createPost, getEditablePost, updatePost } from "@/services/postService";
import type { PostCommentPolicy, PostType, PostVisibility } from "@/types/post";
import { ConfirmState, useConfirmBeforeLeave } from "@/hooks/useConfirmBeforeLeave";

import { createWriteStyles } from "./Write.styles";

const DEFAULT_WRITE_LAYOUT_SIGNATURE = JSON.stringify(buildLayoutPayload(DEFAULT_WRITE_LAYOUT));
type PreviewPanelKey = "settings" | "background" | "layout";
const PREVIEW_PANEL_ITEMS: { key: PreviewPanelKey; label: string }[] = [
  { key: "settings", label: "메타" },
  { key: "background", label: "배경" },
  { key: "layout", label: "배치" },
];

function getParamString(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getParamNumber(value: unknown): number | null {
  const raw = getParamString(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizePromptCategory(value: unknown): PostType | undefined {
  const raw = getParamString(value);
  return raw === "poem" || raw === "essay" || raw === "short" ? raw : undefined;
}

function parsePromptTags(value: unknown): string[] {
  const raw = getParamString(value);
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((item) => item.trim().replace(/^#+/, ""))
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 12);
}

export default function Write() {
  const styles = useMemo(() => createWriteStyles(), []);
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  const [title, setTitle] = useState("");
  const [pageDrafts, setPageDrafts] = useState<WritePageDraft[]>(() =>
    normalizeWritePageDrafts(null)
  );
  const [draftId, setDraftId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [fontKey, setFontKey] = useState<PostFontKey>("serif");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [commentPolicy, setCommentPolicy] = useState<PostCommentPolicy>("logged_in");
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [questContext, setQuestContext] = useState<WriteDraftQuestContext | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewPanel, setPreviewPanel] = useState<PreviewPanelKey>("settings");
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
  const [lastQuestCompletion, setLastQuestCompletion] = useState<{
    status?: string;
    progress?: number;
    target?: number;
  } | null>(null);

  const lastInitializedEntryKeyRef = useRef<string | null>(null);
  const isEditMode = Boolean(editPostId);
  const body = useMemo(() => flattenWritePages(pageDrafts), [pageDrafts]);
  const submissionContentPages = useMemo(
    () => getSubmissionContentPages(pageDrafts),
    [pageDrafts]
  );
  const hasOverLimitPage = useMemo(
    () =>
      submissionContentPages.some(
        (page) => Array.from(page.replace(/\s/g, "")).length > WRITE_PAGE_MAX_CHARS
      ) ||
      Array.from(submissionContentPages.join("").replace(/\s/g, "")).length >
        WRITE_TOTAL_MAX_CHARS,
    [submissionContentPages]
  );

  const hashtagChips = useMemo(() => {
    return hashtagsInput
      .split(/[\s,]+/)
      .map((item) => item.trim().replace(/^#+/, "").toLowerCase())
      .filter(Boolean)
      .filter((item, index, arr) => arr.indexOf(item) === index)
      .slice(0, 12);
  }, [hashtagsInput]);
  const editorInsight = useMemo(
    () => analyzeWriteEditorContent({ title, body }),
    [title, body]
  );
  const layoutSignature = useMemo(() => JSON.stringify(buildLayoutPayload(layout)), [layout]);
  const hasLayoutChanges = layoutSignature !== DEFAULT_WRITE_LAYOUT_SIGNATURE;
  const promptQuestFromParams = useMemo<WriteDraftQuestContext | null>(() => {
    const rawParams = (params ?? {}) as Record<string, unknown>;
    const stateId = getParamNumber(rawParams.questStateId);
    const promptKey = getParamString(rawParams.promptKey);
    if (!stateId || !promptKey) return null;

    return {
      stateId,
      promptKey,
      promptTitle: getParamString(rawParams.promptTitle) ?? undefined,
      promptBody: getParamString(rawParams.promptBody) ?? undefined,
      defaultCategory: normalizePromptCategory(rawParams.promptCategory),
      suggestedHashtags: parsePromptTags(rawParams.promptTags),
    };
  }, [params]);
  const routePostId = useMemo(
    () => getParamString(((params ?? {}) as Record<string, unknown>).postId),
    [params]
  );
  const routeDraftId = useMemo(
    () => getParamString(((params ?? {}) as Record<string, unknown>).draftId),
    [params]
  );
  const routeNewDraft = useMemo(
    () => getParamString(((params ?? {}) as Record<string, unknown>).newDraft),
    [params]
  );
  const writeEntryKey = useMemo(() => {
    if (routePostId) return `post:${routePostId}`;
    if (routeDraftId) return `draft:${routeDraftId}`;
    if (routeNewDraft) return `new:${routeNewDraft}`;
    if (promptQuestFromParams) {
      return `quest:${promptQuestFromParams.stateId}:${promptQuestFromParams.promptKey}`;
    }
    return "create";
  }, [promptQuestFromParams, routeDraftId, routeNewDraft, routePostId]);

  const hasChanges =
    title.trim().length > 0 ||
    body.trim().length > 0 ||
    hashtagsInput.trim().length > 0 ||
    selectedType !== null ||
    questContext !== null ||
    fontKey !== "serif" ||
    visibility !== "public" ||
    commentPolicy !== "logged_in" ||
    hasLayoutChanges;
  const canSubmit =
    title.trim().length > 0 && submissionContentPages.length > 0 && !hasOverLimitPage;
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

  const resetWriteState = useCallback(() => {
    setDraftId(null);
    setTitle("");
    setPageDrafts(normalizeWritePageDrafts(null));
    setSelectedType(null);
    setHashtagsInput("");
    setFontKey("serif");
    setVisibility("public");
    setCommentPolicy("logged_in");
    setEditPostId(null);
    setQuestContext(null);
    setPreviewOpen(false);
    setPreviewPanel("settings");
    setLayout(DEFAULT_WRITE_LAYOUT);
    setActiveBoxId("text_box");
    setEditLoading(false);
    setEditError(null);
    setDraftPrompt(null);
    setIsSubmitting(false);
    setSubmitSuccess(false);
    setCreatedPostId(null);
    setSubmitError(null);
    setLastQuestCompletion(null);
  }, []);

  const saveDraftExplicit = useCallback(async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    const draftCategory =
      selectedType ?? (trimmedTitle || trimmedBody ? editorInsight.detectedType : undefined);
    const hasDraftableChanges =
      Boolean(trimmedTitle || trimmedBody || selectedType || hashtagChips.length > 0) ||
      Boolean(questContext) ||
      fontKey !== "serif" ||
      visibility !== "public" ||
      commentPolicy !== "logged_in" ||
      hasLayoutChanges;
    if (!hasDraftableChanges) {
      showToast("임시저장할 내용이 없어요.");
      return false;
    }

    logger.debug("[write] draft explicit save", {
      draftId,
      titleLen: trimmedTitle.length,
      bodyLen: trimmedBody.length,
      category: draftCategory,
      hashtagCount: hashtagChips.length,
    });

    try {
      const id = await upsertWriteDraft({
        id: draftId,
        title: trimmedTitle,
        body: trimmedBody,
        pages: pageDrafts,
        category: draftCategory,
        hashtags: hashtagChips,
        fontKey,
        layoutJson: buildLayoutPayload(layout),
        visibility,
        commentPolicy,
        questContext,
        mode: editPostId ? "edit" : "create",
        postId: editPostId,
      });
      if (!draftId) setDraftId(id);
      showToast("임시저장했어요.", { tone: "success" });
      return true;
    } catch (error) {
      logger.warn("[write] draft explicit save failed", error);
      showToast("임시저장에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      return false;
    }
  }, [title, body, pageDrafts, draftId, editPostId, selectedType, editorInsight.detectedType, hashtagChips, fontKey, layout, visibility, commentPolicy, questContext, hasLayoutChanges, showToast]);

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
              resetWriteState();
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
              const saved = await saveDraftExplicit();
              if (saved) {
                resetWriteState();
                proceed(action);
              }
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
    lastInitializedEntryKeyRef.current = null;
    resetWriteState();
  }, [resetWriteState]);

  const selectPostType = useCallback((type: PostType) => {
    setSelectedType(type);
    if (!hasLayoutChanges) {
      setLayout(getFallbackLayoutForPostType(type));
    }
  }, [hasLayoutChanges]);

  const updatePageBody = useCallback((pageId: string, value: string) => {
    setPageDrafts((current) =>
      current.map((page) => (page.id === pageId ? { ...page, body: value } : page))
    );
  }, []);

  const addPageDraft = useCallback(() => {
    setPageDrafts((current) => {
      if (current.length >= WRITE_PAGE_MAX_COUNT) return current;
      return [...current, createWritePageDraft("", current.length)];
    });
  }, []);

  const removePageDraft = useCallback((pageId: string) => {
    setPageDrafts((current) => {
      const next = current.filter((page) => page.id !== pageId);
      return next.length > 0 ? next : normalizeWritePageDrafts(null);
    });
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

  const updateBackgroundTemplate = useCallback((presetId: PostBackgroundTemplateId) => {
    setLayout((current) => ({
      ...current,
      presetId,
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

  const onPressSubmit = useCallback(async () => {
    const resolvedType = selectedType ?? editorInsight.detectedType;

    if (!previewOpen) {
      dismissKeyboard();
      if (!selectedType) {
        setSelectedType(resolvedType);
      }
      if (!hasLayoutChanges) {
        setLayout(getFallbackLayoutForPostType(resolvedType));
      }
      setPreviewPanel("settings");
      setPreviewOpen(true);
      return;
    }

    if (!resolvedType) return;
    if (hasOverLimitPage) {
      showToast("페이지당 글자 수를 줄인 뒤 다시 시도해주세요.", { tone: "error" });
      return;
    }

    logger.debug("[write] submit start", { draftId, titleLen: title.length, bodyLen: body.length });

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    logger.debug("[write] submit payload", {
      type: resolvedType,
      category: resolvedType,
      titleLen: trimmedTitle.length,
      contentLen: trimmedBody.length,
    });

    setSubmitError(null);
    setCreatedPostId(null);
    setLastQuestCompletion(null);
    setIsSubmitting(true);
    try {
      if (editPostId) {
        await updatePost({
          postId: editPostId,
          type: resolvedType,
          title: trimmedTitle || undefined,
          content: trimmedBody,
          contentPages: submissionContentPages,
          hashtags: hashtagChips,
          layoutJson: buildLayoutPayload(submissionLayout),
          fontKey,
          visibility,
          commentPolicy,
        });
        setCreatedPostId(editPostId);
        logger.debug("[write] update success", { postId: editPostId });
      } else {
        const created = await createPost({
          type: resolvedType,
          category: resolvedType,
          title: trimmedTitle || undefined,
          content: trimmedBody,
          contentPages: submissionContentPages,
          contentFormat: "plain",
          hashtags: hashtagChips,
          layoutJson: buildLayoutPayload(submissionLayout),
          fontKey,
          visibility,
          commentPolicy,
          questContext: questContext
            ? { stateId: questContext.stateId, promptKey: questContext.promptKey }
            : undefined,
        });

        if (draftId) {
          await deleteWriteDraft(draftId);
          setDraftId(null);
        }
        setCreatedPostId(created.postId);
        setLastQuestCompletion(created.questCompletion ?? null);
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
    editorInsight.detectedType,
    draftId,
    editPostId,
    hashtagChips,
    submissionLayout,
    title,
    body,
    submissionContentPages,
    hasOverLimitPage,
    fontKey,
    visibility,
    commentPolicy,
    questContext,
    previewOpen,
    hasLayoutChanges,
    dismissKeyboard,
    showToast,
  ]);

  const onSuccessGoHome = useCallback(() => {
    setSubmitSuccess(false);
    allowNextLeave();
    resetWriteState();
    router.replace("/(tabs)");
  }, [allowNextLeave, resetWriteState]);

  const onSuccessViewPost = useCallback(() => {
    const postId = createdPostId;
    if (!postId) return;
    setSubmitSuccess(false);
    allowNextLeave();
    resetWriteState();
    router.replace(`/posts/${postId}`);
  }, [createdPostId, allowNextLeave, resetWriteState]);

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
    if (!isFocused) {
      lastInitializedEntryKeyRef.current = null;
      return;
    }
    if (lastInitializedEntryKeyRef.current === writeEntryKey) return;
    lastInitializedEntryKeyRef.current = writeEntryKey;
    let cancelled = false;

    void (async () => {
      resetWriteState();

      if (routePostId) {
        setEditLoading(true);
        setEditError(null);
        try {
          const editable = await getEditablePost(routePostId);
          if (cancelled) return;
          logger.debug("[write] edit post restored", { postId: editable.id });
          setEditPostId(editable.id);
          setTitle(editable.title);
          setPageDrafts(normalizeWritePageDrafts(editable.contentPages, editable.content));
          setSelectedType(editable.category ?? null);
          setHashtagsInput(editable.hashtags.join(", "));
          setFontKey(editable.fontKey ?? "serif");
          setVisibility(editable.visibility ?? "public");
          setCommentPolicy(editable.commentPolicy ?? "logged_in");
          setQuestContext(null);
          setLayout(parseLayoutJson(editable.layoutJson));
          setActiveBoxId("text_box");
        } catch (err) {
          if (cancelled) return;
          logger.warn("[write] edit post load error", err);
          setEditError(normalizeApiError(err));
        } finally {
          if (!cancelled) setEditLoading(false);
        }
        return;
      }

      if (routeDraftId) {
        const d = await loadWriteDraftById(routeDraftId);
        if (cancelled) return;
        if (d) {
          logger.debug("[write] draft restored by param", { draftId: d.id });
          setDraftId(d.id);
          setTitle(d.title);
          setPageDrafts(normalizeWritePageDrafts(d.pages, d.body));
          setSelectedType(d.category ?? null);
          const draftHashtags = Array.isArray(d.hashtags) ? d.hashtags : [];
          setHashtagsInput(draftHashtags.length > 0 ? draftHashtags.join(", ") : "");
          setFontKey(d.fontKey ?? "serif");
          setVisibility(d.visibility ?? "public");
          setCommentPolicy(d.commentPolicy ?? "logged_in");
          setQuestContext(d.questContext ?? null);
          if (draftHashtags.length === 0 && d.questContext?.suggestedHashtags?.length) {
            setHashtagsInput(d.questContext.suggestedHashtags.join(", "));
          }
          setLayout(parseLayoutJson(d.layoutJson));
          setActiveBoxId("text_box");
        }
        return;
      }

      if (promptQuestFromParams) {
        if (cancelled) return;
        logger.debug("[write] prompt quest restored", {
          stateId: promptQuestFromParams.stateId,
          promptKey: promptQuestFromParams.promptKey,
        });
        setQuestContext(promptQuestFromParams);
        setSelectedType(promptQuestFromParams.defaultCategory ?? "essay");
        if (promptQuestFromParams.suggestedHashtags?.length) {
          setHashtagsInput(promptQuestFromParams.suggestedHashtags.join(", "));
        }
        return;
      }

      if (routeNewDraft) return;

      const drafts = await listWriteDrafts();
      if (cancelled) return;
      if (drafts.length === 0) return;

      // ✅ 임시저장 존재 시 먼저 선택 Alert
      openDraftPrompt({
        title: "임시저장한 글이 있어요. 어떻게 할까요?",
        buttons: [
          {
            text: "새로 쓰기",
            variant: "cancel",
            onPress: () => {
              resetWriteState();
              closeDraftPrompt();
            },
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
    return () => {
      cancelled = true;
    };
  }, [
    closeDraftPrompt,
    openDraftPrompt,
    isFocused,
    promptQuestFromParams,
    resetWriteState,
    routeDraftId,
    routeNewDraft,
    routePostId,
    writeEntryKey,
  ]);

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
          onPressSaveDraft={saveDraftExplicit}
          submitLabel={primaryActionLabel}
          submitAccessibilityLabel={primaryActionAccessibilityLabel}
          onPressDrafts={onPressDrafts}
          previewOpen={previewOpen}
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
            {questContext ? (
              <View style={styles.questPromptCard} testID="write-quest-prompt-card">
                <Text style={styles.questPromptEyebrow}>퀘스트 주제</Text>
                <Text style={styles.questPromptTitle}>
                  {questContext.promptTitle ?? "주제 글쓰기"}
                </Text>
                {questContext.promptBody ? (
                  <Text style={styles.questPromptBody}>{questContext.promptBody}</Text>
                ) : null}
              </View>
            ) : null}
            {previewOpen ? (
              <>
                <WritePreviewCard
                  title={title}
                  body={body}
                  contentPages={submissionContentPages}
                  selectedType={selectedType ?? editorInsight.detectedType}
                  layout={submissionLayout}
                  fontKey={fontKey}
                  insight={editorInsight}
                  compact={previewPanel === "layout"}
                />
                <View style={styles.previewControlStack}>
                  <View style={styles.previewSheetHandle} />
                  <View style={styles.previewPanelTabs}>
                    {PREVIEW_PANEL_ITEMS.map((item) => {
                      const active = previewPanel === item.key;
                      return (
                        <Pressable
                          key={item.key}
                          onPress={() => setPreviewPanel(item.key)}
                          style={[
                            styles.previewPanelTab,
                            active && styles.previewPanelTabActive,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${item.label} 조정`}
                          accessibilityState={{ selected: active }}
                          testID={`write-preview-panel-${item.key}`}
                        >
                          <Text
                            style={[
                              styles.previewPanelTabText,
                              active && styles.previewPanelTabTextActive,
                            ]}
                          >
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {previewPanel === "settings" ? (
                    <WriteMetaSection
                      styles={styles}
                      selectedType={selectedType ?? editorInsight.detectedType}
                      onSelectType={selectPostType}
                      hashtagsInput={hashtagsInput}
                      hashtagChips={hashtagChips}
                      onChangeHashtagsInput={setHashtagsInput}
                      fontKey={fontKey}
                      onChangeFontKey={setFontKey}
                      visibility={visibility}
                      onChangeVisibility={setVisibility}
                      commentPolicy={commentPolicy}
                      onChangeCommentPolicy={setCommentPolicy}
                    />
                  ) : null}
                  {previewPanel === "background" ? (
                    <WriteBackgroundSection
                      styles={styles}
                      selectedId={layout.presetId}
                      onSelect={updateBackgroundTemplate}
                    />
                  ) : null}
                  {previewPanel === "layout" ? (
                    <ScrollView
                      style={styles.previewPanelInnerScroll}
                      contentContainerStyle={styles.previewPanelInnerContent}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={false}
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
                    </ScrollView>
                  ) : null}
                </View>
              </>
            ) : (
              <WriteEditor
                title={title}
                pageDrafts={pageDrafts}
                selectedType={selectedType}
                insight={editorInsight}
                onChangeTitle={setTitle}
                onChangePageBody={updatePageBody}
                onAddPage={addPageDraft}
                onRemovePage={removePageDraft}
                onSelectType={selectPostType}
                styles={styles}
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
                {lastQuestCompletion
                  ? "퀘스트 진행도도 반영됐어요."
                  : isEditMode
                    ? "수정한 글을 확인할까요?"
                    : "어디로 이동할까요?"}
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

        {__DEV__ && !previewOpen && (
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
