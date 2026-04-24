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
  const cardTitle = post.title || "(제목 없음)";
  const canLike = Boolean(onLikePress);
  const canBookmark = Boolean(onBookmarkPress);

  return (
    <View style={[styles.card, bookmarked && styles.cardSaved]} testID={testID}>
      <View style={styles.titleRow}>
        {onPress ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.openTitleArea, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={`게시글 열기: ${cardTitle}`}
          >
            <Text style={styles.title} numberOfLines={2}>
              {cardTitle}
            </Text>
          </Pressable>
        ) : (
          <View style={styles.openTitleArea}>
            <Text style={styles.title} numberOfLines={2}>
              {cardTitle}
            </Text>
          </View>
        )}
        {onMorePress ? (
          <Pressable
            onPress={onMorePress}
            hitSlop={10}
            style={({ pressed }) => [styles.moreBtn, pressed && styles.moreBtnPressed]}
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

      {onPress ? (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.openContentArea, pressed && styles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel={`게시글 열기: ${cardTitle}`}
        >
          {showRenderedImage ? (
            <RenderedImage
              primaryImage={primaryImage}
              showPageBadge={showPageBadge}
              pageCount={pageCount}
            />
          ) : null}

          {!showRenderedImage && !!post.excerpt ? (
            <Text style={styles.excerpt} numberOfLines={3}>
              {post.excerpt}
            </Text>
          ) : null}
        </Pressable>
      ) : (
        <View style={styles.openContentArea}>
          {showRenderedImage ? (
            <RenderedImage
              primaryImage={primaryImage}
              showPageBadge={showPageBadge}
              pageCount={pageCount}
            />
          ) : null}

          {!showRenderedImage && !!post.excerpt ? (
            <Text style={styles.excerpt} numberOfLines={3}>
              {post.excerpt}
            </Text>
          ) : null}
        </View>
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
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && !likeDisabled && canLike && styles.actionBtnPressed,
              likeDisabled && styles.actionBtnDisabled,
            ]}
            disabled={likeDisabled || !canLike}
            testID={likeTestID}
            accessibilityRole="button"
            accessibilityLabel={liked ? "좋아요 취소" : "좋아요"}
            accessibilityState={{ disabled: Boolean(likeDisabled || !canLike), selected: liked }}
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
            style={({ pressed }) => [
              styles.actionBtn,
              styles.bookmarkBtn,
              pressed && canBookmark && styles.actionBtnPressed,
              !canBookmark && styles.actionBtnDisabled,
            ]}
            disabled={!canBookmark}
            testID={bookmarkTestID}
            accessibilityRole="button"
            accessibilityLabel={bookmarked ? "북마크 해제" : "북마크 저장"}
            accessibilityState={{ disabled: !canBookmark, selected: bookmarked }}
          >
            <Ionicons
              name={bookmarked ? "bookmark" : "bookmark-outline"}
              size={18}
              color={bookmarked ? tokens.colors.green700 : tokens.colors.textMuted}
            />
            <Text
              style={[
                styles.actionText,
                bookmarked && { color: tokens.colors.green700 },
              ]}
            >
              {bookmarked ? "저장됨" : "저장"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function RenderedImage({
  primaryImage,
  showPageBadge,
  pageCount,
}: {
  primaryImage: string;
  showPageBadge: boolean;
  pageCount: number;
}) {
  return (
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
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 357,
    alignSelf: "center",
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.xl,
    paddingVertical: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: tokens.colors.border,

    ...softCardShadowStyle,
  },
  cardSaved: {
    borderColor: tokens.colors.border,
  },
  cardPressed: {
    backgroundColor: tokens.colors.green100,
    opacity: 0.96,
  },
  openTitleArea: {
    flex: 1,
  },
  openContentArea: {
    width: "100%",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 30,
    color: tokens.colors.text,
    marginBottom: 4,
  },
  renderedImageWrap: {
    position: "relative",
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: tokens.colors.bgMuted,
  },
  renderedImage: {
    width: "100%",
    aspectRatio: 317 / 134,
    backgroundColor: tokens.colors.bgMuted,
  },
  renderedPageBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.overlaySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  renderedPageBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: tokens.colors.textInverse,
  },
  moreBtn: {
    width: 34,
    height: 34,
    marginTop: -4,
    marginRight: -4,
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  moreBtnPressed: { opacity: 0.78 },

  excerpt: {
    fontSize: 14,
    lineHeight: 22,
    color: tokens.colors.textMuted,
    marginTop: 8,
    marginBottom: 16,
    fontWeight: "600",
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
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: "800",
  },

  metaDot: {
    fontSize: 12,
    color: tokens.colors.textFaint,
    fontWeight: "900",
  },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookmarkBtn: {
    marginLeft: 6,
  },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 4,
    borderRadius: tokens.radius.pill,
  },
  actionBtnPressed: {
    backgroundColor: tokens.colors.bgMuted,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },

  actionText: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    fontWeight: "900",
  },
});
