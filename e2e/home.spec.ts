import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop:auth:token:v1";

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

test.describe("홈 화면", () => {
  test("기본 요소가 렌더링된다", async ({ page }) => {
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, id: 1, nickname: "tester", name: "tester" }),
      });
    });
    await page.route("**/api/posts**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, posts: [], hasMore: false }),
      });
    });

    await setAuthToken(page, "mock-token-for-home");
    await page.goto("/");

    await expect(page.getByText("글숲")).toBeVisible();
    await expect(page.getByRole("button", { name: "검색" })).toBeVisible();
    await expect(page.getByRole("button", { name: "추천" })).toBeVisible();
    await expect(page.getByText("오늘의 추천")).toBeVisible();
  });
});
