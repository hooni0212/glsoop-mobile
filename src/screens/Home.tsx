import React, { useMemo, useState } from "react";
import { SafeAreaView } from "react-native";

import { CategoryChips } from "@/components/home/CategoryChips";
import { FeedSection } from "@/components/home/FeedSection";
import { HomeHeader } from "@/components/home/HomeHeader";
import { homeScreenStyles } from "@/screens/Home.styles";
import { useFeed } from "@/features/feed/useFeed";
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

  const { items, loading, refreshing, error, hasMore, refresh, loadMore } =
    useFeed(query);

  const sectionLabel = useMemo(() => {
    if (active === "인기") return "지금 인기";
    if (active === "추천") return "오늘의 추천";
    return `${active} 피드`;
  }, [active]);

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
      />
    </SafeAreaView>
  );
}
