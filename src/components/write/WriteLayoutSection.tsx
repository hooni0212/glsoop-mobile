import React from "react";
import { Pressable, Text, View } from "react-native";

import {
  LAYOUT_ALIGN_OPTIONS,
  LAYOUT_SCALE_OPTIONS,
  type LayoutAlign,
  type WriteLayoutModel,
} from "@/lib/postLayout";

type Props = {
  styles: any;
  layout: WriteLayoutModel;
  onChangeTitleAlign: (value: LayoutAlign) => void;
  onChangeBodyAlign: (value: LayoutAlign) => void;
  onChangeTitleScale: (value: number) => void;
  onChangeBodyScale: (value: number) => void;
  onToggleFooter: () => void;
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

export function WriteLayoutSection({
  styles,
  layout,
  onChangeTitleAlign,
  onChangeBodyAlign,
  onChangeTitleScale,
  onChangeBodyScale,
  onToggleFooter,
}: Props) {
  return (
    <View style={styles.metaCard}>
      <Text style={styles.label}>레이아웃</Text>
      <Text style={styles.hint}>웹 드래그 편집기 대신 모바일용 정렬과 크기 조절을 먼저 지원해요.</Text>

      <View style={styles.metaDivider} />

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
