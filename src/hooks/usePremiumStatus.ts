import React from "react";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/auth/AuthContext";
import { hasActiveEntitlement, listMyEntitlements } from "@/services/entitlementService";

export function usePremiumStatus(enabled = true) {
  const { token } = useAuth();
  const [isPremium, setIsPremium] = React.useState(false);
  const [loading, setLoading] = React.useState(Boolean(token));

  const refresh = React.useCallback(async () => {
    if (!enabled || !token) {
      setIsPremium(false);
      setLoading(false);
      return false;
    }

    setLoading(true);
    try {
      const active = hasActiveEntitlement(await listMyEntitlements());
      setIsPremium(active);
      return active;
    } catch {
      setIsPremium(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [enabled, token]);

  useFocusEffect(
    React.useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { isPremium, loading, refresh };
}
