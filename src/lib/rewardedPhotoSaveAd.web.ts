export type RewardedPhotoSaveResult = {
  type: string;
  amount: number;
  adUnitId: string;
  requestedAdUnitId: string;
  usedTestAdUnit: boolean;
};

export async function showRewardedPhotoSaveAd(
  _adUnitId: string
): Promise<RewardedPhotoSaveResult> {
  throw new Error("이 기기에서는 보상형 광고를 지원하지 않아요.");
}
