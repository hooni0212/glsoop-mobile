import React from "react";
import { Text, TextInput, View } from "react-native";

type Props = {
  title: string;
  body: string;
  onChangeTitle: (v: string) => void;
  onChangeBody: (v: string) => void;
  styles: any;
};

export function WriteEditor({
  title,
  body,
  onChangeTitle,
  onChangeBody,
  styles,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>제목</Text>
      <TextInput
        value={title}
        onChangeText={onChangeTitle}
        placeholder="제목을 입력해줘"
        placeholderTextColor="#9AA0A6"
        style={styles.inputTitle}
        returnKeyType="next"
        accessibilityLabel="글쓰기 제목"
        testID="write-title-input"
      />

      <View style={styles.divider} />

      <Text style={styles.label}>내용</Text>
      <TextInput
        value={body}
        onChangeText={onChangeBody}
        placeholder="오늘의 글을 남겨줘…"
        placeholderTextColor="#9AA0A6"
        style={styles.inputBody}
        multiline
        accessibilityLabel="글쓰기 내용"
        testID="write-body-input"
      />
    </View>
  );
}
