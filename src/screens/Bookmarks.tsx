import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  InteractionManager,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, usePathname } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { PremiumFeaturePrompt } from "@/components/premium/PremiumFeaturePrompt";
import { buildAuthRoute } from "@/lib/authRedirect";
import { useToast } from "@/feedback/ToastProvider";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
import { hasActiveEntitlement, listMyEntitlements } from "@/services/entitlementService";
import { ApiError, normalizeApiError, type AppErrorModel } from "@/lib/errors";
import {
  BookmarkList,
  createBookmarkList,
  deleteBookmarkList,
  listBookmarkItems,
  listBookmarkLists,
  renameBookmarkList,
  removePostFromBookmarkList,
} from "@/services/bookmarkService";
import { togglePostLike } from "@/services/likeService";
import { saveSentenceFrameWidgetSnapshot } from "@/services/widgetSnapshotService";
import { useGuidedHelpTarget } from "@/onboarding/GuidedHelpProvider";
import { softPanelShadowStyle } from "@/theme/shadows";
import { tokens } from "@/theme/tokens";
import type { Post } from "@/types/post";

type ScreenMode = "lists" | "items";

type FolderItemsState = {
  loading: boolean;
  items: Post[];
  hasMore: boolean;
  offset: number;
  error: AppErrorModel | null;
};

const PAGE_SIZE = 15;

function initialFolderItemsState(): FolderItemsState {
  return { loading: false, items: [], hasMore: true, offset: 0, error: null };
}

