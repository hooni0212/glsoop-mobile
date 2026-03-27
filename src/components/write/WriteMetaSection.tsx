import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { PostFontKey } from "@/lib/postContent";
import type { PostType } from "@/types/post";

type Props = {
  styles: any;
  selectedType: PostType | null;
  onSelectType: (type: PostType) => void;
  hashtagsInput: string;
  hashtagChips: string[];
  onChangeHashtagsInput: (value: string) => void;
  fontKey: PostFontKey;
  onChangeFontKey: (value: PostFontKey) => void;
};

const CATEGORY_ITEMS: { type: PostType; label: string }[] = [
  { type: "poem", label: "시" },
  { type: "essay", label: "에세이" },
  { type: "short", label: "짧은 구절" },
];

const FONT_ITEMS: { key: PostFontKey; label: string }[] = [
  { key: "serif", label: "명조" },
  { key: "sans", label: "고딕" },
  { key: "hand", label: "손글씨" },
];

export function WriteMetaSection({
  styles,
  selectedType,
  onSelectType,
  hashtagsInput,
  hashtagChips,
  onChangeHashtagsInput,
  fontKey,
  onChangeFontKey,
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

      <Text style={styles.label}>폰트</Text>
      <View style={styles.metaChipRow}>
        {FONT_ITEMS.map((item) => {
          const active = fontKey === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChangeFontKey(item.key)}
              style={[styles.metaChip, active && styles.metaChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} 폰트 선택`}
              testID={`write-font-${item.key}`}
            >
              <Text style={[styles.metaChipText, active && styles.metaChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>서버 프리뷰와 상세 렌더에 같은 폰트 메타를 전달해요.</Text>

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
