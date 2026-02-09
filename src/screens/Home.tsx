import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView } from "react-native";

import { CategoryChips } from "@/components/home/CategoryChips";
import { FeedSection } from "@/components/home/FeedSection";
import { HomeHeader } from "@/components/home/HomeHeader";
import { homeScreenStyles } from "@/screens/Home.styles";
import { useFeed } from "@/features/feed/useFeed";
import { getBookmark, setBookmark } from "@/features/bookmarks/bookmarkStore";
import { getLike, setLike } from "@/features/likes/likeStore";
import { useAuth } from "@/auth/AuthContext";
import { togglePostLike } from "@/services/likeService";
import { ApiError } from "@/lib/errors";
import { router } from "expo-router";
import { useToast } from "@/feedback/ToastProvider";
import {
  addPostToBookmarkList,
  createBookmarkList,
  listBookmarkItems,
  listBookmarkLists,
  listPostBookmarkLists,
  removePostFromBookmarkList,
} from "@/services/bookmarkService";

const CATEGORIES = ["추천", "인기", "힐링", "일상", "여행"] as const;
type Category = (typeof CATEGORIES)[number];

export default function Home() {
  const [active, setActive] = useState<Category>("추천");
  const { showToast } = useToast();

  const query = useMemo(() => {
    if (active === "인기") return { limit: 10, sort: "popular" as const };
    if (active === "추천") return { limit: 10, sort: "latest" as const };
    return { limit: 10, sort: "latest" as const, tag: active };
  }, [active]);

  const { items, loading, refreshing, error, hasMore, refresh, loadMore, patchItem } =
    useFeed(query);
  const { signOut } = useAuth();
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});
  const [bookmarkPending, setBookmarkPending] = useState<Record<string, boolean>>({});

  const sectionLabel = useMemo(() => {
    if (active === "인기") return "지금 인기";
    if (active === "추천") return "오늘의 추천";
    return `${active} 피드`;
  }, [active]);

  const setPending = (postId: string, pending: boolean) => {
    setLikePending((prev) => ({ ...prev, [postId]: pending }));
  };
  const setBookmarkPendingState = (postId: string, pending: boolean) => {
    setBookmarkPending((prev) => ({ ...prev, [postId]: pending }));
  };

  const handleAuthError = async () => {
    await signOut();
    router.replace("/(auth)");
    Alert.alert("로그인이 필요해요", "다시 로그인해주세요.");
  };

  const handleLike = async (postId: string) => {
    if (likePending[postId]) return;

    const target = items.find((item) => item.id === postId);
    if (!target) return;

    const stored = getLike(postId);
    const prevLiked = stored?.liked ?? Boolean(target.viewer?.isLiked);
    const prevCount = stored?.likeCount ?? (target.stats?.likeCount ?? 0);
    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setLike(postId, nextLiked, nextCount);
    patchItem(postId, (prev) => ({
      ...prev,
      viewer: { ...prev.viewer, isLiked: nextLiked },
      stats: { ...prev.stats, likeCount: nextCount },
    }));

    setPending(postId, true);
    try {
      const res = await togglePostLike(postId);
      setLike(postId, res.liked, res.likeCount);
      patchItem(postId, (prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isLiked: res.liked },
        stats: { ...prev.stats, likeCount: res.likeCount },
      }));
    } catch (err) {
      setLike(postId, prevLiked, prevCount);
      patchItem(postId, (prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isLiked: prevLiked },
        stats: { ...prev.stats, likeCount: prevCount },
      }));

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
      } else {
        showToast("좋아요 처리에 실패했어요. 잠시 후 다시 시도해주세요.", { tone: "error" });
      }
    } finally {
      setPending(postId, false);
    }
  };

  const handleBookmark = async (postId: string) => {
    if (bookmarkPending[postId]) return;
    const target = items.find((item) => item.id === postId);
    if (!target) return;

    const storedBookmark = getBookmark(postId);
    const prevBookmarked = storedBookmark?.bookmarked ?? Boolean(target.viewer?.isBookmarked);
    const prevCount = target.stats?.bookmarkCount ?? 0;
    const nextCount = prevBookmarked ? Math.max(0, prevCount - 1) : prevCount + 1;

    patchItem(postId, (prev) => ({
      ...prev,
      viewer: { ...prev.viewer, isBookmarked: !prevBookmarked },
      stats: { ...prev.stats, bookmarkCount: nextCount },
    }));
    setBookmark(postId, !prevBookmarked);

    setBookmarkPendingState(postId, true);
    try {
      if (!prevBookmarked) {
        let lists = await listBookmarkLists();
        let targetList = lists[0];

        if (!targetList) {
          targetList = await createBookmarkList({ name: "기본" });
          lists = [targetList, ...lists];
        } else {
          const withRecentAddedAt = await Promise.all(
            lists.map(async (list, index) => {
              if (!list.itemCount || list.itemCount <= 0) {
                return { list, index, recentAddedAt: null as number | null };
              }
              const res = await listBookmarkItems({ listId: list.id, limit: 1, offset: 0 });
              const top = res.items[0];
              const t = top?.createdAt ? new Date(top.createdAt).getTime() : NaN;
              return {
                list,
                index,
                recentAddedAt: Number.isNaN(t) ? null : t,
              };
            })
          );

          const recentLists = withRecentAddedAt
            .filter((x) => x.recentAddedAt !== null)
            .sort((a, b) => {
              if ((b.recentAddedAt ?? 0) !== (a.recentAddedAt ?? 0)) {
                return (b.recentAddedAt ?? 0) - (a.recentAddedAt ?? 0);
              }
              // tie-break: API list order(최근 생성 우선) 유지
              return a.index - b.index;
            });

          targetList = recentLists[0]?.list ?? lists[0];
        }

        await addPostToBookmarkList({ listId: targetList.id, postId });
        setBookmark(postId, true);
        showToast(`'${targetList.name}' 폴더에 저장했어요.`, { tone: "success" });
      } else {
        const postLists = await listPostBookmarkLists(postId);
        const contains = postLists.filter((l) => Boolean(l.contains));
        if (contains.length > 0) {
          await Promise.all(
            contains.map((l) => removePostFromBookmarkList({ listId: l.id, postId }))
          );
        }
        setBookmark(postId, false);
        showToast("북마크에서 삭제했어요.", { tone: "success" });
      }
    } catch (err) {
      patchItem(postId, (prev) => ({
        ...prev,
        viewer: { ...prev.viewer, isBookmarked: prevBookmarked },
        stats: { ...prev.stats, bookmarkCount: prevCount },
      }));
      setBookmark(postId, prevBookmarked);

      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await handleAuthError();
      } else {
        showToast(
          err instanceof Error ? err.message : "북마크 처리에 실패했어요. 잠시 후 다시 시도해주세요.",
          { tone: "error" }
        );
      }
    } finally {
      setBookmarkPendingState(postId, false);
    }
  };

  return (
    <SafeAreaView style={homeScreenStyles.safe}>
      <HomeHeader onPressSearch={() => router.push("/search")} />

      <CategoryChips
        categories={CATEGORIES}
        active={active}
        onChange={setActive}
      />

      <FeedSection
        items={items}
        loading={loading}
        refreshing={refreshing}
        error={error}
        hasMore={hasMore}
        sectionLabel={sectionLabel}
        onRefresh={refresh}
        onEndReached={() => {
          if (!loading && hasMore) loadMore();
        }}
        onPressItem={(id) => router.push(`/posts/${String(id)}`)}
        onLikePress={(id) => handleLike(String(id))}
        onBookmarkPress={(id) => handleBookmark(String(id))}
        getLikeDisabled={(id) => Boolean(likePending[String(id)])}
      />
    </SafeAreaView>
  );
}
