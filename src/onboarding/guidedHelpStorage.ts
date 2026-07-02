import AsyncStorage from "@react-native-async-storage/async-storage";

import type { GuidedHelpPageKey } from "@/onboarding/guidedHelpContent";

const GUIDED_HELP_VERSION = "guided-help.v1";
const PAGE_SEEN_PREFIX = "glsoop.guidedHelp.pageSeen.v1.";
const DISMISSED_KEY = "glsoop.guidedHelp.dismissed.v1";
const REQUEST_PAGE_KEY = "glsoop.guidedHelp.requestPage.v1";
const REQUEST_BUTTONS_KEY = "glsoop.guidedHelp.requestButtons.v1";

type GuidedHelpPayload = {
  version?: string;
  pageKey?: GuidedHelpPageKey;
  completedAt?: string;
  requestedAt?: string;
};

function pageSeenKey(pageKey: GuidedHelpPageKey) {
  return `${PAGE_SEEN_PREFIX}${pageKey}`;
}

function parsePayload(raw: string | null): GuidedHelpPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function hasSeenGuidedHelpPage(pageKey: GuidedHelpPageKey) {
  const parsed = parsePayload(await AsyncStorage.getItem(pageSeenKey(pageKey)));
  return parsed?.version === GUIDED_HELP_VERSION && typeof parsed.completedAt === "string";
}

export async function markGuidedHelpPageSeen(pageKey: GuidedHelpPageKey) {
  const payload: GuidedHelpPayload = {
    version: GUIDED_HELP_VERSION,
    pageKey,
    completedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(pageSeenKey(pageKey), JSON.stringify(payload));
}

export async function hasDismissedGuidedHelp() {
  const parsed = parsePayload(await AsyncStorage.getItem(DISMISSED_KEY));
  return parsed?.version === GUIDED_HELP_VERSION && typeof parsed.completedAt === "string";
}

export async function markGuidedHelpDismissed() {
  const payload: GuidedHelpPayload = {
    version: GUIDED_HELP_VERSION,
    completedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(payload));
}

export async function requestGuidedHelpPageReplay(pageKey: GuidedHelpPageKey) {
  const payload: GuidedHelpPayload = {
    version: GUIDED_HELP_VERSION,
    pageKey,
    requestedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(REQUEST_PAGE_KEY, JSON.stringify(payload));
}

export async function requestGuidedHelpButtonsReplay(pageKey: GuidedHelpPageKey) {
  const payload: GuidedHelpPayload = {
    version: GUIDED_HELP_VERSION,
    pageKey,
    requestedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(REQUEST_BUTTONS_KEY, JSON.stringify(payload));
}

async function consumeRequestedPage(storageKey: string, pageKey: GuidedHelpPageKey) {
  const parsed = parsePayload(await AsyncStorage.getItem(storageKey));
  if (
    parsed?.version !== GUIDED_HELP_VERSION ||
    parsed.pageKey !== pageKey ||
    typeof parsed.requestedAt !== "string"
  ) {
    return false;
  }

  await AsyncStorage.removeItem(storageKey);
  return true;
}

export function consumeGuidedHelpPageReplayRequest(pageKey: GuidedHelpPageKey) {
  return consumeRequestedPage(REQUEST_PAGE_KEY, pageKey);
}

export function consumeGuidedHelpButtonsReplayRequest(pageKey: GuidedHelpPageKey) {
  return consumeRequestedPage(REQUEST_BUTTONS_KEY, pageKey);
}
