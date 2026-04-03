import { apiDelete, apiGet, apiPost } from "@/lib/api";

type ReportResponse = {
  ok?: boolean;
  message?: string;
  report_id?: number;
  status?: string;
};

type BlockResponse = {
  ok?: boolean;
  message?: string;
  blocked_user_id?: number | string;
  hidden_post_count?: number;
  report_id?: number;
  already_blocked?: boolean;
  removed?: boolean;
};

type BlockedUsersResponse = {
  ok?: boolean;
  message?: string;
  blocks?: {
    user_id?: number | string;
    display_name?: string;
    nickname?: string | null;
    reason_code?: string;
    detail?: string | null;
    created_at?: string | null;
  }[];
};

type ReportTarget = "post" | "user";

export const DEFAULT_SAFETY_DETAIL_MAX_LENGTH = 200;
export const DEFAULT_SAFETY_DETAIL_REQUIRED_REASON_CODES = ["other"] as const;

export type SafetyReason = {
  code: string;
  label: string;
  targetTypes: string[];
};

export type BlockedUser = {
  userId: string;
  displayName: string;
  nickname: string | null;
  reasonCode: string;
  detail: string | null;
  createdAt: string | null;
};

function ensureOk<T extends { ok?: boolean; message?: string }>(
  response: T,
  fallbackMessage: string
) {
  if (!response?.ok) {
    throw new Error(response?.message || fallbackMessage);
  }
  return response;
}

export function pickSafetyReasons(
  reasons: SafetyReason[] | undefined,
  target: ReportTarget
): SafetyReason[] {
  const filtered = Array.isArray(reasons)
    ? reasons.filter(
        (reason) =>
          reason.code.trim().length > 0 &&
          reason.label.trim().length > 0 &&
          reason.targetTypes.includes(target)
      )
    : [];

  if (filtered.length > 0) return filtered;

  if (target === "user") {
    return [
      { code: "harassment", label: "괴롭힘/비방", targetTypes: ["user"] },
      { code: "hate", label: "혐오/차별", targetTypes: ["user"] },
      { code: "sexual", label: "선정성/음란성", targetTypes: ["user"] },
      { code: "violence", label: "폭력성/자해/위협", targetTypes: ["user"] },
      { code: "spam", label: "광고/스팸", targetTypes: ["user"] },
      { code: "impersonation", label: "사칭/도용", targetTypes: ["user"] },
      { code: "other", label: "기타", targetTypes: ["user"] },
    ];
  }

  return [
    { code: "harassment", label: "괴롭힘/비방", targetTypes: ["post"] },
    { code: "hate", label: "혐오/차별", targetTypes: ["post"] },
    { code: "sexual", label: "선정성/음란성", targetTypes: ["post"] },
    { code: "violence", label: "폭력성/자해/위협", targetTypes: ["post"] },
    { code: "spam", label: "광고/스팸", targetTypes: ["post"] },
    { code: "impersonation", label: "사칭/도용", targetTypes: ["post"] },
    { code: "other", label: "기타", targetTypes: ["post"] },
  ];
}

export async function reportPost(input: {
  postId: string;
  reasonCode: string;
  detail?: string;
}) {
  const response = ensureOk(
    await apiPost<ReportResponse>(`/api/posts/${encodeURIComponent(input.postId)}/report`, {
      reason_code: input.reasonCode,
      detail: input.detail,
    }),
    "게시글 신고를 접수하지 못했어요."
  );

  return {
    message: response.message ?? "게시글 신고가 운영 검토 큐에 접수되었어요.",
    reportId: response.report_id ?? null,
    status: response.status ?? null,
  };
}

export async function reportUser(input: {
  userId: string;
  reasonCode: string;
  detail?: string;
  contextPostId?: string;
}) {
  const response = ensureOk(
    await apiPost<ReportResponse>(`/api/users/${encodeURIComponent(input.userId)}/report`, {
      reason_code: input.reasonCode,
      detail: input.detail,
      context_post_id: input.contextPostId,
    }),
    "사용자 신고를 접수하지 못했어요."
  );

  return {
    message: response.message ?? "사용자 신고가 운영 검토 큐에 접수되었어요.",
    reportId: response.report_id ?? null,
    status: response.status ?? null,
  };
}

export async function blockUserById(input: {
  userId: string;
  reasonCode?: string;
  detail?: string;
  contextPostId?: string;
}) {
  const response = ensureOk(
    await apiPost<BlockResponse>(`/api/users/${encodeURIComponent(input.userId)}/block`, {
      reason_code: input.reasonCode,
      detail: input.detail,
      context_post_id: input.contextPostId,
    }),
    "사용자 차단에 실패했어요."
  );

  return {
    message: response.message ?? "사용자를 차단했어요. 내 화면에서 이 사용자의 글과 프로필이 숨겨져요.",
    hiddenPostCount: Number(response.hidden_post_count ?? 0),
    reportId: response.report_id ?? null,
    alreadyBlocked: Boolean(response.already_blocked),
  };
}

export async function unblockUserById(userId: string) {
  const response = ensureOk(
    await apiDelete<BlockResponse>(`/api/users/${encodeURIComponent(userId)}/block`),
    "사용자 차단 해제에 실패했어요."
  );

  return {
    message: response.message ?? "사용자 차단을 해제했어요.",
    removed: Boolean(response.removed),
  };
}

export async function listBlockedUsers() {
  const response = ensureOk(
    await apiGet<BlockedUsersResponse>("/api/me/blocks"),
    "차단 목록을 불러오지 못했어요."
  );

  return Array.isArray(response.blocks)
    ? response.blocks.map(
        (item): BlockedUser => ({
          userId: String(item.user_id ?? ""),
          displayName: String(item.display_name ?? item.nickname ?? "알 수 없는 사용자"),
          nickname: typeof item.nickname === "string" ? item.nickname : null,
          reasonCode: String(item.reason_code ?? "other"),
          detail: typeof item.detail === "string" ? item.detail : null,
          createdAt: typeof item.created_at === "string" ? item.created_at : null,
        })
      )
    : [];
}
