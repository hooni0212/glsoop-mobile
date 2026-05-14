import { Redirect } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { AppBootScreen } from "@/components/state/AppBootScreen";

export default function Index() {
  const { ready } = useAuth();

  if (!ready) {
    return <AppBootScreen />;
  }
  return <Redirect href="/(tabs)" />;
}
