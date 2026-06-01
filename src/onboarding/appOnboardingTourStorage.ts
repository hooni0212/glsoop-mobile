import AsyncStorage from "@react-native-async-storage/async-storage";

const TOUR_VERSION = "app-onboarding-tour.v1";
const COMPLETED_KEY = "glsoop.appOnboardingTour.completed.v1";
const REPLAY_KEY = "glsoop.appOnboardingTour.replay.v1";

type TourStoragePayload = {
  version?: string;
  completedAt?: string;
  requestedAt?: string;
};

function parsePayload(raw: string | null): TourStoragePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export async function hasCompletedAppOnboardingTour() {
  const parsed = parsePayload(await AsyncStorage.getItem(COMPLETED_KEY));
  return parsed?.version === TOUR_VERSION && typeof parsed.completedAt === "string";
}

export async function markAppOnboardingTourCompleted() {
  const payload: TourStoragePayload = {
    version: TOUR_VERSION,
    completedAt: new Date().toISOString(),
  };
  await Promise.all([
    AsyncStorage.setItem(COMPLETED_KEY, JSON.stringify(payload)),
    AsyncStorage.removeItem(REPLAY_KEY),
  ]);
}

export async function requestAppOnboardingTourReplay() {
  const payload: TourStoragePayload = {
    version: TOUR_VERSION,
    requestedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(REPLAY_KEY, JSON.stringify(payload));
}

export async function consumeAppOnboardingTourReplayRequest() {
  const parsed = parsePayload(await AsyncStorage.getItem(REPLAY_KEY));
  if (parsed?.version !== TOUR_VERSION || typeof parsed.requestedAt !== "string") {
    return false;
  }

  await AsyncStorage.removeItem(REPLAY_KEY);
  return true;
}
