import { apiGet, apiPatch } from "@/lib/api";

export type NotificationType =
  | "post_reaction"
  | "post_comment"
  | "comment_reply"
  | "new_follower"
  | "admin_operational_alert"
  | "marketing_campaign";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  createdAt: string | null;
  readAt: string | null;
  targetPath: string | null;
  postId: string | null;
  commentId: string | null;
  userId: string | null;
  actorCount: number;
};

export type NotificationListResult = {
  items: AppNotification[];
  unreadCount: number;
  hasMore: boolean;
};

type NotificationListResponse = {
  ok?: boolean;
  message?: string;
  notifications?: unknown;
  unread_count?: unknown;
  unreadCount?: unknown;
  has_more?: unknown;
  hasMore?: unknown;
  pagination?: {
    has_more?: unknown;
    hasMore?: unknown;
  };
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toText(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function toNullableText(value: unknown) {
  const text = toText(value).trim();
  return text ? text : null;
}

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "yes";
  }
  return false;
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeType(value: unknown): NotificationType {
  const raw = toText(value);
  if (
    raw === "post_reaction" ||
    raw === "post_comment" ||
    raw === "comment_reply" ||
    raw === "new_follower" ||
    raw === "admin_operational_alert" ||
    raw === "marketing_campaign"
  ) {
    return raw;
  }
  return "post_comment";
}

function normalizeNotification(value: unknown): AppNotification | null {
  const row = toRecord(value);
  const id = toText(row.id).trim();
  if (!id) return null;

  const title = toText(row.title).trim() || "새 알림";
  const targetPath = toNullableText(row.target_path ?? row.targetPath);

  return {
    id,
    type: normalizeType(row.type),
    title,
    body: toNullableText(row.body),
    createdAt: toNullableText(row.created_at ?? row.createdAt),
    readAt: toNullableText(row.read_at ?? row.readAt),
    targetPath,
    postId: toNullableText(row.post_id ?? row.postId),
    commentId: toNullableText(row.comment_id ?? row.commentId),
    userId: toNullableText(row.user_id ?? row.userId),
    actorCount: Math.max(1, toNumber(row.actor_count ?? row.actorCount, 1)),
  };
}

export async function listNotifications(options: { limit?: number; offset?: number } = {}) {
  const limit = Math.max(1, Math.min(50, Math.floor(options.limit ?? 30)));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const res = await apiGet<NotificationListResponse>(
    `/api/notifications?limit=${limit}&offset=${offset}`
  );
  const rawItems = Array.isArray(res.notifications) ? res.notifications : [];
  const items = rawItems
    .map(normalizeNotification)
    .filter((item): item is AppNotification => Boolean(item));
  const hasMore = toBoolean(
    res.has_more ?? res.hasMore ?? res.pagination?.has_more ?? res.pagination?.hasMore
  );

  return {
    items,
    unreadCount: Math.max(0, toNumber(res.unread_count ?? res.unreadCount, 0)),
    hasMore,
  } satisfies NotificationListResult;
}

export async function markNotificationRead(notificationId: string) {
  const id = notificationId.trim();
  if (!id) throw new Error("알림 ID가 비어 있어요.");
  return apiPatch(`/api/notifications/${encodeURIComponent(id)}/read`, {});
}
