import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RuntimeLegalConfig } from "@/services/runtimeConfigService";

const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";
export const PUBLIC_UGC_NOTICE_FALLBACK_VERSION = "public-ugc-notice.v1";

type PublicUgcNoticeAcknowledgementListener = (versionKey: string) => void;

type PublicUgcNoticeSnapshot = {
  versionKey: string;
  acknowledgedAt: string;
};

const acknowledgementListeners = new Set<PublicUgcNoticeAcknowledgementListener>();

export function buildPublicUgcNoticeVersionKey(config: RuntimeLegalConfig | null) {
  const versions = config?.versions;
  const versionParts = [versions?.terms, versions?.privacy, versions?.guidelines].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );

  if (versionParts.length === 0) {
    return PUBLIC_UGC_NOTICE_FALLBACK_VERSION;
  }

  return `public-ugc-notice:${versionParts.join("|")}`;
}

export function subscribePublicUgcNoticeAcknowledgement(
  listener: PublicUgcNoticeAcknowledgementListener
) {
  acknowledgementListeners.add(listener);
  return () => {
    acknowledgementListeners.delete(listener);
  };
}

function notifyPublicUgcNoticeAcknowledgement(versionKey: string) {
  acknowledgementListeners.forEach((listener) => {
    listener(versionKey);
  });
}

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
  notifyPublicUgcNoticeAcknowledgement(normalizedVersionKey);
}
