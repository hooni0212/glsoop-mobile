import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextStyle,
} from "react-native";
import { Image } from "expo-image";

import {
  buildLocalFeedPreview,
  LOCAL_FEED_PREVIEW_CANVAS,
  type LocalFeedPreviewPage,
  type LocalFeedPreviewTextBlock,
} from "@/lib/localFeedPreview";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import {
  getPreviewFontFamily,
  getPreviewSignatureFontFamily,
} from "@/lib/previewFonts";
import {
  getWritePostTypeLabel,
  type WriteEditorInsight,
} from "@/lib/writeEditorInsights";
import { tokens } from "@/theme/tokens";
import type { PostType } from "@/types/post";

const EMPTY_PAGES: LocalFeedPreviewPage[] = [];

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

function resolveBlockTextTop(block: LocalFeedPreviewTextBlock) {
  const rawTextBlockHeight = block.lineHeightPx * block.lines.length;
  if (block.verticalAlign !== "center") return 0;
  return Math.max(0, (block.box.height - rawTextBlockHeight) / 2);
}

function renderScaledNumber(value: number, scale: number) {
  return Math.round(value * scale * 100) / 100;
}

function PreviewTextBlock({
  block,
  scale,
  fontFamily,
}: {
  block: LocalFeedPreviewTextBlock;
  scale: number;
  fontFamily?: string;
}) {
  const resolvedFontFamily =
    block.id === "footer" ? getPreviewSignatureFontFamily() : fontFamily;
  const textTop = resolveBlockTextTop(block);
  const lineHeight = renderScaledNumber(block.lineHeightPx, scale);
  const fontSize = renderScaledNumber(block.fontSizePx, scale);
  const letterSpacing = renderScaledNumber(block.fontSizePx * block.letterSpacingEm, scale);
  const textStyle: TextStyle = {
    color: block.id === "footer" ? "rgba(71, 63, 54, 0.74)" : "#473f36",
    fontFamily: resolvedFontFamily,
    fontSize,
    lineHeight,
    textAlign: block.textAlign,
    letterSpacing,
    includeFontPadding: false,
  };

  return (
    <View
      pointerEvents="none"
      style={[
        styles.textClip,
        {
          left: renderScaledNumber(block.box.x, scale),
          top: renderScaledNumber(Math.max(0, block.box.y - block.clipPadTopPx), scale),
          width: renderScaledNumber(block.box.width, scale),
          height: renderScaledNumber(
            block.box.height + block.clipPadTopPx + block.clipPadBottomPx,
            scale
          ),
          paddingTop: renderScaledNumber(block.clipPadTopPx + textTop, scale),
        },
      ]}
    >
      {block.lines.map((line, index) => (
        <Text
          key={`${block.id}-line-${index}`}
          numberOfLines={1}
          ellipsizeMode="clip"
          style={[styles.previewLine, textStyle, { height: lineHeight }]}
        >
          {line || " "}
        </Text>
      ))}
    </View>
  );
}

function PreviewBackground({ page }: { page: LocalFeedPreviewPage }) {
  if (page.templateId === "paper02") {
    return (
      <>
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: page.template.backgroundColor },
          ]}
        />
        <Image
          pointerEvents="none"
          source={page.template.source}
          contentFit="fill"
          style={styles.paper02Image}
        />
      </>
    );
  }

  return (
    <Image
      pointerEvents="none"
      source={page.template.source}
      contentFit="cover"
      style={StyleSheet.absoluteFill}
    />
  );
}