export default function BookmarksScreen() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<ScreenMode>("lists");

  const [lists, setLists] = useState<BookmarkList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [listsError, setListsError] = useState<AppErrorModel | null>(null);

  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [folderItems, setFolderItems] = useState<FolderItemsState>(initialFolderItemsState());

  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});
  const [sentenceFramePending, setSentenceFramePending] = useState<Record<string, boolean>>({});
  const [premiumPromptVisible, setPremiumPromptVisible] = useState(false);
  const createTarget = useGuidedHelpTarget("bookmarks", "create");
  const folderTarget = useGuidedHelpTarget("bookmarks", "folder");
  const renameTarget = useGuidedHelpTarget("bookmarks", "rename");
  const deleteTarget = useGuidedHelpTarget("bookmarks", "delete");

  const selectedList = useMemo(
    () => lists.find((l) => l.id === selectedListId) ?? null,
    [lists, selectedListId]
  );

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    setListsError(null);
    try {
      const rows = await listBookmarkLists();
      setLists(rows);
      if (selectedListId && !rows.find((l) => l.id === selectedListId)) {
        setSelectedListId(null);
        setMode("lists");
      }
    } catch (e) {
      const normalized = normalizeApiError(e);
      setListsError(normalized);
      showToast(normalized.description || normalized.title || "폴더 목록을 불러오지 못했어요.", {
        tone: "error",
      });
    } finally {
      setLoadingLists(false);
    }
  }, [selectedListId, showToast]);

  const loadItems = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      if (!selectedListId) return;

      const reset = Boolean(opts.reset);
      let blocked = false;
      let nextOffset = 0;

      setFolderItems((prev) => {
        if (prev.loading) {
          blocked = true;
          return prev;
        }
        nextOffset = reset ? 0 : prev.offset;
        return { ...prev, loading: true, error: null };
      });
      if (blocked) return;

      try {
        const res = await listBookmarkItems({
          listId: selectedListId,
          limit: PAGE_SIZE,
          offset: nextOffset,
        });

        setFolderItems((prev) => ({
          loading: false,
          error: null,
          items: reset ? res.items : [...prev.items, ...res.items],
          hasMore: res.hasMore,
          offset: nextOffset + res.items.length,
        }));
      } catch (e) {
        const normalized = normalizeApiError(e);
        setFolderItems((prev) => ({ ...prev, loading: false, error: normalized }));
        showToast(
          normalized.description || normalized.title || "저장한 글을 불러오지 못했어요.",
          { tone: "error" }
        );
      }
    },
    [selectedListId, showToast]
  );

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        void loadLists();
        if (mode === "items" && selectedListId) {
          setFolderItems(initialFolderItemsState());
          void loadItems({ reset: true });
        }
      });

      return () => {
        task.cancel();
      };
    }, [mode, selectedListId, loadLists, loadItems])
  );

  useEffect(() => {
    if (!selectedListId || mode !== "items") return;
    setFolderItems(initialFolderItemsState());
  }, [selectedListId, mode]);

  useEffect(() => {
    if (!selectedListId || mode !== "items") return;
    void loadItems({ reset: true });
  }, [selectedListId, mode, loadItems]);

  const handleAuthError = useCallback(async () => {
    await signOut();
    router.replace(buildAuthRoute("/(auth)/login", pathname));
  }, [pathname, signOut]);

  const onPressCreateFolder = useCallback(async () => {
    const trimmedName = newFolderName.trim();
    if (!trimmedName) return;

    setCreatingFolder(true);
    setListsError(null);
    try {
      const created = await createBookmarkList({
        name: trimmedName,
        description: newFolderDesc.trim() || undefined,
      });
      setLists((prev) => [created, ...prev]);
      setSelectedListId(created.id);
      setMode("items");
      setNewFolderName("");
      setNewFolderDesc("");
      setShowCreate(false);
      showToast(`'${created.name}' 폴더를 만들었어요.`, { tone: "success" });
    } catch (e) {
      const normalized = normalizeApiError(e);
      setListsError(normalized);
      showToast(normalized.description || normalized.title || "폴더 생성에 실패했어요.", {
        tone: "error",
      });
    } finally {
      setCreatingFolder(false);
    }
  }, [newFolderName, newFolderDesc, showToast]);

  const onPressDeleteFolder = useCallback(
    async (listId: string) => {
      setDeletingListId(listId);
      try {
        const deletingName = lists.find((l) => l.id === listId)?.name || "폴더";
        await deleteBookmarkList(listId);
        setLists((prev) => prev.filter((l) => l.id !== listId));
        if (selectedListId === listId) {
          setSelectedListId(null);
          setMode("lists");
        }
        showToast(`'${deletingName}' 폴더를 삭제했어요.`, { tone: "success" });
      } catch (e) {
        const normalized = normalizeApiError(e);
        setListsError(normalized);
        showToast(normalized.description || normalized.title || "폴더 삭제에 실패했어요.", {
          tone: "error",
        });
      } finally {
        setDeletingListId(null);
      }
    },
    [selectedListId, lists, showToast]
  );

  const onStartEditFolder = useCallback((list: BookmarkList) => {
    setEditingListId(list.id);
    setEditFolderName(list.name);
    setEditFolderDesc(list.description ?? "");
  }, []);

  const onCancelEditFolder = useCallback(() => {
    setEditingListId(null);
    setEditFolderName("");
    setEditFolderDesc("");
  }, []);

  const onPressRenameFolder = useCallback(async () => {
    if (!editingListId) return;
    const trimmedName = editFolderName.trim();
    if (!trimmedName) return;

    setRenamingListId(editingListId);
    try {
      const updated = await renameBookmarkList({
        listId: editingListId,
        name: trimmedName,
        description: editFolderDesc.trim() || undefined,
      });

      setLists((prev) => prev.map((list) => (list.id === updated.id ? updated : list)));
      if (selectedListId === updated.id) {
        setSelectedListId(updated.id);
      }
      showToast(`'${updated.name}' 폴더를 수정했어요.`, { tone: "success" });
      onCancelEditFolder();
    } catch (e) {
      const normalized = normalizeApiError(e);
      setListsError(normalized);
      showToast(normalized.description || normalized.title || "폴더 수정에 실패했어요.", {
        tone: "error",
      });
    } finally {
      setRenamingListId(null);
    }
  }, [editFolderDesc, editFolderName, editingListId, onCancelEditFolder, selectedListId, showToast]);

  const onPressRemoveFromList = useCallback(
    async (postId: string) => {
      if (!selectedListId) return;
      try {
        await removePostFromBookmarkList({ listId: selectedListId, postId });
        setFolderItems((prev) => ({
          ...prev,
          items: prev.items.filter((it) => it.id !== postId),
        }));
        setLists((prev) =>
          prev.map((l) =>
            l.id === selectedListId ? { ...l, itemCount: Math.max(0, (l.itemCount ?? 1) - 1) } : l
          )
        );
        showToast("책갈피에서 삭제했어요.", { tone: "success" });
      } catch (e) {
        const normalized = normalizeApiError(e);
        setFolderItems((prev) => ({ ...prev, error: normalized }));
        showToast(normalized.description || normalized.title || "책갈피 삭제에 실패했어요.", {
          tone: "error",
        });
      }
    },
    [selectedListId, showToast]
  );

  const onPressLike = useCallback(
    async (postId: string) => {
      if (likePending[postId]) return;
      const target = folderItems.items.find((it) => it.id === postId);
      if (!target) return;

      const stored = getLike(postId);
      const prevLiked = stored?.liked ?? Boolean(target.viewer?.isLiked);
      const prevCount = stored?.likeCount ?? (target.stats?.likeCount ?? 0);
      const nextLiked = !prevLiked;
      const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

      setLike(postId, nextLiked, nextCount);
      setFolderItems((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          it.id === postId
            ? {
                ...it,
                viewer: { ...it.viewer, isLiked: nextLiked },
                stats: { ...it.stats, likeCount: nextCount },
              }
            : it
        ),
      }));
      setLikePending((prev) => ({ ...prev, [postId]: true }));

      try {
        const res = await togglePostLike(postId);
        setLike(postId, res.liked, res.likeCount);
        setFolderItems((prev) => ({
          ...prev,
          items: prev.items.map((it) =>
            it.id === postId
              ? {
                  ...it,
                  viewer: { ...it.viewer, isLiked: res.liked },
                  stats: { ...it.stats, likeCount: res.likeCount },
                }
              : it
          ),
        }));
      } catch (err) {
        setLike(postId, prevLiked, prevCount);
        setFolderItems((prev) => ({
          ...prev,
          items: prev.items.map((it) =>
            it.id === postId
              ? {
                  ...it,
                  viewer: { ...it.viewer, isLiked: prevLiked },
                  stats: { ...it.stats, likeCount: prevCount },
                }
              : it
          ),
        }));
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await handleAuthError();
        } else {
          const normalized = normalizeApiError(err);
          setFolderItems((prev) => ({ ...prev, error: normalized }));
          showToast(normalized.description || normalized.title || "공감 처리에 실패했어요.", {
            tone: "error",
          });
        }
      } finally {
        setLikePending((prev) => ({ ...prev, [postId]: false }));
      }
    },
    [folderItems.items, likePending, handleAuthError, showToast]
  );

  const onPressSentenceFrame = useCallback(
    async (post: Post) => {
      if (sentenceFramePending[post.id]) return;

      setSentenceFramePending((prev) => ({ ...prev, [post.id]: true }));
      try {
        const entitlements = await listMyEntitlements();
        if (!hasActiveEntitlement(entitlements)) {
          setPremiumPromptVisible(true);
          return;
        }

        const result = await saveSentenceFrameWidgetSnapshot(post);
        if (result.ok) {
          showToast("문장 액자 위젯에 담았어요.", { tone: "success" });
        } else if (result.reason === "unavailable") {
          showToast("정식 앱 빌드에서 문장 액자 위젯을 사용할 수 있어요.", {
            tone: "error",
          });
        } else {
          showToast("문장 액자 저장에 실패했어요. 잠시 후 다시 시도해주세요.", {
            tone: "error",
          });
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          await handleAuthError();
          return;
        }
        const normalized = normalizeApiError(err);
        showToast(normalized.description || normalized.title || "문장 액자 저장에 실패했어요.", {
          tone: "error",
        });
      } finally {
        setSentenceFramePending((prev) => ({ ...prev, [post.id]: false }));
      }
    },
    [handleAuthError, sentenceFramePending, showToast]
  );

  const renderListsScreen = () => {
    if (loadingLists) {
      return (
        <View style={styles.center}>
          <AppLoading message="책갈피 폴더를 불러오는 중..." />
        </View>
      );
    }
    if (listsError && lists.length === 0) {
      return (
        <View style={styles.center}>
          <AppError error={listsError} onRetry={listsError.canRetry ? loadLists : undefined} />
        </View>
      );
    }
    if (lists.length === 0) {
      return (
        <View style={styles.center}>
          <AppEmpty
            title="책갈피 폴더가 없어요"
            description="새 폴더를 만들어 글을 모아보세요."
            primaryAction={{ label: "폴더 만들기", onPress: () => setShowCreate(true) }}
          />
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.listScroll} keyboardShouldPersistTaps="handled">
        {lists.map((list, index) => (
          <View key={list.id} style={styles.folderCard}>
            {editingListId === list.id ? (
              <View style={styles.editBox}>
                <TextInput
                  value={editFolderName}
                  onChangeText={setEditFolderName}
                  placeholder="폴더 이름"
                  placeholderTextColor={tokens.colors.inputPlaceholder}
                  style={styles.input}
                  accessibilityLabel="수정할 폴더 이름"
                  maxLength={80}
                />
                <TextInput
                  value={editFolderDesc}
                  onChangeText={setEditFolderDesc}
                  placeholder="설명 (선택)"
                  placeholderTextColor={tokens.colors.inputPlaceholder}
                  style={styles.input}
                  accessibilityLabel="수정할 폴더 설명"
                  maxLength={120}
                />
                <View style={styles.editActions}>
                  <Pressable
                    onPress={onCancelEditFolder}
                    style={({ pressed }) => [styles.editSecondaryBtn, pressed && styles.controlPressed]}
                  >
                    <Text style={styles.editSecondaryBtnText}>취소</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void onPressRenameFolder()}
                    disabled={renamingListId === list.id || !editFolderName.trim()}
                    style={({ pressed }) => [
                      styles.editPrimaryBtn,
                      (renamingListId === list.id || !editFolderName.trim()) &&
                        styles.createBtnDisabled,
                      pressed &&
                        renamingListId !== list.id &&
                        Boolean(editFolderName.trim()) &&
                        styles.controlPressed,
                    ]}
                  >
                    <Text style={styles.editPrimaryBtnText}>
                      {renamingListId === list.id ? "저장 중..." : "저장"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <>
                <Pressable
                  {...(index === 0 ? folderTarget : {})}
                  onPress={() => {
                    setSelectedListId(list.id);
                    setMode("items");
                  }}
                  style={({ pressed }) => [styles.folderMainBtn, pressed && styles.folderMainBtnPressed]}
                  testID={`bookmark-folder-${list.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${list.name} 책갈피 폴더 열기`}
                >
                  <View style={styles.folderCardTop}>
                    <View style={styles.folderIcon}>
                      <Ionicons name="folder-open-outline" size={20} color={tokens.colors.green700} />
                    </View>
                    <View style={styles.folderTextBlock}>
                      <Text style={styles.folderTitle} numberOfLines={1}>
                        {list.name}
                      </Text>
                      {!!list.description && (
                        <Text style={styles.folderDescription} numberOfLines={2}>
                          {list.description}
                        </Text>
                      )}
                    </View>
                    <View style={styles.folderCountPill}>
                      <Text style={styles.folderCount}>{list.itemCount ?? 0}개</Text>
                    </View>
                  </View>
                  <View style={styles.folderOpenRow}>
                    <Text style={styles.folderOpenHint}>글 보기</Text>
                    <Ionicons name="chevron-forward" size={16} color={tokens.colors.green700} />
                  </View>
                </Pressable>

                <View style={styles.folderActions}>
                  <Pressable
                    {...(index === 0 ? renameTarget : {})}
                    onPress={() => onStartEditFolder(list)}
                    hitSlop={10}
                    style={({ pressed }) => [styles.folderEditBtn, pressed && styles.controlPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`${list.name} 폴더 수정`}
                  >
                    <Ionicons name="create-outline" size={15} color={tokens.colors.text} />
                    <Text style={styles.folderEditText}>수정</Text>
                  </Pressable>
                  <Pressable
                    {...(index === 0 ? deleteTarget : {})}
                    onPress={() => void onPressDeleteFolder(list.id)}
                    hitSlop={10}
                    disabled={deletingListId === list.id}
                    style={({ pressed }) => [
                      styles.folderDeleteBtn,
                      deletingListId === list.id && styles.createBtnDisabled,
                      pressed && deletingListId !== list.id && styles.controlPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${list.name} 폴더 삭제`}
                  >
                    <Ionicons name="trash-outline" size={15} color={tokens.colors.danger} />
                    <Text style={styles.folderDeleteText}>
                      {deletingListId === list.id ? "삭제 중..." : "삭제"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderItemsScreen = () => {
    if (!selectedList) {
      return (
        <View style={styles.center}>
          <AppEmpty title="폴더를 찾을 수 없어요" description="다시 폴더 목록으로 돌아가세요." />
        </View>
      );
    }
    if (folderItems.loading && folderItems.items.length === 0) {
      return (
        <View style={styles.center}>
          <AppLoading message="저장한 글을 불러오는 중..." />
        </View>
      );
    }
    if (folderItems.error && folderItems.items.length === 0) {
      return (
        <View style={styles.center}>
          <AppError
            error={folderItems.error}
            onRetry={folderItems.error.canRetry ? () => void loadItems({ reset: true }) : undefined}
          />
        </View>
      );
    }
    if (folderItems.items.length === 0) {
      return (
        <View style={styles.center}>
          <AppEmpty title="저장한 글이 없어요" description="다른 글을 이 폴더에 저장해보세요." />
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.itemsScroll} keyboardShouldPersistTaps="handled">
        {folderItems.items.map((item) => (
          <View key={item.id} style={styles.itemWrap}>
            <BookmarkFeedItem
              item={item}
              likeDisabled={Boolean(likePending[item.id])}
              sentenceFramePending={Boolean(sentenceFramePending[item.id])}
              onLikePress={onPressLike}
              onBookmarkPress={onPressRemoveFromList}
              onSentenceFramePress={onPressSentenceFrame}
            />
          </View>
        ))}
        {folderItems.hasMore ? (
          <Pressable
            onPress={() => void loadItems({ reset: false })}
            style={({ pressed }) => [styles.moreBtn, pressed && !folderItems.loading && styles.controlPressed]}
            disabled={folderItems.loading}
          >
            <Text style={styles.moreBtnText}>
              {folderItems.loading ? "불러오는 중..." : "더 불러오기"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {mode === "lists" ? (
        <>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.title}>책갈피 폴더</Text>
              <Text style={styles.headerMeta}>
                {loadingLists ? "불러오는 중" : `${lists.length}개 폴더`}
              </Text>
            </View>
            <Pressable
              {...createTarget}
              onPress={() => setShowCreate((prev) => !prev)}
              style={({ pressed }) => [styles.headerBtn, pressed && styles.controlPressed]}
              accessibilityRole="button"
              accessibilityLabel={showCreate ? "새 폴더 입력 닫기" : "새 폴더 만들기"}
            >
              <Ionicons
                name={showCreate ? "close" : "add"}
                size={17}
                color={tokens.colors.green700}
              />
              <Text style={styles.headerBtnText}>{showCreate ? "닫기" : "새 폴더"}</Text>
            </Pressable>
          </View>

          {showCreate ? (
            <View style={styles.createBox}>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="폴더 이름"
                placeholderTextColor={tokens.colors.inputPlaceholder}
                style={styles.input}
                accessibilityLabel="새 폴더 이름"
                maxLength={80}
              />
              <TextInput
                value={newFolderDesc}
                onChangeText={setNewFolderDesc}
                placeholder="설명 (선택)"
                placeholderTextColor={tokens.colors.inputPlaceholder}
                style={styles.input}
                accessibilityLabel="새 폴더 설명"
                maxLength={120}
              />
              <Pressable
                onPress={() => void onPressCreateFolder()}
                disabled={creatingFolder || !newFolderName.trim()}
                style={({ pressed }) => [
                  styles.createBtn,
                  (creatingFolder || !newFolderName.trim()) && styles.createBtnDisabled,
                  pressed && !creatingFolder && Boolean(newFolderName.trim()) && styles.controlPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="폴더 생성"
              >
                <Ionicons name="checkmark" size={17} color={tokens.colors.textInverse} />
                <Text style={styles.createBtnText}>{creatingFolder ? "생성 중..." : "폴더 생성"}</Text>
              </Pressable>
            </View>
          ) : null}

          {renderListsScreen()}
        </>
      ) : (
        <>
          <View style={styles.detailHeader}>
            <Pressable
              onPress={() => setMode("lists")}
              style={({ pressed }) => [styles.backBtn, pressed && styles.controlPressed]}
              accessibilityRole="button"
              accessibilityLabel="책갈피 폴더 목록으로 돌아가기"
            >
              <Ionicons name="arrow-back" size={16} color={tokens.colors.text} />
              <Text style={styles.backBtnText}>목록</Text>
            </Pressable>
            <Text style={styles.detailTitle} numberOfLines={1}>
              {selectedList?.name || "책갈피"}
            </Text>
            <View style={styles.detailHeaderSpacer} />
          </View>

          {renderItemsScreen()}
        </>
      )}
      <PremiumFeaturePrompt
        visible={premiumPromptVisible}
        source="sentence_frame"
        title="좋아하는 문장을 홈 화면에 두세요"
        description="문장 액자는 저장한 글을 조용한 위젯으로 간직하는 프리미엄 기능이에요."
        benefit="직접 고른 문장을 홈 화면 위젯에 담을 수 있어요."
        onClose={() => setPremiumPromptVisible(false)}
      />
    </SafeAreaView>
  );
}

function BookmarkFeedItem({
  item,
  likeDisabled,
  sentenceFramePending,
  onLikePress,
  onBookmarkPress,
  onSentenceFramePress,
}: {
  item: Post;
  likeDisabled: boolean;
  sentenceFramePending: boolean;
  onLikePress: (postId: string) => void;
  onBookmarkPress: (postId: string) => void;
  onSentenceFramePress: (post: Post) => void;
}) {
  const fallbackLiked = Boolean(item.viewer?.isLiked);
  const fallbackCount = item.stats?.likeCount ?? 0;
  const { liked, likeCount } = useLikeSnapshot(item.id, fallbackLiked, fallbackCount);
  const snapshot = { ...item, stats: { ...item.stats, likeCount } };

  return (
    <View style={styles.bookmarkItemCard}>
      <FeedCard
        post={snapshot}
        liked={liked}
        bookmarked
        likeDisabled={likeDisabled}
        onPress={() => router.push(`/posts/${item.id}`)}
        onLikePress={() => onLikePress(item.id)}
        onBookmarkPress={() => onBookmarkPress(item.id)}
        likeTestID={`bookmark-like-btn-${item.id}`}
      />
      <Pressable
        onPress={() => onSentenceFramePress(item)}
        disabled={sentenceFramePending}
        style={({ pressed }) => [
          styles.sentenceFrameBtn,
          sentenceFramePending && styles.createBtnDisabled,
          pressed && !sentenceFramePending && styles.controlPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${item.title || "저장한 글"} 문장 액자에 담기`}
        testID={`bookmark-sentence-frame-btn-${item.id}`}
      >
        <Ionicons name="albums-outline" size={16} color={tokens.colors.green700} />
        <Text style={styles.sentenceFrameBtnText}>
          {sentenceFramePending ? "문장 액자에 담는 중..." : "문장 액자에 담기"}
        </Text>
        {!sentenceFramePending ? (
          <View style={styles.premiumPill}>
            <Text style={styles.premiumPillText}>프리미엄</Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },

  header: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  headerCopy: {
    gap: 3,
  },
  title: { fontSize: 22, fontWeight: "600", color: tokens.colors.text },
  headerMeta: {
    fontSize: tokens.font.small,
    fontWeight: "500",
    color: tokens.colors.textMuted,
  },
  headerBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  headerBtnText: { fontSize: 12, fontWeight: "500", color: tokens.colors.green700 },
  controlPressed: { opacity: 0.82 },

  createBox: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    marginHorizontal: tokens.space.lg,
    marginBottom: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    backgroundColor: tokens.colors.surfaceStrong,
    gap: tokens.space.sm,
    ...softPanelShadowStyle,
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 10,
    backgroundColor: tokens.colors.white,
    color: tokens.colors.text,
    fontSize: 14,
  },
  createBtn: {
    minHeight: 44,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.green700,
    paddingVertical: 11,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontSize: 13, fontWeight: "500", color: tokens.colors.textInverse },

  listScroll: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: tokens.space.md,
  },
  folderCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: tokens.space.sm,
    gap: tokens.space.sm,
    ...softPanelShadowStyle,
  },
  editBox: { gap: tokens.space.sm },
  folderMainBtn: {
    minHeight: 80,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.sm,
    gap: tokens.space.sm,
  },
  folderMainBtnPressed: {
    backgroundColor: tokens.colors.green100,
  },
  folderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
  },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  folderTextBlock: {
    flex: 1,
    gap: 4,
  },
  folderTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: tokens.colors.text },
  folderCountPill: {
    minWidth: 44,
    minHeight: 30,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  folderCount: { fontSize: 12, color: tokens.colors.green700, fontWeight: "500" },
  folderDescription: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: "500", lineHeight: 18 },
  folderOpenRow: {
    minHeight: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
  },
  folderOpenHint: { fontSize: 12, color: tokens.colors.green700, fontWeight: "500" },
  folderActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: tokens.space.xs,
  },
  folderEditBtn: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  folderEditText: { fontSize: 12, fontWeight: "500", color: tokens.colors.text },
  folderDeleteBtn: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: tokens.colors.dangerSoft,
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
  },
  folderDeleteText: { fontSize: 12, fontWeight: "500", color: tokens.colors.danger },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editSecondaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: tokens.colors.surface,
  },
  editSecondaryBtnText: { fontSize: 13, fontWeight: "500", color: tokens.colors.text },
  editPrimaryBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.green700,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  editPrimaryBtnText: { fontSize: 13, fontWeight: "500", color: "#fff" },

  detailHeader: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  backBtn: {
    minHeight: 44,
    flexDirection: "row",
    gap: 5,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: tokens.colors.surfaceStrong,
    minWidth: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnText: { fontSize: 12, color: tokens.colors.text, fontWeight: "500" },
  detailTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "600", color: tokens.colors.text },
  detailHeaderSpacer: { width: 66 },

  itemsScroll: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: tokens.space.md,
  },
  itemWrap: { width: "100%" },
  bookmarkItemCard: {
    gap: tokens.space.sm,
  },
  sentenceFrameBtn: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green050,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 10,
  },
  premiumPill: {
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  premiumPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: tokens.colors.green700,
  },
  sentenceFrameBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: tokens.colors.green700,
  },
  moreBtn: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.md,
    paddingVertical: 10,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  moreBtnText: { fontSize: 13, fontWeight: "500", color: tokens.colors.text },
});
