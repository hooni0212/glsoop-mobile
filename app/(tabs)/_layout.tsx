import { Tabs } from "expo-router";
import React from "react";

import { TabsBar } from "@/navigation/TabsBar";

/**
 * (tabs) 라우팅 전용 레이아웃
 * - 탭 UI/메타/스타일은 src/navigation 으로 분리
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 기본 탭바는 숨기고 우리가 직접 그립니다.
        tabBarStyle: { display: "none" },
      }}
      tabBar={(props) => <TabsBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="bookmarks" options={{ title: "저장" }} />
      <Tabs.Screen name="growth" options={{ title: "성장" }} />
      <Tabs.Screen name="me" options={{ title: "내 정보" }} />
    </Tabs>
  );
}
