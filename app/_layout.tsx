import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* (tabs)는 탭 네비가 알아서 렌더링 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* ✅ FAB로 들어가는 글쓰기: 모달처럼 아래에서 올라오게 */}
      <Stack.Screen
        name="write"
        options={{
          headerShown: false,
          presentation: "modal",
          animation: "slide_from_bottom",
        }}
      />

      <Stack.Screen name="ui-kit" options={{ headerShown: false }} />
    </Stack>
  );
}
