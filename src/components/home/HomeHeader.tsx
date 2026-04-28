import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { homeHeaderStyles } from "@/screens/Home.styles";
import { tokens } from "@/theme/tokens";

type Props = {
  onPressSearch?: () => void;
};

export function HomeHeader({ onPressSearch }: Props) {
  return (
    <View style={homeHeaderStyles.header}>
      <Text style={homeHeaderStyles.brand}>글숲</Text>

      <Pressable
        onPress={onPressSearch}
        hitSlop={12}
        style={({ pressed }) => [
          homeHeaderStyles.searchPill,
          pressed && homeHeaderStyles.searchPillPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="검색"
      >
        <Ionicons
          name="search-outline"
          size={18}
          color={tokens.colors.textMuted}
        />
        <Text style={homeHeaderStyles.searchText}>검색</Text>
      </Pressable>
    </View>
  );
}
