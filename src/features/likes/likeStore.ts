import { useSyncExternalStore } from "react";

export type LikeState = { liked: boolean; likeCount: number; updatedAt: number };

const likeStore = new Map<string, LikeState>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

function toKey(postId: string | number) {
  return String(postId);
}

export function setLike(postId: string | number, liked: boolean, likeCount: number) {
  likeStore.set(toKey(postId), {
    liked,
    likeCount,
    updatedAt: Date.now(),
  });
  notify();
}

export function getLike(postId: string | number): LikeState | null {
  return likeStore.get(toKey(postId)) ?? null;
}

export function clearLikes() {
  likeStore.clear();
  notify();
}

export function useLikeSnapshot(
  postId: string | number,
  fallbackLiked: boolean,
  fallbackCount: number
) {
  const key = toKey(postId);

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => {
      const stored = likeStore.get(key);
      return stored
        ? { liked: stored.liked, likeCount: stored.likeCount }
        : { liked: fallbackLiked, likeCount: fallbackCount };
    },
    () => ({ liked: fallbackLiked, likeCount: fallbackCount })
  );
}
