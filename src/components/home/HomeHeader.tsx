import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, View } from "react-native";

import { homeHeaderStyles } from "@/screens/Home.styles";
import { useKeyboardFocus } from "@/hooks/useKeyboardFocus";
import { FolioHeader } from "@/components/editorial/FolioHeader";
import { tokens } from "@/theme/tokens";

type Props = {
  title?: string;
  subtitle?: string;
  onPressSearch?: () => void;
  onPressNotifications?: () => void;
  hasUnreadNotifications?: boolean;
  showNotifications?: boolean;
};

export function HomeHeader({
  title = "글숲",
  subtitle,
  onPressSearch,
  onPressNotifications,
  hasUnreadNotifications = false,
  showNotifications = false,
}: Props) {
  const searchFocus = useKeyboardFocus();
  const notificationsFocus = useKeyboardFocus();

  return (
    <View style={homeHeaderStyles.header}>
      <FolioHeader
        folio="02"
        eyebrow="문장을 고르는 두 번째 면"
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Pressable
              {...searchFocus.focusProps}
              onPress={onPressSearch}
              hitSlop={12}
              style={({ pressed }) => [
                homeHeaderStyles.iconBtn,
                pressed && homeHeaderStyles.iconBtnPressed,
                searchFocus.keyboardFocused && homeHeaderStyles.focused,
              ]}
              accessibilityRole="button"
              accessibilityLabel="검색"
            >
              <Ionicons
                name="search-outline"
                size={22}
                color={tokens.colors.text}
              />
            </Pressable>

            {showNotifications ? (
              <Pressable
                {...notificationsFocus.focusProps}
                onPress={onPressNotifications}
                hitSlop={12}
                style={({ pressed }) => [
                  homeHeaderStyles.iconBtn,
                  pressed && homeHeaderStyles.iconBtnPressed,
                  notificationsFocus.keyboardFocused && homeHeaderStyles.focused,
                ]}
                accessibilityRole="button"
                accessibilityLabel="알림"
                accessibilityState={{ selected: hasUnreadNotifications }}
                testID="home-notifications-btn"
              >
                <Ionicons name="notifications-outline" size={22} color={tokens.colors.text} />
                {hasUnreadNotifications ? (
                  <View
                    style={homeHeaderStyles.notificationDot}
                    testID="home-notifications-unread-dot"
                  />
                ) : null}
              </Pressable>
            ) : null}
          </>
        }
      />
    </View>
  );
}
