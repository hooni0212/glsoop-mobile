import { tokens } from "@/theme/tokens";
import { softCardShadowStyle } from "@/theme/shadows";
import { resolvePostRenderImages } from "@/lib/postRenderImages";
import type { Post } from "@/types/post";
import { formatRelativeKorean } from "@/lib/dateTime";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { Image } from "expo-image";

type Props = {
  post: Post;
  onPress?: () => void;
  testID?: string;
  likeTestID?: string;
  bookmarkTestID?: string;
  likeDisabled?: boolean;
  moreTestID?: string;

  // (선택) 액션
  liked?: boolean;
  bookmarked?: boolean;
  onLikePress?: () => void;
  onBookmarkPress?: () => void;
  onMorePress?: () => void;
};

export function FeedCard({
  post,
  onPress,
  testID,
  likeTestID,
  bookmarkTestID,
  likeDisabled,
  moreTestID,
  liked = false,
  bookmarked = false,
  onLikePress,
  onBookmarkPress,
  onMorePress,
}: Props) {
  const author = post.author?.name || "익명";
  const timeLabel = formatRelativeKorean(post.createdAt);
  const likeCount = post.stats?.likeCount ?? 0;
  const renderImages = resolvePostRenderImages(post);
  const primaryImage = renderImages?.primaryImage || "";
  const pageCount = renderImages?.pageCount ?? 1;
  const showRenderedImage = Boolean(primaryImage);
  const showPageBadge = showRenderedImage && pageCount > 1;
  const stopCardPress = (event: GestureResponderEvent, action?: () => void) => {
    event.stopPropagation?.();
    action?.();
  };

  return (
    <Pressable style={styles.card} onPress={onPress} testID={testID}>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {post.title || "(제목 없음)"}
        </Text>
        {onMorePress ? (
          <Pressable
            onPress={(event) => stopCardPress(event, onMorePress)}
            hitSlop={10}
            style={styles.moreBtn}
            testID={moreTestID}
            accessibilityRole="button"
            accessibilityLabel="게시글 안전 메뉴 열기"
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={tokens.colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      {showRenderedImage ? (
        <View style={styles.renderedImageWrap}>
          {showPageBadge ? (
            <View style={styles.renderedPageBadge}>
              <Text style={styles.renderedPageBadgeText}>{pageCount}장</Text>
            </View>
          ) : null}
          <Image
            source={{ uri: primaryImage }}
            style={styles.renderedImage}
            contentFit="cover"
            transition={120}
          />
        </View>
      ) : null}

      {/* 내용 요약 */}
      {!showRenderedImage && !!post.excerpt && (
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
            onPress={(event) => stopCardPress(event, onLikePress)}
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
            onPress={(event) => stopCardPress(event, onBookmarkPress)}
            hitSlop={10}
            style={[styles.actionBtn, { marginLeft: 14 }]}
            testID={bookmarkTestID}
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

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    paddingVertical: 20,
    paddingHorizontal: 18,

    // 피그마 톤: 테두리 거의 없음
    borderWidth: 0,

    ...softCardShadowStyle,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: tokens.colors.text,
    marginBottom: 12,
  },
  renderedImageWrap: {
    position: "relative",
    marginBottom: 16,
    borderRadius: tokens.radius.xl,
    overflow: "hidden",
    backgroundColor: "#f4ead8",
    borderWidth: 1,
    borderColor: "rgba(86,62,32,0.08)",
  },
  renderedImage: {
    width: "100%",
    aspectRatio: 500 / 666,
    backgroundColor: "#f4ead8",
  },
  renderedPageBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: "rgba(63,47,28,0.78)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  renderedPageBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fffaf4",
  },
  moreBtn: {
    width: 34,
    height: 34,
    marginTop: -4,
    marginRight: -4,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
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
