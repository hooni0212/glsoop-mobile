import React, { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";

import { PaperReadingCard } from "@/components/paper/PaperReadingCard";
import { buildRenderedPostImageUrl } from "@/lib/feedImage";
import type { WriteLayoutModel } from "@/lib/postLayout";
import { paperFrameShadowStyle } from "@/theme/shadows";
import type { PostType } from "@/types/post";

export type PostBodyProps = {
  postId?: string;
  title?: string;
  content: string;
  paragraphs?: string[];
  footerText?: string;
  type?: PostType | null;
  layout: WriteLayoutModel;
  versionSeed?: unknown;
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
}: PostBodyProps) {
  const [renderFailed, setRenderFailed] = useState(false);
  const imageUrl = useMemo(() => {
    if (!postId) return null;
    return buildRenderedPostImageUrl(postId, versionSeed);
  }, [postId, versionSeed]);

  useEffect(() => {
    setRenderFailed(false);
  }, [imageUrl]);

  if (imageUrl && !renderFailed) {
    return (
      <View style={styles.wrap}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SERVER RENDER</Text>
          <Text style={styles.hint}>서버가 생성한 책 페이지 이미지를 그대로 보여줘요.</Text>
        </View>
        <View style={styles.frame}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={120}
            onError={() => setRenderFailed(true)}
          />
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
      eyebrow="READING CARD"
      hint="이미지 렌더를 불러오지 못해 텍스트 카드로 보여줘요."
    />
  );
}

const styles = {
  wrap: {
    marginBottom: 6,
  },
  header: {
    marginBottom: 10,
    gap: 4,
    paddingHorizontal: 4,
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.3,
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
    ...paperFrameShadowStyle,
  },
  image: {
    width: "100%" as const,
    aspectRatio: 500 / 666,
    borderRadius: 20,
    overflow: "hidden" as const,
    backgroundColor: "#f4ead8",
  },
};
