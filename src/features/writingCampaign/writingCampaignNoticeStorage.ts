import AsyncStorage from "@react-native-async-storage/async-storage";

import { DAILY_WRITING_CAMPAIGN_KEY } from "@/features/writingCampaign/dailyWritingCampaign";

const NOTICE_DISMISS_PREFIX = "glsoop:writing-campaign-notice-dismissed";

function buildDismissKey(localDateKey: string, eventKey = DAILY_WRITING_CAMPAIGN_KEY) {
  return `${NOTICE_DISMISS_PREFIX}:${eventKey}:${localDateKey}`;
}

export async function isWritingCampaignNoticeDismissed(
  localDateKey: string,
  eventKey = DAILY_WRITING_CAMPAIGN_KEY
) {
  const raw = await AsyncStorage.getItem(buildDismissKey(localDateKey, eventKey));
  return raw === "1";
}

export async function dismissWritingCampaignNoticeForToday(
  localDateKey: string,
  eventKey = DAILY_WRITING_CAMPAIGN_KEY
) {
  await AsyncStorage.setItem(buildDismissKey(localDateKey, eventKey), "1");
}
