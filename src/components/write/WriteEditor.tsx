import React from "react";
import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import type { PostType } from "@/types/post";

type Props = {
  title: string;
  body: string;
  selectedType: PostType | null;
  onChangeTitle: (value: string) => void;
  onChangeBody: (value: string) => void;
  onSelectType: (type: PostType) => void;
  styles: any;
};

const CATEGORY_ITEMS: { type: PostType; label: string }[] = [
  { type: "poem", label: "시" },
  { type: "essay", label: "에세이" },
  { type: "short", label: "짧은 구절" },
];

export function WriteEditor({
  title,
  body,
  selectedType,
  onChangeTitle,
  onChangeBody,
  onSelectType,
  styles,
}: Props) {
  return (
    <View style={styles.editorWrap}>
      <View style={styles.quickMetaRow}>
        {CATEGORY_ITEMS.map((item) => {
          const active = selectedType === item.type;
          return (
            <Pressable
              key={item.type}
              onPress={() => onSelectType(item.type)}
              style={[styles.quickMetaChip, active && styles.quickMetaChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`${item.label} 카테고리 선택`}
              accessibilityState={{ selected: active }}
              testID={`write-category-${item.type}`}
            >
              <Text style={[styles.quickMetaChipText, active && styles.quickMetaChipTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.card, styles.writeFormCard]}>
        <Text style={styles.label}>제목</Text>
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          onSubmitEditing={Keyboard.dismiss}
          blurOnSubmit
          placeholder="제목을 입력해줘"
          placeholderTextColor="rgba(74,62,48,0.35)"
          multiline
          style={styles.inputTitle}
          testID="write-title-input"
        />

        <View style={styles.divider} />

        <Text style={styles.label}>본문</Text>
        <TextInput
          value={body}
          onChangeText={onChangeBody}
          placeholder="오늘의 글을 남겨줘..."
          placeholderTextColor="rgba(74,62,48,0.32)"
          multiline
          blurOnSubmit={false}
          style={styles.inputBody}
          testID="write-body-input"
        />
      </View>
    </View>
  );
}
