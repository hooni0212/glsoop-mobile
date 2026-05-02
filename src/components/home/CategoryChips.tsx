import React from "react";
import { Pressable, Text, View } from "react-native";

import { categoryChipsStyles as styles } from "@/screens/Home.styles";

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
        {categories.map((c) => {
          const isActive = c === active;
          return (
            <Pressable
              key={c}
              onPress={() => onChange(c)}
              style={({ pressed }) => [
                styles.chip,
                isActive && styles.chipActive,
                pressed && styles.chipPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.activeLine, isActive && styles.activeLineOn]} />
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
