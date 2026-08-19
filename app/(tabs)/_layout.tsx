import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabsBar } from "@/navigation/TabsBar";
import { getTabBarTotalHeight } from "@/navigation/tabs.styles";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * (tabs) 라우팅 전용 레이아웃
 * - 탭 UI/메타/스타일은 src/navigation 으로 분리
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const tabBarHeight = getTabBarTotalHeight(insets.bottom);

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        lazy: true,
        animation: reducedMotion ? "none" : "shift",
        transitionSpec: reducedMotion
          ? undefined
          : {
              animation: "timing",
              config: { duration: 210 },
            },
        // 기본 탭바는 숨기고 우리가 직접 그립니다.
        // NOTE: tabBarStyle.height를 명시해두면 RN이 "하단 영역"을 안정적으로 예약하는 데 도움이 됨
        // (커스텀 tabBar를 쓰는 경우에도 화면별 체감 높이 차이가 줄어든다)
        tabBarStyle: { display: "none", height: tabBarHeight },
      }}
      tabBar={(props) => <TabsBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "오늘" }} />
      <Tabs.Screen name="explore" options={{ title: "읽기" }} />
      <Tabs.Screen name="book" options={{ title: "문집" }} />
      <Tabs.Screen name="me" options={{ title: "나" }} />

      {/* 기존 경로는 딥링크/내부 이동 호환을 위해 유지하되 하단 탭에서는 숨긴다. */}
      <Tabs.Screen name="bookmarks" options={{ href: null }} />
      <Tabs.Screen name="growth" options={{ href: null }} />
    </Tabs>
  );
}
