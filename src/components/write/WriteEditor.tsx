import React, { useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  PanResponder,
  Pressable,
  TextInput,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from "react-native";

import type { PostFontKey } from "@/lib/postContent";
import { getPostBackgroundTemplate } from "@/lib/postBackgroundTemplates";
import {
  toLayoutLetterSpacingPx,
  type LayoutBox,
  type LayoutBoxId,
  type WriteLayoutModel,
} from "@/lib/postLayout";

type Props = {
  title: string;
  body: string;
  fontKey: PostFontKey;
  layout: WriteLayoutModel;
  activeBoxId: LayoutBoxId;
  onSelectBox: (boxId: LayoutBoxId) => void;
  onDragBox: (boxId: LayoutBoxId, deltaX: number, deltaY: number) => void;
  onChangeTitle: (v: string) => void;
  onChangeBody: (v: string) => void;
  onPressBackground?: () => void;
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
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: () => true,
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
      hitSlop={{ top: 10, right: 14, bottom: 10, left: 14 }}
      style={[
        styles.dragHandle,
        active && styles.dragHandleActive,
        boxId === "text_box" && styles.dragHandleBody,
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
}) {
  const active = activeBoxId === boxId;
  return (
    <Pressable
      onPress={() => onSelectBox(boxId)}
      style={[
        styles.bookBox,
        boxId === "text_box" && styles.bookBodyBox,
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
  fontKey,
  layout,
  activeBoxId,
  onSelectBox,
  onDragBox,
  onChangeTitle,
  onChangeBody,
  onPressBackground,
  styles,
  children,
}: Props) {
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const backgroundTemplate = useMemo(
    () => getPostBackgroundTemplate(layout.presetId),
    [layout.presetId]
  );

  const fontFamily = useMemo(() => {
    if (fontKey === "sans") return styles.bookFontSans;
    if (fontKey === "hand") return styles.bookFontHand;
    return styles.bookFontSerif;
  }, [fontKey, styles.bookFontHand, styles.bookFontSans, styles.bookFontSerif]);

  const onCanvasLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasSize({ width, height });
  };

  const titleFontSize = 18 * layout.titleStyle.fontScale;
  const bodyFontSize = 13 * layout.bodyStyle.fontScale;
  const titleLetterSpacing = toLayoutLetterSpacingPx(titleFontSize, layout.titleStyle.letterSpacing);
  const bodyLetterSpacing = toLayoutLetterSpacingPx(bodyFontSize, layout.bodyStyle.letterSpacing);
  const backgroundImageScale = backgroundTemplate.imageWidthScale;
  const backgroundImageStyle = [
    styles.bookCanvasImage,
    backgroundTemplate.resizeMode === "cover"
      ? styles.bookCanvasImageCover
      : styles.bookCanvasImageContainTop,
    backgroundTemplate.resizeMode === "contain"
      ? {
          aspectRatio: backgroundTemplate.imageAspectRatio,
          left: `${((1 - backgroundImageScale) / 2) * 100}%`,
          top: canvasSize.height * backgroundTemplate.imageOffsetYRatio,
          width: `${backgroundImageScale * 100}%`,
        }
      : null,
  ];

  return (
    <View style={styles.editorWrap}>
      <View style={styles.editorStage}>
        <View
          style={[styles.bookCanvas, { backgroundColor: backgroundTemplate.backgroundColor }]}
          onLayout={onCanvasLayout}
        >
          <Image
            source={backgroundTemplate.source}
            resizeMode={backgroundTemplate.resizeMode}
            style={backgroundImageStyle}
          />
          <Pressable
            onPress={onPressBackground}
            style={styles.bookCanvasDismissLayer}
            accessibilityRole="none"
          />
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
              onSubmitEditing={Keyboard.dismiss}
              blurOnSubmit
              placeholder="제목을 입력해줘"
              placeholderTextColor="rgba(74,62,48,0.35)"
              multiline
              style={[
                styles.bookTitleInput,
                fontFamily,
                {
                  textAlign: layout.titleStyle.align,
                  fontSize: titleFontSize,
                  lineHeight: 22 * layout.titleStyle.lineHeight,
                  ...(typeof titleLetterSpacing === "number"
                    ? { letterSpacing: titleLetterSpacing }
                    : {}),
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
              blurOnSubmit={false}
              style={[
                styles.bookBodyInput,
                fontFamily,
                {
                  textAlign: layout.bodyStyle.align,
                  fontSize: bodyFontSize,
                  lineHeight: 20 * layout.bodyStyle.lineHeight,
                  ...(typeof bodyLetterSpacing === "number"
                    ? { letterSpacing: bodyLetterSpacing }
                    : {}),
                },
              ]}
              testID="write-body-input"
            />
          </EditableBox>
        </View>
      </View>

      {children ? <View style={styles.editorControlDock}>{children}</View> : null}
    </View>
  );
}
