import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { buildFeedPreviewUrl } from "@/lib/feedImage";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

type Props = {
  title: string;
  body: string;
  hashtags: string[];
  categoryLabel: string;
  selectedType?: PostType | null;
  layout: WriteLayoutModel;
  fontKey: PostFontKey;
  compact?: boolean;
};

export function WritePreviewCard({
  title,
  body,
  hashtags,
  categoryLabel,
  selectedType,
  layout,
  fontKey,
  compact = false,
}: Props) {
  const previewTitle = title.trim() || "제목 미리보기";
  const previewBody =
    body.trim() || "본문 미리보기가 여기에 보여요. 서버 렌더 결과를 그대로 확인해요.";
  const footerText = hashtags.length > 0 ? hashtags.map((item) => `#${item}`).join(" ") : categoryLabel;

  const uri = useMemo(
    () =>
      buildFeedPreviewUrl({
        title: previewTitle,
        content: previewBody,
        category: selectedType ?? "short",
        layout: {
          ...layout,
          showFooter: Boolean(footerText),
        },
        fontKey,
      }),
    [fontKey, footerText, layout, previewBody, previewTitle, selectedType]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SERVER PREVIEW</Text>
        <Text style={styles.hint}>서버가 실제로 렌더하는 책 페이지를 그대로 보여줘요.</Text>
      </View>
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
  header: {
    marginBottom: 10,
    paddingHorizontal: 4,
    gap: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    fontWeight: "900" as const,
    color: "rgba(80,58,32,0.55)",
  },
  hint: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "rgba(80,58,32,0.64)",
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
