import React from "react";
import { TextInput, View } from "react-native";

import { PaperReadingCard } from "@/components/paper/PaperReadingCard";
import { paperSurfaceStyles } from "@/components/paper/PaperSurface";
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
    <View style={styles.editorWrap}>
      <PaperReadingCard
        mode="edit"
        layout={layout}
        footerText={footerText}
        eyebrow="PRINT LAYOUT"
        hint="종이 위에 바로 쓰듯 편집하고 바로 정렬해요."
        renderTitle={() => (
          <TextInput
            value={title}
            onChangeText={onChangeTitle}
            placeholder="제목을 입력해줘"
            placeholderTextColor="rgba(80,58,32,0.34)"
            style={[
              styles.paperTitleInput,
              paperSurfaceStyles.serifText,
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
        )}
        renderBody={() => (
          <TextInput
            value={body}
            onChangeText={onChangeBody}
            placeholder="오늘의 글을 남겨줘…"
            placeholderTextColor="rgba(80,58,32,0.34)"
            style={[
              styles.paperBodyInput,
              paperSurfaceStyles.serifText,
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
        )}
      />

      {children ? <View style={styles.editorControlDock}>{children}</View> : null}
    </View>
  );
}
