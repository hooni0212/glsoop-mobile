import { useCallback, useEffect, useState } from "react";

import { apiGet } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";

export type GrowthLoadSource = "dashboard" | "fallback" | null;

export type GrowthSummary = {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  todayXp: number;
  weeklyPosts: number;
  streakDays: number;
  maxStreakDays: number;
  title: string;
};

export type GrowthAchievementStatus = "locked" | "in_progress" | "completed";

export type GrowthAchievement = {
  id: number;
  code: string;
  name: string;
  description: string;
  category: string;
  status: GrowthAchievementStatus;
  progress: number;
  target: number;
  unlockedAt: string | null;
  positionIndex: number;
  icon: string;
};

export type GrowthQuest = {
  id: number;
  stateId: number;
  name: string;
  description: string;
  conditionType: string;
  category: string;
  target: number;
  rewardXp: number;
  status: GrowthAchievementStatus;
  progress: number;
  positionIndex: number;
  campaignId: number;
  campaignType: string;
  templateKind: string;
  code: string;
  uiJson: string;
  completedAt: string | null;
  rewardClaimedAt: string | null;
};

export type GrowthCampaign = {
  id: number;
  name: string;
  description: string;
  campaignType: string;
  startAt: string | null;
  endAt: string | null;
  quests: GrowthQuest[];
};

export type UseGrowthDataResult = {
  summary: GrowthSummary | null;
  achievements: GrowthAchievement[];
  campaigns: GrowthCampaign[];
  loading: boolean;
  error: AppErrorModel | null;
  source: GrowthLoadSource;
  refetch: () => Promise<void>;
};

type DashboardResponse = {
  ok?: boolean;
  message?: string;
  summary?: unknown;
  achievements?: unknown;
  campaigns?: unknown;
};

type SummaryResponse = {
  ok?: boolean;
  message?: string;
  summary?: unknown;
};

type AchievementsResponse = {
  ok?: boolean;
  message?: string;
  achievements?: unknown;
};

type ActiveQuestsResponse = {
  ok?: boolean;
  message?: string;
  campaigns?: unknown;
};

function toNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toNullableText(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeStatus(value: unknown): GrowthAchievementStatus {
  const s = toText(value, "");
  if (s === "completed" || s === "in_progress") return s;
  return "locked";
}

function normalizeSummary(input: unknown): GrowthSummary {
  const row = toRecord(input);
  return {
    level: toNumber(row.level),
    currentXp: toNumber(row.current_xp),
    nextLevelXp: toNumber(row.next_level_xp),
    todayXp: toNumber(row.today_xp),
    weeklyPosts: toNumber(row.weekly_posts),
    streakDays: toNumber(row.streak_days),
    maxStreakDays: toNumber(row.max_streak_days),
    title: toText(row.title),
  };
}

function normalizeAchievement(input: unknown): GrowthAchievement {
  const row = toRecord(input);
  return {
    id: toNumber(row.id),
    code: toText(row.code),
    name: toText(row.name),
    description: toText(row.description),
    category: toText(row.category),
    status: normalizeStatus(row.status),
    progress: toNumber(row.progress),
    target: toNumber(row.target),
    unlockedAt: toNullableText(row.unlocked_at),
    positionIndex: toNumber(row.position_index),
    icon: toText(row.icon, "🌿"),
  };
}

function normalizeAchievements(input: unknown): GrowthAchievement[] {
  return Array.isArray(input) ? input.map(normalizeAchievement) : [];
}

function normalizeQuest(input: unknown): GrowthQuest {
  const row = toRecord(input);
  return {
    id: toNumber(row.id),
    stateId: toNumber(row.state_id),
    name: toText(row.name),
    description: toText(row.description),
    conditionType: toText(row.condition_type),
    category: toText(row.category),
    target: toNumber(row.target),
    rewardXp: toNumber(row.reward_xp),
    status: normalizeStatus(row.status),
    progress: toNumber(row.progress),
    positionIndex: toNumber(row.position_index),
    campaignId: toNumber(row.campaign_id),
    campaignType: toText(row.campaign_type),
    templateKind: toText(row.template_kind),
    code: toText(row.code),
    uiJson: toText(row.ui_json),
    completedAt: toNullableText(row.completed_at),
    rewardClaimedAt: toNullableText(row.reward_claimed_at),
  };
}

function normalizeCampaign(input: unknown): GrowthCampaign {
  const row = toRecord(input);
  const questRows = Array.isArray(row.quests) ? row.quests : [];

  return {
    id: toNumber(row.id),
    name: toText(row.name),
    description: toText(row.description),
    campaignType: toText(row.campaign_type),
    startAt: toNullableText(row.start_at),
    endAt: toNullableText(row.end_at),
    quests: questRows.map(normalizeQuest),
  };
}

function normalizeCampaigns(input: unknown): GrowthCampaign[] {
  return Array.isArray(input) ? input.map(normalizeCampaign) : [];
}

async function fetchDashboard() {
  const res = await apiGet<DashboardResponse>("/api/growth/dashboard");
  if (!res?.ok) throw new Error(res?.message || "성장 대시보드를 불러오지 못했어요.");

  return {
    summary: normalizeSummary(res.summary),
    achievements: normalizeAchievements(res.achievements),
    campaigns: normalizeCampaigns(res.campaigns),
  };
}

async function fetchFallback() {
  const [summaryRes, achievementsRes, campaignsRes] = await Promise.all([
    apiGet<SummaryResponse>("/api/growth/summary"),
    apiGet<AchievementsResponse>("/api/growth/achievements"),
    apiGet<ActiveQuestsResponse>("/api/quests/active"),
  ]);

  if (!summaryRes?.ok) {
    throw new Error(summaryRes?.message || "성장 요약을 불러오지 못했어요.");
  }
  if (!achievementsRes?.ok) {
    throw new Error(achievementsRes?.message || "업적 정보를 불러오지 못했어요.");
  }
  if (!campaignsRes?.ok) {
    throw new Error(campaignsRes?.message || "퀘스트 정보를 불러오지 못했어요.");
  }

  return {
    summary: normalizeSummary(summaryRes.summary),
    achievements: normalizeAchievements(achievementsRes.achievements),
    campaigns: normalizeCampaigns(campaignsRes.campaigns),
  };
}

export function useGrowthData(): UseGrowthDataResult {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [achievements, setAchievements] = useState<GrowthAchievement[]>([]);
  const [campaigns, setCampaigns] = useState<GrowthCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppErrorModel | null>(null);
  const [source, setSource] = useState<GrowthLoadSource>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const dashboard = await fetchDashboard();
      setSummary(dashboard.summary);
      setAchievements(dashboard.achievements);
      setCampaigns(dashboard.campaigns);
      setSource("dashboard");
      return;
    } catch (dashboardError) {
      if (__DEV__) {
        console.warn("[growth] dashboard failed, fallback to legacy endpoints", dashboardError);
      }
    }

    try {
      const fallback = await fetchFallback();
      setSummary(fallback.summary);
      setAchievements(fallback.achievements);
      setCampaigns(fallback.campaigns);
      setSource("fallback");
    } catch (fallbackError) {
      setError(normalizeApiError(fallbackError));
      setSource(null);
      setSummary(null);
      setAchievements([]);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    summary,
    achievements,
    campaigns,
    loading,
    error,
    source,
    refetch: load,
  };
}
