import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const APP_ONBOARDING_COMPLETED_KEY = "glsoop.appOnboardingTour.completed.v1";
const GUIDED_BUTTONS_REPLAY_KEY = "glsoop.guidedHelp.requestButtons.v1";
const POST_LOGIN_PREFERENCES_KEY_PREFIX = "glsoop.postLoginPreferencesPrompt.v1";
const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";
const WRITING_EVENT_KEY = "glsoop-monthly-writing-project-prototype";

function isApiRequest(route: Route, suffix: string) {
  return route.request().url().includes(suffix);
}

async function seedGuidedHelpReplay(page: Page, pageKey: "growth" | "me") {
  await page.addInitScript(
    ({
      authKey,
      onboardingKey,
      pageKey,
      preferencesKeyPrefix,
      publicNoticeKey,
      replayKey,
    }) => {
      const now = "2026-07-06T00:00:00.000Z";

      localStorage.setItem(authKey, "mock-token-guided-help");
      localStorage.setItem(
        onboardingKey,
        JSON.stringify({ version: "app-onboarding-tour.v1", completedAt: now })
      );
      localStorage.setItem(
        `${preferencesKeyPrefix}.7`,
        JSON.stringify({ version: "post-login-preferences.v1", completedAt: now })
      );
      localStorage.setItem(
        publicNoticeKey,
        JSON.stringify({ versionKey: "public-ugc-notice.v1", acknowledgedAt: now })
      );
      localStorage.setItem(
        replayKey,
        JSON.stringify({ version: "guided-help.v1", pageKey, requestedAt: now })
      );
    },
    {
      authKey: AUTH_TOKEN_KEY,
      onboardingKey: APP_ONBOARDING_COMPLETED_KEY,
      pageKey,
      preferencesKeyPrefix: POST_LOGIN_PREFERENCES_KEY_PREFIX,
      publicNoticeKey: PUBLIC_UGC_NOTICE_STORAGE_KEY,
      replayKey: GUIDED_BUTTONS_REPLAY_KEY,
    }
  );
}

function writingEventStatusFixture() {
  const prompts = Array.from({ length: 30 }, (_, index) => {
    const day = index + 1;
    const paddedDay = String(day).padStart(2, "0");
    return {
      key: day === 23 ? "day-23-window-light" : `day-${paddedDay}-prompt`,
      day,
      title: day === 23 ? "창가에 남은 빛" : `${day}일차 글감`,
      body: day === 23 ? "오늘 오래 바라본 빛이나 풍경을 적어보세요." : `${day}일차 글감을 적어보세요.`,
      defaultCategory: "essay",
      suggestedHashtags: ["글숲프로젝트"],
    };
  });
  const todayPrompt = prompts[22];

  return {
    ok: true,
    event: {
      key: WRITING_EVENT_KEY,
      title: "글숲 한달 글쓰기 프로젝트",
      subtitle: "매일 하나의 글감으로 30일 동안 글을 쌓아가요.",
      active: true,
      total_days: 30,
      current_day: 23,
      completed_days: 22,
      remaining_days: 7,
      progress_percent: 77,
      local_date_key: "2026-07-06",
      prompt_label: "오늘의 글감",
      write_path: `/write?campaignKey=${WRITING_EVENT_KEY}&campaignPromptKey=${todayPrompt.key}`,
    },
    today_prompt: {
      ...todayPrompt,
      write_path: `/write?campaignKey=${WRITING_EVENT_KEY}&campaignPromptKey=${todayPrompt.key}`,
    },
    prompts,
    progress_steps: prompts.map((prompt) => ({
      ...prompt,
      state: prompt.day < 23 ? "completed" : prompt.day === 23 ? "current" : "upcoming",
    })),
  };
}

async function mockGuidedHelpApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());

    if (isApiRequest(route, "/api/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 7, nickname: "tester", name: "tester" }),
      });
      return;
    }

    if (isApiRequest(route, "/api/growth/dashboard")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          summary: {
            level: 2,
            current_xp: 59,
            next_level_xp: 100,
            today_xp: 10,
            weekly_posts: 3,
            streak_days: 4,
            title: "새싹",
          },
          achievements: [
            {
              id: 12,
              code: "first_30_likes",
              name: "좋아요 30개",
              category: "growth",
              status: "completed",
              progress: 30,
              target: 30,
              unlocked_at: "2026-06-10T00:00:00.000Z",
              icon: "trophy",
            },
          ],
          campaigns: [],
          top_posts: [],
        }),
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
          posts: [],
        }),
      });
      return;
    }

    if (isApiRequest(route, `/api/writing-events/${WRITING_EVENT_KEY}`)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(writingEventStatusFixture()),
      });
      return;
    }

    if (isApiRequest(route, "/api/users/7/profile")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          user: {
            id: 7,
            name: "tester",
            nickname: "tester",
            bio: "내 글숲",
            about: "내 정보 안내 테스트용 프로필입니다.",
            post_count: 1,
            total_likes: 3,
            follower_count: 2,
            following_count: 1,
          },
          stats: { postCount: 1, totalLikes: 3 },
          viewer: { id: 7, is_logged_in: true, is_own_profile: true },
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/users/7/posts")) {
      const offset = Number(url.searchParams.get("offset") || "0");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          posts:
            offset > 0
              ? []
              : [
                  {
                    id: 7001,
                    title: "내 글 안내 테스트",
                    content: "내가 쓴 글 상세로 이동합니다.",
                    category: "short",
                    created_at: "2026-07-01T00:00:00.000Z",
                    author_id: 7,
                    author_name: "tester",
                    like_count: 3,
                    user_liked: 0,
                  },
                ],
          has_more: false,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

async function boundingBox(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return box!;
}

function overlapArea(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
) {
  const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return x * y;
}

async function expectTourCardNotToCoverTarget(page: Page) {
  await expect(page.getByTestId("guided-button-highlight-tour")).toBeVisible();
  await page.waitForTimeout(700);

  const card = await boundingBox(page.getByTestId("guided-button-highlight-card"));
  const frame = await boundingBox(page.getByTestId("guided-button-highlight-frame"));

  expect(overlapArea(card, frame)).toBeLessThan(1);
}

async function verifyVisibleStepsDoNotOverlap(page: Page, steps: number) {
  for (let index = 0; index < steps; index += 1) {
    await expectTourCardNotToCoverTarget(page);

    if (index < steps - 1) {
      await page.getByRole("button", { name: "다음 버튼 설명 보기" }).click();
    }
  }
}

test.describe("버튼 하이라이트 안내 배치", () => {
  test("성장 화면의 하이라이트 카드가 버튼 타깃을 덮지 않는다", async ({ page }) => {
    await seedGuidedHelpReplay(page, "growth");
    await mockGuidedHelpApis(page);

    await page.goto("/growth");

    await verifyVisibleStepsDoNotOverlap(page, 4);
  });

  test("내 정보 화면의 하이라이트 카드가 버튼 타깃을 덮지 않는다", async ({ page }) => {
    await seedGuidedHelpReplay(page, "me");
    await mockGuidedHelpApis(page);

    await page.goto("/me");

    await verifyVisibleStepsDoNotOverlap(page, 5);
  });
});
