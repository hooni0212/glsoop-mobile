import React, { useMemo, useState } from "react";
import {
  ImageBackground,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from "react-native";

import type { PostFontKey } from "@/lib/postContent";
import type { LayoutBox, LayoutBoxId, WriteLayoutModel } from "@/lib/postLayout";

const PAPER_SOURCE = require("../../../assets/images/feed-templates/paper-source-01.jpg");

type Props = {
  title: string;
  body: string;
  footerText: string;
  fontKey: PostFontKey;
  layout: WriteLayoutModel;
  activeBoxId: LayoutBoxId;
  onSelectBox: (boxId: LayoutBoxId) => void;
  onDragBox: (boxId: LayoutBoxId, deltaX: number, deltaY: number) => void;
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

function DragHandle({
  boxId,
  active,
  canvasWidth,
  canvasHeight,
  onSelectBox,
  onDragBox,
  styles,
}: {
  boxId: LayoutBoxId;
  active: boolean;
  canvasWidth: number;
  canvasHeight: number;
  onSelectBox: (boxId: LayoutBoxId) => void;
  onDragBox: (boxId: LayoutBoxId, deltaX: number, deltaY: number) => void;
  styles: any;
}) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          onSelectBox(boxId);
          setDragOffset({ x: 0, y: 0 });
        },
        onPanResponderMove: (_event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          setDragOffset({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          setDragOffset({ x: 0, y: 0 });
          if (canvasWidth <= 0 || canvasHeight <= 0) return;
          onDragBox(boxId, gesture.dx / canvasWidth, gesture.dy / canvasHeight);
        },
        onPanResponderTerminate: () => {
          setDragOffset({ x: 0, y: 0 });
        },
      }),
    [boxId, canvasHeight, canvasWidth, onDragBox, onSelectBox]
  );

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.dragHandle,
        active && styles.dragHandleActive,
        {
          transform: [{ translateX: dragOffset.x }, { translateY: dragOffset.y }],
        },
      ]}
    >
      <View style={styles.dragHandleGrip} />
      <View style={styles.dragHandleGrip} />
      <View style={styles.dragHandleGrip} />
    </View>
  );
}

function EditableBox({
  boxId,
  box,
  activeBoxId,
  canvasWidth,
  canvasHeight,
  onSelectBox,
  onDragBox,
  styles,
  children,
  footer = false,
}: {
  boxId: LayoutBoxId;
  box: LayoutBox;
  activeBoxId: LayoutBoxId;
  canvasWidth: number;
  canvasHeight: number;
  onSelectBox: (boxId: LayoutBoxId) => void;
  onDragBox: (boxId: LayoutBoxId, deltaX: number, deltaY: number) => void;
  styles: any;
  children: React.ReactNode;
  footer?: boolean;
}) {
  const active = activeBoxId === boxId;
  return (
    <Pressable
      onPress={() => onSelectBox(boxId)}
      style={[
        styles.bookBox,
        footer && styles.bookFooterBox,
        boxFrameStyle(box),
        active && styles.bookBoxActive,
      ]}
    >
      <DragHandle
        boxId={boxId}
        active={active}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        onSelectBox={onSelectBox}
        onDragBox={onDragBox}
        styles={styles}
      />
      {children}
    </Pressable>
  );
}

export function WriteEditor({
  title,
  body,
  footerText,
  fontKey,
  layout,
  activeBoxId,
  onSelectBox,
  onDragBox,
  onChangeTitle,
  onChangeBody,
  styles,
  children,
}: Props) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const fontFamily = useMemo(() => {
    if (fontKey === "sans") return styles.bookFontSans;
    if (fontKey === "hand") return styles.bookFontHand;
    return styles.bookFontSerif;
  }, [fontKey, styles.bookFontHand, styles.bookFontSans, styles.bookFontSerif]);

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

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
          onLayout={onCanvasLayout}
        >
          <EditableBox
            boxId="title_box"
            box={layout.titleBox}
            activeBoxId={activeBoxId}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            onSelectBox={onSelectBox}
            onDragBox={onDragBox}
            styles={styles}
          >
            <TextInput
              value={title}
              onChangeText={onChangeTitle}
              placeholder="제목을 입력해줘"
              placeholderTextColor="rgba(74,62,48,0.35)"
              multiline
              style={[
                styles.bookTitleInput,
                fontFamily,
                {
                  textAlign: layout.titleStyle.align,
                  fontSize: 18 * layout.titleStyle.fontScale,
                  lineHeight: 22 * layout.titleStyle.lineHeight,
                },
              ]}
              testID="write-title-input"
            />
          </EditableBox>

          <EditableBox
            boxId="text_box"
            box={layout.bodyBox}
            activeBoxId={activeBoxId}
            canvasWidth={canvasSize.width}
            canvasHeight={canvasSize.height}
            onSelectBox={onSelectBox}
            onDragBox={onDragBox}
            styles={styles}
          >
            <TextInput
              value={body}
              onChangeText={onChangeBody}
              placeholder="오늘의 글을 남겨줘…"
              placeholderTextColor="rgba(74,62,48,0.32)"
              multiline
              style={[
                styles.bookBodyInput,
                fontFamily,
                {
                  textAlign: layout.bodyStyle.align,
                  fontSize: 13 * layout.bodyStyle.fontScale,
                  lineHeight: 20 * layout.bodyStyle.lineHeight,
                },
              ]}
              testID="write-body-input"
            />
          </EditableBox>

          {layout.showFooter ? (
            <EditableBox
              boxId="footer_box"
              box={layout.footerBox}
              activeBoxId={activeBoxId}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
              onSelectBox={onSelectBox}
              onDragBox={onDragBox}
              styles={styles}
              footer
            >
              <Text
                numberOfLines={2}
                style={[
                  styles.bookFooterText,
                  fontFamily,
                  {
                    textAlign: layout.footerStyle.align,
                    fontSize: 10 * layout.footerStyle.fontScale,
                    lineHeight: 12 * layout.footerStyle.lineHeight,
                  },
                ]}
              >
                {footerText || "#글숲"}
              </Text>
            </EditableBox>
          ) : null}
        </ImageBackground>
      </View>

      {children ? <View style={styles.editorControlDock}>{children}</View> : null}
    </View>
  );
}
