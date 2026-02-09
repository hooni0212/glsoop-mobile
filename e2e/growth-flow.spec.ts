import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop:auth:token:v1";

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

function growthDashboardFixture() {
  return {
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
          },
          {
            id: 502,
            state_id: 9002,
            name: "좋아요 3개 받기",
            description: "오늘 받은 좋아요를 모아보세요",
            condition_type: "RECEIVED_LIKE_COUNT",
            category: "daily",
            target: 3,
            reward_xp: 15,
            status: "in_progress",
            progress: 1,
            position_index: 2,
            campaign_id: 201,
            campaign_type: "daily",
            template_kind: "normal",
            code: "daily_like_three",
            ui_json: "",
            completed_at: null,
            reward_claimed_at: null,
          },
        ],
      },
    ],
  };
}

async function mockGrowthApis(page: Page) {
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
        body: JSON.stringify(growthDashboardFixture()),
      });
      return;
    }

    if (isApiRequest(route, "/api/growth/summary")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "fallback summary", summary: growthDashboardFixture().summary }),
      });
      return;
    }

    if (isApiRequest(route, "/api/growth/achievements")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "fallback achievements",
          achievements: growthDashboardFixture().achievements,
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/quests/active")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "fallback quests", campaigns: growthDashboardFixture().campaigns }),
      });
      return;
    }

    if (isApiRequest(route, "/api/quests/9001/claim")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          reward_claimed_at: "2026-02-10T12:10:20.000Z",
          gained_xp: 20,
          new_xp: 230,
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
    await expect(page.getByText("로그인")).toBeVisible();
  });

  test("로그인 상태에서 성장 메인/상세 이동과 보상 수령이 동작한다", async ({ page }) => {
    await mockGrowthApis(page);
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByText("오늘의 리포트")).toBeVisible();

    await activateByTestId(page, "growth-action-achievements");
    await expect(page.getByTestId("growth-achievements-screen")).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId("growth-screen")).toBeVisible();

    await activateByTestId(page, "growth-action-quests");
    await expect(page.getByTestId("growth-quests-screen")).toBeVisible();

    const claimButton = page.getByTestId("quest-claim-btn-9001");
    await expect(claimButton).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await claimButton.click({ force: true });
    await expect(page.getByText("보상 수령됨")).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId("growth-screen")).toBeVisible();
  });
});
