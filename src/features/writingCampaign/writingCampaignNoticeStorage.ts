import AsyncStorage from "@react-native-async-storage/async-storage";

import { DAILY_WRITING_CAMPAIGN_KEY } from "@/features/writingCampaign/dailyWritingCampaign";

const NOTICE_DISMISS_PREFIX = "glsoop:writing-campaign-notice-dismissed";

function buildDismissKey(localDateKey: string) {
  return `${NOTICE_DISMISS_PREFIX}:${DAILY_WRITING_CAMPAIGN_KEY}:${localDateKey}`;
}

export async function isWritingCampaignNoticeDismissed(localDateKey: string) {
  const raw = await AsyncStorage.getItem(buildDismissKey(localDateKey));
  return raw === "1";
}

export async function dismissWritingCampaignNoticeForToday(localDateKey: string) {
  await AsyncStorage.setItem(buildDismissKey(localDateKey), "1");
}
