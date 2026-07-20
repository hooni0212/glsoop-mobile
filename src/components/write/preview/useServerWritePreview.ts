import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createFeedPreviewSession,
  type FeedPreviewRenderImages,
} from "@/lib/feedImage";
import { logger } from "@/lib/logger";
import type { PostFontKey } from "@/lib/postContent";
import type { WriteLayoutModel } from "@/lib/postLayout";
import type { PostType } from "@/types/post";

const SERVER_PREVIEW_DEBOUNCE_MS = 400;
const SERVER_PREVIEW_CACHE_LIMIT = 12;
const CACHE_EXPIRY_SAFETY_MS = 60_000;
const FALLBACK_CACHE_TTL_MS = 5 * 60_000;

type ServerPreviewStatus = "checking" | "ready" | "local-fallback";

type ServerPreviewInput = {
  title: string;
  content: string;
  contentPages: string[];
  category: PostType;
  layout: WriteLayoutModel;
  fontKey: PostFontKey;
};

type ServerPreviewState = {
  preview: FeedPreviewRenderImages | null;
  status: ServerPreviewStatus;
  errorMessage: string | null;
};

type CachedPreview = {
  preview: FeedPreviewRenderImages;
  expiresAtMs: number;
};

const previewCache = new Map<string, CachedPreview>();

function readCachedPreview(signature: string) {
  const cached = previewCache.get(signature);
  if (!cached) return null;

  // 만료 직전 세션을 재사용하면 이미지 요청 시 410이 날 수 있어 1분의 여유를 둔다.
  if (cached.expiresAtMs <= Date.now() + CACHE_EXPIRY_SAFETY_MS) {
    previewCache.delete(signature);
    return null;
  }

  // 최근 사용 항목을 뒤로 보내 단순 LRU 순서를 유지한다.
  previewCache.delete(signature);
  previewCache.set(signature, cached);
  return cached.preview;
}

function cachePreview(signature: string, preview: FeedPreviewRenderImages) {
  const parsedExpiry = new Date(preview.renderImages.expiresAt || "").getTime();
  const expiresAtMs = Number.isFinite(parsedExpiry)
    ? parsedExpiry
    : Date.now() + FALLBACK_CACHE_TTL_MS;

  previewCache.set(signature, { preview, expiresAtMs });
  while (previewCache.size > SERVER_PREVIEW_CACHE_LIMIT) {
    const oldestKey = previewCache.keys().next().value;
    if (typeof oldestKey !== "string") break;
    previewCache.delete(oldestKey);
  }
}

function buildRequestSignature(input: ServerPreviewInput) {
  return JSON.stringify({
    title: input.title,
    content: input.content,
    contentPages: input.contentPages,
    category: input.category,
    layout: input.layout,
    fontKey: input.fontKey,
  });
}

export function useServerWritePreview(input: ServerPreviewInput) {
  const { title, content, contentPages, category, layout, fontKey } = input;
  const [retryToken, setRetryToken] = useState(0);
  const [state, setState] = useState<ServerPreviewState>({
    preview: null,
    status: "checking",
    errorMessage: null,
  });
  const requestSequenceRef = useRef(0);
  const createdAtRef = useRef(new Date().toISOString());
  const stableInput = useMemo(
    () => ({ title, content, contentPages, category, layout, fontKey }),
    [category, content, contentPages, fontKey, layout, title]
  );
  const signature = useMemo(
    () => buildRequestSignature(stableInput),
    [stableInput]
  );

  useEffect(() => {
    const cached = readCachedPreview(signature);
    if (cached) {
      setState({ preview: cached, status: "ready", errorMessage: null });
      return;
    }

    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    let cancelled = false;

    // 입력이 달라지는 즉시 이전 서버 이미지를 숨겨 잘못된 결과가 현재 값처럼 보이지 않게 한다.
    setState({ preview: null, status: "checking", errorMessage: null });

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const preview = await createFeedPreviewSession({
            title: stableInput.title,
            content: stableInput.content,
            contentPages: stableInput.contentPages,
            category: stableInput.category,
            layout: stableInput.layout,
            template: stableInput.layout.presetId,
            fontKey: stableInput.fontKey,
            createdAt: createdAtRef.current,
          });

          // 빠른 옵션 변경 뒤 늦게 도착한 응답이 최신 미리보기를 덮지 못하게 한다.
          if (cancelled || requestSequence !== requestSequenceRef.current) return;
          cachePreview(signature, preview);
          setState({ preview, status: "ready", errorMessage: null });
        } catch (error) {
          if (cancelled || requestSequence !== requestSequenceRef.current) return;
          logger.warn("[write-preview] authoritative server preview failed", error);
          setState({
            preview: null,
            status: "local-fallback",
            errorMessage: "최종 렌더를 확인하지 못해 로컬 미리보기를 표시하고 있어요.",
          });
        }
      })();
    }, SERVER_PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [retryToken, signature, stableInput]);

  const retry = useCallback(() => {
    previewCache.delete(signature);
    setRetryToken((current) => current + 1);
  }, [signature]);

  return {
    ...state,
    retry,
    signature,
  };
}

export type { ServerPreviewStatus };
