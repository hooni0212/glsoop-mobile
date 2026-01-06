import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, TAB_META, TAB_ORDER, type TabRouteName } from "./tabs.meta";
import { createTabsStyles } from "./tabs.styles";

/**
 * ✅ 최종 탭바(실전용)
 * - 바: 완전 직사각형
 * - 가운데 FAB: 위로 살짝 떠있게(오버레이)
 * - 탭 선택 표시: 상단 라인
 * - 탭 구성: 홈 / 저장 / (FAB) / 성장 / 내 정보
 *
 * IMPORTANT
 * - app/(tabs) 안에 __write.tsx 같은 더미 라우트를 만들지 마세요.
 *   (탭에 __write가 끼어들거나, href/tabBarButton 충돌 이슈가 생길 수 있음)
 * - FAB는 탭 라우트가 아니라 “오버레이 버튼”으로만 존재하고,
 *   눌렀을 때 router.push("/write") 로 이동합니다.
 */

// React Navigation 타입을 굳이 import 안 해도 동작하지만,
// props 타입이 필요하면 아래 주석을 풀어도 됩니다.
// import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function TabsBar(props: any /* BottomTabBarProps */) {
  const { state, navigation } = props;

  const insets = useSafeAreaInsets();
  const styles = React.useMemo(
    () => createTabsStyles(insets.bottom),
    [insets.bottom]
  );

  const go = (name: TabRouteName) => {
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
            active={focusedRouteName === name}
            onPress={() => go(name)}
            styles={styles}
          />
        ))}

        {/* 가운데 FAB 공간 확보 */}
        <View style={styles.centerGap} />

        {/* 오른쪽 2개 */}
        {TAB_ORDER.slice(2).map((name) => (
          <TabButton
            key={name}
            label={TAB_META[name].label}
            icon={TAB_META[name].icon}
            active={focusedRouteName === name}
            onPress={() => go(name)}
            styles={styles}
          />
        ))}
      </View>

      {/* FAB 오버레이 */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push("/write")}
          style={styles.fab}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="글쓰기"
          testID="fab-write"
        >
          <Ionicons name="create-outline" size={26} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
  styles,
}: {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
  styles: any;
}) {
  const color = active ? COLORS.active : COLORS.inactive;

  return (
    <Pressable onPress={onPress} style={styles.tabSlot} hitSlop={10}>
      {/* 선택 상단 라인 */}
      <View style={[styles.activeLine, active && styles.activeLineOn]} />

      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
