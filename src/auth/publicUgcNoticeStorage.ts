import AsyncStorage from "@react-native-async-storage/async-storage";

const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";

type PublicUgcNoticeSnapshot = {
  versionKey: string;
  acknowledgedAt: string;
};

export async function getAcknowledgedPublicUgcNoticeVersion() {
  const raw = await AsyncStorage.getItem(PUBLIC_UGC_NOTICE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PublicUgcNoticeSnapshot | null;
    if (
      parsed &&
      typeof parsed.versionKey === "string" &&
      parsed.versionKey.trim().length > 0
    ) {
      return parsed.versionKey.trim();
    }
  } catch {
    // ignore malformed legacy value
  }

  return null;
}

export async function acknowledgePublicUgcNotice(versionKey: string) {
  const normalizedVersionKey = versionKey.trim();
  if (!normalizedVersionKey) return;

  const payload: PublicUgcNoticeSnapshot = {
    versionKey: normalizedVersionKey,
    acknowledgedAt: new Date().toISOString(),
  };

  await AsyncStorage.setItem(PUBLIC_UGC_NOTICE_STORAGE_KEY, JSON.stringify(payload));
}
