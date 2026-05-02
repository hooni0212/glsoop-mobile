import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
} from "react-native";

import { FeedCard } from "@/components/FeedCard";
import { useBookmarkSnapshot } from "@/features/bookmarks/bookmarkStore";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useLikeSnapshot } from "@/features/likes/likeStore";
import type { AppErrorModel } from "@/lib/errors";
import { useBottomDock } from "@/navigation/bottomDock";
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
  onPressAuthor?: (item: Item) => void;
  onLikePress?: (id: Item["id"]) => void;
  onBookmarkPress?: (id: Item["id"]) => void;
  onMorePress?: (item: Item) => void;
  getLikeDisabled?: (id: Item["id"]) => boolean;
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
  onPressAuthor,
  onLikePress,
  onBookmarkPress,
  onMorePress,
  getLikeDisabled,
}: Props<Item>) {
  const dock = useBottomDock();

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
              description="다른 카테고리를 보거나 새로고침해 보세요."
              primaryAction={{ label: "새로고침", onPress: onRefresh }}
            />
          ) : null}
        </View>
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {items.length > 0 && hasMore && loading ? <ActivityIndicator /> : null}
          <View style={{ height: dock.tab.height + 12 }} />
        </View>
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      renderItem={({ item }: { item: Item }) => (
        <FeedSectionItem
          item={item}
          onPressItem={onPressItem}
          onPressAuthor={onPressAuthor}
          onLikePress={onLikePress}
          onBookmarkPress={onBookmarkPress}
          onMorePress={onMorePress}
          getLikeDisabled={getLikeDisabled}
        />
      )}
    />
  );
}

function FeedSectionItem<Item extends { id: string | number }>({
  item,
  onPressItem,
  onPressAuthor,
  onLikePress,
  onBookmarkPress,
  onMorePress,
  getLikeDisabled,
}: {
  item: Item;
  onPressItem: (id: Item["id"]) => void;
  onPressAuthor?: (item: Item) => void;
  onLikePress?: (id: Item["id"]) => void;
  onBookmarkPress?: (id: Item["id"]) => void;
  onMorePress?: (item: Item) => void;
  getLikeDisabled?: (id: Item["id"]) => boolean;
}) {
  const fallbackLiked = Boolean((item as any).viewer?.isLiked);
  const fallbackCount = (item as any).stats?.likeCount ?? 0;
  const fallbackBookmarked = Boolean((item as any).viewer?.isBookmarked);
  const { liked, likeCount } = useLikeSnapshot(item.id, fallbackLiked, fallbackCount);
  const { bookmarked } = useBookmarkSnapshot(item.id, fallbackBookmarked);
  const postSnapshot = {
    ...(item as any),
    stats: { ...(item as any).stats, likeCount },
  };

  return (
    <FeedCard
      post={postSnapshot}
      liked={liked}
      bookmarked={bookmarked}
      onPress={() => onPressItem(item.id)}
      onAuthorPress={onPressAuthor ? () => onPressAuthor(item) : undefined}
      onLikePress={() => onLikePress?.(item.id)}
      onBookmarkPress={() => onBookmarkPress?.(item.id)}
      onMorePress={onMorePress ? () => onMorePress(item) : undefined}
      likeTestID={`feed-like-btn-${item.id}`}
      bookmarkTestID={`feed-bookmark-btn-${item.id}`}
      moreTestID={`feed-more-btn-${item.id}`}
      likeDisabled={getLikeDisabled ? getLikeDisabled(item.id) : false}
    />
  );
}
