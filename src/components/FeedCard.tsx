import { tokens } from "@/theme/tokens";
import { resolvePostRenderImages } from "@/lib/postRenderImages";
import { appendRenderedImageFormat } from "@/lib/feedImage";
import type { Post } from "@/types/post";
import { formatRelativeKorean } from "@/lib/dateTime";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { typography } from "@/theme/typography";
import { useReducedMotion } from "@/hooks/useReducedMotion";

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
  const reducedMotion = useReducedMotion();
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
  const authorProfilePhoto =
    post.author?.profilePhotoThumbnailUrl || post.author?.profilePhotoUrl || "";
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
          {authorProfilePhoto ? (
            <Image
              source={{ uri: authorProfilePhoto }}
              style={styles.authorPhoto}
              contentFit="cover"
              transition={reducedMotion ? 0 : 120}
            />
          ) : null}
          <View style={styles.authorTextBlock}>
            <View style={styles.authorMetaLine}>
              <Text style={styles.authorName} numberOfLines={1}>
                {authorBadge ? <Text style={styles.authorBadge}>{authorBadge} </Text> : null}
                {author}
              </Text>
              <View style={styles.metaDot} />
              <Text style={styles.postMeta} numberOfLines={1}>
                {timeLabel}
              </Text>
            </View>
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
              reducedMotion={reducedMotion}
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
              reducedMotion={reducedMotion}
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
                  size={21}
                  color={liked ? tokens.colors.green700 : tokens.colors.textMuted}
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
                size={21}
                color={bookmarked ? tokens.colors.green700 : tokens.colors.textMuted}
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
  reducedMotion,
}: {
  primaryImage: string;
  showPageBadge: boolean;
  pageCount: number;
  reducedMotion: boolean;
}) {
  const [usePngFallback, setUsePngFallback] = React.useState(false);
  const [renderFailed, setRenderFailed] = React.useState(false);
  const imageUri =
    Platform.OS === "android" && usePngFallback
      ? appendRenderedImageFormat(primaryImage, "png")
      : primaryImage;

  React.useEffect(() => {
    setUsePngFallback(false);
    setRenderFailed(false);
  }, [primaryImage]);

  const onRenderedImageError = () => {
    if (Platform.OS === "android" && !usePngFallback) {
      setRenderFailed(false);
      setUsePngFallback(true);
      return;
    }
    setRenderFailed(true);
  };

  return (
    <View style={styles.renderedImageWrap}>
      {showPageBadge ? (
        <View style={styles.renderedPageBadge}>
          <Text style={styles.renderedPageBadgeText}>{pageCount}장</Text>
        </View>
      ) : null}
      {renderFailed ? (
        <View style={[styles.renderedImage, styles.renderedImageFallback]}>
          <Text style={styles.renderedImageFallbackText}>
            이미지를 불러오지 못했어요.
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: imageUri }}
          style={styles.renderedImage}
          contentFit="contain"
          transition={reducedMotion ? 0 : 120}
          onError={onRenderedImageError}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },
  cardSaved: {
    backgroundColor: "transparent",
  },
  cardPressed: {
    opacity: 0.78,
  },
  authorRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
  },
  authorPressArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
  },
  authorTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  authorPhoto: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 9,
    backgroundColor: tokens.colors.surfaceStrong,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  authorName: {
    ...typography.author,
    color: tokens.colors.text,
    flexShrink: 1,
  },
  authorBadge: {
    fontSize: 13,
    color: tokens.colors.green700,
  },
  authorMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: 7,
  },
  metaDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: tokens.colors.textFaint,
    flexShrink: 0,
  },
  postMeta: {
    ...typography.meta,
    color: tokens.colors.textFaint,
    flexShrink: 0,
  },
  openContentArea: {
    width: "100%",
  },
  renderedImageWrap: {
    position: "relative",
    marginHorizontal: 0,
    overflow: "hidden",
    backgroundColor: tokens.colors.paper,
    borderWidth: 1,
    borderColor: tokens.colors.paperBorder,
  },
  renderedImage: {
    width: "100%",
    aspectRatio: 500 / 666,
    backgroundColor: tokens.colors.paper,
  },
  renderedImageFallback: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  renderedImageFallbackText: {
    color: tokens.colors.textMuted,
    fontSize: 13,
    fontFamily: typography.meta.fontFamily,
    textAlign: "center",
  },
  renderedPageBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 2,
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.overlaySoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  renderedPageBadgeText: {
    ...typography.meta,
    color: tokens.colors.textInverse,
  },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  moreBtnPressed: { opacity: 0.78 },

  excerpt: {
    ...typography.excerpt,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.paper,
    borderWidth: 1,
    borderColor: tokens.colors.paperBorder,
    borderRadius: 3,
    marginHorizontal: 22,
    paddingHorizontal: 26,
    paddingVertical: 28,
  },

  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: 22,
    paddingTop: 4,
  },

  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.pill,
    flexDirection: "row",
    gap: 5,
  },
  iconOnlyBtn: {
    width: 44,
    height: 44,
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
    ...typography.actionMeta,
    color: tokens.colors.textMuted,
  },
  actionCountTextActive: {
    color: tokens.colors.green700,
  },
});
