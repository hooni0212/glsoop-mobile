import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";

import { useAuth } from "@/auth/AuthContext";
import { COOKIE_SESSION_TOKEN } from "@/lib/authToken";
import {
  buildFallbackFeedPreview,
  createFeedPreviewSession,
  type FeedPreviewRenderImages,
} from "@/lib/feedImage";
import { logger } from "@/lib/logger";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import { tokens } from "@/theme/tokens";
import type { PostType } from "@/types/post";

const PREVIEW_REQUEST_DEBOUNCE_MS = 450;
const PREVIEW_SESSION_PATH = "/api/feed-images/preview/sessions/";

type Props = {
  title: string;
  body: string;
  selectedType?: PostType | null;
  layout: WriteLayoutModel;
  fontKey: PostFontKey;
  compact?: boolean;
};

function isPreviewSessionImageUrl(uri: string) {
  return uri.includes(PREVIEW_SESSION_PATH);
}

export function WritePreviewCard({
  title,
  body,
  selectedType,
  layout,
  fontKey,
  compact = false,
}: Props) {
  const { token } = useAuth();
  const previewTitle = title.trim() || "제목 미리보기";
  const previewBody = body.trim() || "본문이 여기에 보여요.";
  const [preview, setPreview] = useState<FeedPreviewRenderImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const requestSeqRef = useRef(0);
  const previewRef = useRef<FeedPreviewRenderImages | null>(null);
  const previousVisualSignatureRef = useRef<string | null>(null);
  const previewCreatedAtRef = useRef(new Date().toISOString());
  const listRef = useRef<FlatList<string> | null>(null);

  const previewLayout = useMemo(
    () => ({
      ...layout,
      showFooter: true,
    }),
    [layout]
  );
  const previewVisualSignature = useMemo(
    () =>
      JSON.stringify({
        category: selectedType ?? "short",
        fontKey,
        layout: previewLayout,
      }),
    [fontKey, previewLayout, selectedType]
  );

  useEffect(() => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const shouldResetPreview = previousVisualSignatureRef.current !== previewVisualSignature;
    previousVisualSignatureRef.current = previewVisualSignature;

    if (shouldResetPreview) {
      previewRef.current = null;
      setPreview(null);
      setCurrentPage(0);
    }

    if (shouldResetPreview || !previewRef.current) {
      setLoading(true);
    }
    setError(null);
    setImageLoadError(null);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const nextPreview = await createFeedPreviewSession({
            title: previewTitle,
            content: previewBody,
            category: selectedType ?? "short",
            layout: previewLayout,
            template: previewLayout.presetId,
            fontKey,
            createdAt: previewCreatedAtRef.current,
          });

          if (requestSeq !== requestSeqRef.current) return;
          previewRef.current = nextPreview;
          setPreview(nextPreview);
          setCurrentPage((prevPage) =>
            Math.max(0, Math.min(prevPage, Math.max(0, nextPreview.images.length - 1)))
          );
        } catch (nextError) {
          if (requestSeq !== requestSeqRef.current) return;
          const fallbackPreview = buildFallbackFeedPreview({
            title: previewTitle,
            content: previewBody,
            category: selectedType ?? "short",
            layout: previewLayout,
            template: previewLayout.presetId,
            fontKey,
            createdAt: previewCreatedAtRef.current,
          });
          logger.warn("[write-preview] session preview failed; using fallback URL", nextError);
          previewRef.current = fallbackPreview;
          setPreview(fallbackPreview);
          setCurrentPage(0);
          setError(null);
        } finally {
          if (requestSeq === requestSeqRef.current) {
            setLoading(false);
          }
        }
      })();
    }, PREVIEW_REQUEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [fontKey, previewBody, previewLayout, previewTitle, previewVisualSignature, selectedType]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(() => {
    setImageLoadError(null);
  }, [preview?.renderImages.previewSessionId]);

  useEffect(() => {
    if (!preview?.renderImages.previewSessionId) return;
    if (!listRef.current) return;
    if (viewportWidth <= 0) return;
    listRef.current.scrollToOffset({ offset: currentPage * viewportWidth, animated: false });
  }, [currentPage, preview?.renderImages.previewSessionId, viewportWidth]);

  const images = preview?.images ?? [];
  const requiresAuthorizedImages = images.some(isPreviewSessionImageUrl);
  const previewImageHeaders = useMemo<Record<string, string> | undefined>(() => {
    if (!requiresAuthorizedImages) return undefined;
    if (token && token !== COOKIE_SESSION_TOKEN) {
      return { Authorization: `Bearer ${token}` };
    }
    if (Platform.OS === "web") {
      // expo-image on web uses fetch when headers is present, which preserves same-origin cookies.
      return {} as Record<string, string>;
    }
    return undefined;
  }, [requiresAuthorizedImages, token]);
  const totalPages = Math.max(
    1,
    preview?.renderImages.pageCount ?? images.length ?? 1
  );
  const isTruncated = Boolean(preview?.renderImages.isTruncated);
  const visibleError = error || imageLoadError;

  const buildPreviewImageSource = (uri: string) => {
    if (!isPreviewSessionImageUrl(uri) || !previewImageHeaders) {
      return { uri };
    }
    return { uri, headers: previewImageHeaders };
  };

  const onLayoutViewport = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== viewportWidth) {
      setViewportWidth(nextWidth);
    }
  };

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const width = viewportWidth || event.nativeEvent.layoutMeasurement.width;
    if (!width) return;
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(Math.max(0, Math.min(nextPage, totalPages - 1)));
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={[styles.frame, compact && styles.frameCompact]}>
        <View
          style={[styles.viewport, compact && styles.viewportCompact]}
          onLayout={onLayoutViewport}
        >
          {images.length > 0 ? (
            <FlatList
              ref={listRef}
              data={images}
              keyExtractor={(item, index) => `${item}-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.page,
                    viewportWidth > 0 ? { width: viewportWidth } : null,
                    compact && styles.pageCompact,
                  ]}
                >
                  <Image
                    source={buildPreviewImageSource(item)}
                    style={[styles.image, compact && styles.imageCompact]}
                    contentFit="contain"
                    cachePolicy="none"
                    transition={120}
                    onError={() => {
                      logger.warn("[write-preview] image load failed", {
                        platform: Platform.OS,
                        requiresAuthorizedImages,
                        hasToken: Boolean(token && token !== COOKIE_SESSION_TOKEN),
                        uri: item,
                      });
                      setImageLoadError("미리보기 이미지를 불러오지 못했어요. 다시 열어 주세요.");
                    }}
                  />
                </View>
              )}
            />
          ) : (
            <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
              <Text style={styles.emptyStateText}>
                {visibleError || "미리보기를 준비하고 있어요."}
              </Text>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#5f4931" />
            </View>
          ) : null}
        </View>

        {images.length > 1 ? (
          <View style={styles.pageCounter}>
            <Text style={styles.pageCounterText}>
              {Math.min(currentPage + 1, totalPages)} / {totalPages}
            </Text>
          </View>
        ) : null}

        {visibleError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{visibleError}</Text>
          </View>
        ) : null}

        {isTruncated ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              미리보기 이미지는 일부만 표시됩니다.
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
  },
  wrapCompact: {
    marginBottom: 8,
  },
  frame: {
    borderRadius: 24,
    padding: 0,
    backgroundColor: "#f2eddc",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    overflow: "hidden",
  },
  frameCompact: {
    borderRadius: 20,
    paddingVertical: 8,
  },
  viewport: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
  },
  viewportCompact: {
    borderRadius: 20,
  },
  page: {
    width: "100%",
  },
  pageCompact: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    aspectRatio: 500 / 666,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f2eddc",
  },
  imageCompact: {
    width: 210,
    height: 280,
    alignSelf: "center",
    borderRadius: 18,
  },
  emptyState: {
    width: "100%",
    aspectRatio: 500 / 666,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f2eddc",
  },
  emptyStateCompact: {
    width: 210,
    height: 280,
    alignSelf: "center",
    borderRadius: 18,
  },
  emptyStateText: {
    color: tokens.colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,254,250,0.42)",
  },
  pageCounter: {
    marginTop: 12,
    alignItems: "center",
  },
  pageCounterText: {
    fontSize: 13,
    fontWeight: "800",
    color: tokens.colors.textMuted,
  },
  errorBox: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: tokens.colors.dangerSoft,
    borderWidth: 1,
    borderColor: tokens.colors.dangerBorder,
  },
  errorText: {
    color: tokens.colors.danger,
    lineHeight: 20,
    fontWeight: "700",
  },
  noticeBox: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fdfcf7",
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  noticeText: {
    color: tokens.colors.textMuted,
    lineHeight: 20,
    fontWeight: "700",
  },
});
