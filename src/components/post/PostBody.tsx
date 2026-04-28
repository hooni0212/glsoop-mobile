import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";

import { PaperReadingCard } from "@/components/paper/PaperReadingCard";
import { buildRenderedPostImageUrl } from "@/lib/feedImage";
import { normalizePostBackgroundTemplateId } from "@/lib/postBackgroundTemplates";
import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostRenderImages, PostType } from "@/types/post";
import { tokens } from "@/theme/tokens";

export type PostBodyProps = {
  postId?: string;
  title?: string;
  content: string;
  paragraphs?: string[];
  footerText?: string;
  type?: PostType | null;
  layout: WriteLayoutModel;
  versionSeed?: unknown;
  renderImages?: PostRenderImages | null;
};

export function PostBody({
  postId,
  title,
  content,
  paragraphs,
  footerText,
  type,
  layout,
  versionSeed,
  renderImages,
}: PostBodyProps) {
  const [renderFailed, setRenderFailed] = useState(false);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activePage, setActivePage] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const fallbackImageUrl = useMemo(() => {
    if (!postId) return null;
    return buildRenderedPostImageUrl(postId, {
      versionSeed,
      template: normalizePostBackgroundTemplateId(renderImages?.template ?? layout.presetId),
    });
  }, [layout.presetId, postId, renderImages?.template, versionSeed]);
  const imageUrls = useMemo(() => {
    const explicit = Array.isArray(renderImages?.images)
      ? renderImages.images.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    if (explicit.length > 0) return explicit;
    return fallbackImageUrl ? [fallbackImageUrl] : [];
  }, [fallbackImageUrl, renderImages?.images]);
  const pageCount = Math.max(1, renderImages?.pageCount ?? (imageUrls.length || 1));
  const showCarousel = imageUrls.length > 1;
  const imageSeed = useMemo(() => imageUrls.join("|"), [imageUrls]);

  useEffect(() => {
    setRenderFailed(false);
    setActivePage(0);
  }, [imageSeed]);

  const scrollToPage = (nextIndex: number) => {
    if (!scrollRef.current || carouselWidth <= 0) return;
    const safeIndex = Math.max(0, Math.min(nextIndex, imageUrls.length - 1));
    scrollRef.current.scrollTo({ x: safeIndex * carouselWidth, animated: true });
    setActivePage(safeIndex);
  };

  if (imageUrls.length > 0 && !renderFailed) {
    return (
      <View style={styles.wrap}>
        <View style={styles.frame}>
          <View
            style={styles.carouselViewport}
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              if (nextWidth > 0 && nextWidth !== carouselWidth) {
                setCarouselWidth(nextWidth);
              }
            }}
          >
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              scrollEnabled={showCarousel}
              onMomentumScrollEnd={(event) => {
                if (carouselWidth <= 0) return;
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
                setActivePage(Math.max(0, Math.min(nextIndex, imageUrls.length - 1)));
              }}
            >
              {imageUrls.map((imageUrl, index) => (
                <View
                  key={`${imageUrl}-${index}`}
                  style={[styles.carouselSlide, { width: Math.max(carouselWidth, 1) }]}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    contentFit="contain"
                    transition={120}
                    onError={() => setRenderFailed(true)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
          {showCarousel ? (
            <View style={styles.carouselFooter}>
              <View style={styles.carouselStatus}>
                <Text style={styles.carouselStatusText}>
                  {activePage + 1} / {pageCount}
                </Text>
              </View>
              <View style={styles.carouselDots}>
                {imageUrls.map((imageUrl, index) => {
                  const isActive = index === activePage;
                  return (
                    <Pressable
                      key={`${imageUrl}-dot-${index}`}
                      onPress={() => scrollToPage(index)}
                      style={[styles.carouselDot, isActive ? styles.carouselDotActive : null]}
                      accessibilityRole="button"
                      accessibilityLabel={`${index + 1}번째 이미지로 이동`}
                    />
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <PaperReadingCard
      mode="read"
      title={title}
      body={content}
      paragraphs={paragraphs}
      footerText={footerText}
      type={type}
      layout={layout}
    />
  );
}

const styles = {
  wrap: {
    marginBottom: 0,
  },
  frame: {
    position: "relative" as const,
    backgroundColor: "#f4ead8",
  },
  carouselViewport: {
    overflow: "hidden" as const,
  },
  carouselSlide: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  image: {
    width: "100%" as const,
    aspectRatio: 500 / 666,
    overflow: "hidden" as const,
    backgroundColor: "#f4ead8",
  },
  carouselFooter: {
    position: "absolute" as const,
    left: 0,
    right: 0,
    bottom: 14,
    alignItems: "center" as const,
  },
  carouselStatus: {
    marginBottom: 8,
    borderRadius: tokens.radius.pill,
    backgroundColor: "rgba(255,250,244,0.88)",
    borderWidth: 1,
    borderColor: "rgba(86,62,32,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  carouselStatusText: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "rgba(80,58,32,0.68)",
  },
  carouselDots: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  carouselDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: "rgba(86,62,32,0.18)",
  },
  carouselDotActive: {
    width: 20,
    backgroundColor: "rgba(80,58,32,0.68)",
  },
};
