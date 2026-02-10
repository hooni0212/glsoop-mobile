import { apiPost } from "@/lib/api";

export type ShareEventPlatform = "mobile" | "web";
export type ShareEventResult = "shared" | "dismissed" | "failed";

type LogShareEventInput = {
  postId: string;
  platform: ShareEventPlatform;
  surface: string;
  channel: string;
  result: ShareEventResult;
  requestId?: string;
  meta?: Record<string, unknown> | string | null;
};

type ShareEventApiResponse = {
  ok?: boolean;
  message?: string;
};

function normalizeText(value: string, fallback: string, maxLength: number) {
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

export async function logShareEvent(input: LogShareEventInput): Promise<void> {
  const payload = {
    post_id: input.postId,
    platform: input.platform,
    surface: normalizeText(input.surface, "unknown_surface", 60),
    channel: normalizeText(input.channel, "unknown_channel", 60),
    result: input.result,
    request_id: input.requestId?.trim() ? input.requestId.trim().slice(0, 120) : undefined,
    meta: input.meta ?? undefined,
  };

  const res = await apiPost<ShareEventApiResponse>("/api/share-events", payload);
  if (res?.ok === false) {
    throw new Error(res.message || "공유 이벤트 기록에 실패했어요.");
  }
}
