import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { FeedCard } from "@/components/FeedCard";
import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { useBookmarkSnapshot } from "@/features/bookmarks/bookmarkStore";
import { useLikeSnapshot } from "@/features/likes/likeStore";
import type { AppErrorModel } from "@/lib/errors";
import { useBottomDock } from "@/navigation/bottomDock";
import { immersiveFeedSectionStyles as styles } from "@/screens/Home.styles";

type Props<Item extends { id: string | number }> = {
  items: Item[];
  loading: boolean;
  refreshing: boolean;
  error?: AppErrorModel | null;
  hasMore: boolean;
  sectionLabel: string;
  genreLabel: string;
  onRefresh: () => void;
  onEndReached: () => void;
  onPressItem: (id: Item["id"]) => void;
  onLikePress?: (id: Item["id"]) => void;
  onBookmarkPress?: (id: Item["id"]) => void;
  onMorePress?: (item: Item) => void;
  getLikeDisabled?: (id: Item["id"]) => boolean;
};

export function ImmersiveFeedSection<Item extends { id: string | number }>({
  items,
  loading,
  refreshing,
  error,
  hasMore,
  sectionLabel,
  genreLabel,
  onRefresh,
  onEndReached,
  onPressItem,
  onLikePress,
  onBookmarkPress,
  onMorePress,
  getLikeDisabled,
}: Props<Item>) {
  const { height } = useWindowDimensions();
  const dock = useBottomDock();
  const pageHeight = Math.max(480, height - dock.tab.height - 178);

  if (error && items.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <AppError error={error} onRetry={error.canRetry ? onRefresh : undefined} />
      </View>
    );
  }

  if (loading && items.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <AppLoading />
      </View>
    );
  }

  if (!loading && items.length === 0 && !error) {
    return (
      <View style={styles.stateWrap}>
        <AppEmpty
          title="넘겨볼 글이 없어요"
          description="다른 장르를 선택하거나 새로고침해 보세요."
          primaryAction={{ label: "새로고침", onPress: onRefresh }}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => String(item.id)}
      pagingEnabled
      decelerationRate="fast"
      snapToAlignment="start"
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.7}
      ListFooterComponent={
        <View style={[styles.footer, { height: dock.tab.height + 40 }]}>
          {items.length > 0 && hasMore && loading ? <ActivityIndicator /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <ImmersiveFeedItem
          item={item}
          height={pageHeight}
          sectionLabel={sectionLabel}
          genreLabel={genreLabel}
          onPressItem={onPressItem}
          onLikePress={onLikePress}
          onBookmarkPress={onBookmarkPress}
          onMorePress={onMorePress}
          getLikeDisabled={getLikeDisabled}
        />
      )}
    />
  );
}

function ImmersiveFeedItem<Item extends { id: string | number }>({
  item,
  height,
  sectionLabel,
  genreLabel,
  onPressItem,
  onLikePress,
  onBookmarkPress,
  onMorePress,
  getLikeDisabled,
}: {
  item: Item;
  height: number;
  sectionLabel: string;
  genreLabel: string;
  onPressItem: (id: Item["id"]) => void;
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
    <View style={[styles.page, { minHeight: height }]}>
      <View style={styles.contextRow}>
        <View style={styles.contextPill}>
          <Text style={styles.contextPillText}>{sectionLabel}</Text>
        </View>
        <Text style={styles.contextMeta}>{genreLabel}</Text>
      </View>
      <FeedCard
        post={postSnapshot}
        liked={liked}
        bookmarked={bookmarked}
        onPress={() => onPressItem(item.id)}
        onLikePress={() => onLikePress?.(item.id)}
        onBookmarkPress={() => onBookmarkPress?.(item.id)}
        onMorePress={onMorePress ? () => onMorePress(item) : undefined}
        likeTestID={`home-immersive-like-btn-${item.id}`}
        bookmarkTestID={`home-immersive-bookmark-btn-${item.id}`}
        moreTestID={`home-immersive-more-btn-${item.id}`}
        likeDisabled={getLikeDisabled ? getLikeDisabled(item.id) : false}
      />
      <Pressable
        onPress={() => onPressItem(item.id)}
        style={styles.readBtn}
        accessibilityRole="button"
        testID={`home-immersive-read-btn-${item.id}`}
      >
        <Text style={styles.readBtnText}>전체 읽기</Text>
      </Pressable>
    </View>
  );
}
