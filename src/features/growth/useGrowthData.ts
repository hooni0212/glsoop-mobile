import { useCallback, useEffect, useState } from "react";

import { trackGrowthTelemetry, toGrowthTelemetryError } from "@/features/growth/growthTelemetry";
import { apiGet, apiPost } from "@/lib/api";
import { normalizeApiError, type AppErrorModel } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { normalizePostPreviewText } from "@/lib/postContent";
import { normalizePublicDisplayName } from "@/lib/publicDisplayName";

export type GrowthLoadSource = "dashboard" | "fallback" | null;
export type GrowthTopPostsMode = "ready" | "empty" | "error";

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
  isLocked: boolean;
  requiredEntitlement: string | null;
  lockReason: string | null;
};

export type GrowthPromptQuest = {
  key: string;
  title: string;
  body: string;
  ctaLabel: string;
  defaultCategory: "poem" | "essay" | "short";
  suggestedHashtags: string[];
  source: string | null;
  sourceUrl: string | null;
};

export type GrowthCosmeticReward = {
  key: string;
  name: string;
  iconEmoji: string | null;
  rarity: string;
  season: string | null;
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

export type GrowthTopPost = {
  id: string;
  title: string;
  excerpt: string;
  authorName: string;
  category: string;
  createdAt: string | null;
  likeCount: number;
  bookmarkCount: number;
};

export type UseGrowthDataResult = {
  summary: GrowthSummary | null;
  achievements: GrowthAchievement[];
  campaigns: GrowthCampaign[];
  topPosts: GrowthTopPost[];
  topPostsMode: GrowthTopPostsMode;
  loading: boolean;
  error: AppErrorModel | null;
  source: GrowthLoadSource;
  refetch: () => Promise<void>;
  claimQuestReward: (stateId: number) => Promise<ClaimQuestResult>;
};

type DashboardResponse = {
  ok?: boolean;
  message?: string;
  summary?: unknown;
  achievements?: unknown;
  campaigns?: unknown;
  top_posts?: unknown;
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

type TopPostsResponse = {
  ok?: boolean;
  message?: string;
  top_posts?: unknown;
};

type ClaimQuestResponse = {
  ok?: boolean;
  message?: string;
  reward_claimed_at?: unknown;
  gained_xp?: unknown;
  new_xp?: unknown;
  gained_cosmetics?: unknown;
};

type GrowthSnapshot = {
  summary: GrowthSummary | null;
  achievements: GrowthAchievement[];
  campaigns: GrowthCampaign[];
  topPosts: GrowthTopPost[];
  topPostsMode: GrowthTopPostsMode;
  loading: boolean;
  error: AppErrorModel | null;
  source: GrowthLoadSource;
};

export type ClaimQuestResult = {
  rewardClaimedAt: string | null;
  gainedXp: number;
  newXp: number;
  gainedCosmetics: GrowthCosmeticReward[];
};

const CACHE_TTL_MS = 60_000;

const INITIAL_SNAPSHOT: GrowthSnapshot = {
  summary: null,
  achievements: [],
  campaigns: [],
  topPosts: [],
  topPostsMode: "empty",
  loading: false,
  error: null,
  source: null,
};

let growthSnapshot: GrowthSnapshot = INITIAL_SNAPSHOT;
let lastLoadedAt = 0;
let inflightLoad: Promise<void> | null = null;
const listeners = new Set<(next: GrowthSnapshot) => void>();

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

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
}

function toIdText(value: unknown) {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 12);
}

function normalizePromptCategory(value: unknown): "poem" | "essay" | "short" {
  if (value === "poem" || value === "short") return value;
  return "essay";
}

