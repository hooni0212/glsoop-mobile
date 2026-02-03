import React, { useMemo, useState } from "react";
import { Alert, SafeAreaView } from "react-native";

import { CategoryChips } from "@/components/home/CategoryChips";
import { FeedSection } from "@/components/home/FeedSection";
import { HomeHeader } from "@/components/home/HomeHeader";
import { homeScreenStyles } from "@/screens/Home.styles";
import { useFeed } from "@/features/feed/useFeed";
import { getLike, setLike } from "@/features/likes/likeStore";
import { useAuth } from "@/auth/AuthContext";
import { togglePostLike } from "@/services/likeService";
import { ApiError } from "@/lib/errors";
import { router } from "expo-router";

const CATEGORIES = ["추천", "인기", "힐링", "일상", "여행"] as const;
type Category = (typeof CATEGORIES)[number];

export default function Home() {
  const [active, setActive] = useState<Category>("추천");

  const query = useMemo(() => {
    if (active === "인기") return { limit: 10, sort: "popular" as const };
    if (active === "추천") return { limit: 10, sort: "latest" as const };
    return { limit: 10, sort: "latest" as const, tag: active };
  }, [active]);

  const { items, loading, refreshing, error, hasMore, refresh, loadMore, patchItem } =
    useFeed(query);
  const { signOut } = useAuth();
  const [likePending, setLikePending] = useState<Record<string, boolean>>({});

  const sectionLabel = useMemo(() => {
    if (active === "인기") return "지금 인기";
    if (active === "추천") return "오늘의 추천";
    return `${active} 피드`;
  }, [active]);

  const setPending = (postId: string, pending: boolean) => {
    setLikePending((prev) => ({ ...prev, [postId]: pending }));
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
        Alert.alert("좋아요 실패", "잠시 후 다시 시도해주세요.");
      }
    } finally {
      setPending(postId, false);
    }
  };

  return (
    <SafeAreaView style={homeScreenStyles.safe}>
      <HomeHeader onPressSearch={() => {}} />

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
        getLikeDisabled={(id) => Boolean(likePending[String(id)])}
      />
    </SafeAreaView>
  );
}
