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
  backgrounds: CosmeticItem[];
};

type UseMyCosmeticsResult = {
  inventory: CosmeticsInventory;
  profile: ProfileCosmeticsState;
  loading: boolean;
  loaded: boolean;
  error: AppErrorModel | null;
  refetch: () => Promise<void>;
};

const EMPTY_INVENTORY: CosmeticsInventory = {
  badges: [],
  stickers: [],
  backgrounds: [],
};

type CosmeticsSnapshot = {
  inventory: CosmeticsInventory;
  profile: ProfileCosmeticsState;
  loading: boolean;
  loaded: boolean;
  error: AppErrorModel | null;
};

const INITIAL_SNAPSHOT: CosmeticsSnapshot = {
  inventory: EMPTY_INVENTORY,
  profile: createEmptyProfileCosmeticsState(),
  loading: false,
  loaded: false,
  error: null,
};

let cosmeticsSnapshot: CosmeticsSnapshot = INITIAL_SNAPSHOT;
let cosmeticsInflight: Promise<void> | null = null;
const listeners = new Set<(snapshot: CosmeticsSnapshot) => void>();

function publishSnapshot(next: CosmeticsSnapshot) {
  cosmeticsSnapshot = next;
  listeners.forEach((listener) => listener(next));
}

export async function refreshMyCosmetics(force = false): Promise<void> {
  if (cosmeticsInflight && !force) {
    await cosmeticsInflight;
    return;
  }

  cosmeticsInflight = (async () => {
    publishSnapshot({
      ...cosmeticsSnapshot,
      loading: true,
      error: null,
    });

    try {
      const response = await getMyCosmetics();
      publishSnapshot({
        inventory: response.inventory,
        profile: response.profile,
        loading: false,
        loaded: true,
        error: null,
      });
    } catch (err) {
      publishSnapshot({
        ...cosmeticsSnapshot,
        loading: false,
        loaded: true,
        error: normalizeApiError(err),
      });
    }
  })().finally(() => {
    cosmeticsInflight = null;
  });

  await cosmeticsInflight;
}

export function resetMyCosmeticsSnapshot() {
  cosmeticsInflight = null;
  publishSnapshot(INITIAL_SNAPSHOT);
}

export function useMyCosmetics(): UseMyCosmeticsResult {
  const [snapshot, setSnapshot] = useState<CosmeticsSnapshot>(cosmeticsSnapshot);

  useEffect(() => {
    setSnapshot(cosmeticsSnapshot);
    const listener = (next: CosmeticsSnapshot) => setSnapshot(next);
    listeners.add(listener);
    void refreshMyCosmetics(false);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const fetchMyCosmetics = useCallback(async () => {
    await refreshMyCosmetics(true);
  }, []);

  return {
    inventory: snapshot.inventory,
    profile: snapshot.profile,
    loading: snapshot.loading,
    loaded: snapshot.loaded,
    error: snapshot.error,
    refetch: fetchMyCosmetics,
  };
}