export function parseGrowthPromptQuest(quest: GrowthQuest): GrowthPromptQuest | null {
  if (quest.conditionType !== "PROMPT_POST_CREATED" || !quest.uiJson) return null;
  try {
    const parsed = JSON.parse(quest.uiJson);
    const root = toRecord(parsed);
    if (root.quest_kind !== "writing_prompt") return null;
    const prompt = toRecord(root.prompt);
    const key = toText(prompt.key).trim();
    const title = toText(prompt.title).trim();
    if (!key || !title) return null;
    return {
      key,
      title,
      body: toText(prompt.body),
      ctaLabel: toText(prompt.cta_label, "이 주제로 글쓰기"),
      defaultCategory: normalizePromptCategory(prompt.default_category),
      suggestedHashtags: toStringArray(prompt.suggested_hashtags),
      source: toNullableText(root.source),
      sourceUrl: toNullableText(root.source_url),
    };
  } catch {
    return null;
  }
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
  const serverStatus = normalizeStatus(row.status);
  const isLocked = toBoolean(row.is_locked) || serverStatus === "locked";

  return {
    id: toNumber(row.id),
    stateId: toNumber(row.state_id),
    name: toText(row.name),
    description: toText(row.description),
    conditionType: toText(row.condition_type),
    category: toText(row.category),
    target: toNumber(row.target),
    rewardXp: toNumber(row.reward_xp),
    status: isLocked ? "locked" : serverStatus,
    progress: toNumber(row.progress),
    positionIndex: toNumber(row.position_index),
    campaignId: toNumber(row.campaign_id),
    campaignType: toText(row.campaign_type),
    templateKind: toText(row.template_kind),
    code: toText(row.code),
    uiJson: toText(row.ui_json),
    completedAt: toNullableText(row.completed_at),
    rewardClaimedAt: toNullableText(row.reward_claimed_at),
    isLocked,
    requiredEntitlement: toNullableText(row.required_entitlement),
    lockReason: toNullableText(row.lock_reason),
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

function normalizeTopPost(input: unknown): GrowthTopPost | null {
  const row = toRecord(input);
  const id = toIdText(row.id);
  const title = toText(row.title);
  if (!id || !title) return null;

  return {
    id,
    title,
    excerpt: normalizePostPreviewText(row.excerpt),
    authorName: normalizePublicDisplayName(
      row.display_name,
      row.author_display_name,
      row.nickname,
      row.author_nickname
    ),
    category: toText(row.category),
    createdAt: toNullableText(row.created_at),
    likeCount: toNumber(row.like_count),
    bookmarkCount: toNumber(row.bookmark_count),
  };
}

function normalizeTopPosts(input: unknown): GrowthTopPost[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(normalizeTopPost)
    .filter((item): item is GrowthTopPost => item !== null);
}

function normalizeClaimCosmetic(input: unknown): GrowthCosmeticReward | null {
  const row = toRecord(input);
  const key = toText(row.key);
  const name = toText(row.name);
  if (!key || !name) return null;

  return {
    key,
    name,
    iconEmoji: toNullableText(row.icon_emoji),
    rarity: toText(row.rarity, "common"),
    season: toNullableText(row.season),
  };
}

function normalizeClaimCosmetics(input: unknown): GrowthCosmeticReward[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(normalizeClaimCosmetic)
    .filter((item): item is GrowthCosmeticReward => item !== null);
}

function publishSnapshot(next: GrowthSnapshot) {
  growthSnapshot = next;
  listeners.forEach((listener) => listener(growthSnapshot));
}

function hasGrowthData(snapshot: GrowthSnapshot) {
  if (snapshot.summary) return true;
  if (snapshot.achievements.length > 0) return true;
  if (snapshot.campaigns.length > 0) return true;
  return false;
}

function shouldUseCache(force: boolean) {
  if (force) return false;
  if (growthSnapshot.loading) return true;

  const hasData = hasGrowthData(growthSnapshot);
  if (!hasData) return false;

  return Date.now() - lastLoadedAt < CACHE_TTL_MS;
}

function applyQuestClaim(snapshot: GrowthSnapshot, result: ClaimQuestResult, stateId: number) {
  let patched = false;

  const campaigns = snapshot.campaigns.map((campaign) => {
    const quests = campaign.quests.map((quest) => {
      if (quest.stateId !== stateId) return quest;
      patched = true;
      return {
        ...quest,
        rewardClaimedAt: result.rewardClaimedAt,
      };
    });

    return { ...campaign, quests };
  });

  const summary = snapshot.summary
    ? {
        ...snapshot.summary,
        currentXp: result.newXp > 0 ? result.newXp : snapshot.summary.currentXp,
      }
    : snapshot.summary;

  if (!patched && summary === snapshot.summary) {
    return snapshot;
  }

  return {
    ...snapshot,
    summary,
    campaigns,
  };
}

async function fetchDashboard() {
  const res = await apiGet<DashboardResponse>("/api/growth/dashboard");
  if (!res?.ok) throw new Error(res?.message || "성장 대시보드를 불러오지 못했어요.");

  const topPosts = normalizeTopPosts(res.top_posts);
  const topPostsMode: GrowthTopPostsMode = topPosts.length > 0 ? "ready" : "empty";

  return {
    summary: normalizeSummary(res.summary),
    achievements: normalizeAchievements(res.achievements),
    campaigns: normalizeCampaigns(res.campaigns),
    topPosts,
    topPostsMode,
  };
}

async function fetchFallback() {
  const [summaryRes, achievementsRes, campaignsRes, topPostsRes] = await Promise.all([
    apiGet<SummaryResponse>("/api/growth/summary"),
    apiGet<AchievementsResponse>("/api/growth/achievements"),
    apiGet<ActiveQuestsResponse>("/api/quests/active"),
    apiGet<TopPostsResponse>("/api/growth/top-posts").catch(() => null),
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

  const topPosts = topPostsRes?.ok ? normalizeTopPosts(topPostsRes.top_posts) : [];
  const topPostsMode: GrowthTopPostsMode = topPosts.length > 0 ? "ready" : "empty";

  return {
    summary: normalizeSummary(summaryRes.summary),
    achievements: normalizeAchievements(achievementsRes.achievements),
    campaigns: normalizeCampaigns(campaignsRes.campaigns),
    topPosts,
    topPostsMode,
  };
}

async function loadGrowth(force = false) {
  if (inflightLoad) {
    trackGrowthTelemetry("growth_load_skipped_inflight", { force });
    await inflightLoad;
    return;
  }

  if (shouldUseCache(force)) {
    trackGrowthTelemetry("growth_load_skipped_cache", { force });
    return;
  }

  inflightLoad = (async () => {
    publishSnapshot({
      ...growthSnapshot,
      loading: true,
      error: null,
    });

    try {
      const dashboard = await fetchDashboard();

      publishSnapshot({
        ...growthSnapshot,
        summary: dashboard.summary,
        achievements: dashboard.achievements,
        campaigns: dashboard.campaigns,
        topPosts: dashboard.topPosts,
        topPostsMode: dashboard.topPostsMode,
        source: "dashboard",
        error: null,
        loading: false,
      });
      trackGrowthTelemetry("growth_load_succeeded", {
        source: "dashboard",
        achievementsCount: dashboard.achievements.length,
        campaignsCount: dashboard.campaigns.length,
        topPostsCount: dashboard.topPosts.length,
        force,
      });
      lastLoadedAt = Date.now();
      return;
    } catch (dashboardError) {
      trackGrowthTelemetry("growth_load_failed", {
        source: "dashboard",
        error: toGrowthTelemetryError(dashboardError),
        force,
      });
      if (__DEV__) {
        logger.warn("[growth] dashboard failed; fallback to legacy endpoints", dashboardError);
      }
    }

    try {
      const fallback = await fetchFallback();
      publishSnapshot({
        ...growthSnapshot,
        summary: fallback.summary,
        achievements: fallback.achievements,
        campaigns: fallback.campaigns,
        topPosts: fallback.topPosts,
        topPostsMode: fallback.topPostsMode,
        source: "fallback",
        error: null,
        loading: false,
      });
      trackGrowthTelemetry("growth_load_succeeded", {
        source: "fallback",
        achievementsCount: fallback.achievements.length,
        campaignsCount: fallback.campaigns.length,
        topPostsCount: fallback.topPosts.length,
        force,
      });
      lastLoadedAt = Date.now();
    } catch (fallbackError) {
      trackGrowthTelemetry("growth_load_failed", {
        source: "fallback",
        error: toGrowthTelemetryError(fallbackError),
        force,
      });
      publishSnapshot({
        ...growthSnapshot,
        summary: null,
        achievements: [],
        campaigns: [],
        topPosts: [],
        topPostsMode: "error",
        source: null,
        error: normalizeApiError(fallbackError),
        loading: false,
      });
    }
  })().finally(() => {
    inflightLoad = null;
  });

  await inflightLoad;
}

async function claimQuestRewardRequest(stateId: number): Promise<ClaimQuestResult> {
  trackGrowthTelemetry("growth_quest_claim_started", { stateId });

  try {
    const res = await apiPost<ClaimQuestResponse>(`/api/quests/${encodeURIComponent(String(stateId))}/claim`);
    if (!res?.ok) {
      throw new Error(res?.message || "퀘스트 보상 수령에 실패했어요.");
    }

    const result: ClaimQuestResult = {
      rewardClaimedAt: toNullableText(res.reward_claimed_at),
      gainedXp: toNumber(res.gained_xp),
      newXp: toNumber(res.new_xp),
      gainedCosmetics: normalizeClaimCosmetics(res.gained_cosmetics),
    };

    publishSnapshot({
      ...applyQuestClaim(growthSnapshot, result, stateId),
      error: null,
    });

    // 서버 계산값(레벨/XP/요약)을 동기화하기 위해 1회 재조회
    void loadGrowth(true);

    trackGrowthTelemetry("growth_quest_claim_succeeded", {
      stateId,
      gainedXp: result.gainedXp,
      newXp: result.newXp,
      gainedCosmeticsCount: result.gainedCosmetics.length,
    });

    return result;
  } catch (claimError) {
    trackGrowthTelemetry("growth_quest_claim_failed", {
      stateId,
      error: toGrowthTelemetryError(claimError),
    });
    throw claimError;
  }
}

export function useGrowthData(): UseGrowthDataResult {
  const [snapshot, setSnapshot] = useState<GrowthSnapshot>(growthSnapshot);

  useEffect(() => {
    setSnapshot(growthSnapshot);

    const listener = (next: GrowthSnapshot) => {
      setSnapshot(next);
    };
    listeners.add(listener);

    void loadGrowth(false);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const refetch = useCallback(() => loadGrowth(true), []);
  const claimQuestReward = useCallback((stateId: number) => claimQuestRewardRequest(stateId), []);

  return {
    summary: snapshot.summary,
    achievements: snapshot.achievements,
    campaigns: snapshot.campaigns,
    topPosts: snapshot.topPosts,
    topPostsMode: snapshot.topPostsMode,
    loading: snapshot.loading,
    error: snapshot.error,
    source: snapshot.source,
    refetch,
    claimQuestReward,
  };
}
