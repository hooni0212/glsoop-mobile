import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRef, useSyncExternalStore } from "react";

export type BookmarkState = { bookmarked: boolean };

const bookmarkStore = new Map<string, BookmarkState>();
const listeners = new Set<() => void>();
const BOOKMARK_STORE_KEY = "glsoop:bookmarks:v1";
const MAX_BOOKMARK_ITEMS = 500;
let hydrateStarted = false;

function notify() {
  listeners.forEach((listener) => listener());
}

function toKey(postId: string | number) {
  return String(postId);
}

function schedulePersist() {
  const payload = Array.from(bookmarkStore.entries())
    .slice(-MAX_BOOKMARK_ITEMS)
    .map(([id, state]) => ({ id, bookmarked: state.bookmarked }));

  void AsyncStorage.setItem(BOOKMARK_STORE_KEY, JSON.stringify(payload)).catch(() => {});
}

function startHydrate() {
  if (hydrateStarted) return;
  hydrateStarted = true;

  void (async () => {
    try {
      const raw = await AsyncStorage.getItem(BOOKMARK_STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      for (const row of parsed) {
        const id = typeof row?.id === "string" ? row.id : "";
        if (!id) continue;
        bookmarkStore.set(id, { bookmarked: Boolean(row?.bookmarked) });
      }
      notify();
    } catch {
      // ignore hydrate failures
    }
  })();
}

export function setBookmark(postId: string | number, bookmarked: boolean) {
  startHydrate();
  bookmarkStore.set(toKey(postId), { bookmarked });
  notify();
  schedulePersist();
}

export function getBookmark(postId: string | number): BookmarkState | null {
  startHydrate();
  return bookmarkStore.get(toKey(postId)) ?? null;
}

export function clearBookmarks() {
  startHydrate();
  bookmarkStore.clear();
  notify();
  void AsyncStorage.removeItem(BOOKMARK_STORE_KEY).catch(() => {});
}

export function useBookmarkSnapshot(postId: string | number, fallbackBookmarked: boolean) {
  const key = toKey(postId);
  startHydrate();
  const fallbackRef = useRef<BookmarkState>({ bookmarked: fallbackBookmarked });

  if (fallbackRef.current.bookmarked !== fallbackBookmarked) {
    fallbackRef.current = { bookmarked: fallbackBookmarked };
  }

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => bookmarkStore.get(key) ?? fallbackRef.current,
    () => fallbackRef.current
  );
}

startHydrate();
