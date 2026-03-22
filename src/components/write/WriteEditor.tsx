import React from "react";
import { ImageBackground, Pressable, Text, TextInput, View } from "react-native";

import type { LayoutBoxId, WriteLayoutModel } from "@/lib/postLayout";

const PAPER_SOURCE = require("../../../assets/images/feed-templates/paper-source-01.jpg");

type Props = {
  title: string;
  body: string;
  footerText: string;
  layout: WriteLayoutModel;
  activeBoxId: LayoutBoxId;
  onSelectBox: (boxId: LayoutBoxId) => void;
  onChangeTitle: (v: string) => void;
  onChangeBody: (v: string) => void;
  styles: any;
  children?: React.ReactNode;
};

function boxFrameStyle(box: { x: number; y: number; w: number; h: number }) {
  return {
    left: `${box.x * 100}%` as const,
    top: `${box.y * 100}%` as const,
    width: `${box.w * 100}%` as const,
    height: `${box.h * 100}%` as const,
  };
}

export function WriteEditor({
  title,
  body,
  footerText,
  layout,
  activeBoxId,
  onSelectBox,
  onChangeTitle,
  onChangeBody,
  styles,
  children,
}: Props) {
  return (
    <View style={styles.editorWrap}>
      <View style={styles.editorStage}>
        <View style={styles.editorStageHeader}>
          <Text style={styles.editorStageEyebrow}>SERVER PAPER LAYOUT</Text>
          <Text style={styles.editorStageHint}>
            서버와 같은 종이 이미지 위에서 글 영역을 바로 조절해요.
          </Text>
        </View>

        <ImageBackground
          source={PAPER_SOURCE}
          resizeMode="cover"
          style={styles.bookCanvas}
          imageStyle={styles.bookCanvasImage}
        >
          <Pressable
            onPress={() => onSelectBox("title_box")}
            style={[
              styles.bookBox,
              boxFrameStyle(layout.titleBox),
              activeBoxId === "title_box" && styles.bookBoxActive,
            ]}
          >
            <TextInput
              value={title}
              onChangeText={onChangeTitle}
              placeholder="제목을 입력해줘"
              placeholderTextColor="rgba(74,62,48,0.35)"
              multiline
              style={[
                styles.bookTitleInput,
                {
                  textAlign: layout.titleStyle.align,
                  fontSize: 18 * layout.titleStyle.fontScale,
                  lineHeight: 22 * layout.titleStyle.lineHeight,
                },
              ]}
              testID="write-title-input"
            />
          </Pressable>

          <Pressable
            onPress={() => onSelectBox("text_box")}
            style={[
              styles.bookBox,
              boxFrameStyle(layout.bodyBox),
              activeBoxId === "text_box" && styles.bookBoxActive,
            ]}
          >
            <TextInput
              value={body}
              onChangeText={onChangeBody}
              placeholder="오늘의 글을 남겨줘…"
              placeholderTextColor="rgba(74,62,48,0.32)"
              multiline
              style={[
                styles.bookBodyInput,
                {
                  textAlign: layout.bodyStyle.align,
                  fontSize: 13 * layout.bodyStyle.fontScale,
                  lineHeight: 20 * layout.bodyStyle.lineHeight,
                },
              ]}
              testID="write-body-input"
            />
          </Pressable>

          {layout.showFooter ? (
            <Pressable
              onPress={() => onSelectBox("footer_box")}
              style={[
                styles.bookBox,
                styles.bookFooterBox,
                boxFrameStyle(layout.footerBox),
                activeBoxId === "footer_box" && styles.bookBoxActive,
              ]}
            >
              <Text
                numberOfLines={2}
                style={[
                  styles.bookFooterText,
                  {
                    textAlign: layout.footerStyle.align,
                    fontSize: 10 * layout.footerStyle.fontScale,
                    lineHeight: 12 * layout.footerStyle.lineHeight,
                  },
                ]}
              >
                {footerText || "#글숲"}
              </Text>
            </Pressable>
          ) : null}
        </ImageBackground>
      </View>

      {children ? <View style={styles.editorControlDock}>{children}</View> : null}
    </View>
  );
}
