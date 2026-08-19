import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";

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

async function getAuthToken(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), AUTH_TOKEN_KEY);
}

async function mockAuthedAppApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    if (isApiRequest(route, "/api/login")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "환영합니다!",
          token: "native-token-not-used-on-web",
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          id: 11,
          nickname: "session-user",
          name: "session-user",
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/posts")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          posts: [],
          has_more: false,
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/logout")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
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

test.describe("웹 인증 세션 유지", () => {
  test("로그인 후 새로고침해도 세션을 유지한다", async ({ page }) => {
    await mockAuthedAppApis(page);

    await page.goto("/login");
    await expect(page.getByTestId("auth-login-screen")).toBeVisible();

    await page.getByTestId("login-email-input").fill("user@example.com");
    await page.getByTestId("login-password-input").fill("StrongPass123!");
    await page.getByTestId("login-submit-btn").click();

    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);
    await expect(page.getByTestId("app-boot-screen")).toHaveCount(0);
    await expect(page.getByText("글숲", { exact: true })).toBeVisible();
    await expect.poll(() => getAuthToken(page)).toBe(COOKIE_SESSION_TOKEN);

    await page.reload();
    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);
    await expect(page.getByTestId("app-boot-screen")).toHaveCount(0);
    await expect(page.getByText("글숲", { exact: true })).toBeVisible();
    await expect.poll(() => getAuthToken(page)).toBe(COOKIE_SESSION_TOKEN);
  });

  test("저장된 세션이 401이면 토큰을 지우고 로그인 화면으로 돌려보낸다", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      if (isApiRequest(route, "/api/me")) {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: "AUTH_INVALID_SESSION",
            message: "세션이 만료되었습니다.",
          }),
        });
        return;
      }

      if (isApiRequest(route, "/api/logout")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await setAuthToken(page, COOKIE_SESSION_TOKEN);
    await page.goto("/profile-customize");

    await expect(page.getByTestId("auth-login-screen")).toBeVisible();
    await expect(page.getByText("저장한 글과 팔로잉 피드를 이어서 볼 수 있어요.")).toBeVisible();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile-customize$/);
    await expect.poll(() => getAuthToken(page)).toBeNull();
  });

  test("세션 확인이 500으로 잠시 실패해도 보호 화면에서 로그인으로 튕기지 않는다", async ({
    page,
  }) => {
    await page.route("**/api/**", async (route) => {
      if (isApiRequest(route, "/api/me")) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            ok: false,
            code: "INTERNAL_ERROR",
            message: "잠시 후 다시 시도해주세요.",
          }),
        });
        return;
      }

      if (isApiRequest(route, "/api/logout")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await setAuthToken(page, COOKIE_SESSION_TOKEN);
    await page.goto("/profile-customize");

    await expect(page.getByTestId("profile-customize-screen")).toBeVisible();
    await expect(page).toHaveURL(/\/profile-customize$/);
    await expect.poll(() => getAuthToken(page)).toBe(COOKIE_SESSION_TOKEN);
  });
});
