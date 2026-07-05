import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const WRITING_EVENT_KEY = "glsoop-monthly-writing-project-prototype";

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
  postCreateCapture?: { payload?: Record<string, unknown> };
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
            id: 504,
            state_id: 9004,
            name: "지나간 연인에게 편지를 써봐요",
            description: "인스타그램 주제로 한 편을 완성해보세요",
            condition_type: "PROMPT_POST_CREATED",
            category: "essay",
            target: 1,
            reward_xp: 25,
            status: "in_progress",
            progress: 0,
            position_index: 3,
            campaign_id: 201,
            campaign_type: "daily",
            template_kind: "quest",
            code: "prompt_past_lover_letter",
            ui_json: JSON.stringify({
              quest_kind: "writing_prompt",
              prompt: {
                key: "past-lover-letter",
                title: "지나간 연인에게 편지를 써봐요",
                body: "보내지 못한 말, 지금이라면 다르게 쓰고 싶은 문장을 글로 남겨보세요.",
                cta_label: "이 주제로 쓰기",
                default_category: "essay",
                suggested_hashtags: ["편지", "이별", "글숲"],
              },
              source: "instagram",
              source_url: "https://www.instagram.com/glsoop",
            }),
            completed_at: null,
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
            ui_json: JSON.stringify({
              required_entitlement: "pass:2026_spring",
              rewards: { cosmetics: ["badge_spring_2026"] },
            }),
            completed_at: "2026-02-10T08:35:00.000Z",
            reward_claimed_at: null,
            is_locked: true,
            required_entitlement: "pass:2026_spring",
            lock_reason: "SEASON_PASS_REQUIRED",
            reward_cosmetic_keys: ["badge_spring_2026"],
            reward_cosmetics: [
              {
                key: "badge_spring_2026",
                type: "badge",
                name: "봄 시즌 배지",
                icon_emoji: "🌸",
                rarity: "rare",
                season: "2026_spring",
                meta: null,
              },
            ],
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

function writingEventPostsFixture() {
  return [
    {
      id: "campaign-post-day-1",
      title: "1일차 작성 글",
      excerpt: "첫날에 남긴 문장입니다.",
      category: "essay",
      created_at: "2026-06-14T02:00:00.000Z",
      event_key: WRITING_EVENT_KEY,
      event_title: "글숲 한달 글쓰기 프로젝트",
      prompt_key: "day-01-first-sentence",
      prompt_day: 1,
      prompt_title: "오늘 가장 기억에 남은 장면",
      prompt_body: "오늘 하루 중 유독 마음에 남은 순간을 한 문장으로 시작해보세요.",
    },
    {
      id: "campaign-post-day-3",
      title: "3일차 작성 글",
      excerpt: "작은 친절을 기록했습니다.",
      category: "essay",
      created_at: "2026-06-16T02:00:00.000Z",
      event_key: WRITING_EVENT_KEY,
      event_title: "글숲 한달 글쓰기 프로젝트",
      prompt_key: "day-03-small-kindness",
      prompt_day: 3,
      prompt_title: "작은 친절을 받은 순간",
      prompt_body: "크지는 않았지만 기억에 남은 친절한 말이나 행동을 기록해보세요.",
    },
  ];
}

