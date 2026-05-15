import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";
const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";
const PROMPT_STORAGE_KEY = "glsoop.postLoginPreferencesPrompt.v1.42";
const PROMPT_PENDING_STORAGE_KEY = "glsoop.postLoginPreferencesPrompt.pending.v1.42";

function isApiRequest(route: Route, suffix: string) {
  return route.request().url().includes(suffix);
}

async function seedPublicNoticeAck(page: Page) {
  await page.addInitScript(
    ({ noticeKey }) => {
      localStorage.setItem(
        noticeKey,
        JSON.stringify({
          versionKey: "public-ugc-notice.v1",
          acknowledgedAt: "2026-05-14T00:00:00.000Z",
        })
      );
    },
    { noticeKey: PUBLIC_UGC_NOTICE_STORAGE_KEY }
  );
}

async function clearAuthToken(page: Page) {
  await page.evaluate((key) => localStorage.removeItem(key), AUTH_TOKEN_KEY);
}

async function login(page: Page) {
  await page.goto("/login");
  await expect(page.getByTestId("auth-login-screen")).toBeVisible();
  await page.getByTestId("login-email-input").fill("user@example.com");
  await page.getByTestId("login-password-input").fill("StrongPass123!");
  await page.getByTestId("login-submit-btn").click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), AUTH_TOKEN_KEY)).toBe(
    COOKIE_SESSION_TOKEN
  );
}

async function mockPostLoginPreferenceApis(page: Page, logs: Array<Record<string, unknown>>) {
  let rememberLoginEnabled = false;
  let marketingPushOptIn = false;

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
      if (route.request().method() === "PUT") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        logs.push({ endpoint: "/api/me", ...body });
        rememberLoginEnabled = Boolean(body.remember_login_enabled);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          id: 42,
          nickname: "prompt-user",
          name: "prompt-user",
          remember_login_enabled: rememberLoginEnabled,
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/marketing-push-consent")) {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        logs.push({ endpoint: "/api/marketing-push-consent", ...body });
        marketingPushOptIn = Boolean(body.marketing_push_opt_in);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          consent: {
            marketing_push_opt_in: marketingPushOptIn,
            marketing_version: "2026-05-14.marketing.v1",
            updated_at: "2026-05-14T00:00:00.000Z",
          },
        }),
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

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

test.describe("로그인 직후 초기 설정 안내", () => {
  test("로그인 유지와 마케팅 푸시 선택을 저장하고 완료 상태를 기록한다", async ({ page }) => {
    const logs: Array<Record<string, unknown>> = [];

    await seedPublicNoticeAck(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPostLoginPreferenceApis(page, logs);

    await login(page);

    await expect(page.getByTestId("post-login-preferences-sheet")).toBeVisible();
    await page.getByTestId("post-login-remember-on-btn").click();
    await page.getByTestId("post-login-marketing-off-btn").click();
    await page.getByTestId("post-login-preferences-save-btn").click();

    await expect.poll(() => logs).toEqual([
      { endpoint: "/api/me", remember_login_enabled: true },
      {
        endpoint: "/api/marketing-push-consent",
        marketing_push_opt_in: false,
        marketing_version: "2026-05-14.marketing.v1",
      },
    ]);
    await expect(page.getByTestId("post-login-preferences-sheet")).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw).version : null;
        }, PROMPT_STORAGE_KEY)
      )
      .toBe("post-login-preferences.v1");
  });

  test("나중에 닫으면 재진입과 다음 로그인 때 다시 표시한다", async ({ page }) => {
    const logs: Array<Record<string, unknown>> = [];

    await seedPublicNoticeAck(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPostLoginPreferenceApis(page, logs);

    await login(page);
    await expect(page.getByTestId("post-login-preferences-sheet")).toBeVisible();
    await page.getByTestId("post-login-preferences-later-btn").click();
    await expect(page.getByTestId("post-login-preferences-sheet")).toBeHidden();
    expect(logs).toEqual([]);
    await expect
      .poll(() =>
        page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw).version : null;
        }, PROMPT_PENDING_STORAGE_KEY)
      )
      .toBe("post-login-preferences.v1");

    await page.reload();
    await expect(page.getByTestId("post-login-preferences-sheet")).toBeVisible();
    await page.getByTestId("post-login-preferences-later-btn").click();
    await expect(page.getByTestId("post-login-preferences-sheet")).toBeHidden();

    await clearAuthToken(page);
    await page.reload();
    await login(page);
    await expect(page.getByTestId("post-login-preferences-sheet")).toBeVisible();
  });

  test("이미 완료한 사용자는 다음 로그인에서 다시 표시하지 않는다", async ({ page }) => {
    const logs: Array<Record<string, unknown>> = [];

    await seedPublicNoticeAck(page);
    await page.addInitScript(
      ({ key }) => {
        localStorage.setItem(
          key,
          JSON.stringify({
            version: "post-login-preferences.v1",
            completedAt: "2026-05-14T00:00:00.000Z",
          })
        );
      },
      { key: PROMPT_STORAGE_KEY }
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await mockPostLoginPreferenceApis(page, logs);

    await login(page);
    await expect(page.getByTestId("post-login-preferences-sheet")).toBeHidden();
    expect(logs).toEqual([]);
  });
});
