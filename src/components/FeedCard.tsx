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
  const authorInitial = author.slice(0, 1) || "?";
  const canLike = Boolean(onLikePress);
  const canBookmark = Boolean(onBookmarkPress);

  return (
    <View style={[styles.card, bookmarked && styles.cardSaved]} testID={testID}>
      <View style={styles.authorRow}>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          style={({ pressed }) => [styles.authorPressArea, pressed && styles.cardPressed]}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityLabel={onPress ? `게시글 열기: ${cardTitle}` : undefined}
        >
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{authorInitial}</Text>
            </View>
          </View>
          <View style={styles.authorTextBlock}>
            <Text style={styles.authorName} numberOfLines={1}>
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

      <View style={styles.socialRow}>
        <View style={styles.leftActions}>
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
              size={24}
              color={liked ? tokens.colors.green700 : tokens.colors.text}
            />
          </Pressable>

          <Pressable
            onPress={onPress}
            disabled={!onPress}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconOnlyBtn,
              pressed && onPress && styles.actionBtnPressed,
              !onPress && styles.actionBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="댓글 보기"
          >
            <Ionicons name="chatbubble-outline" size={23} color={tokens.colors.text} />
          </Pressable>

          <Pressable
            onPress={onPress}
            disabled={!onPress}
            hitSlop={10}
            style={({ pressed }) => [
              styles.iconOnlyBtn,
              pressed && onPress && styles.actionBtnPressed,
              !onPress && styles.actionBtnDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="공유 화면 열기"
          >
            <Ionicons name="paper-plane-outline" size={23} color={tokens.colors.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={onBookmarkPress}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconOnlyBtn,
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
            size={24}
            color={bookmarked ? tokens.colors.green700 : tokens.colors.text}
          />
        </Pressable>
      </View>

      <View style={styles.captionBlock}>
        <Text style={styles.likeSummary}>좋아요 {likeCount}</Text>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          style={({ pressed }) => [styles.captionPressArea, pressed && styles.cardPressed]}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityLabel={onPress ? `게시글 열기: ${cardTitle}` : undefined}
        >
          <Text style={styles.captionText} numberOfLines={2}>
            <Text style={styles.captionAuthor}>{author}</Text>
            {" "}
            {cardTitle}
            {post.excerpt ? ` ${post.excerpt}` : ""}
          </Text>
        </Pressable>
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
    minHeight: 62,
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
    gap: 10,
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#f0a03a",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green100,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "900",
    color: tokens.colors.green900,
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
    width: 28,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
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

  captionBlock: {
    paddingHorizontal: 14,
    gap: 5,
  },
  likeSummary: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    color: tokens.colors.text,
  },
  captionPressArea: {
    borderRadius: 8,
  },
  captionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    color: tokens.colors.text,
  },
  captionAuthor: {
    fontWeight: "900",
  },
});
