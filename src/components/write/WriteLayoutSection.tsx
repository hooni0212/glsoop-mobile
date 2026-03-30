import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  LAYOUT_ALIGN_OPTIONS,
  LAYOUT_LETTER_SPACING_OPTIONS,
  LAYOUT_LINE_HEIGHT_OPTIONS,
  LAYOUT_SCALE_OPTIONS,
  type LayoutAlign,
  type LayoutBoxId,
  type LayoutStyle,
  type WriteLayoutModel,
} from "@/lib/postLayout";

type Props = {
  styles: any;
  layout: WriteLayoutModel;
  activeBoxId: LayoutBoxId;
  onSelectBox: (boxId: LayoutBoxId) => void;
  onChangeTitleAlign: (value: LayoutAlign) => void;
  onChangeBodyAlign: (value: LayoutAlign) => void;
  onChangeTitleScale: (value: number) => void;
  onChangeBodyScale: (value: number) => void;
  onChangeTitleLineHeight: (value: number) => void;
  onChangeBodyLineHeight: (value: number) => void;
  onChangeTitleLetterSpacing: (value: number) => void;
  onChangeBodyLetterSpacing: (value: number) => void;
  onNudgeBox: (boxId: LayoutBoxId, axis: "x" | "y", delta: number) => void;
  onResizeBox: (boxId: LayoutBoxId, axis: "w" | "h", delta: number) => void;
};

function toOptionTestId(value: string | number) {
  return String(value)
    .replace(/^-/, "neg_")
    .replace(/\./g, "_");
}

function findNearestOptionValue(selected: number, options: readonly { value: number }[]) {
  return options.reduce((closest, option) => {
    if (Math.abs(option.value - selected) < Math.abs(closest - selected)) {
      return option.value;
    }
    return closest;
  }, options[0]?.value ?? selected);
}

