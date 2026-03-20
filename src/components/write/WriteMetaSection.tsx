import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { PostType } from "@/types/post";

type Props = {
  styles: any;
  selectedType: PostType | null;
  onSelectType: (type: PostType) => void;
  hashtagsInput: string;
  hashtagChips: string[];
  onChangeHashtagsInput: (value: string) => void;
};

const CATEGORY_ITEMS: { type: PostType; label: string }[] = [
  { type: "poem", label: "시" },
  { type: "essay", label: "에세이" },
  { type: "short", label: "짧은 구절" },
];

export function WriteMetaSection({
  styles,
  selectedType,
  onSelectType,
  hashtagsInput,
  hashtagChips,
  onChangeHashtagsInput,
}: Props) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.label}>카테고리</Text>
      <View style={styles.metaChipRow}>
        {CATEGORY_ITEMS.map((item) => {
          const active = selectedType === item.type;
          return (
            <Pressable
              key={item.type}
              onPress={() => onSelectType(item.type)}
              style={[styles.metaChip, active && styles.metaChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} 카테고리 선택`}
              testID={`write-category-${item.type}`}
            >
              <Text style={[styles.metaChipText, active && styles.metaChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>카테고리를 선택해야 게시할 수 있어요.</Text>

      <View style={styles.metaDivider} />

      <Text style={styles.label}>해시태그</Text>
      <TextInput
        value={hashtagsInput}
        onChangeText={onChangeHashtagsInput}
        placeholder="#감정, 봄밤, 기록"
        autoCapitalize="none"
        style={styles.metaInput}
      />
      {hashtagChips.length > 0 ? (
        <View style={styles.metaChipWrap}>
          {hashtagChips.map((item) => (
            <View key={item} style={styles.hashChip}>
              <Text style={styles.hashChipText}>#{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.hint}>쉼표나 공백으로 여러 해시태그를 입력할 수 있어요.</Text>
    </View>
  );
}
