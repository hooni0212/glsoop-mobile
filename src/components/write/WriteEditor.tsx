import React from "react";
import { Text, TextInput, View } from "react-native";

import type { WriteLayoutModel } from "@/lib/postLayout";

type Props = {
  title: string;
  body: string;
  footerText: string;
  layout: WriteLayoutModel;
  onChangeTitle: (v: string) => void;
  onChangeBody: (v: string) => void;
  styles: any;
  children?: React.ReactNode;
};

export function WriteEditor({
  title,
  body,
  footerText,
  layout,
  onChangeTitle,
  onChangeBody,
  styles,
  children,
}: Props) {
  return (
    <View style={styles.editorStage}>
      <View style={styles.editorPaper}>
        <View style={styles.editorPaperHeader}>
          <Text style={styles.editorPaperEyebrow}>PRINT LAYOUT</Text>
          <Text style={styles.editorPaperHint}>종이 위에 바로 쓰듯 편집하고 바로 정렬해요.</Text>
        </View>

        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder="제목을 입력해줘"
          placeholderTextColor={styles.editorPlaceholder.color}
          style={[
            styles.paperTitleInput,
            {
              textAlign: layout.titleStyle.align,
              fontSize: 26 * layout.titleStyle.fontScale,
              lineHeight: 32 * layout.titleStyle.lineHeight,
            },
          ]}
          returnKeyType="next"
          accessibilityLabel="글쓰기 제목"
          testID="write-title-input"
        />

        <View style={styles.paperRule} />

        <TextInput
          value={body}
          onChangeText={onChangeBody}
          placeholder="오늘의 글을 남겨줘…"
          placeholderTextColor={styles.editorPlaceholder.color}
          style={[
            styles.paperBodyInput,
            {
              textAlign: layout.bodyStyle.align,
              fontSize: 16 * layout.bodyStyle.fontScale,
              lineHeight: 28 * layout.bodyStyle.lineHeight,
            },
          ]}
          multiline
          accessibilityLabel="글쓰기 내용"
          testID="write-body-input"
        />

        {layout.showFooter ? (
          <>
            <View style={styles.paperFooterRule} />
            <Text style={styles.paperFooterText}>{footerText}</Text>
          </>
        ) : null}
      </View>

      {children ? <View style={styles.editorControlDock}>{children}</View> : null}
    </View>
  );
}
