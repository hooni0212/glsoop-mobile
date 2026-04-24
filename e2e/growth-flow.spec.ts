import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";

function isApiRequest(route: Route, suffix: string) {
  return route.request().url().includes(suffix);
}

async function setAuthToken(page: Page, token: string) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: AUTH_TOKEN_KEY, value: token }
  );
}

async function clearAuthToken(page: Page) {
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate((key) => localStorage.removeItem(key), AUTH_TOKEN_KEY);
}

async function activateByTestId(page: Page, testId: string) {
  const target = page.getByTestId(testId);
  await expect(target).toBeVisible();
  await target.focus();
  await page.keyboard.press("Enter");
}

type GrowthMockOptions = {
  dashboardShouldFail?: boolean;
  fallbackShouldFail?: boolean;
  topPostsEmpty?: boolean;
  claimEntitlementRequired?: boolean;
};

function growthDashboardFixture(options: GrowthMockOptions = {}) {
  const topPostsEmpty = options.topPostsEmpty ?? false;
  const payload: Record<string, unknown> = {
    ok: true,
    message: "성장 대시보드 정보를 불러왔습니다.",
    summary: {
      level: 7,
      current_xp: 210,
      next_level_xp: 300,
      today_xp: 18,
      weekly_posts: 4,
      streak_days: 5,
      max_streak_days: 12,
      title: "푸른 가지",
    },
    achievements: [
      {
        id: 11,
        code: "first_7_days",
        name: "7일 연속 기록",
        description: "7일 연속 글을 남겨보세요",
        category: "growth",
        status: "in_progress",
        progress: 5,
        target: 7,
        unlocked_at: null,
        position_index: 1,
        icon: "🔥",
      },
      {
        id: 12,
        code: "first_30_likes",
        name: "좋아요 30개",
        description: "누적 좋아요 30개를 달성하세요",
        category: "growth",
        status: "completed",
        progress: 30,
        target: 30,
        unlocked_at: "2026-02-10T11:00:00.000Z",
        position_index: 2,
        icon: "🌟",
      },
    ],
    campaigns: [
      {
        id: 201,
        name: "데일리 캠페인",
        description: "오늘의 루틴 퀘스트",
        campaign_type: "daily",
        start_at: "2026-02-10T00:00:00.000Z",
        end_at: null,
        quests: [
          {
            id: 501,
            state_id: 9001,
            name: "오늘 글 1개 작성",
            description: "오늘 한 편 이상 글을 작성해보세요",
            condition_type: "POST_COUNT_TOTAL",
            category: "daily",
            target: 1,
            reward_xp: 20,
            status: "completed",
            progress: 1,
            position_index: 1,
            campaign_id: 201,
            campaign_type: "daily",
            template_kind: "normal",
            code: "daily_write_once",
            ui_json: "",
            completed_at: "2026-02-10T08:20:00.000Z",
            reward_claimed_at: null,
            is_locked: false,
            required_entitlement: null,
            lock_reason: null,
          },
          {
            id: 503,
            state_id: 9003,
            name: "봄 시즌 패스 퀘스트",
            description: "시즌 패스 보유 시 보상을 받을 수 있어요",
            condition_type: "POST_COUNT_TOTAL",
            category: "daily",
            target: 1,
            reward_xp: 30,
            status: "completed",
            progress: 1,
            position_index: 2,
            campaign_id: 201,
            campaign_type: "daily",
            template_kind: "normal",
            code: "premium_pass_quest",
            ui_json: "{\"required_entitlement\":\"pass:2026_spring\"}",
            completed_at: "2026-02-10T08:35:00.000Z",
            reward_claimed_at: null,
            is_locked: true,
            required_entitlement: "pass:2026_spring",
            lock_reason: "SEASON_PASS_REQUIRED",
          },
        ],
      },
    ],
    top_posts: topPostsEmpty
      ? []
      : [
          {
            id: 701,
            title: "테스트 인기 글",
            excerpt: "반응이 좋은 글입니다.",
            author_name: "테스터",
            like_count: 21,
            bookmark_count: 7,
          },
        ],
  };

  return payload;
}

