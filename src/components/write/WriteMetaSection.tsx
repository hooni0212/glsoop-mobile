import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import type { PostFontKey } from "@/lib/postContent";
import type { PostCommentPolicy, PostType, PostVisibility } from "@/types/post";

type Props = {
  styles: any;
  selectedType: PostType | null;
  onSelectType: (type: PostType) => void;
  hashtagsInput: string;
  hashtagChips: string[];
  onChangeHashtagsInput: (value: string) => void;
  fontKey: PostFontKey;
  onChangeFontKey: (value: PostFontKey) => void;
  visibility: PostVisibility;
  onChangeVisibility: (value: PostVisibility) => void;
  commentPolicy: PostCommentPolicy;
  onChangeCommentPolicy: (value: PostCommentPolicy) => void;
  showCategory?: boolean;
  showFont?: boolean;
  showHashtags?: boolean;
  showPermissions?: boolean;
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

const VISIBILITY_ITEMS: { key: PostVisibility; label: string }[] = [
  { key: "public", label: "전체 공개" },
  { key: "followers", label: "팔로워" },
  { key: "unlisted", label: "링크 공개" },
  { key: "private", label: "나만 보기" },
];

const COMMENT_POLICY_ITEMS: { key: PostCommentPolicy; label: string }[] = [
  { key: "logged_in", label: "로그인 사용자" },
  { key: "followers", label: "팔로워만" },
  { key: "author_only", label: "나만" },
  { key: "closed", label: "댓글 닫기" },
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
  visibility,
  onChangeVisibility,
  commentPolicy,
  onChangeCommentPolicy,
  showCategory = true,
  showFont = true,
  showHashtags = true,
  showPermissions = true,
}: Props) {
  const showDividerAfterCategory = showCategory && (showFont || showHashtags || showPermissions);
  const showDividerAfterFont = showFont && (showHashtags || showPermissions);
  const showDividerAfterHashtags = showHashtags && showPermissions;

  return (
    <View style={styles.metaCard}>
      {showCategory ? (
        <>
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
          <Text style={styles.hint}>카테고리를 선택해야 제출할 수 있어요.</Text>
        </>
      ) : null}

      {showDividerAfterCategory ? <View style={styles.metaDivider} /> : null}

      {showFont ? (
        <>
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
          <Text style={styles.hint}>글 분위기에 맞는 폰트를 골라주세요.</Text>
        </>
      ) : null}

      {showDividerAfterFont ? <View style={styles.metaDivider} /> : null}

      {showHashtags ? (
        <>
          <Text style={styles.label}>해시태그</Text>
          <TextInput
            value={hashtagsInput}
            onChangeText={onChangeHashtagsInput}
            placeholder="#감정, 봄밤, 기록"
            autoCapitalize="none"
            style={styles.metaInput}
            testID="write-hashtags-input"
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
        </>
      ) : null}

      {showDividerAfterHashtags ? <View style={styles.metaDivider} /> : null}

      {showPermissions ? (
        <>
          <Text style={styles.label}>공개 범위</Text>
          <View style={styles.metaChipRow}>
            {VISIBILITY_ITEMS.map((item) => {
              const active = visibility === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onChangeVisibility(item.key)}
                  style={[styles.metaChip, active && styles.metaChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} 공개 범위 선택`}
                  testID={`write-visibility-${item.key}`}
                >
                  <Text style={[styles.metaChipText, active && styles.metaChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>홈과 검색 노출은 공개 범위에 따라 달라져요.</Text>

          <View style={styles.metaDivider} />

          <Text style={styles.label}>댓글 작성자</Text>
          <View style={styles.metaChipRow}>
            {COMMENT_POLICY_ITEMS.map((item) => {
              const active = commentPolicy === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => onChangeCommentPolicy(item.key)}
                  style={[styles.metaChip, active && styles.metaChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label} 댓글 권한 선택`}
                  testID={`write-comment-policy-${item.key}`}
                >
                  <Text style={[styles.metaChipText, active && styles.metaChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.hint}>글 성격에 맞게 댓글을 열거나 제한할 수 있어요.</Text>
        </>
      ) : null}
    </View>
  );
}
