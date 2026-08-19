import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Animated, Easing, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import { buildAuthRoute } from "@/lib/authRedirect";
import * as haptics from "@/lib/haptics";
import { COLORS, TAB_META, TAB_ORDER, type TabRouteName } from "./tabs.meta";
import { createTabsStyles } from "./tabs.styles";
import { useKeyboardFocus } from "@/hooks/useKeyboardFocus";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * ✅ 최종 탭바(실전용)
 * - 바: 완전 직사각형
 * - 가운데 쓰기: 탭바 안에 편집 행동으로 배치
 * - 탭 선택 표시: 하단 짧은 선
 * - 탭 구성: 오늘 / 읽기 / 쓰기 / 문집 / 나
 *
 * IMPORTANT
 * - app/(tabs) 안에 __write.tsx 같은 더미 라우트를 만들지 마세요.
 *   (탭에 __write가 끼어들거나, href/tabBarButton 충돌 이슈가 생길 수 있음)
 * - 쓰기는 탭 라우트가 아니라 “행동 버튼”으로만 존재하고,
 *   눌렀을 때 router.push("/write") 로 이동합니다.
 */

// React Navigation 타입을 굳이 import 안 해도 동작하지만,
// props 타입이 필요하면 아래 주석을 풀어도 됩니다.
// import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function TabsBar(props: any /* BottomTabBarProps */) {
  const { state, navigation } = props;

  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const writeFocus = useKeyboardFocus();
  const reducedMotion = useReducedMotion();
  const styles = React.useMemo(
    () => createTabsStyles(insets.bottom),
    [insets.bottom]
  );

  const go = (name: TabRouteName) => {
    haptics.selection();
    if (!token && name !== "index" && name !== "explore") {
      router.push(buildAuthRoute("/(auth)/login"));
      return;
    }
    // expo-router Tabs는 내부적으로 React Navigation 기반이라 navigate로 이동 가능
    navigation.navigate(name);
  };

  const focusedRouteName: string | undefined = state.routes[state.index]?.name;

  return (
    <View style={styles.barWrap}>
      {/* 직사각형 바 */}
      <View style={styles.bar}>
        {/* 왼쪽 2개 */}
        {TAB_ORDER.slice(0, 2).map((name) => (
          <TabButton
            key={name}
            label={TAB_META[name].label}
            icon={TAB_META[name].icon}
            activeIcon={TAB_META[name].activeIcon}
            active={focusedRouteName === name}
            onPress={() => go(name)}
            styles={styles}
            reducedMotion={reducedMotion}
          />
        ))}

        <Pressable
          {...writeFocus.focusProps}
          onPress={() => {
            haptics.medium();
            if (!token) {
              router.push(buildAuthRoute("/(auth)/login"));
              return;
            }
            router.push("/write");
          }}
          style={({ pressed }) => [
            styles.writeSlot,
            pressed && styles.pressed,
            writeFocus.keyboardFocused && styles.focused,
          ]}
          accessibilityRole="button"
          accessibilityLabel="글쓰기"
          testID="fab-write"
        >
          <View style={styles.writeMark}>
            <Ionicons name="create-outline" size={24} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* 오른쪽 2개 */}
        {TAB_ORDER.slice(2).map((name) => (
          <TabButton
            key={name}
            label={TAB_META[name].label}
            icon={TAB_META[name].icon}
            activeIcon={TAB_META[name].activeIcon}
            active={focusedRouteName === name}
            onPress={() => go(name)}
            styles={styles}
            reducedMotion={reducedMotion}
          />
        ))}
      </View>
    </View>
  );
}

function TabButton({
  icon,
  activeIcon,
  label,
  active,
  onPress,
  styles,
  reducedMotion,
}: {
  icon: any;
  activeIcon: any;
  label: string;
  active: boolean;
  onPress: () => void;
  styles: any;
  reducedMotion: boolean;
}) {
  const focus = useKeyboardFocus();
  const activeProgress = React.useRef(new Animated.Value(active ? 1 : 0)).current;
  const color = active ? COLORS.active : COLORS.inactive;

  React.useEffect(() => {
    if (reducedMotion) {
      activeProgress.setValue(active ? 1 : 0);
      return;
    }

    Animated.timing(activeProgress, {
      toValue: active ? 1 : 0,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }, [active, activeProgress, reducedMotion]);

  const haloStyle = {
    opacity: activeProgress,
    transform: [
      {
        scale: activeProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
      },
    ],
  };

  const contentStyle = {
    transform: [
      {
        translateY: activeProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -1],
        }),
      },
    ],
  };

  return (
    <Pressable
      {...focus.focusProps}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabSlot,
        pressed && styles.pressed,
        focus.keyboardFocused && styles.focused,
      ]}
      hitSlop={10}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Animated.View style={[styles.tabIconWrap, contentStyle]}>
        <Animated.View style={[styles.activeHalo, haloStyle]} />
        <Ionicons name={active ? activeIcon : icon} size={21} color={color} />
      </Animated.View>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
