import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  LAYOUT_ALIGN_OPTIONS,
  LAYOUT_SCALE_OPTIONS,
  type LayoutAlign,
  type LayoutBoxId,
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
  onToggleFooter: () => void;
  onNudgeBox: (boxId: LayoutBoxId, axis: "x" | "y", delta: number) => void;
  onResizeBox: (boxId: LayoutBoxId, axis: "w" | "h", delta: number) => void;
};

function OptionRow({
  label,
  options,
  selected,
  onSelect,
  styles,
}: {
  label: string;
  options: { value: string | number; label: string }[];
  selected: string | number;
  onSelect: (value: any) => void;
  styles: any;
}) {
  return (
    <View style={styles.layoutBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.layoutOptionRow}>
        {options.map((item) => {
          const active = item.value === selected;
          return (
            <Pressable
              key={`${label}-${item.value}`}
              onPress={() => onSelect(item.value)}
              style={[styles.layoutOption, active && styles.layoutOptionActive]}
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
  { id: "footer_box", label: "푸터 박스" },
];

export function WriteLayoutSection({
  styles,
  layout,
  activeBoxId,
  onSelectBox,
  onChangeTitleAlign,
  onChangeBodyAlign,
  onChangeTitleScale,
  onChangeBodyScale,
  onToggleFooter,
  onNudgeBox,
  onResizeBox,
}: Props) {
  const activeBox =
    activeBoxId === "title_box"
      ? layout.titleBox
      : activeBoxId === "text_box"
        ? layout.bodyBox
        : layout.footerBox;

  return (
    <View style={styles.layoutDock}>
      <View style={styles.layoutDockHeader}>
        <Text style={styles.layoutDockTitle}>레이아웃</Text>
        <Text style={styles.layoutDockHint}>
          서버와 같은 `title/text/footer` 박스를 바로 고르고 위치를 맞춰요.
        </Text>
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
        label="제목 정렬"
        options={LAYOUT_ALIGN_OPTIONS}
        selected={layout.titleStyle.align}
        onSelect={onChangeTitleAlign}
        styles={styles}
      />

      <OptionRow
        label="본문 정렬"
        options={LAYOUT_ALIGN_OPTIONS}
        selected={layout.bodyStyle.align}
        onSelect={onChangeBodyAlign}
        styles={styles}
      />

      <OptionRow
        label="제목 크기"
        options={LAYOUT_SCALE_OPTIONS}
        selected={layout.titleStyle.fontScale}
        onSelect={onChangeTitleScale}
        styles={styles}
      />

      <OptionRow
        label="본문 크기"
        options={LAYOUT_SCALE_OPTIONS}
        selected={layout.bodyStyle.fontScale}
        onSelect={onChangeBodyScale}
        styles={styles}
      />

      <View style={styles.layoutBlock}>
        <Text style={styles.label}>푸터 표시</Text>
        <View style={styles.layoutOptionRow}>
          <Pressable
            onPress={onToggleFooter}
            style={[styles.layoutOption, layout.showFooter && styles.layoutOptionActive]}
          >
            <Text
              style={[
                styles.layoutOptionText,
                layout.showFooter && styles.layoutOptionTextActive,
              ]}
            >
              {layout.showFooter ? "보임" : "숨김"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
