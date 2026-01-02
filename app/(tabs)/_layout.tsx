import { Ionicons } from "@expo/vector-icons";
import { Tabs, router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

const TAB_ORDER: Array<keyof typeof TAB_META> = ["index", "bookmarks", "growth", "me"];

const TAB_META = {
  index: { label: "홈", icon: "home-outline" as const },
  bookmarks: { label: "저장", icon: "bookmark-outline" as const },
  growth: { label: "성장", icon: "trending-up-outline" as const },
  me: { label: "내 정보", icon: "person-outline" as const },
};

const COLORS = {
  active: "#2E5A3D",
  inactive: "#8E95A3",
  bg: "#FFFFFF",
  border: "rgba(0,0,0,0.06)",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 기본 탭바는 숨기고 우리가 직접 그립니다.
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => <RectBarRaisedFab {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="bookmarks" options={{ title: "저장" }} />
      <Tabs.Screen name="growth" options={{ title: "성장" }} />
      <Tabs.Screen name="me" options={{ title: "내 정보" }} />
    </Tabs>
  );
}

// React Navigation 타입을 굳이 import 안 해도 동작하지만,
// props 타입이 필요하면 아래 주석을 풀어도 됩니다.
// import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
function RectBarRaisedFab(props: any /* BottomTabBarProps */) {
  const { state, navigation } = props;

  const go = (name: string) => {
    // expo-router Tabs는 내부적으로 React Navigation 기반이라 navigate로 이동 가능
    navigation.navigate(name);
  };

  const focusedRouteName = state.routes[state.index]?.name;

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
          />
        ))}
      </View>

      {/* FAB 오버레이 */}
      <View style={styles.fabWrap} pointerEvents="box-none">
        <Pressable
          onPress={() => router.push("/write")}
          style={styles.fab}
          hitSlop={12}
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
}: {
  icon: any;
  label: string;
  active: boolean;
  onPress: () => void;
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

const styles = StyleSheet.create({
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ✅ 직사각형 바
  bar: {
    height: 74,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    paddingTop: 10,
  },

  tabSlot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginTop: 6,
  },

  activeLine: {
    position: "absolute",
    top: 0,
    left: 18,
    right: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  activeLineOn: {
    backgroundColor: COLORS.active,
  },

  // ✅ 가운데 FAB 자리 확보(탭 간격)
  centerGap: {
    width: 74,
  },

  // ✅ FAB 오버레이: 위로 살짝 띄움
  fabWrap: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -34 }],
    top: -22,
    width: 68,
    height: 68,
    borderRadius: 34,

    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,

    alignItems: "center",
    justifyContent: "center",
  },

  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.active,
    alignItems: "center",
    justifyContent: "center",
  },
});
