import AsyncStorage from "@react-native-async-storage/async-storage";

import { apiPost } from "@/lib/api";
import { getNativeAppVersionContext, isNativeAppPlatform } from "@/lib/clientContext";

const ANONYMOUS_ID_KEY = "glsoop:native-analytics:anonymous-id";
const EVENT_NAME_PATTERN = /^[a-z0-9_]{1,64}$/;
const MAX_PAGE_PATH_LENGTH = 255;

type AnalyticsValue = string | number | boolean | null | undefined;
type AnalyticsProperties = Record<string, AnalyticsValue>;

type TrackNativeUxEventOptions = {
  pagePath?: string | null;
  properties?: AnalyticsProperties;
};

let anonymousIdPromise: Promise<string> | null = null;
const sessionId = createId("native_session");

function createId(prefix: string): string {
  const runtimeCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof runtimeCrypto?.randomUUID === "function") {
    return `${prefix}_${runtimeCrypto.randomUUID()}`;
  }
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

async function loadAnonymousId(): Promise<string> {
  const stored = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
  if (stored) return stored;

  const created = createId("native_anon");
  await AsyncStorage.setItem(ANONYMOUS_ID_KEY, created);
  return created;
}

function getAnonymousId(): Promise<string> {
  if (!anonymousIdPromise) {
    anonymousIdPromise = loadAnonymousId().catch((error) => {
      anonymousIdPromise = null;
      throw error;
    });
  }
  return anonymousIdPromise;
}

function normalizeEventName(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return EVENT_NAME_PATTERN.test(normalized) ? normalized : null;
}

function normalizePagePath(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, MAX_PAGE_PATH_LENGTH);
}

function compactProperties(properties: AnalyticsProperties = {}): AnalyticsProperties {
  return Object.fromEntries(
    Object.entries({ ...getNativeAppVersionContext(), ...properties }).filter(
      ([, value]) => value !== undefined
    )
  );
}

export async function trackNativeUxEvent(
  eventName: string,
  options: TrackNativeUxEventOptions = {}
): Promise<boolean> {
  if (!isNativeAppPlatform()) return false;

  const normalizedEventName = normalizeEventName(eventName);
  if (!normalizedEventName) return false;

  try {
    const anonymousId = await getAnonymousId();
    await apiPost("/api/ux-events", {
      event_name: normalizedEventName,
      session_id: sessionId,
      anonymous_id: anonymousId,
      page_path: normalizePagePath(options.pagePath),
      properties: compactProperties(options.properties),
    });
    return true;
  } catch {
    // 계측 실패가 앱 동작이나 화면 전환을 막지 않도록 한다.
    return false;
  }
}
