import { useRef, useSyncExternalStore } from "react";

export type LikeState = { liked: boolean; likeCount: number };

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
