import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";

import {
  appendRenderedImageFormat,
  buildFallbackFeedPreview,
  createFeedPreviewSession,
  type FeedPreviewRenderImages,
} from "@/lib/feedImage";
import { logger } from "@/lib/logger";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import {
  getWritePostTypeLabel,
  type WriteEditorInsight,
} from "@/lib/writeEditorInsights";
import { tokens } from "@/theme/tokens";
import type { PostType } from "@/types/post";

const PREVIEW_REQUEST_DEBOUNCE_MS = 450;
const EMPTY_IMAGES: string[] = [];

type Props = {
  title: string;
  body: string;
  contentPages?: string[];
  selectedType?: PostType | null;
  layout: WriteLayoutModel;
  fontKey: PostFontKey;
  insight?: WriteEditorInsight;
  compact?: boolean;
};

export function WritePreviewCard({
  title,
  body,
  contentPages,
  selectedType,
  layout,
  fontKey,
  insight,
  compact = false,
}: Props) {
  const previewTitle = title.trim() || "제목 미리보기";
  const previewBody = body.trim() || "본문이 여기에 보여요.";
  const previewContentPages = useMemo(
    () =>
      Array.isArray(contentPages)
        ? contentPages.map((page) => String(page || "").trim()).filter((page, index, arr) => {
            if (page) return true;
            return index < arr.length - 1;
          })
        : [],
    [contentPages]
  );
  const [preview, setPreview] = useState<FeedPreviewRenderImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const [usePngFallback, setUsePngFallback] = useState(false);
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
        contentPages: previewContentPages,
      }),
    [fontKey, previewContentPages, previewLayout, selectedType]
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
    setUsePngFallback(false);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const nextPreview = await createFeedPreviewSession({
            title: previewTitle,
            content: previewBody,
            contentPages: previewContentPages,
            category: selectedType ?? "short",
            layout: previewLayout,
            template: previewLayout.presetId,
            fontKey,
            createdAt: previewCreatedAtRef.current,
          });

          if (requestSeq !== requestSeqRef.current) return;
          previewRef.current = nextPreview;
          setPreview(nextPreview);
          setUsePngFallback(false);
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
          setUsePngFallback(false);
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
  }, [fontKey, previewBody, previewContentPages, previewLayout, previewTitle, previewVisualSignature, selectedType]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(() => {
    setImageLoadError(null);
    setUsePngFallback(false);
  }, [preview?.renderImages.previewSessionId]);

  useEffect(() => {
    if (!preview?.renderImages.previewSessionId) return;
    if (!listRef.current) return;
    if (viewportWidth <= 0) return;
    listRef.current.scrollToOffset({ offset: currentPage * viewportWidth, animated: false });
  }, [currentPage, preview?.renderImages.previewSessionId, viewportWidth]);

  const rawImages = preview?.images ?? EMPTY_IMAGES;
  const images = useMemo(() => {
    if (Platform.OS !== "android" || !usePngFallback) return rawImages;
    return rawImages.map((item) => appendRenderedImageFormat(item, "png"));
  }, [rawImages, usePngFallback]);
  const totalPages = Math.max(
    1,
    preview?.renderImages.pageCount ?? images.length ?? 1
  );
  const isTruncated = Boolean(preview?.renderImages.isTruncated);
  const visibleError = error || imageLoadError;
  const summaryPageCount = preview?.renderImages.pageCount ?? insight?.estimatedPageCount ?? totalPages;
  const summaryTypeLabel = selectedType
    ? getWritePostTypeLabel(selectedType)
    : insight?.detectedLabel ?? "자동";
  const summaryDensityLabel = insight?.densityLabel ?? "미리보기";
  const imageFormatLabel = Platform.OS === "android" && usePngFallback ? "png" : "webp";

  const buildPreviewImageSource = (uri: string) => {
    return { uri };
  };

  const onPreviewImageError = (uri: string) => {
    if (Platform.OS === "android" && !usePngFallback) {
      logger.warn("[write-preview] image load failed; retrying png fallback", {
        platform: Platform.OS,
        uri,
      });
      setImageLoadError(null);
      setUsePngFallback(true);
      return;
    }

    logger.warn("[write-preview] image load failed", {
      platform: Platform.OS,
      format: imageFormatLabel,
      uri,
    });
    setImageLoadError("미리보기 이미지를 불러오지 못했어요. 다시 열어 주세요.");
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

  const onPressPageThumbnail = (index: number) => {
    const nextPage = Math.max(0, Math.min(index, totalPages - 1));
    setCurrentPage(nextPage);
    if (viewportWidth > 0) {
      listRef.current?.scrollToOffset({ offset: nextPage * viewportWidth, animated: true });
    }
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryEyebrow}>출판 미리보기</Text>
          <Text style={styles.summaryTitle}>
            {summaryTypeLabel} · 총 {Math.max(1, summaryPageCount)}장
          </Text>
        </View>
        <View style={styles.summaryPill}>
          <Text style={styles.summaryPillText}>{summaryDensityLabel}</Text>
        </View>
      </View>

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
              initialNumToRender={1}
              maxToRenderPerBatch={1}
              windowSize={2}
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
                    onError={() => onPreviewImageError(item)}
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

        {images.length > 1 ? (
          <View style={styles.thumbnailStrip}>
            {images.slice(0, 6).map((item, index) => {
              const active = index === currentPage;
              return (
                <Pressable
                  key={`${item}-thumb-${index}`}
                  onPress={() => onPressPageThumbnail(index)}
                  style={[styles.thumbnailButton, active && styles.thumbnailButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1}페이지 미리보기`}
                  accessibilityState={{ selected: active }}
                >
                  {Platform.OS === "android" ? (
                    <Text
                      style={[
                        styles.thumbnailText,
                        active && styles.thumbnailTextActive,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  ) : (
                    <Image
                      source={buildPreviewImageSource(item)}
                      style={styles.thumbnailImage}
                      contentFit="cover"
                      cachePolicy="none"
                    />
                  )}
                </Pressable>
              );
            })}
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
  summaryBar: {
    marginBottom: 10,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#fffefa",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryCopy: {
    flex: 1,
    gap: 3,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: "900",
    color: tokens.colors.textFaint,
    letterSpacing: 0,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: tokens.colors.text,
    letterSpacing: 0,
  },
  summaryPill: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.green050,
    borderWidth: 1,
    borderColor: tokens.colors.green100,
  },
  summaryPillText: {
    fontSize: 12,
    fontWeight: "900",
    color: tokens.colors.green700,
    letterSpacing: 0,
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
  thumbnailStrip: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  thumbnailButton: {
    width: 42,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tokens.colors.border,
    backgroundColor: "#f2eddc",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailButtonActive: {
    borderWidth: 2,
    borderColor: tokens.colors.green700,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailText: {
    fontSize: 13,
    fontWeight: "900",
    color: tokens.colors.textMuted,
  },
  thumbnailTextActive: {
    color: tokens.colors.green700,
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
