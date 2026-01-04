import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {categories.map((c) => {
          const isActive = c === active;
          return (
            <Pressable
              key={c}
              onPress={() => onChange(c)}
              style={[styles.chip, isActive && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[styles.chipText, isActive && styles.chipTextActive]}
              >
                {c}
              </Text>
            </Pressable>
          );
        })}
        <View style={{ width: 6 }} />
      </ScrollView>
    </View>
  );
}
