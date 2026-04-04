import { useSyncExternalStore } from "react";

type BlockedUsersSnapshot = {
  blockedUserIds: string[];
};

const listeners = new Set<() => void>();

let snapshot: BlockedUsersSnapshot = {
  blockedUserIds: [],
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

function normalizeUserId(value: string | null | undefined) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function normalizeBlockedUserIds(values: readonly string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const userId = normalizeUserId(value);
    if (!userId || seen.has(userId)) continue;
    seen.add(userId);
    normalized.push(userId);
  }

  return normalized;
}

function setSnapshot(nextBlockedUserIds: readonly string[]) {
  const normalized = normalizeBlockedUserIds(nextBlockedUserIds);
  const prev = snapshot.blockedUserIds;

  if (
    prev.length === normalized.length &&
    prev.every((value, index) => value === normalized[index])
  ) {
    return;
  }

  snapshot = {
    blockedUserIds: normalized,
  };
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

export function replaceBlockedUserIds(userIds: readonly string[]) {
  setSnapshot(userIds);
}

export function addBlockedUserId(userId: string) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return;
  setSnapshot([...snapshot.blockedUserIds, normalizedUserId]);
}

export function removeBlockedUserId(userId: string) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return;
  setSnapshot(snapshot.blockedUserIds.filter((value) => value !== normalizedUserId));
}

export function clearBlockedUserIds() {
  if (snapshot.blockedUserIds.length === 0) return;
  snapshot = { blockedUserIds: [] };
  emitChange();
}

export function useBlockedUserIds() {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().blockedUserIds,
    () => getSnapshot().blockedUserIds
  );
}

export function filterBlockedPosts<
  T extends {
    author?: {
      id?: string | null;
    } | null;
  },
>(items: readonly T[], blockedUserIds: readonly string[]) {
  if (!Array.isArray(items) || items.length === 0 || blockedUserIds.length === 0) {
    return [...items];
  }

  const blockedSet = new Set(normalizeBlockedUserIds(blockedUserIds));
  return items.filter((item) => {
    const authorId = normalizeUserId(item?.author?.id ?? undefined);
    if (!authorId) return true;
    return !blockedSet.has(authorId);
  });
}

export function filterBlockedAuthors<
  T extends {
    id?: string | null;
  },
>(items: readonly T[], blockedUserIds: readonly string[]) {
  if (!Array.isArray(items) || items.length === 0 || blockedUserIds.length === 0) {
    return [...items];
  }

  const blockedSet = new Set(normalizeBlockedUserIds(blockedUserIds));
  return items.filter((item) => {
    const userId = normalizeUserId(item?.id ?? undefined);
    if (!userId) return true;
    return !blockedSet.has(userId);
  });
}
