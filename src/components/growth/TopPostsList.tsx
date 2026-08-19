import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import { formatKstDateDot } from "@/lib/dateTime";
import type { AppErrorModel } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

export type TopPostItem = {
  id: string;
  title: string;
  excerpt?: string;
  authorName?: string;
  createdAt?: string | null;
  likeCount?: number;
  bookmarkCount?: number;
};

type Props = {
  items: TopPostItem[];
  loading?: boolean;
  error?: AppErrorModel | null;
  onPressItem?: (id: string) => void;
  title?: string;
  description?: string;
  emptyTitle?: string;
  emptyDescription?: string;
};

export function TopPostsList({
  items,
  loading = false,
  error = null,
  onPressItem,
  title = "인기 글",
  description = "반응이 좋은 글",
  emptyTitle = "아직 인기 글이 없어요",
  emptyDescription = "활동이 쌓이면 여기에 표시돼요.",
}: Props) {
  if (loading && items.length === 0) {
    return <AppLoading message="인기 글을 불러오는 중..." />;
  }

  if (error && items.length === 0) {
    return <AppError error={error} />;
  }

  if (items.length === 0) {
    return (
      <View testID="top-posts-empty" accessibilityLabel="인기 글 없음">
        <AppEmpty
          title={emptyTitle}
          description={emptyDescription}
        />
      </View>
    );
  }

  return (
    <View style={styles.card} testID="top-posts-list">
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.list}>
        {items.map((item, index) => {
          const createdAtLabel = formatKstDateDot(item.createdAt);
          const content = (
            <>
              <View style={styles.rankWrap}>
                <Text style={styles.rankText}>{index + 1}</Text>
              </View>

              <View style={styles.body}>
                <Text numberOfLines={1} style={styles.itemTitle}>
                  {item.title}
                </Text>
                {item.excerpt ? (
                  <Text numberOfLines={2} style={styles.itemExcerpt}>
                    {item.excerpt}
                  </Text>
                ) : null}

                <View style={styles.metaRow}>
                  {item.authorName ? <Text style={styles.metaText}>{item.authorName}</Text> : null}
                  {createdAtLabel ? <Text style={styles.metaText}>{createdAtLabel}</Text> : null}
                  <View style={styles.metaMetric} accessibilityLabel={`공감 ${item.likeCount ?? 0}개`}>
                    <Ionicons name="heart" size={13} color={tokens.colors.textFaint} />
                    <Text style={styles.metaText}>{item.likeCount ?? 0}</Text>
                  </View>
                  <Text style={styles.metaText}>저장 {item.bookmarkCount ?? 0}</Text>
                </View>
              </View>
            </>
          );

          if (onPressItem) {
            return (
              <Pressable
                key={item.id}
                onPress={() => onPressItem(item.id)}
                style={({ pressed }) => [styles.itemRow, pressed && styles.itemRowPressed]}
                testID={`top-post-item-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${index + 1}위 인기 글 ${item.title}`}
                accessibilityHint="게시글 상세로 이동"
              >
                {content}
              </Pressable>
            );
          }

          return (
            <View key={item.id} style={styles.itemRow} testID={`top-post-item-${item.id}`}>
              {content}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.md as any,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: tokens.font.body,
    fontWeight: "600",
    color: tokens.colors.text,
  },
  description: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  list: {
    gap: tokens.space.sm as any,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.space.sm as any,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: tokens.colors.surface,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.sm,
  },
  itemRowPressed: {
    opacity: 0.85,
  },
  rankWrap: {
    width: 24,
    height: 24,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.green100,
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: tokens.font.small,
    fontWeight: "600",
    color: tokens.colors.green900,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: tokens.font.body,
    fontWeight: "500",
    color: tokens.colors.text,
  },
  itemExcerpt: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm as any,
  },
  metaText: {
    fontSize: tokens.font.small,
    color: tokens.colors.textFaint,
    fontWeight: "500",
  },
  metaMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
});