function OptionRow({
  label,
  options,
  selected,
  onSelect,
  styles,
  useNearestMatch = false,
  testIDPrefix,
}: {
  label: string;
  options: readonly { value: string | number; label: string }[];
  selected: string | number;
  onSelect: (value: string | number) => void;
  styles: any;
  useNearestMatch?: boolean;
  testIDPrefix?: string;
}) {
  const resolvedSelected =
    useNearestMatch && typeof selected === "number"
      ? findNearestOptionValue(
          selected,
          options.filter((item): item is { value: number; label: string } => typeof item.value === "number")
        )
      : selected;

  return (
    <View style={styles.layoutBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.layoutOptionRow}>
        {options.map((item) => {
          const active = item.value === resolvedSelected;
          return (
            <Pressable
              key={`${label}-${item.value}`}
              onPress={() => onSelect(item.value)}
              style={[styles.layoutOption, active && styles.layoutOptionActive]}
              testID={testIDPrefix ? `${testIDPrefix}-${toOptionTestId(item.value)}` : undefined}
            >
              <Text style={[styles.layoutOptionText, active && styles.layoutOptionTextActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const BOX_ITEMS: { id: LayoutBoxId; label: string }[] = [
  { id: "title_box", label: "제목 박스" },
  { id: "text_box", label: "본문 박스" },
];

function getActiveStyle(layout: WriteLayoutModel, activeBoxId: LayoutBoxId): LayoutStyle {
  return activeBoxId === "title_box" ? layout.titleStyle : layout.bodyStyle;
}

export function WriteLayoutSection({
  styles,
  layout,
  activeBoxId,
  onSelectBox,
  onChangeTitleAlign,
  onChangeBodyAlign,
  onChangeTitleScale,
  onChangeBodyScale,
  onChangeTitleLineHeight,
  onChangeBodyLineHeight,
  onChangeTitleLetterSpacing,
  onChangeBodyLetterSpacing,
  onNudgeBox,
  onResizeBox,
}: Props) {
  const isTitleBox = activeBoxId === "title_box";
  const activeBox = isTitleBox ? layout.titleBox : layout.bodyBox;
  const activeStyle = getActiveStyle(layout, activeBoxId);
  const activeLabel = isTitleBox ? "제목" : "본문";
  const lineHeightOptions = isTitleBox
    ? LAYOUT_LINE_HEIGHT_OPTIONS.title
    : LAYOUT_LINE_HEIGHT_OPTIONS.body;

  const onChangeAlign = isTitleBox ? onChangeTitleAlign : onChangeBodyAlign;
  const onChangeScale = isTitleBox ? onChangeTitleScale : onChangeBodyScale;
  const onChangeLineHeight = isTitleBox ? onChangeTitleLineHeight : onChangeBodyLineHeight;
  const onChangeLetterSpacing = isTitleBox
    ? onChangeTitleLetterSpacing
    : onChangeBodyLetterSpacing;

  return (
    <View style={styles.layoutDock}>
      <View style={styles.layoutDockHeader}>
        <Text style={styles.layoutDockTitle}>글 배치</Text>
        <Text style={styles.layoutDockHint}>{activeLabel} 박스 서식을 조절할 수 있어요.</Text>
      </View>

      <View style={styles.layoutBlock}>
        <Text style={styles.label}>활성 박스</Text>
        <View style={styles.layoutOptionRow}>
          {BOX_ITEMS.map((item) => {
            const active = item.id === activeBoxId;
            return (
              <Pressable
                key={item.id}
                onPress={() => onSelectBox(item.id)}
                style={[styles.layoutOption, active && styles.layoutOptionActive]}
                testID={`write-layout-box-${item.id}`}
              >
                <Text style={[styles.layoutOptionText, active && styles.layoutOptionTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.layoutMetrics}>
          x {activeBox.x.toFixed(3)} · y {activeBox.y.toFixed(3)} · w {activeBox.w.toFixed(3)} · h{" "}
          {activeBox.h.toFixed(3)}
        </Text>
      </View>

      <View style={styles.layoutBlock}>
        <Text style={styles.label}>위치 조절</Text>
        <View style={styles.layoutOptionRow}>
          <Pressable style={styles.layoutOption} onPress={() => onNudgeBox(activeBoxId, "x", -0.02)}>
            <Text style={styles.layoutOptionText}>왼쪽</Text>
          </Pressable>
          <Pressable style={styles.layoutOption} onPress={() => onNudgeBox(activeBoxId, "x", 0.02)}>
            <Text style={styles.layoutOptionText}>오른쪽</Text>
          </Pressable>
          <Pressable style={styles.layoutOption} onPress={() => onNudgeBox(activeBoxId, "y", -0.02)}>
            <Text style={styles.layoutOptionText}>위로</Text>
          </Pressable>
          <Pressable style={styles.layoutOption} onPress={() => onNudgeBox(activeBoxId, "y", 0.02)}>
            <Text style={styles.layoutOptionText}>아래로</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.layoutBlock}>
        <Text style={styles.label}>크기 조절</Text>
        <View style={styles.layoutOptionRow}>
          <Pressable style={styles.layoutOption} onPress={() => onResizeBox(activeBoxId, "w", -0.02)}>
            <Text style={styles.layoutOptionText}>폭 -</Text>
          </Pressable>
          <Pressable style={styles.layoutOption} onPress={() => onResizeBox(activeBoxId, "w", 0.02)}>
            <Text style={styles.layoutOptionText}>폭 +</Text>
          </Pressable>
          <Pressable style={styles.layoutOption} onPress={() => onResizeBox(activeBoxId, "h", -0.02)}>
            <Text style={styles.layoutOptionText}>높이 -</Text>
          </Pressable>
          <Pressable style={styles.layoutOption} onPress={() => onResizeBox(activeBoxId, "h", 0.02)}>
            <Text style={styles.layoutOptionText}>높이 +</Text>
          </Pressable>
        </View>
      </View>

      <OptionRow
        label={`${activeLabel} 정렬`}
        options={LAYOUT_ALIGN_OPTIONS}
        selected={activeStyle.align}
        onSelect={(value) => onChangeAlign(value as LayoutAlign)}
        styles={styles}
        testIDPrefix={`write-layout-${isTitleBox ? "title" : "body"}-align`}
      />

      <OptionRow
        label={`${activeLabel} 크기`}
        options={LAYOUT_SCALE_OPTIONS}
        selected={activeStyle.fontScale}
        onSelect={(value) => onChangeScale(value as number)}
        styles={styles}
        useNearestMatch
        testIDPrefix={`write-layout-${isTitleBox ? "title" : "body"}-scale`}
      />

      <OptionRow
        label={`${activeLabel} 행간`}
        options={lineHeightOptions}
        selected={activeStyle.lineHeight}
        onSelect={(value) => onChangeLineHeight(value as number)}
        styles={styles}
        useNearestMatch
        testIDPrefix={`write-layout-${isTitleBox ? "title" : "body"}-line-height`}
      />

      <OptionRow
        label={`${activeLabel} 자간`}
        options={LAYOUT_LETTER_SPACING_OPTIONS}
        selected={typeof activeStyle.letterSpacing === "number" ? activeStyle.letterSpacing : 0}
        onSelect={(value) => onChangeLetterSpacing(value as number)}
        styles={styles}
        useNearestMatch
        testIDPrefix={`write-layout-${isTitleBox ? "title" : "body"}-letter-spacing`}
      />
    </View>
  );
}
