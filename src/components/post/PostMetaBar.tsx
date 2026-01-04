import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { PostType } from "@/types/post";

const TYPE_LABEL: Record<PostType, string> = {
  poem: "시",
  essay: "에세이",
  short: "짧은 글",
};

export type PostMetaBarProps = {
  type?: PostType | null;
  tags?: string[] | null;
  styles: {
    metaBar: any;
    typeChip: any;
    typeChipText: any;
    tagChip: any;
    tagChipText: any;
  };
};

export function PostMetaBar({ type, tags, styles }: PostMetaBarProps) {
  const safeTags = useMemo(() => (Array.isArray(tags) ? tags.filter(Boolean) : []), [tags]);
  const hasType = Boolean(type);
  const hasTags = safeTags.length > 0;

  if (!hasType && !hasTags) return null;

  return (
    <View style={styles.metaBar}>
      {hasType && type && (
        <View style={styles.typeChip}>
          <Text style={styles.typeChipText}>{TYPE_LABEL[type] ?? type}</Text>
        </View>
      )}

      {safeTags.map((t) => (
        <View key={t} style={styles.tagChip}>
          <Text style={styles.tagChipText}>#{t}</Text>
        </View>
      ))}
    </View>
  );
}
