import { expect, test, type Page, type Route } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const COOKIE_SESSION_TOKEN = "__glsoop_cookie_session__";

function isApiRequest(route: Route, suffix: string) {
  return route.request().url().includes(suffix);
}

async function getStoredAuthToken(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), AUTH_TOKEN_KEY);
}

async function mockSignupFlowApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    if (isApiRequest(route, "/api/runtime-config")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          legal: {
            versions: {
              terms: "2026-02-27.terms.v1",
              privacy: "2026-02-27.privacy.v1",
            },
          },
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/signup")) {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      expect(payload.age_confirmed).toBe(true);
      expect(payload.terms_agreed).toBe(true);
      expect(payload.privacy_agreed).toBe(true);
      expect(payload.terms_version).toBe("2026-02-27.terms.v1");
      expect(payload.privacy_version).toBe("2026-02-27.privacy.v1");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "인증 번호를 이메일로 발송했습니다.",
          pending_id: "pending-123",
          email_masked: "u***@example.com",
          otp_ttl: 600,
          resend_after: 60,
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/verify-email")) {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      expect(payload.pending_id).toBe("pending-123");
      expect(payload.verification_code).toBe("123456");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "이메일 인증이 완료되었습니다.",
          user_id: "101",
        }),
      });
      return;
    }

    if (isApiRequest(route, "/api/login")) {
      const payload = route.request().postDataJSON() as Record<string, unknown>;
      expect(payload.email).toBe("user@example.com");
      expect(payload.pw).toBe("StrongPass123!");

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
          id: 101,
          nickname: "signup-user",
          name: "signup-user",
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

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

test.describe("회원가입 인증 흐름", () => {
  test("인증 랜딩에서는 법률 링크를 숨기고 회원가입 화면에서만 노출한다", async ({ page }) => {
    await mockSignupFlowApis(page);

    await page.goto("/(auth)?redirect=%2Fme");
    await expect(page.getByTestId("auth-welcome-screen")).toBeVisible();
    await expect(page.getByTestId("auth-legal-link-terms")).toHaveCount(0);
    await expect(page.getByTestId("auth-legal-link-privacy")).toHaveCount(0);
    await expect(page.getByTestId("auth-legal-link-guidelines")).toHaveCount(0);

    await page.getByTestId("auth-welcome-signup-btn").click();
    await expect(page.getByTestId("auth-signup-screen")).toBeVisible();
    await expect(page.getByTestId("auth-legal-link-terms")).toBeVisible();
    await expect(page.getByTestId("auth-legal-link-privacy")).toBeVisible();
    await expect(page.getByTestId("auth-legal-link-guidelines")).toBeVisible();
  });

  test("회원가입 -> OTP -> 자동 로그인 후 홈으로 이동한다", async ({ page }) => {
    await mockSignupFlowApis(page);

    await page.goto("/signup");
    await expect(page.getByTestId("auth-signup-screen")).toBeVisible();

    await page.getByTestId("signup-name-input").fill("홍길동");
    await page.getByTestId("signup-nickname-input").fill("길동");
    await page.getByTestId("signup-email-input").fill("user@example.com");
    await page.getByTestId("signup-password-input").fill("StrongPass123!");
    await page.getByTestId("signup-age-checkbox").click();
    await page.getByTestId("signup-terms-checkbox").click();
    await page.getByTestId("signup-privacy-checkbox").click();

    await page.getByTestId("signup-submit-btn").click();

    await expect(page.getByTestId("signup-otp-input")).toBeVisible();
    await expect(page.getByText(/u\*\*\*@example\.com/)).toBeVisible();

    await page.getByTestId("signup-otp-input").fill("123456");
    await page.getByTestId("signup-otp-submit-btn").click();

    await expect(page).toHaveURL(/\/(\(tabs\))?\/?$/);
    await expect(page.getByText("글숲", { exact: true })).toBeVisible();
    await expect.poll(() => getStoredAuthToken(page)).toBe(COOKIE_SESSION_TOKEN);
  });
});
