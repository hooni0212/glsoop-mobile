import { tokens } from "@/theme/tokens";
import type { Post } from "@/types/post";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  post: Post;
  onPress?: () => void;
  testID?: string;
  likeTestID?: string;
  likeDisabled?: boolean;

  // (선택) 액션
  liked?: boolean;
  bookmarked?: boolean;
  onLikePress?: () => void;
  onBookmarkPress?: () => void;
};

export function FeedCard({
  post,
  onPress,
  testID,
  likeTestID,
  likeDisabled,
  liked = false,
  bookmarked = false,
  onLikePress,
  onBookmarkPress,
}: Props) {
  const author = post.author?.name || "익명";
  const timeLabel = formatRelativeKorean(post.createdAt);

  const likeCount = post.stats?.likeCount ?? 0;

  return (
    <Pressable style={styles.card} onPress={onPress} testID={testID}>
      {/* 제목 */}
      <Text style={styles.title} numberOfLines={1}>
        {post.title || "(제목 없음)"}
      </Text>

      {/* 내용 요약 */}
      {!!post.excerpt && (
        <Text style={styles.excerpt} numberOfLines={2}>
          {post.excerpt}
        </Text>
      )}

      {/* 하단 메타 + 액션 */}
      <View style={styles.bottomRow}>
        <View style={styles.metaRow}>
          <Text style={styles.metaText} numberOfLines={1}>
            {author}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {timeLabel}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onLikePress}
            hitSlop={10}
            style={styles.actionBtn}
            disabled={likeDisabled}
            testID={likeTestID}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={18}
              color={liked ? tokens.colors.green700 : tokens.colors.textMuted}
            />
            <Text
              style={[
                styles.actionText,
                liked && { color: tokens.colors.green700 },
              ]}
            >
              {likeCount}
            </Text>
          </Pressable>

          <Pressable
            onPress={onBookmarkPress}
            hitSlop={10}
            style={[styles.actionBtn, { marginLeft: 14 }]}
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={18}
              color={bookmarked ? tokens.colors.green700 : tokens.colors.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function formatRelativeKorean(iso: string) {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}일 전`;

    // 너무 오래된 건 날짜로
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate()
    ).padStart(2, "0")}`;
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    paddingVertical: 20,
    paddingHorizontal: 18,

    // 피그마 톤: 테두리 거의 없음
    borderWidth: 0,

    // 매우 은은한 그림자 (iOS)
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },

    // Android도 최소
    elevation: 1,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: tokens.colors.text,
    marginBottom: 12,
  },

  excerpt: {
    fontSize: 14.5,
    lineHeight: 21,
    color: tokens.colors.text,
    opacity: 0.82,
    marginBottom: 16,
  },

  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    gap: 8,
  },

  metaText: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontWeight: "600",
  },

  metaDot: {
    fontSize: 13,
    color: tokens.colors.textFaint,
    fontWeight: "700",
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  actionText: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    fontWeight: "700",
  },
});
