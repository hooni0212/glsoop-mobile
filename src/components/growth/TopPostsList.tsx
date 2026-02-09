import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppEmpty } from "@/components/state/AppEmpty";
import { AppError } from "@/components/state/AppError";
import { AppLoading } from "@/components/state/AppLoading";
import type { AppErrorModel } from "@/lib/errors";
import { tokens } from "@/theme/tokens";

export type TopPostItem = {
  id: string;
  title: string;
  excerpt?: string;
  authorName?: string;
  likeCount?: number;
  bookmarkCount?: number;
};

type Props = {
  items: TopPostItem[];
  loading?: boolean;
  error?: AppErrorModel | null;
  onPressItem?: (id: string) => void;
  mode?: "default" | "pending";
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
  mode = "default",
  title = "인기 글",
  description = "반응이 좋은 글을 모아 보여주는 영역이에요.",
  emptyTitle = "인기 글을 준비 중이에요",
  emptyDescription = "추천 기능이 열리면 이곳에서 바로 확인할 수 있어요.",
}: Props) {
  if (loading && items.length === 0) {
    return <AppLoading message="인기 글을 불러오는 중..." />;
  }

  if (error && items.length === 0) {
    return <AppError error={error} />;
  }

  if (items.length === 0) {
    if (mode === "pending") {
      return (
        <View style={styles.pendingCard} testID="top-posts-pending" accessibilityLabel="인기 글 준비 중">
          <View style={styles.pendingHeader}>
            <View style={styles.pendingIconWrap}>
              <Ionicons name="sparkles-outline" size={18} color={tokens.colors.green900} />
            </View>
            <View style={styles.pendingTitleBlock}>
              <Text style={styles.pendingTitle}>{title}</Text>
              <Text style={styles.pendingDescription}>{description}</Text>
            </View>
            <Text style={styles.pendingBadge}>준비 중</Text>
          </View>
          <Text style={styles.pendingHint}>{emptyDescription}</Text>
        </View>
      );
    }

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
                  <Text style={styles.metaText}>좋아요 {item.likeCount ?? 0}</Text>
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
  pendingCard: {
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.radius.xl,
    padding: tokens.space.lg,
    gap: tokens.space.sm as any,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm as any,
  },
  pendingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green100,
  },
  pendingTitleBlock: {
    flex: 1,
    gap: 2,
  },
  pendingTitle: {
    fontSize: tokens.font.body,
    color: tokens.colors.text,
    fontWeight: "900",
  },
  pendingDescription: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
  },
  pendingBadge: {
    fontSize: tokens.font.small,
    fontWeight: "800",
    color: tokens.colors.green900,
    backgroundColor: tokens.colors.green100,
    borderRadius: tokens.radius.pill,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingHint: {
    fontSize: tokens.font.small,
    color: tokens.colors.textMuted,
    lineHeight: 18,
  },
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
    fontWeight: "900",
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
    fontWeight: "900",
    color: tokens.colors.green900,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: tokens.font.body,
    fontWeight: "800",
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
    fontWeight: "700",
  },
});