async function freezeCampaignDate(page: Page) {
  await page.addInitScript(() => {
    const fixedNow = new Date("2026-07-06T03:00:00.000Z").valueOf();
    const RealDate = Date;

    class MockDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fixedNow);
        } else {
          const [yearOrValue, month, day, hours, minutes, seconds, ms] = args;
          if (args.length === 1) {
            super(yearOrValue);
          } else if (args.length === 2) {
            super(yearOrValue, month);
          } else if (args.length === 3) {
            super(yearOrValue, month, day);
          } else if (args.length === 4) {
            super(yearOrValue, month, day, hours);
          } else if (args.length === 5) {
            super(yearOrValue, month, day, hours, minutes);
          } else if (args.length === 6) {
            super(yearOrValue, month, day, hours, minutes, seconds);
          } else {
            super(yearOrValue, month, day, hours, minutes, seconds, ms);
          }
        }
      }

      static now() {
        return fixedNow;
      }
    }

    globalThis.Date = MockDate as DateConstructor;
  });
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

    if (isApiRequest(route, `/api/writing-events/${WRITING_EVENT_KEY}/me/posts`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          event_key: WRITING_EVENT_KEY,
          posts: writingEventPostsFixture(),
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/posts") && route.request().method() === "POST") {
      if (options.postCreateCapture) {
        options.postCreateCapture.payload = route.request().postDataJSON() as Record<string, unknown>;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          post_id: "post-e2e-prompt-quest",
          quest_completion: {
            state_id: 9004,
            prompt_key: "past-lover-letter",
            progress: 1,
            target: 1,
            status: "completed",
          },
        }),
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
              type: "sticker",
              name: "스타 스티커",
              icon_emoji: "✨",
              rarity: "common",
              season: null,
              meta: null,
            },
          ],
        }),
      });
      return;
    }

    if (
      isApiRequest(route, "/api/posts/701") ||
      isApiRequest(route, "/api/posts/campaign-post-day-1") ||
      isApiRequest(route, "/api/posts/campaign-post-day-3")
    ) {
      const postId = route.request().url().includes("campaign-post-day-3")
        ? "campaign-post-day-3"
        : route.request().url().includes("campaign-post-day-1")
          ? "campaign-post-day-1"
          : "701";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          post: {
            id: postId,
            title: postId === "701" ? "테스트 인기 글" : "프로젝트 작성 글",
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

    await expect(page.getByTestId("auth-login-screen")).toBeVisible();
    await expect(page.getByTestId("login-submit-btn")).toBeVisible();
    await expect(page.getByText("회원가입", { exact: true })).toBeVisible();
  });

  test("로그인 상태에서 성장 메인/상세 이동과 보상 수령이 동작한다", async ({ page }) => {
    await mockGrowthApis(page);
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByText("나의 숲")).toBeVisible();
    await expect(page.getByText("오늘의 리포트")).toHaveCount(0);
    await expect(page.getByTestId("growth-forest-card")).toContainText("다음 레벨까지 90 XP");
    await expect(page.getByTestId("growth-achievement-highlight")).toContainText("7일 연속 기록");
    await expect(page.getByTestId("growth-reflection-card")).toContainText("이번 주 4편의 글이 쌓였어요.");
    await expect(page.getByTestId("growth-campaign-preview")).toHaveCount(0);
    await expect(page.getByTestId("top-posts-list")).toHaveCount(0);

    await activateByTestId(page, "growth-action-records");
    await expect(page.getByTestId("growth-records-screen")).toBeVisible();
    await expect(page.getByText("최근의 숲")).toBeVisible();
    await expect(page.getByText("이번 흐름")).toBeVisible();
    await expect(page.getByText("오늘 XP")).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId("growth-screen")).toBeVisible();

    await activateByTestId(page, "growth-action-achievements");
    await expect(page.getByTestId("growth-achievements-screen")).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId("growth-screen")).toBeVisible();

    await activateByTestId(page, "growth-action-quests");
    await expect(page.getByTestId("growth-quests-screen")).toBeVisible();
    await expect(page.getByText("프리미엄 잠금")).toBeVisible();
    await expect(page.getByTestId("quest-lock-hint-9003")).toBeVisible();
    await expect(page.getByTestId("quest-reward-cosmetic-9003-badge_spring_2026")).toContainText(
      "봄 시즌 배지"
    );
    await expect(page.getByTestId("quest-claim-btn-9003")).toHaveCount(0);

    const claimButton = page.getByTestId("quest-claim-btn-9001");
    await expect(claimButton).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await activateByTestId(page, "quest-claim-btn-9001");
    await expect(page.getByText("보상 수령됨")).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId("growth-screen")).toBeVisible();
  });

  test("글쓰기 프로젝트 달력은 작성, 미작성, 예정 날짜를 구분한다", async ({ page }) => {
    await freezeCampaignDate(page);
    await mockGrowthApis(page);
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-writing-campaign-calendar")).toBeVisible();
    await expect(page.getByText("작성 2개")).toBeVisible();
    await expect(page.getByTestId("growth-writing-campaign-day-1")).toHaveCSS(
      "background-color",
      "rgb(73, 128, 90)"
    );
    await expect(page.getByTestId("growth-writing-campaign-day-2")).toHaveCSS(
      "background-color",
      "rgb(253, 241, 243)"
    );
    await expect(page.getByTestId("growth-writing-campaign-day-24")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)"
    );

    await page.getByTestId("growth-writing-campaign-day-1").click();
    await expect(page).toHaveURL(/\/posts\/campaign-post-day-1/);
  });

  test("dashboard 요청이 실패하면 fallback 데이터로 성장 홈을 유지한다", async ({ page }) => {
    await mockGrowthApis(page, { dashboardShouldFail: true });
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByTestId("growth-forest-card")).toBeVisible();
    await expect(page.getByText("나의 숲")).toBeVisible();
    await expect(page.getByText("오늘의 리포트")).toHaveCount(0);
    await expect(page.getByTestId("top-posts-empty")).toHaveCount(0);
  });

  test("dashboard와 fallback이 모두 실패하면 오류 UI를 노출한다", async ({ page }) => {
    await mockGrowthApis(page, { dashboardShouldFail: true, fallbackShouldFail: true });
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByText("문제가 발생했어요").first()).toBeVisible();
    await expect(page.getByText("성장 요약을 불러오지 못했어요.").first()).toBeVisible();
  });

  test("dashboard top_posts가 빈 배열이어도 성장 홈에는 인기 글 영역을 렌더하지 않는다", async ({ page }) => {
    await mockGrowthApis(page, { topPostsEmpty: true });
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");

    await expect(page.getByTestId("growth-screen")).toBeVisible();
    await expect(page.getByTestId("top-posts-list")).toHaveCount(0);
    await expect(page.getByTestId("top-posts-empty")).toHaveCount(0);
  });

  test("프롬프트 퀘스트에서 글쓰기 화면으로 이동하고 quest_context를 전송한다", async ({ page }) => {
    const capture: { payload?: Record<string, unknown> } = {};
    await mockGrowthApis(page, { postCreateCapture: capture });
    await setAuthToken(page, "mock-token-for-growth");

    await page.goto("/growth");
    await activateByTestId(page, "growth-action-quests");
    await activateByTestId(page, "quest-prompt-write-btn-9004");

    await expect(page).toHaveURL(/\/write\?/);
    const promptCard = page.getByTestId("write-quest-prompt-card");
    await expect(promptCard).toBeVisible();
    await expect(promptCard.getByText("지나간 연인에게 편지를 써봐요")).toBeVisible();

    await page.getByTestId("write-title-input").fill("보내지 못한 편지");
    await page.getByTestId("write-body-input").fill("이제야 조용히 적어보는 문장들입니다.");

    const submitBtn = page.getByTestId("write-submit-btn");
    await submitBtn.click();
    await submitBtn.click();

    await expect(page.getByText("퀘스트 진행도도 반영됐어요.")).toBeVisible();
    expect(capture.payload?.category).toBe("essay");
    expect(capture.payload?.hashtags).toEqual(["편지", "이별", "글숲"]);
    expect(capture.payload?.quest_context).toEqual({
      state_id: 9004,
      prompt_key: "past-lover-letter",
    });
  });
});
