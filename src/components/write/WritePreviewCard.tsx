import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { writePreviewCardStyles as styles } from "@/components/write/WritePreviewCard.styles";
import {
  LocalPreviewPageCanvas,
  ServerPreviewPageCanvas,
} from "@/components/write/preview/WritePreviewCanvas";
import {
  useServerWritePreview,
  type ServerPreviewStatus,
} from "@/components/write/preview/useServerWritePreview";
import { appendRenderedImageFormat } from "@/lib/feedImage";
import {
  buildLocalFeedPreview,
  type LocalFeedPreviewPage,
} from "@/lib/localFeedPreview";
import { logger } from "@/lib/logger";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import {
  getWritePostTypeLabel,
  type WriteEditorInsight,
} from "@/lib/writeEditorInsights";
import type { PostType } from "@/types/post";

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

type DisplayPreviewPage =
  | {
      kind: "local";
      key: string;
      pageNumber: number;
      page: LocalFeedPreviewPage;
    }
  | {
      kind: "server";
      key: string;
      pageNumber: number;
      uri: string;
    };

function normalizeContentPages(contentPages?: string[]) {
  if (!Array.isArray(contentPages)) return [];

  return contentPages
    .map((page) => String(page || "").trim())
    .filter((page, index, pages) => Boolean(page) || index < pages.length - 1);
}

