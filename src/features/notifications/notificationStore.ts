import { useSyncExternalStore } from "react";

import { listNotifications } from "@/services/notificationService";

type NotificationSnapshot = {
  unreadCount: number;
  loaded: boolean;
};

const listeners = new Set<() => void>();
let snapshot: NotificationSnapshot = {
  unreadCount: 0,
  loaded: false,
};
let inflightRefresh: Promise<number> | null = null;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function setSnapshot(next: NotificationSnapshot) {
  if (snapshot.unreadCount === next.unreadCount && snapshot.loaded === next.loaded) {
    return;
  }

  snapshot = next;
  emitChange();
}

export function setNotificationUnreadCount(count: number) {
  setSnapshot({
    unreadCount: Math.max(0, Math.floor(count)),
    loaded: true,
  });
}

export function decrementNotificationUnreadCount() {
  setNotificationUnreadCount(Math.max(0, snapshot.unreadCount - 1));
}

export function clearNotificationUnreadCount() {
  setSnapshot({
    unreadCount: 0,
    loaded: false,
  });
}

export async function refreshNotificationUnreadCount() {
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = listNotifications({ limit: 1, offset: 0 })
    .then((result) => {
      setNotificationUnreadCount(result.unreadCount);
      return result.unreadCount;
    })
    .finally(() => {
      inflightRefresh = null;
    });

  return inflightRefresh;
}

export function useNotificationUnreadCount() {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().unreadCount,
    () => getSnapshot().unreadCount
  );
}
