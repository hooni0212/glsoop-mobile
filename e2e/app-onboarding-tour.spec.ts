import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const APP_ONBOARDING_REPLAY_KEY = "glsoop.appOnboardingTour.replay.v1";

function isApiRequest(route: Route, suffix: string) {
  return route.request().url().includes(suffix);
}

async function mockHomeApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    if (isApiRequest(route, "/api/runtime-config")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, legal: { versions: {} } }),
      });
      return;
    }

    if (isApiRequest(route, "/api/posts")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [], has_more: false }),
      });
      return;
    }

    if (isApiRequest(route, "/api/notifications")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, notifications: [], unread_count: 0, has_more: false }),
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

test.describe("앱 첫 화면 튜토리얼", () => {
  test("비로그인 공개 홈에서는 뜨지 않고 수동 리플레이 요청 시 홈에서 표시한다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mockHomeApis(page);

    await page.goto("/");

    const noticeGate = page.getByTestId("public-ugc-notice-gate");
    await expect(noticeGate).toBeVisible();
    await page.waitForTimeout(700);
    await expect(page.getByTestId("app-onboarding-tour")).toHaveCount(0);

    await page.getByTestId("public-ugc-notice-check-legal").click();
    await page.getByTestId("public-ugc-notice-check-safety").click();
    await page.getByTestId("public-ugc-notice-continue").click();
    await expect(noticeGate).toBeHidden();
    await expect(page.getByTestId("app-onboarding-tour")).toHaveCount(0);

    await page.evaluate(
      ({ authTokenKey, replayKey }) => {
        localStorage.setItem(authTokenKey, "mock-token-app-onboarding-replay");
        localStorage.setItem(
          replayKey,
          JSON.stringify({
            version: "app-onboarding-tour.v1",
            requestedAt: "2026-07-03T00:00:00.000Z",
          })
        );
      },
      { authTokenKey: AUTH_TOKEN_KEY, replayKey: APP_ONBOARDING_REPLAY_KEY }
    );
    await page.reload();
    await expect(page.getByTestId("app-onboarding-tour")).toBeVisible();
  });

  test("로그인 전 가이드 직접 진입은 로그인 화면으로 보낸다", async ({ page }) => {
    await mockHomeApis(page);

    await page.goto("/guide");

    await expect(page.getByTestId("auth-login-screen")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
