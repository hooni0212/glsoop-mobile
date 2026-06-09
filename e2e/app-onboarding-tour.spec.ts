import { expect, test, type Page, type Route } from "@playwright/test";

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
  test("공개 약관 확인 전에는 뜨지 않고 확인 후 홈에서 표시한다", async ({ page }) => {
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

    await expect(page.getByTestId("app-onboarding-tour")).toBeVisible();
  });

  test("로그인 전 가이드 직접 진입은 로그인 화면으로 보낸다", async ({ page }) => {
    await mockHomeApis(page);

    await page.goto("/guide");

    await expect(page.getByTestId("auth-login-screen")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
