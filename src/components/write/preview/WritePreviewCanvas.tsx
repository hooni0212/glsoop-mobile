import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from "react-native";
import { Image } from "expo-image";

import {
  LOCAL_FEED_PREVIEW_CANVAS,
  type LocalFeedPreviewPage,
  type LocalFeedPreviewTextBlock,
} from "@/lib/localFeedPreview";
import type { PostFontKey } from "@/lib/postContent";
import {
  getPreviewFontFamily,
  getPreviewSignatureFontFamily,
} from "@/lib/previewFonts";

type CanvasSizeProps = {
  compact?: boolean;
  thumbnail?: boolean;
};

type LocalPreviewPageCanvasProps = CanvasSizeProps & {
  page: LocalFeedPreviewPage;
  fontKey: PostFontKey;
};

type ServerPreviewPageCanvasProps = CanvasSizeProps & {
  uri: string;
  pageNumber: number;
  onError: (uri: string) => void;
};

function resolveBlockTextTop(block: LocalFeedPreviewTextBlock) {
  const rawTextBlockHeight = block.lineHeightPx * block.lines.length;
  if (block.verticalAlign !== "center") return 0;
  return Math.max(0, (block.box.height - rawTextBlockHeight) / 2);
}

function scaleNumber(value: number, scale: number) {
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
  const lineHeight = scaleNumber(block.lineHeightPx, scale);
  const fontSize = scaleNumber(block.fontSizePx, scale);
  const letterSpacing = scaleNumber(block.fontSizePx * block.letterSpacingEm, scale);
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
          left: scaleNumber(block.box.x, scale),
          top: scaleNumber(Math.max(0, block.box.y - block.clipPadTopPx), scale),
          width: scaleNumber(block.box.width, scale),
          height: scaleNumber(
            block.box.height + block.clipPadTopPx + block.clipPadBottomPx,
            scale
          ),
          paddingTop: scaleNumber(block.clipPadTopPx + textTop, scale),
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

function canvasSizeStyles({ compact, thumbnail }: CanvasSizeProps) {
  return [
    styles.canvas,
    compact && styles.canvasCompact,
    thumbnail && styles.canvasThumbnail,
  ];
}

export function LocalPreviewPageCanvas({
  page,
  fontKey,
  compact = false,
  thumbnail = false,
}: LocalPreviewPageCanvasProps) {
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
      style={canvasSizeStyles({ compact, thumbnail })}
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

export function ServerPreviewPageCanvas({
  uri,
  pageNumber,
  onError,
  compact = false,
  thumbnail = false,
}: ServerPreviewPageCanvasProps) {
  return (
    <Image
      testID={thumbnail ? undefined : `write-server-preview-page-${pageNumber}`}
      accessibilityLabel={`서버 최종 렌더 ${pageNumber}페이지`}
      source={{ uri }}
      style={canvasSizeStyles({ compact, thumbnail })}
      contentFit={thumbnail ? "cover" : "contain"}
      cachePolicy="none"
      transition={thumbnail ? 0 : 120}
      onError={() => onError(uri)}
    />
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: "100%",
    aspectRatio: LOCAL_FEED_PREVIEW_CANVAS.width / LOCAL_FEED_PREVIEW_CANVAS.height,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#f2eddc",
  },
  canvasCompact: {
    width: 210,
    height: 280,
    alignSelf: "center",
    borderRadius: 18,
  },
  canvasThumbnail: {
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
});
