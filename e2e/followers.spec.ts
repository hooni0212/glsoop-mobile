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

test.describe("내 팔로워 목록", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthToken(page, "mock-token-for-followers");

    await page.route("**/api/runtime-config", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, legal: { versions: {} } }),
      });
    });
    await page.route("**/api/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          id: 1,
          nickname: "tester",
          name: "tester",
          follower_count: 2,
          following_count: 1,
        }),
      });
    });
  });

  test("팔로워 목록을 팔로잉 목록과 같은 패턴으로 보여준다", async ({ page }) => {
    await page.route("**/api/me/followers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          followers: [
            {
              id: 31,
              display_name: "서윤",
              bio: "밤에 쓰는 사람",
              follower_count: 12,
              is_following: true,
            },
            {
              id: 32,
              display_name: "민재",
              about: "조용한 산문을 읽습니다.",
              follower_count: 3,
              is_following: false,
            },
          ],
        }),
      });
    });

    await page.goto("/me/followers");

    await expect(page.getByTestId("followers-list")).toBeVisible();
    await expect(page.getByText("팔로워", { exact: true })).toBeVisible();
    await expect(page.getByText("2명")).toBeVisible();
    await expect(page.getByText("서윤")).toBeVisible();
    await expect(page.getByText("밤에 쓰는 사람")).toBeVisible();
    await expect(page.getByText("팔로잉 중")).toBeVisible();
    await expect(page.getByText("민재")).toBeVisible();
    await expect(page.getByText("나를 팔로우")).toBeVisible();
  });

  test("팔로워가 없으면 빈 상태를 보여준다", async ({ page }) => {
    await page.route("**/api/me/followers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, followers: [] }),
      });
    });

    await page.goto("/me/followers");

    await expect(page.getByTestId("followers-list")).toBeVisible();
    await expect(page.getByText("아직 나를 팔로우한 독자가 없어요")).toBeVisible();
    await expect(page.getByText("글을 꾸준히 남기면 천천히 독자가 모일 거예요.")).toBeVisible();
  });
});
