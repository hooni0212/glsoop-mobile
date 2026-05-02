import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";
const PUBLIC_UGC_NOTICE_STORAGE_KEY = "glsoop.public_ugc_notice_ack";

async function seedAuthToken(page: Page, token: string) {
  await page.addInitScript(
    ({ key, value, noticeKey }) => {
      localStorage.setItem(key, value);
      localStorage.setItem(
        noticeKey,
        JSON.stringify({
          versionKey: "public-ugc-notice.v1",
          acknowledgedAt: "2026-04-20T00:00:00.000Z",
        })
      );
    },
    {
      key: AUTH_TOKEN_KEY,
      value: token,
      noticeKey: PUBLIC_UGC_NOTICE_STORAGE_KEY,
    }
  );
}

test.describe("마케팅 푸시 수신 동의", () => {
  test("계정센터에서 광고성 마케팅 알림 수신 동의를 변경한다", async ({ page }) => {
    const patchRequests: Array<Record<string, unknown>> = [];
    let marketingPushOptIn = false;

    await seedAuthToken(page, "mock-token-for-marketing-push");
    await page.setViewportSize({ width: 390, height: 844 });

    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          id: 1,
          nickname: "tester",
          name: "tester",
          remember_login_enabled: false,
        }),
      });
    });
    await page.route("**/api/me/sessions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, sessions: [] }),
      });
    });
    await page.route("**/api/marketing-push-consent", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as Record<string, unknown>;
        patchRequests.push(body);
        marketingPushOptIn = Boolean(body.marketing_push_opt_in);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          consent: {
            marketing_push_opt_in: marketingPushOptIn,
            marketing_version: "2026-02-27.marketing.v1",
            updated_at: "2026-05-02T00:00:00.000Z",
          },
        }),
      });
    });

    await page.goto("/account-center/security");
    await expect(page.getByText("광고성 마케팅 알림")).toBeVisible();

    await page.getByTestId("marketing-push-opt-in-btn").click();
    await expect.poll(() => patchRequests).toEqual([
      {
        marketing_push_opt_in: true,
        marketing_version: "2026-02-27.marketing.v1",
      },
    ]);
    await expect(page.getByText("마케팅 알림 수신에 동의했어요.")).toBeVisible();

    await page.getByTestId("marketing-push-opt-out-btn").click();
    await expect.poll(() => patchRequests.length).toBe(2);
    expect(patchRequests[1]).toMatchObject({
      marketing_push_opt_in: false,
      marketing_version: "2026-02-27.marketing.v1",
    });
    await expect(page.getByText("마케팅 알림 수신 동의를 철회했어요.")).toBeVisible();
  });
});