function getStatusLabel(status: ServerPreviewStatus) {
  if (status === "ready") return "최종 렌더";
  if (status === "local-fallback") return "로컬 미리보기";
  return "서버 확인 중";
}

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
    () => normalizeContentPages(contentPages),
    [contentPages]
  );
  const previewLayout = useMemo(
    () => ({
      ...layout,
      showFooter: true,
    }),
    [layout]
  );
  const resolvedType = selectedType ?? "short";
  const localPreview = useMemo(
    () =>
      buildLocalFeedPreview({
        title: previewTitle,
        content: previewBody,
        contentPages: previewContentPages,
        category: resolvedType,
        layout: previewLayout,
        fontKey,
      }),
    [fontKey, previewBody, previewContentPages, previewLayout, previewTitle, resolvedType]
  );
  const serverPreviewInput = useMemo(
    () => ({
      title: previewTitle,
      content: previewBody,
      contentPages: previewContentPages,
      category: resolvedType,
      layout: previewLayout,
      fontKey,
    }),
    [fontKey, previewBody, previewContentPages, previewLayout, previewTitle, resolvedType]
  );
  const serverPreview = useServerWritePreview(serverPreviewInput);

  const [currentPage, setCurrentPage] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [usePngFallback, setUsePngFallback] = useState(false);
  const [imageLoadError, setImageLoadError] = useState<string | null>(null);
  const listRef = useRef<FlatList<DisplayPreviewPage> | null>(null);

  useEffect(() => {
    setUsePngFallback(false);
    setImageLoadError(null);
  }, [serverPreview.signature]);

  const serverImages = useMemo(() => {
    const images = serverPreview.preview?.images ?? [];
    if (Platform.OS !== "android" || !usePngFallback) return images;
    return images.map((uri) => appendRenderedImageFormat(uri, "png"));
  }, [serverPreview.preview?.images, usePngFallback]);
  const usesServerRender =
    serverPreview.status === "ready" &&
    serverImages.length > 0 &&
    imageLoadError == null;
  const effectiveStatus: ServerPreviewStatus = imageLoadError
    ? "local-fallback"
    : serverPreview.status;

  const displayPages = useMemo<DisplayPreviewPage[]>(() => {
    if (usesServerRender) {
      return serverImages.map((uri, index) => ({
        kind: "server",
        key: `server-${index + 1}-${uri}`,
        pageNumber: index + 1,
        uri,
      }));
    }

    return localPreview.pages.map((page) => ({
      kind: "local",
      key: `local-${page.pageNumber}-${page.id}`,
      pageNumber: page.pageNumber,
      page,
    }));
  }, [localPreview.pages, serverImages, usesServerRender]);

  const totalPages = Math.max(
    1,
    usesServerRender
      ? serverPreview.preview?.renderImages.pageCount ?? serverImages.length
      : localPreview.pageCount
  );
  const isTruncated = usesServerRender
    ? Boolean(serverPreview.preview?.renderImages.isTruncated)
    : Boolean(localPreview.isTruncated);
  const summaryTypeLabel = selectedType
    ? getWritePostTypeLabel(selectedType)
    : insight?.detectedLabel ?? "자동";
  const summaryDensityLabel = insight?.densityLabel ?? "미리보기";
  const fallbackMessage = imageLoadError || serverPreview.errorMessage;

  useEffect(() => {
    setCurrentPage((current) => Math.max(0, Math.min(current, totalPages - 1)));
  }, [totalPages]);

  useEffect(() => {
    if (!listRef.current || viewportWidth <= 0) return;
    listRef.current.scrollToOffset({
      offset: currentPage * viewportWidth,
      animated: false,
    });
  }, [currentPage, usesServerRender, viewportWidth]);

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
      listRef.current?.scrollToOffset({
        offset: nextPage * viewportWidth,
        animated: true,
      });
    }
  };

  const onServerImageError = (uri: string) => {
    // 일부 Android 디코더에서 WebP 로딩이 실패하면 동일 세션의 PNG를 한 번만 재시도한다.
    if (Platform.OS === "android" && !usePngFallback) {
      logger.warn("[write-preview] webp failed; retrying server preview as png", { uri });
      setUsePngFallback(true);
      return;
    }

    logger.warn("[write-preview] server preview image failed; keeping local preview", {
      uri,
      platform: Platform.OS,
    });
    setImageLoadError("서버 이미지를 불러오지 못해 로컬 미리보기를 표시하고 있어요.");
  };

  const onRetryServerPreview = () => {
    setUsePngFallback(false);
    setImageLoadError(null);
    serverPreview.retry();
  };

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.summaryBar}>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryEyebrow}>
            출판 미리보기 · {summaryDensityLabel}
          </Text>
          <Text style={styles.summaryTitle}>
            {summaryTypeLabel} · 총 {totalPages}장
          </Text>
        </View>
        <View
          testID="write-preview-render-status"
          style={[
            styles.statusPill,
            effectiveStatus === "checking" && styles.statusPillChecking,
            effectiveStatus === "ready" && styles.statusPillReady,
            effectiveStatus === "local-fallback" && styles.statusPillFallback,
          ]}
        >
          {effectiveStatus === "checking" ? (
            <ActivityIndicator size="small" color="#786f62" />
          ) : null}
          <Text
            style={[
              styles.statusPillText,
              effectiveStatus === "ready" && styles.statusPillTextReady,
              effectiveStatus === "local-fallback" && styles.statusPillTextFallback,
            ]}
          >
            {getStatusLabel(effectiveStatus)}
          </Text>
        </View>
      </View>

      <View style={[styles.frame, compact && styles.frameCompact]}>
        <View
          style={[styles.viewport, compact && styles.viewportCompact]}
          onLayout={onLayoutViewport}
        >
          {displayPages.length > 0 ? (
            <FlatList
              key={usesServerRender ? "server-preview" : "local-preview"}
              ref={listRef}
              data={displayPages}
              keyExtractor={(item) => item.key}
              extraData={`${fontKey}:${serverPreview.signature}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={onMomentumScrollEnd}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.page,
                    viewportWidth > 0 ? { width: viewportWidth } : null,
                    compact && styles.pageCompact,
                  ]}
                >
                  {item.kind === "server" ? (
                    <ServerPreviewPageCanvas
                      uri={item.uri}
                      pageNumber={item.pageNumber}
                      compact={compact}
                      onError={onServerImageError}
                    />
                  ) : (
                    <LocalPreviewPageCanvas
                      page={item.page}
                      fontKey={fontKey}
                      compact={compact}
                    />
                  )}
                </View>
              )}
            />
          ) : (
            <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
              <Text style={styles.emptyStateText}>미리보기를 준비하고 있어요.</Text>
            </View>
          )}
        </View>

        {displayPages.length > 1 ? (
          <View style={styles.pageCounter}>
            <Text style={styles.pageCounterText}>
              {Math.min(currentPage + 1, totalPages)} / {totalPages}
            </Text>
          </View>
        ) : null}

        {displayPages.length > 1 ? (
          <View style={styles.thumbnailStrip}>
            {displayPages.slice(0, 6).map((item, index) => {
              const active = index === currentPage;
              return (
                <Pressable
                  key={`${item.key}-thumbnail`}
                  onPress={() => onPressPageThumbnail(index)}
                  style={[styles.thumbnailButton, active && styles.thumbnailButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1}페이지 미리보기`}
                  accessibilityState={{ selected: active }}
                >
                  {item.kind === "server" ? (
                    <ServerPreviewPageCanvas
                      uri={item.uri}
                      pageNumber={item.pageNumber}
                      thumbnail
                      onError={onServerImageError}
                    />
                  ) : (
                    <LocalPreviewPageCanvas
                      page={item.page}
                      fontKey={fontKey}
                      thumbnail
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {effectiveStatus === "local-fallback" && fallbackMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{fallbackMessage}</Text>
            <Pressable
              testID="write-preview-retry"
              accessibilityRole="button"
              accessibilityLabel="서버 최종 렌더 다시 확인"
              onPress={onRetryServerPreview}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>다시 확인</Text>
            </Pressable>
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
