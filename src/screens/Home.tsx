import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { FeedCard } from "@/components/FeedCard";
import { useFeed } from "@/features/feed/useFeed";

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
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.brand}>글숲</Text>

        <Pressable
          onPress={() => {}}
          hitSlop={12}
          style={styles.searchBtn}
        >
          <Ionicons name="search-outline" size={22} color="#3B3B3B" />
        </Pressable>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
        >
          {CATEGORIES.map((c) => {
            const isActive = c === active;
            return (
              <Pressable
                key={c}
                onPress={() => setActive(c)}
                style={[styles.chip, isActive && styles.chipActive]}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {c}
                </Text>
              </Pressable>
            );
          })}
          <View style={{ width: 6 }} />
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item: any) => String(item.id)}
        showsVerticalScrollIndicator
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
        ListHeaderComponent={
          <View>
            <View style={{ height: 14 }} />
            <Text style={styles.sectionLabel}>{sectionLabel}</Text>
            <View style={{ height: 8 }} />

            {error ? (
              <Pressable
                onPress={refresh}
                style={styles.errorBanner}
                accessibilityRole="button"
              >
                <Text style={styles.errorText}>
                  불러오기에 실패했어요. 탭해서 다시 시도
                </Text>
                <Text style={styles.errorSub}>{error}</Text>
              </Pressable>
            ) : null}

            {loading && items.length === 0 ? (
              <View style={{ paddingVertical: 14 }}>
                <ActivityIndicator />
              </View>
            ) : null}

            {!loading && items.length === 0 && !error ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>아직 글이 없어요</Text>
                <Text style={styles.emptySub}>
                  다른 카테고리를 눌러보거나 새로고침 해보세요.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 16 }}>
            {items.length > 0 && hasMore && loading ? <ActivityIndicator /> : null}
            <View style={{ height: 28 }} />
          </View>
        }
        refreshing={refreshing}
        onRefresh={refresh}
        onEndReached={() => {
          if (!loading && hasMore) loadMore();
        }}
        onEndReachedThreshold={0.6}
        renderItem={({ item }: any) => (
          <FeedCard
            post={item}
            liked={Boolean((item as any).viewer?.isLiked)}
            bookmarked={Boolean((item as any).viewer?.isBookmarked)}
            onPress={() => {}}
            onLikePress={() => {}}
            onBookmarkPress={() => {}}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A9A9A",
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: -0.2,
  },
  safe: {
    flex: 1,
    backgroundColor: "#F6F6F4",
  },
  header: {
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    color: "#2E5A3D",
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsWrap: {
    paddingTop: 6,
    paddingBottom: 10,
  },
  chipsContent: {
    paddingHorizontal: 14,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F2F2F2",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  chipActive: {
    backgroundColor: "#6E9277",
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3B3B3B",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  errorBanner: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 90, 90, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 90, 90, 0.22)",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#B00020",
    marginBottom: 4,
  },
  errorSub: {
    fontSize: 12,
    color: "rgba(0,0,0,0.55)",
  },
  emptyBox: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(0,0,0,0.75)",
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: "rgba(0,0,0,0.55)",
  },
});
