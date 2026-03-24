import { Redirect } from "expo-router";
import { SafeAreaView, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { AppLoading } from "@/components/state/AppLoading";
import { tokens } from "@/theme/tokens";

export default function Index() {
  const { ready } = useAuth();

  if (!ready) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: tokens.colors.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <AppLoading message="로그인 상태를 준비하고 있어요..." />
        </View>
      </SafeAreaView>
    );
  }
  return <Redirect href="/(tabs)" />;
}
