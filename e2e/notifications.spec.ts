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

test.describe("알림함", () => {
  test.beforeEach(async ({ page }) => {
    await seedAuthToken(page, "mock-token-for-notifications");

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
        body: JSON.stringify({ ok: true, id: 1, nickname: "tester", name: "tester" }),
      });
    });
    await page.route("**/api/posts/201", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          post: {
            id: 201,
            title: "알림 대상 글",
            content: "알림에서 이동한 글입니다.",
            author_id: 9,
            author_name: "루나",
            category: "essay",
            created_at: "2026-04-23T00:00:00.000Z",
            like_count: 0,
            bookmark_count: 0,
            user_liked: 0,
            user_bookmarked: 0,
          },
        }),
      });
    });
    await page.route("**/api/posts/201/comments**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, comments: [], pagination: { has_more: false } }),
      });
    });
  });

  test("알림을 누르면 읽음 처리 후 target_path로 이동한다", async ({ page }) => {
    let readCalls = 0;

    await page.route("**/api/notifications?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          notifications: [
            {
              id: "n-201",
              type: "post_comment",
              title: "새 댓글",
              body: "루나님이 댓글을 남겼어요.",
              created_at: "2026-04-23T00:00:00.000Z",
              read_at: null,
              target_path: "/posts/201",
              post_id: 201,
              comment_id: 301,
              user_id: 9,
              actor_count: 1,
            },
          ],
          unread_count: 1,
          has_more: false,
        }),
      });
    });
    await page.route("**/api/notifications/*/read", async (route) => {
      readCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "read" }),
      });
    });

    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-screen")).toBeVisible();
    await expect(page.getByText("새 댓글")).toBeVisible();

    await page.getByTestId("notification-item-n-201").click();
    await expect.poll(() => readCalls).toBe(1);
    await expect(page).toHaveURL(/\/posts\/201$/);
  });

  test("팔로잉 작가 새 글 알림을 보여주고 글 상세로 이동한다", async ({ page }) => {
    let readCalls = 0;

    await page.route("**/api/notifications?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          notifications: [
            {
              id: "n-following-post",
              type: "following_new_post",
              title: "루나님이 새 글을 올렸어요.",
              body: "루나님이 「알림 대상 글」을 남겼어요.",
              created_at: "2026-04-23T00:00:00.000Z",
              read_at: null,
              target_path: "/posts/201",
              post_id: 201,
              comment_id: null,
              user_id: 9,
              actor_count: 1,
            },
          ],
          unread_count: 1,
          has_more: false,
        }),
      });
    });
    await page.route("**/api/notifications/*/read", async (route) => {
      readCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, message: "read" }),
      });
    });

    await page.goto("/notifications");
    await expect(page.getByText("루나님이 새 글을 올렸어요.")).toBeVisible();
    await expect(page.getByText("루나님이 「알림 대상 글」을 남겼어요.")).toBeVisible();

    await page.getByTestId("notification-item-n-following-post").click();
    await expect.poll(() => readCalls).toBe(1);
    await expect(page).toHaveURL(/\/posts\/201$/);
  });

  test("빈 알림함에서는 빈 상태를 보여준다", async ({ page }) => {
    await page.route("**/api/notifications?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, notifications: [], unread_count: 0, has_more: false }),
      });
    });

    await page.goto("/notifications");
    await expect(page.getByTestId("notifications-screen")).toBeVisible();
    await expect(page.getByText("아직 알림이 없어요")).toBeVisible();
    await expect(page.getByRole("button", { name: "푸시 알림 켜기" })).toHaveCount(0);
  });
});
