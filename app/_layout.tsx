import { AuthGate } from "@/auth/AuthGate";
import { AuthProvider } from "@/auth/AuthContext";
import { BottomDockProvider } from "@/navigation/bottomDock";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <AuthProvider>
      <BottomDockProvider>
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }}>
          {/* (auth): 로그인 전 랜딩/로그인/회원가입 */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />

          {/* (tabs): 로그인 후 앱 본문 */}
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
      </BottomDockProvider>
    </AuthProvider>
  );
}