async function mockGrowthApis(page: Page, options: GrowthMockOptions = {}) {
  const dashboardFixture = growthDashboardFixture(options);
  const dashboardShouldFail = options.dashboardShouldFail ?? false;
  const fallbackShouldFail = options.fallbackShouldFail ?? false;
  const claimEntitlementRequired = options.claimEntitlementRequired ?? false;
  await page.route("**/api/**", async (route) => {
    if (isApiRequest(route, "/api/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 1, nickname: "tester", name: "tester" }),
      });
      return;
    }

    if (isApiRequest(route, "/api/growth/dashboard")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          dashboardShouldFail
            ? { ok: false, message: "dashboard disabled for fallback test" }
            : dashboardFixture
        ),
      });
      return;
    }

    if (isApiRequest(route, "/api/growth/summary")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          fallbackShouldFail
            ? { ok: false, message: "성장 요약을 불러오지 못했어요." }
            : { ok: true, message: "fallback summary", summary: dashboardFixture.summary }
        ),
      });
      return;
    }

    if (isApiRequest(route, "/api/growth/achievements")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          fallbackShouldFail
            ? { ok: false, message: "업적 정보를 불러오지 못했어요." }
            : {
                ok: true,
                message: "fallback achievements",
                achievements: dashboardFixture.achievements,
              }
        ),
      });
      return;
    }

    if (isApiRequest(route, "/api/quests/active")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          fallbackShouldFail
            ? { ok: false, message: "퀘스트 정보를 불러오지 못했어요." }
            : { ok: true, message: "fallback quests", campaigns: dashboardFixture.campaigns }
        ),
      });
      return;
    }

    if (isApiRequest(route, "/api/growth/top-posts")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "fallback top posts", top_posts: [] }),
      });
      return;
    }

    if (isApiRequest(route, "/api/quests/9001/claim")) {
      if (claimEntitlementRequired) {
        await route.fulfill({
          status: 403,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: "ENTITLEMENT_REQUIRED",
            message: "시즌 패스가 필요합니다.",
          }),
        });
        return;
      }

      const claimRewardedAt = "2026-02-10T12:10:20.000Z";
      const campaigns = Array.isArray(dashboardFixture.campaigns)
        ? (dashboardFixture.campaigns as Record<string, unknown>[])
        : [];
      campaigns.forEach((campaign) => {
        const quests = Array.isArray(campaign.quests) ? (campaign.quests as Record<string, unknown>[]) : [];
        quests.forEach((quest) => {
          if (Number(quest.state_id) === 9001) {
            quest.reward_claimed_at = claimRewardedAt;
          }
        });
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          reward_claimed_at: claimRewardedAt,
          gained_xp: 20,
          new_xp: 230,
          gained_cosmetics: [
            {
              key: "sticker_star",
              name: "스타 스티커",
              icon_emoji: "✨",
              rarity: "common",
              season: null,
            },
          ],
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/posts/701")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          post: {
            id: 701,
            title: "테스트 인기 글",
            content: "<p>테스트 상세 본문</p>",
            author_name: "테스터",
            created_at: "2026-02-10T11:00:00.000Z",
            like_count: 21,
            bookmark_count: 7,
            user_liked: false,
            user_bookmarked: false,
            category: "essay",
          },
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe("Growth 플로우", () => {
  test("비로그인 상태에서는 성장 탭 접근 시 auth 화면으로 유도된다", async ({ page }) => {
    await clearAuthToken(page);
    await page.goto("/growth");

    await expect(page.getByText("글숲")).toBeVisible();
    await expect(page.getByText("로그인", { exact: true })).toBeVisible();
    await expect(page.getByText("회원가입", { exact: true })).toBeVisible();
  });

  test("로그인 상태에서 성장 메인/상세 이동과 보상 수령이 동작한다", async ({ page }) => {
    await mockGrowthApis(page);
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByText("오늘의 리포트")).toBeVisible();
    await expect(page.getByText("테스트 인기 글")).toBeVisible();

    await activateByTestId(page, "growth-action-achievements");
    await expect(page.getByTestId("growth-achievements-screen")).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId("growth-screen")).toBeVisible();

    await activateByTestId(page, "growth-action-quests");
    await expect(page.getByTestId("growth-quests-screen")).toBeVisible();
    await expect(page.getByText("프리미엄 잠금")).toBeVisible();
    await expect(page.getByTestId("quest-lock-hint-9003")).toBeVisible();
    await expect(page.getByTestId("quest-claim-btn-9003")).toHaveCount(0);

    const claimButton = page.getByTestId("quest-claim-btn-9001");
    await expect(claimButton).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await activateByTestId(page, "quest-claim-btn-9001");
    await expect(page.getByText("보상 수령됨")).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId("growth-screen")).toBeVisible();
  });

  test("인기 글 항목을 누르면 게시글 상세로 이동한다", async ({ page }) => {
    await mockGrowthApis(page);
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await activateByTestId(page, "top-post-item-701");
    await expect(page).toHaveURL(/\/posts\/701$/);
  });

  test("dashboard 요청이 실패하면 fallback 데이터와 인기 글 empty UI를 유지한다", async ({ page }) => {
    await mockGrowthApis(page, { dashboardShouldFail: true });
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByLabel("데이터 소스: 대체 데이터")).toBeVisible();
    await expect(page.getByTestId("top-posts-empty")).toBeVisible();
    await expect(page.getByText("아직 인기 글이 없어요")).toBeVisible();
    await expect(page.getByText("활동이 더 쌓이면, 여기에서 주목받는 글을 추천해드릴게요.")).toBeVisible();
  });

  test("dashboard와 fallback이 모두 실패하면 오류 UI를 노출한다", async ({ page }) => {
    await mockGrowthApis(page, { dashboardShouldFail: true, fallbackShouldFail: true });
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByText("문제가 발생했어요").first()).toBeVisible();
    await expect(page.getByText("성장 요약을 불러오지 못했어요.").first()).toBeVisible();
  });

  test("dashboard top_posts가 빈 배열이면 준비중이 아닌 empty UI를 보여준다", async ({ page }) => {
    await mockGrowthApis(page, { topPostsEmpty: true });
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByTestId("top-posts-empty")).toBeVisible();
    await expect(page.getByText("아직 인기 글이 없어요")).toBeVisible();
    await expect(page.getByText("활동이 더 쌓이면, 여기에서 주목받는 글을 추천해드릴게요.")).toBeVisible();
  });
});
