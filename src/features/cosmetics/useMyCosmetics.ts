import { useCallback, useEffect, useState } from "react";

import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { getMyCosmetics } from "@/services/cosmeticsService";
import {
  createEmptyProfileCosmeticsState,
  type CosmeticItem,
  type ProfileCosmeticsState,
} from "@/types/cosmetics";

type CosmeticsInventory = {
  badges: CosmeticItem[];
  stickers: CosmeticItem[];
};

type UseMyCosmeticsResult = {
  inventory: CosmeticsInventory;
  profile: ProfileCosmeticsState;
  loading: boolean;
  error: AppErrorModel | null;
  refetch: () => Promise<void>;
};

const EMPTY_INVENTORY: CosmeticsInventory = {
  badges: [],
  stickers: [],
};

export function useMyCosmetics(): UseMyCosmeticsResult {
  const [inventory, setInventory] = useState<CosmeticsInventory>(EMPTY_INVENTORY);
  const [profile, setProfile] = useState<ProfileCosmeticsState>(
    createEmptyProfileCosmeticsState
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);

  const fetchMyCosmetics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getMyCosmetics();
      setInventory(response.inventory);
      setProfile(response.profile);
    } catch (err) {
      setError(normalizeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCosmetics();
  }, [fetchMyCosmetics]);

  return {
    inventory,
    profile,
    loading,
    error,
    refetch: fetchMyCosmetics,
  };
}
