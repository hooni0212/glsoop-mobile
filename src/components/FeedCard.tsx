import { tokens } from "@/theme/tokens";
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
  onAuthorPress?: () => void;
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
  onAuthorPress,
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
  const primaryBadge = post.author?.profileCosmetics?.primary_badge;
  const authorBadge = primaryBadge?.icon_emoji?.trim();
  const canLike = Boolean(onLikePress);
  const canBookmark = Boolean(onBookmarkPress);
  const showSocialRow = Boolean(canLike || canBookmark);

  return (
    <View style={[styles.card, bookmarked && styles.cardSaved]} testID={testID}>
      <View style={styles.authorRow}>
        <Pressable
          onPress={onAuthorPress}
          disabled={!onAuthorPress}
          style={({ pressed }) => [styles.authorPressArea, pressed && styles.cardPressed]}
          accessibilityRole={onAuthorPress ? "button" : undefined}
          accessibilityLabel={onAuthorPress ? `작가 페이지 열기: ${author}` : undefined}
        >
          <View style={styles.authorTextBlock}>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorBadge ? <Text style={styles.authorBadge}>{authorBadge} </Text> : null}
              {author}
            </Text>
            <Text style={styles.postMeta} numberOfLines={1}>
              {timeLabel}
            </Text>
          </View>
        </Pressable>

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

      {showSocialRow ? (
        <View style={styles.socialRow}>
          <View style={styles.leftActions}>
            {canLike ? (
              <Pressable
                onPress={onLikePress}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && !likeDisabled && styles.actionBtnPressed,
                  likeDisabled && styles.actionBtnDisabled,
                ]}
                disabled={likeDisabled}
                testID={likeTestID}
                accessibilityRole="button"
                accessibilityLabel={liked ? "공감 취소" : "공감"}
                accessibilityState={{ disabled: Boolean(likeDisabled), selected: liked }}
              >
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={24}
                  color={liked ? tokens.colors.green700 : tokens.colors.text}
                />
                <Text style={[styles.actionCountText, liked && styles.actionCountTextActive]}>
                  {likeCount}
                </Text>
              </Pressable>
            ) : null}

          </View>

          {canBookmark ? (
            <Pressable
              onPress={onBookmarkPress}
              hitSlop={10}
              style={({ pressed }) => [
                styles.iconOnlyBtn,
                pressed && styles.actionBtnPressed,
              ]}
              testID={bookmarkTestID}
              accessibilityRole="button"
              accessibilityLabel={bookmarked ? "북마크 해제" : "북마크 저장"}
              accessibilityState={{ selected: bookmarked }}
            >
              <Ionicons
                name={bookmarked ? "bookmark" : "bookmark-outline"}
                size={24}
                color={bookmarked ? tokens.colors.green700 : tokens.colors.text}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

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
        contentFit="contain"
        transition={120}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 393,
    alignSelf: "center",
    backgroundColor: tokens.colors.surface,
    borderRadius: 28,
    paddingBottom: 14,
    overflow: "hidden",
  },
  cardSaved: {
    backgroundColor: tokens.colors.surface,
  },
  cardPressed: {
    opacity: 0.78,
  },
  authorRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  authorPressArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  authorTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  authorName: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  authorBadge: {
    fontSize: 13,
    fontWeight: "900",
    color: tokens.colors.green700,
  },
  postMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: tokens.colors.textMuted,
  },
  openContentArea: {
    width: "100%",
  },
  renderedImageWrap: {
    position: "relative",
    marginHorizontal: 0,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#f7f3ea",
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  renderedImage: {
    width: "100%",
    aspectRatio: 500 / 666,
    backgroundColor: "#f7f3ea",
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
    borderRadius: tokens.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  moreBtnPressed: { opacity: 0.78 },

  excerpt: {
    fontSize: 14,
    lineHeight: 22,
    color: tokens.colors.textMuted,
    paddingHorizontal: 18,
    paddingVertical: 18,
    fontWeight: "600",
  },

  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
    paddingHorizontal: 14,
    paddingTop: 8,
  },

  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    minWidth: 42,
    height: 32,
    paddingHorizontal: 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
    flexDirection: "row",
    gap: 4,
  },
  iconOnlyBtn: {
    width: 28,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
  },
  actionBtnPressed: {
    backgroundColor: tokens.colors.bgMuted,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  actionCountText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  actionCountTextActive: {
    color: tokens.colors.green700,
  },
});
