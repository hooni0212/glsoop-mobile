import { formatKstDateTime } from "@/lib/dateTime";

export type MeResponse = {
  ok?: boolean;
  id: number;
  name: string;
  nickname?: string | null;
  email: string;
  bio?: string | null;
  about?: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
  remember_login_enabled?: boolean;
  marketing_email_opt_in?: boolean;
  level: number;
  xp: number;
  streak_days: number;
  max_streak_days: number;
  follower_count?: number;
  following_count?: number;
};

export type SessionsResponse = {
  ok?: boolean;
  sessions?: any[];
  message?: string;
};

export type UpdateMeResponse = {
  ok?: boolean;
  message?: string;
};

export type AccountClosureResponse = {
  ok?: boolean;
  mode?: "deactivate" | "delete";
  message?: string;
  scheduled_purge_at?: string;
};

export type SessionItem = {
  sid: string;
  current: boolean;
  rememberMe: boolean;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  userAgent: string;
  ipHint?: string | null;
};

export type AccountClosureMode = "deactivate" | "delete";

export function pickFirstString(...vals: any[]) {
  for (const value of vals) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}

export function pickFirstNumber(...vals: any[]) {
  for (const value of vals) {
    const next = Number(value);
    if (!Number.isNaN(next)) return next;
  }
  return 0;
}

export function parseFlag(...vals: any[]) {
  for (const value of vals) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (normalized === "1" || normalized === "true") return true;
      if (normalized === "0" || normalized === "false" || normalized === "") return false;
    }
  }
  return false;
}

export function normalizeSession(row: any): SessionItem {
  return {
    sid: pickFirstString(row?.sid),
    current: parseFlag(row?.current),
    rememberMe: parseFlag(row?.remember_me, row?.rememberMe),
    createdAt: pickFirstString(row?.created_at, row?.createdAt),
    lastSeenAt: pickFirstString(row?.last_seen_at, row?.lastSeenAt),
    expiresAt: pickFirstString(row?.expires_at, row?.expiresAt),
    userAgent: pickFirstString(row?.user_agent, row?.userAgent) || "알 수 없는 기기",
    ipHint: pickFirstString(row?.ip_hint, row?.ipHint) || null,
  };
}

export function formatDateTime(iso?: string) {
  return formatKstDateTime(iso);
}
