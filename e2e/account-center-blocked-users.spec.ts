import { expect, test, type Page } from "@playwright/test";

const AUTH_TOKEN_KEY = "glsoop_auth_token_v1";

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

test.describe("계정 센터 차단한 사용자", () => {
  test("차단 해제 버튼이 앱 내부 확인 시트를 열고 삭제 요청까지 연결된다", async ({ page }) => {
    const deletedUserIds: string[] = [];
    let blockedUsers = [
      {
        user_id: 41,
        display_name: "안개숲",
        nickname: "foggy",
        reason_code: "harassment",
        detail: null,
        created_at: "2026-04-10T00:00:00.000Z",
      },
    ];

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
        }),
      });
    });

    await page.route("**/api/me/blocks", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "차단 목록을 불러왔습니다.",
          blocks: blockedUsers,
        }),
      });
    });

    await page.route(/\/api\/users\/\d+\/block$/, async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }

      const matched = route.request().url().match(/\/api\/users\/(\d+)\/block$/);
      const userId = matched?.[1] ?? "";
      deletedUserIds.push(userId);
      blockedUsers = blockedUsers.filter((item) => String(item.user_id) !== userId);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          message: "사용자 차단을 해제했어요.",
          removed: true,
        }),
      });
    });

    await setAuthToken(page, "mock-token-blocked-users");
    await page.goto("/account-center/blocked-users");

    await expect(page.getByText("안개숲")).toBeVisible();

    await page.getByTestId("blocked-user-unblock-btn-41").click();
    await expect(page.getByTestId("blocked-user-unblock-confirm-btn")).toBeVisible();
    await expect(
      page.getByText("안개숲 사용자의 차단을 해제할까요? 해제하면 이 사용자의 글과 프로필이 다시 보일 수 있어요.")
    ).toBeVisible();

    await page.getByTestId("blocked-user-unblock-confirm-btn").click();

    await expect.poll(() => deletedUserIds).toEqual(["41"]);
    await expect(page.getByText("사용자 차단을 해제했어요.")).toBeVisible();
    await expect(page.getByText("아직 차단한 사용자가 없어요")).toBeVisible();
  });
});
