import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { storyRailStyles as styles } from "@/screens/Home.styles";

type Props<T extends string> = {
  categories: readonly T[];
  active: T;
  onChange: (value: T) => void;
};

function getInitials(label: string) {
  if (label === "전체") return "All";
  return label.slice(0, 2);
}

export function StoryRail<T extends string>({ categories, active, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {categories.map((item) => {
          const isActive = item === active;
          return (
            <Pressable
              key={item}
              onPress={() => onChange(item)}
              style={({ pressed }) => [
                styles.item,
                pressed && styles.itemPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              testID={`home-story-${item}`}
            >
              <View style={[styles.ring, isActive && styles.ringActive]}>
                <View style={styles.avatar}>
                  <Text style={[styles.avatarText, isActive && styles.avatarTextActive]}>
                    {getInitials(item)}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.label, isActive && styles.labelActive]}
                numberOfLines={1}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
