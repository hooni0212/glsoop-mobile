import { Platform } from "react-native";

let mobileAdsInitialized: Promise<void> | null = null;

export type RewardedPhotoSaveResult = {
  type: string;
  amount: number;
  adUnitId: string;
  requestedAdUnitId: string;
  usedTestAdUnit: boolean;
};

function shouldUseTestAds() {
  const raw = process.env.EXPO_PUBLIC_ADMOB_USE_TEST_ADS;
  if (raw === undefined || raw === null || raw === "") return __DEV__;
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

async function loadGoogleMobileAds() {
  try {
    return await import("react-native-google-mobile-ads");
  } catch {
    throw new Error(
      "광고 SDK를 불러오지 못했어요. 개발 빌드 또는 스토어 빌드에서 다시 시도해주세요."
    );
  }
}

async function initializeMobileAds() {
  if (mobileAdsInitialized) return mobileAdsInitialized;

  mobileAdsInitialized = (async () => {
    const ads = await loadGoogleMobileAds();
    await ads.default().setRequestConfiguration({
      maxAdContentRating: ads.MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    await ads.default().initialize();
  })();

  return mobileAdsInitialized;
}

export async function showRewardedPhotoSaveAd(adUnitId: string): Promise<RewardedPhotoSaveResult> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("이 기기에서는 보상형 광고를 지원하지 않아요.");
  }

  const requestedAdUnitId = adUnitId.trim();
  if (!requestedAdUnitId) {
    throw new Error("사진 저장 광고가 아직 준비되지 않았어요.");
  }

  await initializeMobileAds();
  const ads = await loadGoogleMobileAds();
  const usedTestAdUnit = shouldUseTestAds();
  const effectiveAdUnitId = usedTestAdUnit ? ads.TestIds.REWARDED : requestedAdUnitId;

  return new Promise((resolve, reject) => {
    const rewarded = ads.RewardedAd.createForAdRequest(effectiveAdUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    let settled = false;
    let earnedReward: { type?: string; amount?: number } | null = null;

    const cleanup = () => {
      clearTimeout(timeoutId);
      rewarded.removeAllListeners();
    };

    const settleResolve = (value: RewardedPhotoSaveResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };

    const settleReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error("광고를 완료하지 못했어요."));
    };

    const timeoutId = setTimeout(() => {
      settleReject(new Error("광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요."));
    }, 15000);

    rewarded.addAdEventListener(ads.AdEventType.ERROR, (error) => {
      settleReject(
        new Error(
          error instanceof Error && error.message
            ? error.message
            : "광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요."
        )
      );
    });

    rewarded.addAdEventListener(ads.RewardedAdEventType.LOADED, () => {
      rewarded.show({ immersiveModeEnabled: true }).catch(settleReject);
    });

    rewarded.addAdEventListener(ads.RewardedAdEventType.EARNED_REWARD, (reward) => {
      earnedReward = {
        type: reward?.type || "photo_save",
        amount: typeof reward?.amount === "number" ? reward.amount : 1,
      };
    });

    rewarded.addAdEventListener(ads.AdEventType.CLOSED, () => {
      if (!earnedReward) {
        settleReject(new Error("광고 시청이 완료되지 않았어요."));
        return;
      }

      settleResolve({
        type: earnedReward.type || "photo_save",
        amount: earnedReward.amount || 1,
        adUnitId: effectiveAdUnitId,
        requestedAdUnitId,
        usedTestAdUnit,
      });
    });

    rewarded.load();
  });
}
