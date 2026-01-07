import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from "react-native";

import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { AppErrorModel } from "@/lib/errors";
import { feedSectionStyles as styles } from "@/screens/Home.styles";

type Props<Item extends { id: string | number }> = {
  items: Item[];
  loading: boolean;
  refreshing: boolean;
  error?: AppErrorModel | null;
  hasMore: boolean;
  sectionLabel: string;
  onRefresh: () => void;
  onEndReached: () => void;
  onPressItem: (id: Item["id"]) => void;
};

export function FeedSection<Item extends { id: string | number }>({
  items,
  loading,
  refreshing,
  error,
  hasMore,
  sectionLabel,
  onRefresh,
  onEndReached,
  onPressItem,
}: Props<Item>) {
  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      showsVerticalScrollIndicator
      contentContainerStyle={styles.listContent}
      ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
      ListHeaderComponent={
        <View>
          <View style={styles.headerSpacerTop} />
          <Text style={styles.sectionLabel}>{sectionLabel}</Text>
          <View style={styles.headerSpacerAfterLabel} />

          {error ? (
            <AppError error={error} onRetry={error.canRetry ? onRefresh : undefined} />
          ) : null}

          {loading && items.length === 0 ? <AppLoading /> : null}

          {!loading && items.length === 0 && !error ? (
            <AppEmpty
              title="아직 글이 없어요"
              description="다른 카테고리를 눌러보거나 새로고침 해보세요."
              primaryAction={{ label: "새로고침", onPress: onRefresh }}
            />
          ) : null}
        </View>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {items.length > 0 && hasMore && loading ? <ActivityIndicator /> : null}
          <View style={{ height: 28 }} />
        </View>
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      renderItem={({ item }: { item: Item }) => (
        <FeedCard
          post={item as any}
          liked={Boolean((item as any).viewer?.isLiked)}
          bookmarked={Boolean((item as any).viewer?.isBookmarked)}
          onPress={() => onPressItem(item.id)}
          onLikePress={() => {}}
          onBookmarkPress={() => {}}
        />
      )}
    />
  );
}
