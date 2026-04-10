import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";

import { createFeedPreviewSession, type FeedPreviewRenderImages } from "@/lib/feedImage";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

const PREVIEW_REQUEST_DEBOUNCE_MS = 450;

type Props = {
  title: string;
  body: string;
  selectedType?: PostType | null;
  layout: WriteLayoutModel;
  fontKey: PostFontKey;
  compact?: boolean;
};

function resolveErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "미리보기를 불러오지 못했어요. 저장은 계속할 수 있습니다.";
}

export function WritePreviewCard({
  title,
  body,
  selectedType,
  layout,
  fontKey,
  compact = false,
}: Props) {
  const previewTitle = title.trim() || "제목 미리보기";
  const previewBody = body.trim() || "본문이 여기에 보여요.";
  const [preview, setPreview] = useState<FeedPreviewRenderImages | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const requestSeqRef = useRef(0);
  const previewRef = useRef<FeedPreviewRenderImages | null>(null);
  const previewCreatedAtRef = useRef(new Date().toISOString());
  const listRef = useRef<FlatList<string> | null>(null);

  const previewLayout = useMemo(
    () => ({
      ...layout,
      showFooter: true,
    }),
    [layout]
  );

  useEffect(() => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    if (!previewRef.current) {
      setLoading(true);
    }
    setError(null);

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const nextPreview = await createFeedPreviewSession({
            title: previewTitle,
            content: previewBody,
            category: selectedType ?? "short",
            layout: previewLayout,
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
          setError(resolveErrorMessage(nextError));
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
  }, [fontKey, previewBody, previewLayout, previewTitle, selectedType]);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(() => {
    if (!preview?.renderImages.previewSessionId) return;
    if (!listRef.current) return;
    if (viewportWidth <= 0) return;
    listRef.current.scrollToOffset({ offset: currentPage * viewportWidth, animated: false });
  }, [currentPage, preview?.renderImages.previewSessionId, viewportWidth]);

  const images = preview?.images ?? [];
  const totalPages = Math.max(
    1,
    preview?.renderImages.pageCount ?? images.length ?? 1
  );
  const isTruncated = Boolean(preview?.renderImages.isTruncated);

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
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <View style={styles.viewport} onLayout={onLayoutViewport}>
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
                  ]}
                >
                  <Image
                    source={{ uri: item }}
                    style={[styles.image, compact && styles.imageCompact]}
                    contentFit="contain"
                    cachePolicy="none"
                    transition={120}
                  />
                </View>
              )}
            />
          ) : (
            <View style={[styles.emptyState, compact && styles.imageCompact]}>
              <Text style={styles.emptyStateText}>
                {error || "미리보기를 준비하고 있어요."}
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

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
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
  frame: {
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(92,69,42,0.10)",
    borderWidth: 1,
    borderColor: "rgba(86,62,32,0.08)",
  },
  viewport: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
  },
  page: {
    width: "100%",
  },
  image: {
    width: "100%",
    aspectRatio: 500 / 666,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#f4ead8",
  },
  imageCompact: {
    maxHeight: 300,
  },
  emptyState: {
    width: "100%",
    aspectRatio: 500 / 666,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "#f4ead8",
  },
  emptyStateText: {
    color: "#5f4931",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,234,216,0.18)",
  },
  pageCounter: {
    marginTop: 12,
    alignItems: "center",
  },
  pageCounterText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#433424",
  },
  errorBox: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(185,28,28,0.08)",
    borderWidth: 1,
    borderColor: "rgba(185,28,28,0.14)",
  },
  errorText: {
    color: "#9f1c1c",
    lineHeight: 20,
    fontWeight: "700",
  },
  noticeBox: {
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(104,74,37,0.08)",
    borderWidth: 1,
    borderColor: "rgba(104,74,37,0.14)",
  },
  noticeText: {
    color: "#5f4931",
    lineHeight: 20,
    fontWeight: "700",
  },
});
