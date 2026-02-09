import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  description = "좋아요와 저장 반응이 높은 글이에요.",
  emptyTitle = "아직 인기 글 데이터가 없어요",
  emptyDescription = "서버에서 top posts API가 준비되면 여기에 노출돼요.",
}: Props) {
  if (loading && items.length === 0) {
    return <AppLoading message="인기 글을 불러오는 중..." />;
  }

  if (error && items.length === 0) {
    return <AppError error={error} />;
  }

  if (items.length === 0) {
    return (
      <AppEmpty
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <View style={styles.card}>
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
              >
                {content}
              </Pressable>
            );
          }

          return (
            <View key={item.id} style={styles.itemRow}>
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
