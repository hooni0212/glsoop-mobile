import React from "react";
import { Pressable, Text, View } from "react-native";

import { categoryChipsStyles as styles } from "@/screens/Home.styles";
import { useKeyboardFocus } from "@/hooks/useKeyboardFocus";

type Props<T extends string> = {
  categories: readonly T[];
  active: T;
  onChange: (next: T) => void;
};

export function CategoryChips<T extends string>({
  categories,
  active,
  onChange,
}: Props<T>) {
  return (
    <View style={styles.wrap}>
      <View style={styles.content}>
        {categories.map((category) => (
          <CategoryChip
            key={category}
            label={category}
            active={category === active}
            onPress={() => onChange(category)}
          />
        ))}
      </View>
    </View>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const focus = useKeyboardFocus();

  return (
    <Pressable
      {...focus.focusProps}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && styles.chipPressed,
        focus.keyboardFocused && styles.focused,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <View style={[styles.activeLine, active && styles.activeLineOn]} />
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}
