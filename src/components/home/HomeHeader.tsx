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
        style={homeHeaderStyles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="검색"
      >
        <Ionicons
          name="search-outline"
          size={22}
          color={tokens.colors.textMuted}
        />
      </Pressable>
    </View>
  );
}
