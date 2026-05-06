import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { homeHeaderStyles } from "@/screens/Home.styles";
import { tokens } from "@/theme/tokens";

type Props = {
  onPressSearch?: () => void;
  onPressNotifications?: () => void;
  hasUnreadNotifications?: boolean;
  showNotifications?: boolean;
};

export function HomeHeader({
  onPressSearch,
  onPressNotifications,
  hasUnreadNotifications = false,
  showNotifications = false,
}: Props) {
  return (
    <View style={homeHeaderStyles.header}>
      <Text style={homeHeaderStyles.brand}>글숲</Text>

      <View style={homeHeaderStyles.actions}>
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

        {showNotifications ? (
          <Pressable
            onPress={onPressNotifications}
            hitSlop={12}
            style={({ pressed }) => [
              homeHeaderStyles.iconBtn,
              pressed && homeHeaderStyles.iconBtnPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="알림"
            accessibilityState={{
              selected: hasUnreadNotifications,
            }}
            testID="home-notifications-btn"
          >
            <Ionicons
              name="notifications-outline"
              size={21}
              color={tokens.colors.textMuted}
            />
            {hasUnreadNotifications ? (
              <View
                style={homeHeaderStyles.notificationDot}
                testID="home-notifications-unread-dot"
              />
            ) : null}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
