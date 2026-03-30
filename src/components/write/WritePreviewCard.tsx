import React, { useMemo } from "react";
import { View } from "react-native";
import { Image } from "expo-image";

import { buildFeedPreviewUrl } from "@/lib/feedImage";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

type Props = {
  title: string;
  body: string;
  selectedType?: PostType | null;
  layout: WriteLayoutModel;
  fontKey: PostFontKey;
  compact?: boolean;
};

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

  const uri = useMemo(
    () =>
      buildFeedPreviewUrl({
        title: previewTitle,
        content: previewBody,
        category: selectedType ?? "short",
        layout: {
          ...layout,
          showFooter: true,
        },
        fontKey,
      }),
    [fontKey, layout, previewBody, previewTitle, selectedType]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.frame}>
        <Image
          source={{ uri }}
          style={[styles.image, compact && styles.imageCompact]}
          contentFit="contain"
          cachePolicy="none"
          transition={120}
        />
      </View>
    </View>
  );
}

const styles = {
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
  image: {
    width: "100%" as const,
    aspectRatio: 500 / 666,
    borderRadius: 20,
    overflow: "hidden" as const,
    backgroundColor: "#f4ead8",
  },
  imageCompact: {
    maxHeight: 300,
  },
};
