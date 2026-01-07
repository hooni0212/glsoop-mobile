import { Redirect } from "expo-router";

import { useAuth } from "@/auth/AuthContext";

export default function Index() {
  const { ready, token } = useAuth();

  if (!ready) return null;
  return <Redirect href={token ? "/(tabs)" : "/(auth)"} />;
}
