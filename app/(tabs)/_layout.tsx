import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabsBar } from "@/navigation/TabsBar";
import { getTabBarTotalHeight } from "@/navigation/tabs.styles";

/**
 * (tabs) 라우팅 전용 레이아웃
 * - 탭 UI/메타/스타일은 src/navigation 으로 분리
 */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = getTabBarTotalHeight(insets.bottom);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        // 기본 탭바는 숨기고 우리가 직접 그립니다.
        // NOTE: tabBarStyle.height를 명시해두면 RN이 "하단 영역"을 안정적으로 예약하는 데 도움이 됨
        // (커스텀 tabBar를 쓰는 경우에도 화면별 체감 높이 차이가 줄어든다)
        tabBarStyle: { display: "none", height: tabBarHeight },
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
