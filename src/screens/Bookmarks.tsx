import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, usePathname } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/auth/AuthContext";
import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { buildAuthRoute } from "@/lib/authRedirect";
import { useToast } from "@/feedback/ToastProvider";
import { getLike, setLike, useLikeSnapshot } from "@/features/likes/likeStore";
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
      void loadLists();
      if (mode === "items" && selectedListId) {
        setFolderItems(initialFolderItemsState());
        void loadItems({ reset: true });
      }
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
    router.replace(buildAuthRoute("/(auth)", pathname));
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
        showToast("북마크에서 삭제했어요.", { tone: "success" });
      } catch (e) {
        const normalized = normalizeApiError(e);
        setFolderItems((prev) => ({ ...prev, error: normalized }));
        showToast(normalized.description || normalized.title || "북마크 삭제에 실패했어요.", {
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
          showToast(normalized.description || normalized.title || "좋아요 처리에 실패했어요.", {
            tone: "error",
          });
        }
      } finally {
        setLikePending((prev) => ({ ...prev, [postId]: false }));
      }
    },
    [folderItems.items, likePending, handleAuthError, showToast]
  );

  const renderListsScreen = () => {
    if (loadingLists) {
      return (
        <View style={styles.center}>
          <AppLoading message="북마크 폴더를 불러오는 중..." />
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
            title="북마크 폴더가 없어요"
            description="새 폴더를 만들어 글을 모아보세요."
            primaryAction={{ label: "폴더 만들기", onPress: () => setShowCreate(true) }}
          />
        </View>
      );
    }
    return (
      <ScrollView contentContainerStyle={styles.listScroll}>
        {lists.map((list) => (
          <View key={list.id} style={styles.folderCard}>
            {editingListId === list.id ? (
              <View style={styles.editBox}>
                <TextInput
                  value={editFolderName}
                  onChangeText={setEditFolderName}
                  placeholder="폴더 이름"
                  style={styles.input}
                  maxLength={80}
                />
                <TextInput
                  value={editFolderDesc}
                  onChangeText={setEditFolderDesc}
                  placeholder="설명 (선택)"
                  style={styles.input}
                  maxLength={120}
                />
                <View style={styles.editActions}>
                  <Pressable onPress={onCancelEditFolder} style={styles.editSecondaryBtn}>
                    <Text style={styles.editSecondaryBtnText}>취소</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void onPressRenameFolder()}
                    disabled={renamingListId === list.id || !editFolderName.trim()}
                    style={[
                      styles.editPrimaryBtn,
                      (renamingListId === list.id || !editFolderName.trim()) &&
                        styles.createBtnDisabled,
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
                  onPress={() => {
                    setSelectedListId(list.id);
                    setMode("items");
                  }}
                  style={styles.folderMainBtn}
                  testID={`bookmark-folder-${list.id}`}
                >
                  <View style={styles.folderHeaderRow}>
                    <Text style={styles.folderTitle} numberOfLines={1}>
                      {list.name}
                    </Text>
                    <Text style={styles.folderCount}>{list.itemCount ?? 0}개</Text>
                  </View>
                  {!!list.description && (
                    <Text style={styles.folderDescription} numberOfLines={2}>
                      {list.description}
                    </Text>
                  )}
                  <Text style={styles.folderOpenHint}>열어서 글 보기</Text>
                </Pressable>

                <View style={styles.folderActions}>
                  <Pressable
                    onPress={() => onStartEditFolder(list)}
                    hitSlop={10}
                    style={styles.folderEditBtn}
                  >
                    <Text style={styles.folderEditText}>폴더 수정</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void onPressDeleteFolder(list.id)}
                    hitSlop={10}
                    disabled={deletingListId === list.id}
                    style={styles.folderDeleteBtn}
                  >
                    <Text style={styles.folderDeleteText}>
                      {deletingListId === list.id ? "삭제중..." : "폴더 삭제"}
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
      <ScrollView contentContainerStyle={styles.itemsScroll}>
        {folderItems.items.map((item) => (
          <View key={item.id} style={styles.itemWrap}>
            <BookmarkFeedItem
              item={item}
              likeDisabled={Boolean(likePending[item.id])}
              onLikePress={onPressLike}
              onBookmarkPress={onPressRemoveFromList}
            />
          </View>
        ))}
        {folderItems.hasMore ? (
          <Pressable
            onPress={() => void loadItems({ reset: false })}
            style={styles.moreBtn}
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
            <Text style={styles.title}>북마크 폴더</Text>
            <Pressable onPress={() => setShowCreate((prev) => !prev)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>{showCreate ? "닫기" : "새 폴더"}</Text>
            </Pressable>
          </View>

          {showCreate ? (
            <View style={styles.createBox}>
              <TextInput
                value={newFolderName}
                onChangeText={setNewFolderName}
                placeholder="폴더 이름"
                style={styles.input}
                maxLength={80}
              />
              <TextInput
                value={newFolderDesc}
                onChangeText={setNewFolderDesc}
                placeholder="설명 (선택)"
                style={styles.input}
                maxLength={120}
              />
              <Pressable
                onPress={() => void onPressCreateFolder()}
                disabled={creatingFolder || !newFolderName.trim()}
                style={[styles.createBtn, (creatingFolder || !newFolderName.trim()) && styles.createBtnDisabled]}
              >
                <Text style={styles.createBtnText}>{creatingFolder ? "생성 중..." : "폴더 생성"}</Text>
              </Pressable>
            </View>
          ) : null}

          {renderListsScreen()}
        </>
      ) : (
        <>
          <View style={styles.detailHeader}>
            <Pressable onPress={() => setMode("lists")} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← 목록</Text>
            </Pressable>
            <Text style={styles.detailTitle} numberOfLines={1}>
              {selectedList?.name || "북마크"}
            </Text>
            <View style={{ width: 66 }} />
          </View>

          {renderItemsScreen()}
        </>
      )}
    </SafeAreaView>
  );
}

function BookmarkFeedItem({
  item,
  likeDisabled,
  onLikePress,
  onBookmarkPress,
}: {
  item: Post;
  likeDisabled: boolean;
  onLikePress: (postId: string) => void;
  onBookmarkPress: (postId: string) => void;
}) {
  const fallbackLiked = Boolean(item.viewer?.isLiked);
  const fallbackCount = item.stats?.likeCount ?? 0;
  const { liked, likeCount } = useLikeSnapshot(item.id, fallbackLiked, fallbackCount);
  const snapshot = { ...item, stats: { ...item.stats, likeCount } };

  return (
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
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: tokens.colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  title: { fontSize: 22, fontWeight: "900", color: tokens.colors.text },
  headerBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  headerBtnText: { fontSize: 12, fontWeight: "800", color: tokens.colors.text },

  createBox: {
    marginHorizontal: tokens.space.lg,
    marginBottom: tokens.space.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.md,
    backgroundColor: tokens.colors.surfaceStrong,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    color: tokens.colors.text,
  },
  createBtn: {
    marginTop: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.green700,
    paddingVertical: 11,
  },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  listScroll: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: 32,
    gap: 10,
  },
  folderCard: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceStrong,
    padding: 12,
    gap: 10,
  },
  editBox: { gap: 8 },
  folderMainBtn: { gap: 8 },
  folderHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  folderTitle: { flex: 1, fontSize: 15, fontWeight: "900", color: tokens.colors.text },
  folderCount: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: "800" },
  folderDescription: { fontSize: 12, color: tokens.colors.textMuted, fontWeight: "700" },
  folderOpenHint: { fontSize: 12, color: tokens.colors.green900, fontWeight: "800" },
  folderActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  folderEditBtn: {
    alignSelf: "flex-end",
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  folderEditText: { fontSize: 11, fontWeight: "800", color: tokens.colors.text },
  folderDeleteBtn: {
    alignSelf: "flex-end",
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(180,50,50,0.08)",
  },
  folderDeleteText: { fontSize: 11, fontWeight: "800", color: "rgba(180,50,50,0.95)" },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  editSecondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: tokens.colors.surface,
  },
  editSecondaryBtnText: { fontSize: 13, fontWeight: "800", color: tokens.colors.text },
  editPrimaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.green700,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  editPrimaryBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
    paddingBottom: tokens.space.md,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: tokens.colors.surfaceStrong,
    minWidth: 66,
    alignItems: "center",
  },
  backBtnText: { fontSize: 12, color: tokens.colors.text, fontWeight: "800" },
  detailTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "900", color: tokens.colors.text },

  itemsScroll: {
    paddingHorizontal: tokens.space.lg,
    paddingBottom: 32,
    gap: 10,
  },
  itemWrap: { width: "100%" },
  moreBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: tokens.colors.borderStrong,
    borderRadius: tokens.radius.md,
    paddingVertical: 10,
    backgroundColor: tokens.colors.surfaceStrong,
  },
  moreBtnText: { fontSize: 13, fontWeight: "800", color: tokens.colors.text },
});
