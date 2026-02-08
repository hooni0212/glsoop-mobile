import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRef, useSyncExternalStore } from "react";

export type LikeState = { liked: boolean; likeCount: number };

const likeStore = new Map<string, LikeState>();
const listeners = new Set<() => void>();
const LIKE_STORE_KEY = "glsoop:likes:v1";
const MAX_LIKE_ITEMS = 500;
let hydrateStarted = false;

function notify() {
  listeners.forEach((listener) => listener());
}

function toKey(postId: string | number) {
  return String(postId);
}

function schedulePersist() {
  const payload = Array.from(likeStore.entries())
    .slice(-MAX_LIKE_ITEMS)
    .map(([id, state]) => ({ id, liked: state.liked, likeCount: state.likeCount }));

  void AsyncStorage.setItem(LIKE_STORE_KEY, JSON.stringify(payload)).catch(() => {});
}

function startHydrate() {
  if (hydrateStarted) return;
  hydrateStarted = true;

  void (async () => {
    try {
      const raw = await AsyncStorage.getItem(LIKE_STORE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      for (const row of parsed) {
        const id = typeof row?.id === "string" ? row.id : "";
        if (!id) continue;
        const liked = Boolean(row?.liked);
        const likeCount = Number(row?.likeCount);
        likeStore.set(id, {
          liked,
          likeCount: Number.isNaN(likeCount) ? 0 : likeCount,
        });
      }
      notify();
    } catch {
      // ignore hydrate failures
    }
  })();
}

export function setLike(postId: string | number, liked: boolean, likeCount: number) {
  startHydrate();
  likeStore.set(toKey(postId), {
    liked,
    likeCount,
  });
  notify();
  schedulePersist();
}

export function getLike(postId: string | number): LikeState | null {
  startHydrate();
  return likeStore.get(toKey(postId)) ?? null;
}

export function clearLikes() {
  startHydrate();
  likeStore.clear();
  notify();
  void AsyncStorage.removeItem(LIKE_STORE_KEY).catch(() => {});
}

export function useLikeSnapshot(
  postId: string | number,
  fallbackLiked: boolean,
  fallbackCount: number
) {
  const key = toKey(postId);
  startHydrate();
  const fallbackRef = useRef<LikeState>({ liked: fallbackLiked, likeCount: fallbackCount });

  if (
    fallbackRef.current.liked !== fallbackLiked ||
    fallbackRef.current.likeCount !== fallbackCount
  ) {
    fallbackRef.current = { liked: fallbackLiked, likeCount: fallbackCount };
  }

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => {
      const stored = likeStore.get(key);
      return stored ?? fallbackRef.current;
    },
    () => fallbackRef.current
  );
}

startHydrate();
