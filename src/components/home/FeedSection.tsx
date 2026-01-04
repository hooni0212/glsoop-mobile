import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from "react-native";

import { FeedCard } from "@/components/FeedCard";
import { feedSectionStyles as styles, homeStateStyles } from "@/screens/Home.styles";
import { EmptyState } from "@/components/home/EmptyState";
import { ErrorState } from "@/components/home/ErrorState";

type Props<Item extends { id: string | number }> = {
  items: Item[];
  loading: boolean;
  refreshing: boolean;
  error?: string | null;
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

          {error ? <ErrorState message={error} onRetry={onRefresh} /> : null}

          {loading && items.length === 0 ? (
            <View style={homeStateStyles.loadingBox}>
              <ActivityIndicator />
            </View>
          ) : null}

          {!loading && items.length === 0 && !error ? <EmptyState /> : null}
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