function LocalPreviewPageCanvas({
  page,
  fontKey,
  compact = false,
  thumbnail = false,
}: {
  page: LocalFeedPreviewPage;
  fontKey: PostFontKey;
  compact?: boolean;
  thumbnail?: boolean;
}) {
  const [displayWidth, setDisplayWidth] = useState(0);
  const scale =
    displayWidth > 0 ? displayWidth / LOCAL_FEED_PREVIEW_CANVAS.width : 1;
  const fontFamily = getPreviewFontFamily(fontKey);

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== displayWidth) {
      setDisplayWidth(nextWidth);
    }
  };

  return (
    <View
      testID={thumbnail ? undefined : `write-preview-page-${page.pageNumber}`}
      onLayout={onCanvasLayout}
      style={[
        styles.localCanvas,
        compact && styles.localCanvasCompact,
        thumbnail && styles.localCanvasThumbnail,
      ]}
    >
      <PreviewBackground page={page} />
      {page.title ? (
        <PreviewTextBlock block={page.title} scale={scale} fontFamily={fontFamily} />
      ) : null}
      <PreviewTextBlock block={page.body} scale={scale} fontFamily={fontFamily} />
      {page.footer ? (
        <PreviewTextBlock block={page.footer} scale={scale} fontFamily={fontFamily} />
      ) : null}
    </View>
  );
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
    () =>
      Array.isArray(contentPages)
        ? contentPages.map((page) => String(page || "").trim()).filter((page, index, arr) => {
            if (page) return true;
            return index < arr.length - 1;
          })
        : [],
    [contentPages]
  );
  const previewLayout = useMemo(
    () => ({
      ...layout,
      showFooter: true,
    }),
    [layout]
  );
  const preview = useMemo(
    () =>
      buildLocalFeedPreview({
        title: previewTitle,
        content: previewBody,
        contentPages: previewContentPages,
        category: selectedType ?? "short",
        layout: previewLayout,
        fontKey,
      }),
    [fontKey, previewBody, previewContentPages, previewLayout, previewTitle, selectedType]
  );
  const [currentPage, setCurrentPage] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const listRef = useRef<FlatList<LocalFeedPreviewPage> | null>(null);
  const pages = preview.pages ?? EMPTY_PAGES;
  const totalPages = Math.max(1, preview.pageCount || pages.length || 1);
  const isTruncated = Boolean(preview.isTruncated);
  const summaryPageCount = preview.pageCount ?? insight?.estimatedPageCount ?? totalPages;
  const summaryTypeLabel = selectedType
    ? getWritePostTypeLabel(selectedType)
    : insight?.detectedLabel ?? "자동";
  const summaryDensityLabel = insight?.densityLabel ?? "미리보기";

  useEffect(() => {
    setCurrentPage((prevPage) => Math.max(0, Math.min(prevPage, totalPages - 1)));
  }, [totalPages]);

  useEffect(() => {
    if (!listRef.current) return;
    if (viewportWidth <= 0) return;
    listRef.current.scrollToOffset({ offset: currentPage * viewportWidth, animated: false });
  }, [currentPage, viewportWidth]);

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
          {pages.length > 0 ? (
            <FlatList
              ref={listRef}
              data={pages}
              keyExtractor={(item) => `preview-page-${item.pageNumber}`}
              extraData={fontKey}
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
                  <LocalPreviewPageCanvas page={item} fontKey={fontKey} compact={compact} />
                </View>
              )}
            />
          ) : (
            <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
              <Text style={styles.emptyStateText}>미리보기를 준비하고 있어요.</Text>
            </View>
          )}
        </View>

        {pages.length > 1 ? (
          <View style={styles.pageCounter}>
            <Text style={styles.pageCounterText}>
              {Math.min(currentPage + 1, totalPages)} / {totalPages}
            </Text>
          </View>
        ) : null}

        {pages.length > 1 ? (
          <View style={styles.thumbnailStrip}>
            {pages.slice(0, 6).map((item, index) => {
              const active = index === currentPage;
              return (
                <Pressable
                  key={`preview-page-thumb-${item.pageNumber}`}
                  onPress={() => onPressPageThumbnail(index)}
                  style={[styles.thumbnailButton, active && styles.thumbnailButtonActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1}페이지 미리보기`}
                  accessibilityState={{ selected: active }}
                >
                  <LocalPreviewPageCanvas page={item} fontKey={fontKey} thumbnail />
                </Pressable>
              );
            })}
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
  localCanvas: {
    width: "100%",
    aspectRatio: LOCAL_FEED_PREVIEW_CANVAS.width / LOCAL_FEED_PREVIEW_CANVAS.height,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f2eddc",
  },
  localCanvasCompact: {
    width: 210,
    height: 280,
    alignSelf: "center",
    borderRadius: 18,
  },
  localCanvasThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  paper02Image: {
    position: "absolute",
    left: "-4%",
    top: "-4.1%",
    width: "108%",
    aspectRatio: 580 / 723,
  },
  textClip: {
    position: "absolute",
    overflow: "hidden",
  },
  previewLine: {
    width: "100%",
    backgroundColor: "transparent",
  },
  emptyState: {
    width: "100%",
    aspectRatio: LOCAL_FEED_PREVIEW_CANVAS.width / LOCAL_FEED_PREVIEW_CANVAS.height,
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
